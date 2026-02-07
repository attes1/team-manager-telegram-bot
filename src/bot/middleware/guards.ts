import type {
  AdminContext,
  AdminSeasonContext,
  BotContext,
  CaptainContext,
  CaptainSeasonContext,
  RosterContext,
  SeasonContext,
} from '../context';

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
