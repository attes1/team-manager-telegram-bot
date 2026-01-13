import type { Bot } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { formatDateRange } from '../../lib/format';
import { daySchema, timeSchema } from '../../lib/schemas';
import { getWeekDateRange, getWeekNumber, getWeekYear } from '../../lib/week';
import { setMatchTime } from '../../services/match';
import { getActiveSeason } from '../../services/season';

export const registerMatchCommands = (bot: Bot) => {
  bot.command('setmatch', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const args = ctx.match?.toString().trim() ?? '';
    const [dayStr, timeStr] = args.split(/\s+/);

    if (!dayStr || !timeStr) {
      return ctx.reply(t().match.usage);
    }

    const dayResult = daySchema.safeParse(dayStr.toLowerCase());
    if (!dayResult.success) {
      return ctx.reply(t().match.invalidDay);
    }

    const timeResult = timeSchema.safeParse(timeStr);
    if (!timeResult.success) {
      return ctx.reply(t().match.invalidTime);
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
    const dayName = t().poll.days[dayResult.data];

    return ctx.reply(t().match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
  });
};
