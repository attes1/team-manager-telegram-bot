import type { CommandMiddleware } from 'grammy';
import type { AdminContext, AdminSeasonContext, BotContext, SeasonContext } from '../context';
import { isAdminContext, isAdminSeasonContext, isSeasonContext } from './guards';

type CommandHandler<T extends BotContext> = (ctx: T) => Promise<unknown> | unknown;

export const adminCommand = (
  handler: CommandHandler<AdminContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (!isAdminContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.notAdmin);
      return;
    }
    return handler(ctx);
  };
};

export const seasonCommand = (
  handler: CommandHandler<SeasonContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (!isSeasonContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.noActiveSeason);
      return;
    }
    return handler(ctx);
  };
};

export const adminSeasonCommand = (
  handler: CommandHandler<AdminSeasonContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (!isAdminContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.notAdmin);
      return;
    }
    if (!isAdminSeasonContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.noActiveSeason);
      return;
    }
    return handler(ctx);
  };
};
