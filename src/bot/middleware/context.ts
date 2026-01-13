import type { NextFunction } from 'grammy';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { t } from '@/i18n';
import { isAdmin } from '@/lib/admin';
import { getSchedulingWeek } from '@/lib/temporal';
import { getConfig } from '@/services/config';
import { getGroup } from '@/services/group';
import { isCaptain, isPlayerInRoster } from '@/services/roster';
import { getActiveSeason } from '@/services/season';

export const contextMiddleware = async (ctx: BotContext, next: NextFunction) => {
  ctx.db = db;
  ctx.userId = ctx.from?.id ?? 0;
  ctx.isAdmin = ctx.userId !== 0 && isAdmin(ctx.userId);
  ctx.isCaptain = ctx.isAdmin;
  ctx.isInRoster = false;

  // Determine if in public group based on database
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  if (chatId && (chatType === 'group' || chatType === 'supergroup')) {
    const group = await getGroup(db, chatId);
    ctx.isInPublicGroup = group?.type === 'public';
  } else {
    ctx.isInPublicGroup = false;
  }

  const season = await getActiveSeason(db);
  if (season) {
    ctx.season = season;
    const config = await getConfig(db, season.id);
    if (config) {
      ctx.config = config;
      ctx.schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
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
