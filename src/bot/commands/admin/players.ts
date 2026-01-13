import type { Bot } from 'grammy';
import { addInvitation } from '@/services/pending-invitations';
import { removePlayerFromRoster } from '@/services/roster';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

// Escape HTML special characters to prevent injection
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

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
  // Remove @ if present
  return parts[1].replace(/^@/, '');
};

export const registerPlayerCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'addplayer',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { season, i18n } = ctx;
      const chatId = ctx.chat?.id;
      const adminId = ctx.from?.id;

      if (!chatId || !adminId) {
        return;
      }

      // Flow B: Check for text_mention first (has userId)
      const textMention = getTextMention(ctx);
      if (textMention) {
        // Create mention link for user without username
        const userLink = `<a href="tg://user?id=${textMention.userId}">${escapeHtml(textMention.displayName)}</a>`;
        const message = `${userLink}, ${i18n.roster.invitationPrompt}`;

        const sentMessage = await ctx.reply(message, { parse_mode: 'HTML' });

        // Add 👍 reaction as visual hint (bots can only set one reaction per message)
        try {
          await ctx.api.setMessageReaction(chatId, sentMessage.message_id, [
            { type: 'emoji', emoji: '👍' },
          ]);
        } catch {
          // Reactions may fail if not enabled in chat - continue anyway
        }

        // Store pending invitation with userId
        addInvitation(sentMessage.message_id, {
          userId: textMention.userId,
          displayName: textMention.displayName,
          chatId,
          messageId: sentMessage.message_id,
          seasonId: season.id,
          adminId,
        });
        return;
      }

      // Flow A: Check for username in args
      const username = getUsernameFromArgs(ctx);
      if (username) {
        const message = `@${username}, ${i18n.roster.invitationPrompt}`;

        const sentMessage = await ctx.reply(message);

        // Add 👍 reaction as visual hint (bots can only set one reaction per message)
        try {
          await ctx.api.setMessageReaction(chatId, sentMessage.message_id, [
            { type: 'emoji', emoji: '👍' },
          ]);
        } catch {
          // Reactions may fail if not enabled in chat - continue anyway
        }

        // Store pending invitation with username
        addInvitation(sentMessage.message_id, {
          username,
          displayName: username, // Will be updated when user reacts
          chatId,
          messageId: sentMessage.message_id,
          seasonId: season.id,
          adminId,
        });
        return;
      }

      // No user specified - show usage
      return ctx.reply(i18n.roster.addplayerUsage);
    }),
  );

  bot.command(
    'removeplayer',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;

      // Check for text_mention first
      const textMention = getTextMention(ctx);
      if (textMention) {
        const removed = await removePlayerFromRoster(db, season.id, textMention.userId);
        if (!removed) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }
        return ctx.reply(i18n.roster.removed(textMention.displayName));
      }

      // Check for username in args - need to look up in database
      const username = getUsernameFromArgs(ctx);
      if (username) {
        // Look up player by username in roster
        const roster = await db
          .selectFrom('seasonRoster')
          .innerJoin('players', 'players.telegramId', 'seasonRoster.playerId')
          .selectAll('players')
          .where('seasonRoster.seasonId', '=', season.id)
          .where('players.username', '=', username)
          .executeTakeFirst();

        if (!roster) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }

        await removePlayerFromRoster(db, season.id, roster.telegramId);
        return ctx.reply(i18n.roster.removed(roster.displayName));
      }

      return ctx.reply(i18n.roster.addplayerUsage);
    }),
  );
};
