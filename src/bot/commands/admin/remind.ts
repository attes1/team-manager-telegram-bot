import type { Bot } from 'grammy';
import { formatDateRange, formatPlayerName } from '../../../lib/format';
import { getCurrentWeek, getWeekDateRange } from '../../../lib/week';
import { hasRespondedForWeek } from '../../../services/availability';
import { getRoster } from '../../../services/roster';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

export const registerRemindCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'remind',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const { week, year } = getCurrentWeek();
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
        .map((p) =>
          isPingMode ? `• <a href="tg://user?id=${p.telegramId}">${p.name}</a>` : `• ${p.name}`,
        )
        .join('\n');

      const message = `${i18n.reminder.title(week, dateRange)}\n\n${i18n.reminder.missingResponses(names)}`;

      return ctx.reply(message, { parse_mode: 'HTML' });
    }),
  );
};
