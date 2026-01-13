import { Bot } from 'grammy';
import { registerCommands } from './commands';
import { env } from './env';
import { t } from './i18n';

export const createBot = () => {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command('start', (ctx) => ctx.reply(t().bot.started));

  registerCommands(bot);

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};
