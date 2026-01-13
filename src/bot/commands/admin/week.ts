import type { Bot } from 'grammy';
import { formatDateRange } from '../../../lib/format';
import type { WeekType } from '../../../lib/schemas';
import { getWeekDateRange, getWeekYear } from '../../../lib/week';
import { setWeekType } from '../../../services/week';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

const isValidWeekType = (type: string): type is WeekType => type === 'practice' || type === 'match';

export const registerWeekCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'setweek',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const [weekStr, typeStr] = args.split(/\s+/);

      if (!weekStr || !typeStr) {
        return ctx.reply(i18n.week.usage);
      }

      const weekNumber = Number.parseInt(weekStr, 10);
      if (Number.isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        return ctx.reply(i18n.week.invalidWeek);
      }

      const type = typeStr.toLowerCase();
      if (!isValidWeekType(type)) {
        return ctx.reply(i18n.week.invalidType);
      }

      const year = getWeekYear(new Date());
      await setWeekType(db, season.id, weekNumber, year, type);

      const { start, end } = getWeekDateRange(year, weekNumber);
      const dateRange = formatDateRange(start, end);

      if (type === 'practice') {
        return ctx.reply(i18n.week.setPractice(weekNumber, dateRange));
      }
      return ctx.reply(i18n.week.setMatch(weekNumber, dateRange));
    }),
  );
};
