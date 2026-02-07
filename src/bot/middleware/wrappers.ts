import type { CommandMiddleware } from 'grammy';
import type {
  AdminContext,
  AdminSeasonContext,
  BotContext,
  CaptainContext,
  CaptainSeasonContext,
  RosterContext,
  SeasonContext,
} from '../context';
import {
  isAdminContext,
  isAdminSeasonContext,
  isCaptainContext,
  isCaptainSeasonContext,
  isRosterContext,
  isSeasonContext,
} from './guards';

type CommandHandler<T extends BotContext> = (ctx: T) => Promise<unknown> | unknown;

const isRestrictedInPublicGroup = (ctx: BotContext): boolean => ctx.isInPublicGroup && !ctx.isAdmin;

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

export const rosterCommand = (
  handler: CommandHandler<RosterContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (isRestrictedInPublicGroup(ctx)) {
      await ctx.reply(ctx.i18n.errors.notAvailableInPublicGroup);
      return;
    }
    if (!isSeasonContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.noActiveSeason);
      return;
    }
    if (!isRosterContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.notInRoster);
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

export const captainCommand = (
  handler: CommandHandler<CaptainContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (isRestrictedInPublicGroup(ctx)) {
      await ctx.reply(ctx.i18n.errors.notAvailableInPublicGroup);
      return;
    }
    if (!isCaptainContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.notCaptain);
      return;
    }
    return handler(ctx);
  };
};

export const captainSeasonCommand = (
  handler: CommandHandler<CaptainSeasonContext>,
): CommandMiddleware<BotContext> => {
  return async (ctx) => {
    if (isRestrictedInPublicGroup(ctx)) {
      await ctx.reply(ctx.i18n.errors.notAvailableInPublicGroup);
      return;
    }
    if (!isCaptainContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.notCaptain);
      return;
    }
    if (!isCaptainSeasonContext(ctx)) {
      await ctx.reply(ctx.i18n.errors.noActiveSeason);
      return;
    }
    return handler(ctx);
  };
};
