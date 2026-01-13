import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { getPollMessage, pollMenu } from '../menus/poll';
import { getActiveSeason } from '../services/season';

export const sendWeeklyPoll = async (bot: Bot<BotContext>, chatId: number): Promise<void> => {
  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Weekly poll: No active season, skipping');
    return;
  }

  const message = await getPollMessage(season.id);

  await bot.api.sendMessage(chatId, message, {
    reply_markup: pollMenu,
    parse_mode: 'HTML',
  });

  console.log(`Weekly poll sent to chat ${chatId}`);
};
