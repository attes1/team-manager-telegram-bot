import type { Bot } from 'grammy';
import { getPollMessage, pollMenu } from '../../../menus/poll';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.command(
    'poll',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { season } = ctx;
      const message = await getPollMessage(season.id);
      return ctx.reply(message, { reply_markup: pollMenu });
    }),
  );
};
