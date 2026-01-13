import type { NextFunction } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { languageSchema } from '../../lib/schemas';
import { getConfig } from '../../services/config';
import { getActiveSeason } from '../../services/season';
import type { BotContext } from '../context';

export const contextMiddleware = async (ctx: BotContext, next: NextFunction) => {
  ctx.db = db;
  ctx.userId = ctx.from?.id ?? 0;
  ctx.isAdmin = ctx.userId !== 0 && isAdmin(ctx.userId);

  const season = await getActiveSeason(db);
  if (season) {
    ctx.season = season;
    const config = await getConfig(db, season.id);
    if (config) {
      ctx.config = config;
      const lang = languageSchema.catch('en').parse(config.language);
      ctx.i18n = t(lang);
    } else {
      ctx.i18n = t();
    }
  } else {
    ctx.i18n = t();
  }

  return next();
};
