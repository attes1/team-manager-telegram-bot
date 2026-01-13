import type { Bot, Context } from 'grammy';
import { db } from '../../db';
import { getTranslations, t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { formatDateRange } from '../../lib/format';
import { daySchema, timeSchema } from '../../lib/schemas';
import { getWeekDateRange, getWeekNumber, getWeekYear } from '../../lib/week';
import { getLineupMenuMessage, lineupMenu } from '../../menus/lineup';
import { clearLineup, setLineup, setMatchTime } from '../../services/match';
import { isPlayerInRoster } from '../../services/roster';
import { getActiveSeason } from '../../services/season';

interface MentionedUser {
  id: number;
  name: string;
  username?: string;
}

const getAllMentionedUsers = (ctx: Context): MentionedUser[] => {
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

export const registerMatchCommands = (bot: Bot) => {
  bot.use(lineupMenu);

  bot.command('setmatch', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const i18n = await getTranslations(db, season.id);
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
    const dayName = i18n.poll.days[dayResult.data];

    return ctx.reply(i18n.match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
  });

  bot.command('setlineup', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const i18n = await getTranslations(db, season.id);
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

    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = getWeekYear(now);

    await setLineup(db, {
      seasonId: season.id,
      weekNumber,
      year,
      playerIds: mentionedUsers.map((u) => u.id),
    });

    const playerList = mentionedUsers.map((u) => `• ${u.name}`).join('\n');
    return ctx.reply(i18n.lineup.set(mentionedUsers.length, playerList));
  });
};
