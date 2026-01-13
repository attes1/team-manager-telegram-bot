import type { Bot } from 'grammy';
import { registerConfigCommand } from './admin/config';
import { registerPlayerCommands } from './admin/players';
import { registerSeasonCommands } from './admin/season';
import { registerRosterCommand } from './player/roster';

export const registerCommands = (bot: Bot) => {
  registerPlayerCommands(bot);
  registerSeasonCommands(bot);
  registerConfigCommand(bot);
  registerRosterCommand(bot);
};
