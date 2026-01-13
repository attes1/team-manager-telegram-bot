import type { Bot } from 'grammy';
import { formatDateRange } from '../../../lib/format';
import { weekTypeSchema } from '../../../lib/schemas';
import { getTargetWeek, getWeekDateRange, parseWeekInput } from '../../../lib/week';
import { setWeekType } from '../../../services/week';
import type { BotContext, CaptainSeasonContext } from '../../context';
import { captainSeasonCommand } from '../../middleware';

export const registerWeekCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'setweek',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const parts = args.split(/\s+/).filter(Boolean);

      const targetWeek = getTargetWeek(config.pollCutoffDay, config.pollCutoffTime);

      let weekNumber: number;
      let year: number;

      // Parse week type from last argument
      const typeArg = parts.length > 0 ? parts[parts.length - 1].toLowerCase() : '';
      const parsedType = weekTypeSchema.safeParse(typeArg);

      if (!parsedType.success) {
        if (parts.length === 0) {
          return ctx.reply(i18n.week.usage);
        }
        return ctx.reply(i18n.week.invalidType);
      }

      const type = parsedType.data;

      if (parts.length === 1) {
        // Single argument is type - use target week with cutoff logic
        weekNumber = targetWeek.week;
        year = targetWeek.year;
      } else if (parts.length === 2) {
        // Two arguments: week number + type
        const weekResult = parseWeekInput(parts[0], targetWeek);

        if (!weekResult.success) {
          return ctx.reply(i18n.week.invalidWeek);
        }

        weekNumber = weekResult.week;
        year = weekResult.year;
      } else {
        return ctx.reply(i18n.week.usage);
      }

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
