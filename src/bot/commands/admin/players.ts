import type { Bot } from 'grammy';
import {
  addPlayerToRoster,
  isPlayerInRoster,
  removePlayerFromRoster,
} from '../../../services/roster';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

const getMentionedUser = (
  ctx: AdminSeasonContext,
): { id: number; name: string; username?: string } | null => {
  const textMentions = ctx.entities('text_mention');
  if (textMentions.length > 0 && textMentions[0].user) {
    const user = textMentions[0].user;
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    return { id: user.id, name, username: user.username };
  }

  const mentions = ctx.entities('mention');
  if (mentions.length > 0) {
    const username = mentions[0].text.replace('@', '');
    return { id: 0, name: username, username };
  }

  return null;
};

export const registerPlayerCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'addplayer',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;
      const mentionedUser = getMentionedUser(ctx);

      if (!mentionedUser || mentionedUser.id === 0) {
        return ctx.reply(i18n.errors.noUserMentioned);
      }

      const alreadyInRoster = await isPlayerInRoster(db, season.id, mentionedUser.id);
      if (alreadyInRoster) {
        return ctx.reply(i18n.roster.alreadyInRoster(mentionedUser.name));
      }

      await addPlayerToRoster(db, {
        seasonId: season.id,
        telegramId: mentionedUser.id,
        displayName: mentionedUser.name,
        username: mentionedUser.username,
      });

      return ctx.reply(i18n.roster.added(mentionedUser.name));
    }),
  );

  bot.command(
    'removeplayer',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, i18n } = ctx;
      const mentionedUser = getMentionedUser(ctx);

      if (!mentionedUser || mentionedUser.id === 0) {
        return ctx.reply(i18n.errors.noUserMentioned);
      }

      const removed = await removePlayerFromRoster(db, season.id, mentionedUser.id);
      if (!removed) {
        return ctx.reply(i18n.errors.playerNotInRoster);
      }

      return ctx.reply(i18n.roster.removed(mentionedUser.name));
    }),
  );
};
