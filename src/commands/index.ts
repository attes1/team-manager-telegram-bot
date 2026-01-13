import type { Bot } from 'grammy';
import { registerConfigCommand } from './admin/config';
import { registerPlayerCommands } from './admin/players';
import { registerPollCommand } from './admin/poll';
import { registerSeasonCommands } from './admin/season';
import { registerWeekCommand } from './admin/week';
import { registerRosterCommand } from './player/roster';

export const registerCommands = (bot: Bot) => {
  registerPollCommand(bot);
  registerPlayerCommands(bot);
  registerSeasonCommands(bot);
  registerConfigCommand(bot);
  registerWeekCommand(bot);
  registerRosterCommand(bot);
};
