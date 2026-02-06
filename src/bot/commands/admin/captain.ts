import type { Bot } from 'grammy';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import { getTextMention, getUsernameFromArgs } from '@/lib/mentions';
import { getPlayerByUsername, getPlayerRole, setPlayerRole } from '@/services/roster';

export const registerCaptainCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'promote',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;

      const textMention = getTextMention(ctx);
      if (textMention) {
        const role = await getPlayerRole(db, season.id, textMention.userId);
        if (role === null) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        if (role === 'captain') {
          return ctx.reply(i18n.captain.alreadyCaptain(textMention.displayName));
        }
        await setPlayerRole(db, season.id, textMention.userId, 'captain');
        return ctx.reply(i18n.captain.promoted(textMention.displayName));
      }

      const username = getUsernameFromArgs(ctx);
      if (username) {
        const player = await getPlayerByUsername(db, season.id, username);
        if (!player) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        const role = await getPlayerRole(db, season.id, player.telegramId);
        if (role === 'captain') {
          return ctx.reply(i18n.captain.alreadyCaptain(player.displayName));
        }
        await setPlayerRole(db, season.id, player.telegramId, 'captain');
        return ctx.reply(i18n.captain.promoted(player.displayName));
      }

      return ctx.reply(i18n.captain.usage);
    }),
  );

  bot.command(
    'demote',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;

      const textMention = getTextMention(ctx);
      if (textMention) {
        const role = await getPlayerRole(db, season.id, textMention.userId);
        if (role === null) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        if (role !== 'captain') {
          return ctx.reply(i18n.captain.notACaptain(textMention.displayName));
        }
        await setPlayerRole(db, season.id, textMention.userId, 'player');
        return ctx.reply(i18n.captain.demoted(textMention.displayName));
      }

      const username = getUsernameFromArgs(ctx);
      if (username) {
        const player = await getPlayerByUsername(db, season.id, username);
        if (!player) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        const role = await getPlayerRole(db, season.id, player.telegramId);
        if (role !== 'captain') {
          return ctx.reply(i18n.captain.notACaptain(player.displayName));
        }
        await setPlayerRole(db, season.id, player.telegramId, 'player');
        return ctx.reply(i18n.captain.demoted(player.displayName));
      }

      return ctx.reply(i18n.captain.removeUsage);
    }),
  );
};
