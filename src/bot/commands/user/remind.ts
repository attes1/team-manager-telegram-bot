import type { Bot } from 'grammy';
import type { BotContext, CaptainSeasonContext } from '@/bot/context';
import { captainSeasonCommand } from '@/bot/middleware';
import { formatDateRange, formatPlayerName, formatUserMention } from '@/lib/format';
import { getWeekDateRange } from '@/lib/temporal';
import { hasRespondedForWeek } from '@/services/availability';
import { getRoster } from '@/services/roster';

export const registerRemindCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'remind',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, schedulingWeek, i18n } = ctx;
      const { week, year } = schedulingWeek;
      const { start, end } = getWeekDateRange(year, week);
      const dateRange = formatDateRange(start, end);

      const roster = await getRoster(db, season.id);
      if (roster.length === 0) {
        return ctx.reply('Roster is empty.');
      }

      const playersWithoutResponse: Array<{
        name: string;
        telegramId: number;
      }> = [];

      for (const player of roster) {
        const hasResponded = await hasRespondedForWeek(db, {
          seasonId: season.id,
          playerId: player.telegramId,
          weekNumber: week,
          year,
        });

        if (!hasResponded) {
          playersWithoutResponse.push({
            name: formatPlayerName(player),
            telegramId: player.telegramId,
          });
        }
      }

      if (playersWithoutResponse.length === 0) {
        return ctx.reply(
          `${i18n.reminder.title(week, dateRange)}\n\n${i18n.reminder.allResponded}`,
        );
      }

      const isPingMode = config.remindersMode === 'ping';
      const names = playersWithoutResponse
        .map((p) => (isPingMode ? `• ${formatUserMention(p.telegramId, p.name)}` : `• ${p.name}`))
        .join('\n');

      const message = `${i18n.reminder.title(week, dateRange)}\n\n${i18n.reminder.missingResponses(names)}`;

      return ctx.reply(message, { parse_mode: 'HTML' });
    }),
  );
};
