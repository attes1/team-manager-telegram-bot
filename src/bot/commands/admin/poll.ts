import type { Bot } from 'grammy';
import { getPollMessage, pollMenu } from '../../../menus/poll';
import type { BotContext, RosterContext } from '../../context';
import { rosterCommand } from '../../middleware';

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { season } = ctx;
      const message = await getPollMessage(season.id);
      return ctx.reply(message, { reply_markup: pollMenu });
    }),
  );
};
