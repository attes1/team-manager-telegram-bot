import type { NextFunction } from 'grammy';
import type {
  AdminContext,
  AdminSeasonContext,
  BotContext,
  CaptainContext,
  CaptainSeasonContext,
  RosterContext,
  SeasonContext,
} from '../context';

export const requireAdmin = async (ctx: BotContext, next: NextFunction): Promise<void> => {
  if (!ctx.isAdmin) {
    await ctx.reply(ctx.i18n.errors.notAdmin);
    return;
  }
  return next();
};

export const requireSeason = async (ctx: BotContext, next: NextFunction): Promise<void> => {
  if (!ctx.season || !ctx.config) {
    await ctx.reply(ctx.i18n.errors.noActiveSeason);
    return;
  }
  return next();
};

export const requireAdminAndSeason = async (ctx: BotContext, next: NextFunction): Promise<void> => {
  if (!ctx.isAdmin) {
    await ctx.reply(ctx.i18n.errors.notAdmin);
    return;
  }
  if (!ctx.season || !ctx.config) {
    await ctx.reply(ctx.i18n.errors.noActiveSeason);
    return;
  }
  return next();
};

export const requireCaptain = async (ctx: BotContext, next: NextFunction): Promise<void> => {
  if (!ctx.isCaptain) {
    await ctx.reply(ctx.i18n.errors.notCaptain);
    return;
  }
  return next();
};

export const requireCaptainAndSeason = async (
  ctx: BotContext,
  next: NextFunction,
): Promise<void> => {
  if (!ctx.isCaptain) {
    await ctx.reply(ctx.i18n.errors.notCaptain);
    return;
  }
  if (!ctx.season || !ctx.config) {
    await ctx.reply(ctx.i18n.errors.noActiveSeason);
    return;
  }
  return next();
};

export const isAdminContext = (ctx: BotContext): ctx is AdminContext => ctx.isAdmin;

export const isSeasonContext = (ctx: BotContext): ctx is SeasonContext =>
  ctx.season !== undefined && ctx.config !== undefined;

export const isRosterContext = (ctx: BotContext): ctx is RosterContext =>
  ctx.season !== undefined && ctx.config !== undefined && (ctx.isInRoster || ctx.isCaptain);

export const isAdminSeasonContext = (ctx: BotContext): ctx is AdminSeasonContext =>
  ctx.isAdmin && ctx.season !== undefined && ctx.config !== undefined;

export const isCaptainContext = (ctx: BotContext): ctx is CaptainContext => ctx.isCaptain;

export const isCaptainSeasonContext = (ctx: BotContext): ctx is CaptainSeasonContext =>
  ctx.isCaptain && ctx.season !== undefined && ctx.config !== undefined;
