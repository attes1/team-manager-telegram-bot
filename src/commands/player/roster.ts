import type { Bot } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { getRoster } from '../../services/roster';
import { getActiveSeason } from '../../services/season';

export const registerRosterCommand = (bot: Bot) => {
  bot.command('roster', async (ctx) => {
    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const players = await getRoster(db, season.id);
    if (players.length === 0) {
      return ctx.reply(t().roster.empty);
    }

    const lines = players.map((p) => t().roster.playerLine(p.displayName, p.username));
    const message = `${t().roster.title}\n${lines.join('\n')}`;

    return ctx.reply(message);
  });
};
