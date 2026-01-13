import type { Bot } from 'grammy';
import { registerPlayerCommands } from './admin/players';
import { registerRosterCommand } from './player/roster';

export const registerCommands = (bot: Bot) => {
  registerPlayerCommands(bot);
  registerRosterCommand(bot);
};
