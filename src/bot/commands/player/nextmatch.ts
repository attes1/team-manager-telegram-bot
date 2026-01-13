import type { Bot } from 'grammy';
import { buildMatchAnnouncement, getMatchAnnouncementData } from '@/services/announcements';
import type { BotContext, SeasonContext } from '../../context';
import { seasonCommand } from '../../middleware';

export const registerNextMatchCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'nextmatch',
    seasonCommand(async (ctx: SeasonContext) => {
      const { db, config, i18n, season } = ctx;

      const data = await getMatchAnnouncementData({ db, config, i18n, season });
      if (!data) {
        return ctx.reply(i18n.announcements.noMatchWeek);
      }

      const message = buildMatchAnnouncement(i18n, data);
      return ctx.reply(message);
    }),
  );
};
