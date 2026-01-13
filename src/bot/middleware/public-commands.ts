import type { NextFunction } from 'grammy';
import type { BotContext } from '@/bot/context';

/**
 * Middleware to restrict commands in public groups to admins only when configured.
 * This should be applied before command handlers.
 */
export const publicCommandsRestriction = async (ctx: BotContext, next: NextFunction) => {
  // Only check for commands (messages starting with /)
  const isCommand = ctx.message?.text?.startsWith('/');
  if (!isCommand) {
    return next();
  }

  // Skip restriction if:
  // - Not in a public group
  // - No config (no active season)
  // - Mode is 'all' (everyone can use commands)
  // - User is admin
  if (
    !ctx.isInPublicGroup ||
    !ctx.config ||
    ctx.config.publicCommandsMode === 'all' ||
    ctx.isAdmin
  ) {
    return next();
  }

  // Silently ignore command (anti-spam: don't respond at all)
};
