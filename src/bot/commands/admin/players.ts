import { type Bot, InlineKeyboard } from 'grammy';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import { formatUserMention } from '@/lib/format';
import { getTextMention, getUsernameFromArgs } from '@/lib/mentions';
import { addInvitation } from '@/services/pending-invitations';
import { getPlayerByUsername, removePlayerFromRoster } from '@/services/roster';

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

      const username = getUsernameFromArgs(ctx);
      if (username) {
        const player = await getPlayerByUsername(db, season.id, username);

        if (!player) {
          return ctx.reply(i18n.errors.playerNotInRoster);
        }

        await removePlayerFromRoster(db, season.id, player.telegramId);
        return ctx.reply(i18n.roster.removed(player.displayName));
      }

      return ctx.reply(i18n.roster.addplayerUsage);
    }),
  );
};
