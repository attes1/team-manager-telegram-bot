import type { Bot } from 'grammy';
import type { BotContext } from '@/bot/context';
import { registerCaptainCommands } from './admin/captain';
import { registerConfigCommand } from './admin/config';
import { registerPlayerCommands } from './admin/players';
import { registerSeasonCommands } from './admin/season';
import { registerHelpCommand } from './public/help';
import { registerNextMatchCommand } from './public/nextmatch';
import { registerRosterCommand } from './public/roster';
import { registerAvailCommand } from './user/avail';
import { registerMatchCommands } from './user/match';
import { registerPollCommand } from './user/poll';
import { registerRemindCommand } from './user/remind';
import { registerStatusCommand } from './user/status';
import { registerWeekCommand } from './user/week';

export const registerCommands = (bot: Bot<BotContext>) => {
  // Public commands (no auth required, just season)
  registerHelpCommand(bot);
  registerRosterCommand(bot);
  registerNextMatchCommand(bot);

  // User commands (roster/captain required)
  registerAvailCommand(bot);
  registerPollCommand(bot);
  registerStatusCommand(bot);
  registerWeekCommand(bot);
  registerMatchCommands(bot);
  registerRemindCommand(bot);

  // Admin commands
  registerSeasonCommands(bot);
  registerConfigCommand(bot);
  registerPlayerCommands(bot);
  registerCaptainCommands(bot);
};
