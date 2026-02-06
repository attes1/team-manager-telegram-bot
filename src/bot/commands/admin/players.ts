import { type Bot, InlineKeyboard } from 'grammy';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import { formatUserMention } from '@/lib/format';
import { addInvitation } from '@/services/pending-invitations';
import { removePlayerFromRoster } from '@/services/roster';

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

      const botUsername = ctx.me.username;

      // Flow B: Check for text_mention first (has userId)
      const textMention = getTextMention(ctx);
      if (textMention) {
        const userLink = formatUserMention(textMention.userId, textMention.displayName);
        const message = `${userLink}, ${i18n.roster.invitationPrompt}`;

        const sentMessage = await ctx.reply(message, { parse_mode: 'HTML' });

        addInvitation(sentMessage.message_id, {
          userId: textMention.userId,
          displayName: textMention.displayName,
          chatId,
          messageId: sentMessage.message_id,
          seasonId: season.id,
          adminId,
        });

        const keyboard = new InlineKeyboard().url(
          i18n.roster.acceptButton,
          `https://t.me/${botUsername}?start=invite_${sentMessage.message_id}`,
        );

        await ctx.api.editMessageReplyMarkup(chatId, sentMessage.message_id, {
          reply_markup: keyboard,
        });
        return;
      }

      // Flow A: Check for username in args
      const username = getUsernameFromArgs(ctx);
      if (username) {
        const message = `@${username}, ${i18n.roster.invitationPrompt}`;

        const sentMessage = await ctx.reply(message);

        addInvitation(sentMessage.message_id, {
          username,
          displayName: username,
          chatId,
          messageId: sentMessage.message_id,
          seasonId: season.id,
          adminId,
        });

        const keyboard = new InlineKeyboard().url(
          i18n.roster.acceptButton,
          `https://t.me/${botUsername}?start=invite_${sentMessage.message_id}`,
        );

        await ctx.api.editMessageReplyMarkup(chatId, sentMessage.message_id, {
          reply_markup: keyboard,
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
