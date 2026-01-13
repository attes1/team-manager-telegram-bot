import { Bot } from 'grammy';
import { env } from './env';

export const createBot = () => {
  const bot = new Bot(env.BOT_TOKEN);

  bot.command('start', (ctx) => ctx.reply('Pappaliiga Bot käynnistetty!'));

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};
