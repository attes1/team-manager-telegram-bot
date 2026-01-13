import type { Bot } from 'grammy';
import { formatDateRange, formatDay } from '../../../lib/format';
import { daySchema, timeSchema } from '../../../lib/schemas';
import { getCurrentWeek, getWeekDateRange, getWeekNumber, getWeekYear } from '../../../lib/week';
import { getLineupMenuMessage, lineupMenu } from '../../../menus/lineup';
import {
  buildLineupAnnouncement,
  buildMatchScheduledAnnouncement,
} from '../../../services/announcements';
import { clearLineup, getLineup, setLineup, setMatchTime } from '../../../services/match';
import { isPlayerInRoster } from '../../../services/roster';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

interface MentionedUser {
  id: number;
  name: string;
  username?: string;
}

const getAllMentionedUsers = (ctx: AdminSeasonContext): MentionedUser[] => {
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
  bot.use(lineupMenu);

  bot.command(
    'setmatch',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
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

      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = getWeekYear(now);

      await setMatchTime(db, {
        seasonId: season.id,
        weekNumber,
        year,
        matchDay: dayResult.data,
        matchTime: timeResult.data,
      });

      const { start, end } = getWeekDateRange(year, weekNumber);
      const dateRange = formatDateRange(start, end);
      const lang = config.language as 'fi' | 'en';
      const dayName = i18n.poll.days[dayResult.data];
      const dayFormatted = formatDay(dayResult.data, lang);

      if (config.announcementsChatId) {
        const announcement = buildMatchScheduledAnnouncement(i18n, dayFormatted, timeResult.data);
        await ctx.api.sendMessage(config.announcementsChatId, announcement);
      }

      return ctx.reply(i18n.match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
    }),
  );

  bot.command(
    'setlineup',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      if (args.toLowerCase() === 'clear') {
        const now = new Date();
        const weekNumber = getWeekNumber(now);
        const year = getWeekYear(now);
        await clearLineup(db, { seasonId: season.id, weekNumber, year });
        return ctx.reply(i18n.lineup.cleared);
      }

      const mentionedUsers = getAllMentionedUsers(ctx);

      if (mentionedUsers.length === 0) {
        const message = await getLineupMenuMessage(season.id);
        return ctx.reply(message, { reply_markup: lineupMenu });
      }

      for (const user of mentionedUsers) {
        const inRoster = await isPlayerInRoster(db, season.id, user.id);
        if (!inRoster) {
          return ctx.reply(i18n.lineup.playerNotInRoster(user.name));
        }
      }

      const { week, year } = getCurrentWeek();

      await setLineup(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
        playerIds: mentionedUsers.map((u) => u.id),
      });

      if (config.announcementsChatId) {
        const { start, end } = getWeekDateRange(year, week);
        const dateRange = formatDateRange(start, end);
        const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
        const announcement = buildLineupAnnouncement(i18n, week, dateRange, lineup);
        await ctx.api.sendMessage(config.announcementsChatId, announcement);
      }

      const playerList = mentionedUsers.map((u) => `• ${u.name}`).join('\n');
      return ctx.reply(i18n.lineup.set(mentionedUsers.length, playerList));
    }),
  );
};
