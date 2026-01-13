import type { Bot } from 'grammy';
import { registerConfigCommand } from './admin/config';
import { registerMatchCommands } from './admin/match';
import { registerPlayerCommands } from './admin/players';
import { registerPollCommand } from './admin/poll';
import { registerSeasonCommands } from './admin/season';
import { registerWeekCommand } from './admin/week';
import { registerPracticeCommand } from './player/practice';
import { registerRosterCommand } from './player/roster';

export const registerCommands = (bot: Bot) => {
  registerPollCommand(bot);
  registerPlayerCommands(bot);
  registerSeasonCommands(bot);
  registerConfigCommand(bot);
  registerWeekCommand(bot);
  registerMatchCommands(bot);
  registerRosterCommand(bot);
  registerPracticeCommand(bot);
};
