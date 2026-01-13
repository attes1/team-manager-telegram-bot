import type { Bot } from 'grammy';
import { getPlayerRole, setPlayerRole } from '@/services/roster';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

// Extract user info from text_mention entity (user without username)
const getTextMention = (
  ctx: AdminSeasonContext,
): { userId: number; displayName: string; username?: string } | null => {
  const textMentions = ctx.entities('text_mention');
  if (textMentions.length > 0 && textMentions[0].user) {
    const user = textMentions[0].user;
    const displayName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    return { userId: user.id, displayName, username: user.username };
  }
  return null;
};

// Extract username from command arguments
const getUsernameFromArgs = (ctx: AdminSeasonContext): string | null => {
  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  return parts[1].replace(/^@/, '');
};

export const registerCaptainCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'promote',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;

      // Check for text_mention first
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

      // Check for username in args
      const username = getUsernameFromArgs(ctx);
      if (username) {
        const player = await db
          .selectFrom('seasonRoster')
          .innerJoin('players', 'players.telegramId', 'seasonRoster.playerId')
          .select(['players.telegramId', 'players.displayName', 'seasonRoster.role'])
          .where('seasonRoster.seasonId', '=', season.id)
          .where('players.username', '=', username)
          .executeTakeFirst();

        if (!player) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        if (player.role === 'captain') {
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

      // Check for text_mention first
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

      // Check for username in args
      const username = getUsernameFromArgs(ctx);
      if (username) {
        const player = await db
          .selectFrom('seasonRoster')
          .innerJoin('players', 'players.telegramId', 'seasonRoster.playerId')
          .select(['players.telegramId', 'players.displayName', 'seasonRoster.role'])
          .where('seasonRoster.seasonId', '=', season.id)
          .where('players.username', '=', username)
          .executeTakeFirst();

        if (!player) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        if (player.role !== 'captain') {
          return ctx.reply(i18n.captain.notACaptain(player.displayName));
        }
        await setPlayerRole(db, season.id, player.telegramId, 'player');
        return ctx.reply(i18n.captain.demoted(player.displayName));
      }

      return ctx.reply(i18n.captain.removeUsage);
    }),
  );
};
