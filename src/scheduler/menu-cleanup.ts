import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { deleteExpiredMenus, getExpiredMenus } from '../services/menu';

export const cleanupExpiredMenus = async (
  bot: Bot<BotContext>,
  seasonId: number,
  expirationHours: number,
): Promise<void> => {
  const expired = await getExpiredMenus(db, seasonId, expirationHours);

  if (expired.length === 0) {
    console.log('Menu cleanup: No expired menus found');
    return;
  }

  for (const menu of expired) {
    try {
      await bot.api.deleteMessage(menu.chatId, menu.messageId);
    } catch {
      // Message already deleted or >48h old, ignore
    }
  }

  const deleted = await deleteExpiredMenus(db, seasonId, expirationHours);
  console.log(`Menu cleanup: Deleted ${deleted} expired menu(s)`);
};
