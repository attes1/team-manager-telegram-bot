import type { Bot } from 'grammy';
import type { BotContext, CaptainSeasonContext } from '@/bot/context';
import { captainSeasonCommand } from '@/bot/middleware';
import { parseWeekInput } from '@/lib/temporal';
import { clearOpponent, setOpponent } from '@/services/match';

export const registerSetopponentCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'setopponent',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, schedulingWeek, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      // Check for clear command (with optional week or week/year)
      const clearMatch = args.toLowerCase().match(/^clear(?:\s+(\d+(?:\/\d+)?))?$/);
      if (clearMatch) {
        let week: number;
        let year: number;

        if (clearMatch[1]) {
          const result = parseWeekInput(clearMatch[1], { allowPast: false, schedulingWeek });
          if (!result.success) {
            return ctx.reply(i18n.opponent.invalidWeek);
          }
          week = result.week;
          year = result.year;
        } else {
          week = schedulingWeek.week;
          year = schedulingWeek.year;
        }

        await clearOpponent(db, { seasonId: season.id, weekNumber: week, year });
        return ctx.reply(i18n.opponent.cleared);
      }

      if (!args) {
        return ctx.reply(i18n.opponent.usage);
      }

      // Check for week/year at the end of args (e.g., "5" or "5/2026")
      const weekMatch = args.match(/\s+(\d+(?:\/\d+)?)$/);
      let argsWithoutWeek = args;
      let weekNumber = schedulingWeek.week;
      let year = schedulingWeek.year;

      if (weekMatch) {
        const result = parseWeekInput(weekMatch[1], { allowPast: false, schedulingWeek });
        if (result.success) {
          weekNumber = result.week;
          year = result.year;
          argsWithoutWeek = args.slice(0, weekMatch.index).trim();
        }
        // If parsing fails, treat it as part of the name (e.g., "Team 123")
      }

      const urlMatch = argsWithoutWeek.match(/\s+(https?:\/\/\S+)$/i);
      let opponentName: string;
      let opponentUrl: string | undefined;

      if (urlMatch) {
        opponentUrl = urlMatch[1];
        opponentName = argsWithoutWeek.slice(0, urlMatch.index).trim();
      } else {
        opponentName = argsWithoutWeek;
      }

      if (!opponentName) {
        return ctx.reply(i18n.opponent.usage);
      }

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
