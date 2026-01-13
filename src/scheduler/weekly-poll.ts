import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { getSchedulingWeek } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { getConfig } from '@/services/config';
import { getActiveSeason } from '@/services/season';

export const sendWeeklyPoll = async (bot: Bot<BotContext>, chatId: number): Promise<void> => {
  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Weekly poll: No active season, skipping');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config) {
    console.log('Weekly poll: No config found, skipping');
    return;
  }

  const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const message = await getPollMessage(season.id, schedulingWeek);

  await bot.api.sendMessage(chatId, message, {
    reply_markup: pollMenu,
    parse_mode: 'HTML',
  });

  console.log(
    `Weekly poll sent to chat ${chatId} for week ${schedulingWeek.week}/${schedulingWeek.year}`,
  );
};
