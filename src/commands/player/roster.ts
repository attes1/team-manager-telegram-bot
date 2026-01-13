import type { Bot } from 'grammy';
import { db } from '../../db';
import { getTranslations, t } from '../../i18n';
import { getRoster } from '../../services/roster';
import { getActiveSeason } from '../../services/season';

export const registerRosterCommand = (bot: Bot) => {
  bot.command('roster', async (ctx) => {
    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const i18n = await getTranslations(db, season.id);
    const players = await getRoster(db, season.id);
    if (players.length === 0) {
      return ctx.reply(i18n.roster.empty);
    }

    const lines = players.map((p) => i18n.roster.playerLine(p.displayName, p.username));
    const message = `${i18n.roster.title}\n${lines.join('\n')}`;

    return ctx.reply(message);
  });
};
