import type { Bot } from 'grammy';
import { formatDate } from '../../../lib/format';
import { endSeason, startSeason } from '../../../services/season';
import type { BotContext, SeasonContext } from '../../context';
import { adminCommand, seasonCommand } from '../../middleware';

export const registerSeasonCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'startseason',
    adminCommand(async (ctx) => {
      const { db, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      if (!args) {
        return ctx.reply(i18n.errors.missingSeasonName);
      }

      const season = await startSeason(db, args);
      return ctx.reply(i18n.season.started(season.name));
    }),
  );

  bot.command(
    'endseason',
    adminCommand(async (ctx) => {
      const { db, season, i18n } = ctx;

      if (!season) {
        return ctx.reply(i18n.season.alreadyEnded);
      }

      await endSeason(db);
      return ctx.reply(i18n.season.ended(season.name));
    }),
  );

  bot.command(
    'season',
    seasonCommand(async (ctx: SeasonContext) => {
      const { season, i18n } = ctx;
      const status =
        season.status === 'active' ? i18n.season.statusActive : i18n.season.statusEnded;
      const createdAt = formatDate(new Date(season.createdAt));
      return ctx.reply(i18n.season.info(season.name, status, createdAt));
    }),
  );
};
