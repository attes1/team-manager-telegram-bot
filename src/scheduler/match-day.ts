import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { getTranslations } from '@/i18n';
import { formatPlayerName } from '@/lib/format';
import { getCurrentWeek } from '@/lib/week';
import { getConfig } from '@/services/config';
import { getLineup, getMatchInfo } from '@/services/match';
import { getActiveSeason } from '@/services/season';
import { getWeek } from '@/services/week';

export const sendMatchDayReminder = async (bot: Bot<BotContext>, chatId: number): Promise<void> => {
  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Match day reminder: No active season, skipping');
    return;
  }

  const { week, year } = getCurrentWeek();

  const weekData = await getWeek(db, season.id, week, year);
  if (weekData?.type === 'practice') {
    console.log('Match day reminder: Practice week, skipping');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config) {
    console.log('Match day reminder: No config, skipping');
    return;
  }

  const i18n = await getTranslations(db, season.id);

  const matchInfo = await getMatchInfo(db, { seasonId: season.id, weekNumber: week, year });
  const matchDay = matchInfo?.matchDay ?? config.matchDay;
  const matchTime = matchInfo?.matchTime ?? config.matchTime;

  const dayName = i18n.poll.days[matchDay as keyof typeof i18n.poll.days] ?? matchDay;

  const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

  let message = i18n.reminder.matchDayTitle(dayName, matchTime);

  if (lineup.length > 0) {
    const isPingMode = config.matchDayReminderMode === 'ping';
    const players = lineup
      .map((p) =>
        isPingMode
          ? `• <a href="tg://user?id=${p.telegramId}">${formatPlayerName(p)}</a>`
          : `• ${formatPlayerName(p)}`,
      )
      .join('\n');
    message += `\n\n${i18n.reminder.matchDayLineup(players)}`;
  } else {
    message += `\n\n⚠️ ${i18n.reminder.matchDayNoLineup}`;
  }

  await bot.api.sendMessage(chatId, message, {
    parse_mode: 'HTML',
  });

  console.log(`Match day reminder sent to chat ${chatId}`);
};
