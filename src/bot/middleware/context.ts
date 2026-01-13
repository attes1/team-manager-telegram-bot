import type { NextFunction } from 'grammy';
import { db } from '../../db';
import { env } from '../../env';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { getConfig } from '../../services/config';
import { isCaptain, isPlayerInRoster } from '../../services/roster';
import { getActiveSeason } from '../../services/season';
import type { BotContext } from '../context';

export const contextMiddleware = async (ctx: BotContext, next: NextFunction) => {
  ctx.db = db;
  ctx.userId = ctx.from?.id ?? 0;
  ctx.isAdmin = ctx.userId !== 0 && isAdmin(ctx.userId);
  ctx.isCaptain = ctx.isAdmin;
  ctx.isInRoster = false;
  ctx.isInPublicGroup = env.PUBLIC_GROUP_ID !== undefined && ctx.chat?.id === env.PUBLIC_GROUP_ID;

  const season = await getActiveSeason(db);
  if (season) {
    ctx.season = season;
    const config = await getConfig(db, season.id);
    if (config) {
      ctx.config = config;
      ctx.i18n = t(config.language);
    } else {
      ctx.i18n = t();
    }

    if (ctx.userId !== 0) {
      ctx.isInRoster = await isPlayerInRoster(db, season.id, ctx.userId);
      if (!ctx.isAdmin && ctx.isInRoster) {
        ctx.isCaptain = await isCaptain(db, season.id, ctx.userId);
      }
    }
  } else {
    ctx.i18n = t();
  }

  return next();
};
