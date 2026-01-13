import type { Bot } from 'grammy';
import { buildMatchAnnouncement, getMatchAnnouncementData } from '@/services/announcements';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

export const registerNextMatchCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'nextmatch',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, config, i18n, season } = ctx;

      const chatId = config.announcementsChatId;
      if (!chatId) {
        return ctx.reply(i18n.announcements.noChannel);
      }

      const data = await getMatchAnnouncementData({ db, config, i18n, season });
      if (!data) {
        return ctx.reply(i18n.announcements.noMatchWeek);
      }

      const message = buildMatchAnnouncement(i18n, data);
      await ctx.api.sendMessage(chatId, message);

      return ctx.reply(i18n.announcements.sent);
    }),
  );
};
