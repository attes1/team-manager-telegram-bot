import type { Bot } from 'grammy';
import type { BotContext, CaptainSeasonContext } from '@/bot/context';
import { captainSeasonCommand } from '@/bot/middleware';
import { formatDateRange, formatDay } from '@/lib/format';
import { daySchema, timeSchema } from '@/lib/schemas';
import { getSchedulingWeek, getWeekDateRange, parseWeekInput } from '@/lib/temporal';
import { getLineupMenuMessage, lineupMenu } from '@/menus/lineup';
import { getPublicGroupIds } from '@/services/group';
import {
  buildLineupMessage,
  buildMatchScheduledMessage,
  clearLineup,
  clearOpponent,
  getLineup,
  setLineup,
  setMatchTime,
  setOpponent,
} from '@/services/match';
import { deleteActiveMenu, getActiveMenu, saveActiveMenu } from '@/services/menu';
import { getPlayerByUsername, isPlayerInRoster } from '@/services/roster';
import { getWeek } from '@/services/week';

interface MentionedUser {
  id: number;
  name: string;
  username?: string;
}

// Get text_mention entities (users mentioned by tapping on their name)
const getTextMentionedUsers = (ctx: CaptainSeasonContext): MentionedUser[] => {
  const users: MentionedUser[] = [];

  const textMentions = ctx.entities('text_mention');
  for (const mention of textMentions) {
    if (mention.user) {
      const user = mention.user;
      const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
      users.push({ id: user.id, name, username: user.username });
    }
  }

  return users;
};

// Get @username mentions from message text
const getUsernameMentions = (ctx: CaptainSeasonContext): string[] => {
  const mentions = ctx.entities('mention');
  return mentions.map((m) => m.text.replace(/^@/, ''));
};

export const registerMatchCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'setmatch',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const [dayStr, timeStr] = args.split(/\s+/);

      if (!dayStr || !timeStr) {
        return ctx.reply(i18n.match.usage);
      }

      const dayResult = daySchema.safeParse(dayStr.toLowerCase());
      if (!dayResult.success) {
        return ctx.reply(i18n.match.invalidDay);
      }

      const timeResult = timeSchema.safeParse(timeStr);
      if (!timeResult.success) {
        return ctx.reply(i18n.match.invalidTime);
      }

      const { week: weekNumber, year } = getSchedulingWeek(
        config.weekChangeDay,
        config.weekChangeTime,
      );

      await setMatchTime(db, {
        seasonId: season.id,
        weekNumber,
        year,
        matchDay: dayResult.data,
        matchTime: timeResult.data,
      });

      const { start, end } = getWeekDateRange(year, weekNumber);
      const dateRange = formatDateRange(start, end);
      const dayName = i18n.poll.days[dayResult.data];
      const dayFormatted = formatDay(dayResult.data, config.language);

      if (config.publicAnnouncements === 'on') {
        const publicGroupIds = await getPublicGroupIds(db);
        if (publicGroupIds.length > 0) {
          const announcement = buildMatchScheduledMessage(i18n, dayFormatted, timeResult.data);
          for (const groupId of publicGroupIds) {
            try {
              await ctx.api.sendMessage(groupId, announcement);
            } catch (error) {
              console.error(`Failed to send match announcement to group ${groupId}:`, error);
            }
          }
        }
      }

      return ctx.reply(i18n.match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
    }),
  );

  bot.command(
    'setlineup',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);

      // Parse optional week number from args (last word if it matches week or week/year format)
      const parseWeekFromArgs = (
        argsStr: string,
      ): { week: number; year: number; remainingArgs: string } | null => {
        const parts = argsStr.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1];

        if (parts.length > 0 && /^\d+(\/\d+)?$/.test(lastPart)) {
          const result = parseWeekInput(lastPart, { allowPast: false, schedulingWeek });
          if (result.success) {
            return {
              week: result.week,
              year: result.year,
              remainingArgs: parts.slice(0, -1).join(' '),
            };
          }
        }
        return null;
      };

      // Check for clear command (with optional week or week/year)
      const clearMatch = args.toLowerCase().match(/^clear(?:\s+(\d+(?:\/\d+)?))?$/);
      if (clearMatch) {
        let week: number;
        let year: number;

        if (clearMatch[1]) {
          const result = parseWeekInput(clearMatch[1], { allowPast: false, schedulingWeek });
          if (!result.success) {
            return ctx.reply(i18n.lineup.invalidWeek);
          }
          week = result.week;
          year = result.year;
        } else {
          week = schedulingWeek.week;
          year = schedulingWeek.year;
        }

        await clearLineup(db, { seasonId: season.id, weekNumber: week, year });
        return ctx.reply(i18n.lineup.cleared);
      }

      // Get users from text_mention entities (tapping on names - has user ID)
      const textMentionedUsers = getTextMentionedUsers(ctx);

      // Get users from @username mentions (typed mentions - need to look up by username)
      const usernameMentions = getUsernameMentions(ctx);
      const mentionedUsers: MentionedUser[] = [...textMentionedUsers];

      // Look up @username mentions in the roster
      for (const username of usernameMentions) {
        const player = await getPlayerByUsername(db, season.id, username);
        if (!player) {
          return ctx.reply(i18n.lineup.playerNotInRoster(`@${username}`));
        }
        // Avoid duplicates if same user is mentioned both ways
        if (!mentionedUsers.some((u) => u.id === player.telegramId)) {
          mentionedUsers.push({
            id: player.telegramId,
            name: player.displayName,
            username: player.username ?? undefined,
          });
        }
      }

      if (mentionedUsers.length === 0) {
        // Check for optional week parameter (supports 5 or 5/2026 format)
        const weekArg = args.match(/^(\d+(?:\/\d+)?)$/);
        let lineupWeek = schedulingWeek;

        if (weekArg) {
          const result = parseWeekInput(weekArg[1], { allowPast: false, schedulingWeek });
          if (!result.success) {
            if (result.error === 'past') {
              return ctx.reply(i18n.lineup.weekInPast(schedulingWeek.week));
            }
            return ctx.reply(i18n.lineup.invalidWeek);
          }
          lineupWeek = { week: result.week, year: result.year };
        }

        // Check for practice week BEFORE showing the menu
        const weekInfo = await getWeek(db, season.id, lineupWeek.week, lineupWeek.year);
        if (weekInfo?.type === 'practice') {
          return ctx.reply(i18n.lineup.practiceWeek);
        }

        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;

        // Delete existing lineup menu if any
        if (chatId && userId) {
          const existing = await getActiveMenu(db, chatId, userId, 'lineup');
          if (existing) {
            try {
              await ctx.api.deleteMessage(chatId, existing.messageId);
            } catch {
              // Message already deleted or >48h old, ignore
            }
            await deleteActiveMenu(db, chatId, userId, 'lineup');
          }
        }

        // Set target week in context for menu's initial render
        ctx.lineupTargetWeek = lineupWeek;

        const message = getLineupMenuMessage(i18n, lineupWeek.week, lineupWeek.year);
        const sent = await ctx.reply(message, { reply_markup: lineupMenu });

        // Track the new menu
        if (chatId && userId) {
          await saveActiveMenu(db, {
            seasonId: season.id,
            chatId,
            userId,
            menuType: 'lineup',
            messageId: sent.message_id,
            weekNumber: lineupWeek.week,
            year: lineupWeek.year,
          });
        }

        return sent;
      }

      // Validate all text_mention users are in roster
      for (const user of textMentionedUsers) {
        const inRoster = await isPlayerInRoster(db, season.id, user.id);
        if (!inRoster) {
          return ctx.reply(i18n.lineup.playerNotInRoster(user.name));
        }
      }

      // Parse week from args or use scheduling week
      const weekParsed = parseWeekFromArgs(args);
      const week = weekParsed?.week ?? schedulingWeek.week;
      const year = weekParsed?.year ?? schedulingWeek.year;

      const result = await setLineup(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
        playerIds: mentionedUsers.map((u) => u.id),
      });

      if (!result.success) {
        if (result.reason === 'practice_week') {
          return ctx.reply(i18n.lineup.practiceWeek);
        }
      }

      if (config.publicAnnouncements === 'on') {
        const publicGroupIds = await getPublicGroupIds(db);
        if (publicGroupIds.length > 0) {
          const { start, end } = getWeekDateRange(year, week);
          const dateRange = formatDateRange(start, end);
          const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
          const announcement = buildLineupMessage(i18n, week, dateRange, lineup);
          for (const groupId of publicGroupIds) {
            try {
              await ctx.api.sendMessage(groupId, announcement);
            } catch (error) {
              console.error(`Failed to send lineup announcement to group ${groupId}:`, error);
            }
          }
        }
      }

      const playerList = mentionedUsers.map((u) => `• ${u.name}`).join('\n');
      return ctx.reply(i18n.lineup.set(mentionedUsers.length, playerList));
    }),
  );

  bot.command(
    'setopponent',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      if (args.toLowerCase() === 'clear') {
        const { week: weekNumber, year } = getSchedulingWeek(
          config.weekChangeDay,
          config.weekChangeTime,
        );
        await clearOpponent(db, { seasonId: season.id, weekNumber, year });
        return ctx.reply(i18n.opponent.cleared);
      }

      if (!args) {
        return ctx.reply(i18n.opponent.usage);
      }

      const urlMatch = args.match(/\s+(https?:\/\/\S+)$/i);
      let opponentName: string;
      let opponentUrl: string | undefined;

      if (urlMatch) {
        opponentUrl = urlMatch[1];
        opponentName = args.slice(0, urlMatch.index).trim();
      } else {
        opponentName = args;
      }

      if (!opponentName) {
        return ctx.reply(i18n.opponent.usage);
      }

      const { week: weekNumber, year } = getSchedulingWeek(
        config.weekChangeDay,
        config.weekChangeTime,
      );

      await setOpponent(db, {
        seasonId: season.id,
        weekNumber,
        year,
        opponentName,
        opponentUrl,
      });

      if (opponentUrl) {
        return ctx.reply(i18n.opponent.setWithUrl(opponentName, opponentUrl));
      }
      return ctx.reply(i18n.opponent.set(opponentName));
    }),
  );
};
