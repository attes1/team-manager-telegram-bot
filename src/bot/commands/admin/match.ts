import type { Bot } from 'grammy';
import { env } from '../../../env';
import { formatDateRange, formatDay } from '../../../lib/format';
import { daySchema, timeSchema } from '../../../lib/schemas';
import { getSchedulingWeek, getWeekDateRange } from '../../../lib/week';
import { getLineupMenuMessage, lineupMenu } from '../../../menus/lineup';
import {
  buildLineupMessage,
  buildMatchScheduledMessage,
  clearLineup,
  clearOpponent,
  getLineup,
  setLineup,
  setMatchTime,
  setOpponent,
} from '../../../services/match';
import { isPlayerInRoster } from '../../../services/roster';
import type { BotContext, CaptainSeasonContext } from '../../context';
import { captainSeasonCommand } from '../../middleware';

interface MentionedUser {
  id: number;
  name: string;
  username?: string;
}

const getAllMentionedUsers = (ctx: CaptainSeasonContext): MentionedUser[] => {
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

      if (env.PUBLIC_GROUP_ID && config.publicAnnouncements === 'on') {
        const announcement = buildMatchScheduledMessage(i18n, dayFormatted, timeResult.data);
        await ctx.api.sendMessage(env.PUBLIC_GROUP_ID, announcement);
      }

      return ctx.reply(i18n.match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
    }),
  );

  bot.command(
    'setlineup',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      if (args.toLowerCase() === 'clear') {
        const { week: weekNumber, year } = getSchedulingWeek(
          config.weekChangeDay,
          config.weekChangeTime,
        );
        await clearLineup(db, { seasonId: season.id, weekNumber, year });
        return ctx.reply(i18n.lineup.cleared);
      }

      const mentionedUsers = getAllMentionedUsers(ctx);

      if (mentionedUsers.length === 0) {
        const message = getLineupMenuMessage(i18n, config);
        return ctx.reply(message, { reply_markup: lineupMenu });
      }

      for (const user of mentionedUsers) {
        const inRoster = await isPlayerInRoster(db, season.id, user.id);
        if (!inRoster) {
          return ctx.reply(i18n.lineup.playerNotInRoster(user.name));
        }
      }

      const { week, year } = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);

      await setLineup(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
        playerIds: mentionedUsers.map((u) => u.id),
      });

      if (env.PUBLIC_GROUP_ID && config.publicAnnouncements === 'on') {
        const { start, end } = getWeekDateRange(year, week);
        const dateRange = formatDateRange(start, end);
        const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
        const announcement = buildLineupMessage(i18n, week, dateRange, lineup);
        await ctx.api.sendMessage(env.PUBLIC_GROUP_ID, announcement);
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
