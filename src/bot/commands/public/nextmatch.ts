import type { Bot } from 'grammy';
import type { BotContext, SeasonContext } from '@/bot/context';
import { seasonCommand } from '@/bot/middleware';
import { buildNextMatchMessage, getNextMatchResult } from '@/services/match';

export const registerNextMatchCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'nextmatch',
    seasonCommand(async (ctx: SeasonContext) => {
      const { db, config, i18n, season } = ctx;

      const result = await getNextMatchResult({ db, config, i18n, season });
      const message = buildNextMatchMessage(i18n, result);
      return ctx.reply(message);
    }),
  );
};
