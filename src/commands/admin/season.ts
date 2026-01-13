import type { Bot } from 'grammy';
import { db } from '../../db';
import { getTranslations, t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { formatDate } from '../../lib/format';
import { endSeason, getActiveSeason, startSeason } from '../../services/season';

export const registerSeasonCommands = (bot: Bot) => {
  bot.command('season', async (ctx) => {
    const userId = ctx.from?.id;
    const args = ctx.match?.toString().trim() ?? '';
    const [subcommand, ...rest] = args.split(/\s+/);

    if (subcommand === 'start') {
      if (!userId || !isAdmin(userId)) {
        return ctx.reply(t().errors.notAdmin);
      }

      const name = rest.join(' ').trim();
      if (!name) {
        return ctx.reply(t().errors.missingSeasonName);
      }

      const season = await startSeason(db, name);
      const i18n = await getTranslations(db, season.id);
      return ctx.reply(i18n.season.started(season.name));
    }

    if (subcommand === 'end') {
      if (!userId || !isAdmin(userId)) {
        return ctx.reply(t().errors.notAdmin);
      }

      const activeSeason = await getActiveSeason(db);
      if (!activeSeason) {
        return ctx.reply(t().season.alreadyEnded);
      }

      const i18n = await getTranslations(db, activeSeason.id);
      await endSeason(db);
      return ctx.reply(i18n.season.ended(activeSeason.name));
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const i18n = await getTranslations(db, season.id);
    const status = season.status === 'active' ? i18n.season.statusActive : i18n.season.statusEnded;
    const createdAt = formatDate(new Date(season.createdAt));
    return ctx.reply(i18n.season.info(season.name, status, createdAt));
  });
};
