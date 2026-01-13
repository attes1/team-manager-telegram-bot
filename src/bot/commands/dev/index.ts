import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';
import { env } from '@/env';
import { registerDevSchedulerCommands } from './scheduler';

export const registerDevCommands = (bot: Bot<BotContext>) => {
  if (!env.DEV_MODE) {
    return;
  }

  console.log('Dev mode enabled: registering dev commands');
  registerDevSchedulerCommands(bot);
};
