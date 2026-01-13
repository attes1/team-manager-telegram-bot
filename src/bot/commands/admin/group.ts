import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';
import { adminCommand } from '@/bot/middleware';
import { groupTypeSchema } from '@/lib/schemas';
import { refreshScheduler } from '@/scheduler';
import { getGroup, registerGroup, setGroupType } from '@/services/group';

export const registerGroupCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'setgrouptype',
    adminCommand(async (ctx) => {
      const { db, i18n } = ctx;
      const chatId = ctx.chat?.id;
      const chatType = ctx.chat?.type;
      const chatTitle = ctx.chat && 'title' in ctx.chat ? ctx.chat.title : undefined;
      const args = ctx.match?.toString().trim().toLowerCase() ?? '';

      // Must be used in a group
      if (!chatId || (chatType !== 'group' && chatType !== 'supergroup')) {
        return ctx.reply(i18n.group.notInGroup);
      }

      // Validate type argument
      const result = groupTypeSchema.safeParse(args);
      if (!result.success) {
        return ctx.reply(i18n.group.usage);
      }

      // Auto-register group if not already registered
      const group = await getGroup(db, chatId);
      if (!group) {
        await registerGroup(db, chatId, chatTitle);
      }

      const newType = result.data;
      await setGroupType(db, chatId, newType);
      await refreshScheduler();

      if (newType === 'team') {
        return ctx.reply(i18n.group.setTeam);
      }
      return ctx.reply(i18n.group.setPublic);
    }),
  );
};
