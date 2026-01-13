import type { Bot } from 'grammy';
import { getRoster } from '../../../services/roster';
import type { BotContext, SeasonContext } from '../../context';
import { seasonCommand } from '../../middleware';

export const registerRosterCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'roster',
    seasonCommand(async (ctx: SeasonContext) => {
      const { db, season, i18n } = ctx;
      const players = await getRoster(db, season.id);

      if (players.length === 0) {
        return ctx.reply(i18n.roster.empty);
      }

      const lines = players.map((p) => i18n.roster.playerLine(p.displayName, p.username));
      const message = `${i18n.roster.title}\n${lines.join('\n')}`;

      return ctx.reply(message);
    }),
  );
};
