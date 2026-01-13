import type { Bot } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { formatDateRange } from '../../lib/format';
import type { WeekType } from '../../lib/schemas';
import { getWeekDateRange, getWeekYear } from '../../lib/week';
import { getActiveSeason } from '../../services/season';
import { setWeekType } from '../../services/week';

const isValidWeekType = (type: string): type is WeekType => type === 'practice' || type === 'match';

export const registerWeekCommand = (bot: Bot) => {
  bot.command('setweek', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const args = ctx.match?.toString().trim() ?? '';
    const [weekStr, typeStr] = args.split(/\s+/);

    if (!weekStr || !typeStr) {
      return ctx.reply(t().week.usage);
    }

    const weekNumber = Number.parseInt(weekStr, 10);
    if (Number.isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
      return ctx.reply(t().week.invalidWeek);
    }

    const type = typeStr.toLowerCase();
    if (!isValidWeekType(type)) {
      return ctx.reply(t().week.invalidType);
    }

    const year = getWeekYear(new Date());
    await setWeekType(db, season.id, weekNumber, year, type);

    const { start, end } = getWeekDateRange(year, weekNumber);
    const dateRange = formatDateRange(start, end);

    if (type === 'practice') {
      return ctx.reply(t().week.setPractice(weekNumber, dateRange));
    }
    return ctx.reply(t().week.setMatch(weekNumber, dateRange));
  });
};
