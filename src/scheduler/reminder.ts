import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { getTranslations } from '../i18n';
import { formatDateRange, formatPlayerName } from '../lib/format';
import { getSchedulingWeek, getWeekDateRange } from '../lib/week';
import { hasRespondedForWeek } from '../services/availability';
import { getConfig } from '../services/config';
import { getRoster } from '../services/roster';
import { getActiveSeason } from '../services/season';

export const sendReminder = async (bot: Bot<BotContext>, chatId: number): Promise<void> => {
  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Reminder: No active season, skipping');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config || config.remindersMode === 'off') {
    console.log('Reminder: Reminders disabled, skipping');
    return;
  }

  const i18n = await getTranslations(db, season.id);
  // Use target week based on cutoff logic
  const { week, year } = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const roster = await getRoster(db, season.id);
  if (roster.length === 0) {
    console.log('Reminder: Empty roster, skipping');
    return;
  }

  const playersWithoutResponse: Array<{ name: string; telegramId: number }> = [];

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
    await bot.api.sendMessage(
      chatId,
      `${i18n.reminder.title(week, dateRange)}\n\n${i18n.reminder.allResponded}`,
    );
    console.log('Reminder: All players have responded');
    return;
  }

  const isPingMode = config.remindersMode === 'ping';
  const names = playersWithoutResponse
    .map((p) =>
      isPingMode ? `• <a href="tg://user?id=${p.telegramId}">${p.name}</a>` : `• ${p.name}`,
    )
    .join('\n');

  const message = `${i18n.reminder.title(week, dateRange)}\n\n${i18n.reminder.missingResponses(names)}`;

  await bot.api.sendMessage(chatId, message, {
    parse_mode: 'HTML',
  });

  console.log(
    `Reminder sent to chat ${chatId} (${playersWithoutResponse.length} missing responses)`,
  );
};
