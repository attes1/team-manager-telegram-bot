import type { Bot } from 'grammy';
import { db } from '@/db';
import { registerGroup, unregisterGroup } from '@/services/group';
import type { BotContext } from '../context';

export const registerChatMemberHandlers = (bot: Bot<BotContext>) => {
  bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const oldStatus = ctx.myChatMember.old_chat_member?.status;

    // Only handle group/supergroup chats
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      return;
    }

    const telegramId = chat.id;
    const title = chat.title;

    // Bot was added or promoted to member/admin
    if (newStatus === 'member' || newStatus === 'administrator') {
      if (oldStatus === 'left' || oldStatus === 'kicked' || !oldStatus) {
        await registerGroup(db, telegramId, title);
        console.log(`Bot added to group: ${title} (${telegramId})`);
      }
    }

    // Bot was removed or kicked
    if (newStatus === 'left' || newStatus === 'kicked') {
      await unregisterGroup(db, telegramId);
      console.log(`Bot removed from group: ${title} (${telegramId})`);
    }
  });
};
