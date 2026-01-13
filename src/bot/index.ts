import { Bot } from 'grammy';
import { db } from '../db';
import { env } from '../env';
import { languageSchema } from '../lib/schemas';
import { lineupMenu } from '../menus/lineup';
import { pollMenu } from '../menus/poll';
import { getConfig } from '../services/config';
import { getActiveSeason } from '../services/season';
import { registerCommands } from './commands';
import { commandDefinitions } from './commands/definitions';
import type { BotContext } from './context';
import { registerChatMemberHandlers } from './handlers/chat-member';
import { registerReactionHandlers } from './handlers/reactions';
import { contextMiddleware } from './middleware';

export const createBot = () => {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(contextMiddleware);
  bot.use(pollMenu);
  bot.use(lineupMenu);

  bot.command('start', (ctx) => ctx.reply(ctx.i18n.bot.started));

  registerCommands(bot);
  registerReactionHandlers(bot);
  registerChatMemberHandlers(bot);

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};

export const setCommands = async (bot: Bot<BotContext>) => {
  const season = await getActiveSeason(db);
  let lang: 'en' | 'fi' = 'en';

  if (season) {
    const config = await getConfig(db, season.id);
    lang = languageSchema.catch('en').parse(config?.language);
  }

  await bot.api.setMyCommands(commandDefinitions[lang]);
};

export type { BotContext } from './context';
