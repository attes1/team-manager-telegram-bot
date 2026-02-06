import { Bot } from 'grammy';
import { db } from '../db';
import { env } from '../env';
import { getTranslations } from '../i18n';
import { languageSchema } from '../lib/schemas';
import { lineupMenu } from '../menus/lineup';
import { getConfig } from '../services/config';
import { registerDmChat } from '../services/dm';
import { getInvitation, removeInvitation } from '../services/pending-invitations';
import { addPlayerToRoster, getPlayerByTelegramId, isPlayerInRoster } from '../services/roster';
import { getActiveSeason } from '../services/season';
import { registerCommands } from './commands';
import { commandDefinitions } from './commands/definitions';
import type { BotContext } from './context';
import { registerChatMemberHandlers } from './handlers/chat-member';
import { registerReactionHandlers } from './handlers/reactions';
import { contextMiddleware, publicCommandsRestriction } from './middleware';

const handleInviteDeepLink = async (
  ctx: BotContext,
  userId: number,
  chatId: number,
  messageId: number,
): Promise<boolean> => {
  const invitation = getInvitation(messageId);
  if (!invitation) {
    return false;
  }

  const username = ctx.from?.username;
  const isCorrectUser = invitation.userId
    ? userId === invitation.userId
    : username?.toLowerCase() === invitation.username?.toLowerCase();

  if (!isCorrectUser) {
    return false;
  }

  const i18n = await getTranslations(db, invitation.seasonId);

  const alreadyInRoster = await isPlayerInRoster(db, invitation.seasonId, userId);
  if (alreadyInRoster) {
    removeInvitation(messageId);
    await registerDmChat(db, userId, chatId);
    await ctx.reply(i18n.roster.alreadyInRoster(invitation.displayName));
    return true;
  }

  const firstName = ctx.from?.first_name || '';
  const lastName = ctx.from?.last_name || '';
  const displayName = firstName + (lastName ? ` ${lastName}` : '') || invitation.displayName;

  await addPlayerToRoster(db, {
    seasonId: invitation.seasonId,
    telegramId: userId,
    displayName,
    username,
  });

  await registerDmChat(db, userId, chatId);

  removeInvitation(messageId);

  await ctx.reply(i18n.roster.invitationAcceptedDm);

  const messageName = username ? `@${username}` : displayName;
  await ctx.api.sendMessage(invitation.chatId, i18n.roster.invitationAccepted(messageName));

  return true;
};

export const createBot = () => {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(contextMiddleware);
  bot.use(publicCommandsRestriction);
  bot.use(lineupMenu);

  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (ctx.chat?.type === 'private' && userId && chatId) {
      const payload = ctx.match;

      // Deep link: invite_{messageId} — registers DM after player is created
      const inviteMatch = payload?.match(/^invite_(\d+)$/);
      if (inviteMatch) {
        const messageId = parseInt(inviteMatch[1], 10);
        const accepted = await handleInviteDeepLink(ctx, userId, chatId, messageId);
        if (accepted) return;
      }

      // Register DM for existing players (non-invite /start)
      const player = await getPlayerByTelegramId(db, userId);
      if (player) {
        await registerDmChat(db, userId, chatId);
      }
    }

    return ctx.reply(ctx.i18n.bot.started);
  });

  registerCommands(bot);
  registerReactionHandlers(bot);
  registerChatMemberHandlers(bot);

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};

export const setCommands = async (bot: Bot<BotContext>) => {
  const season = await getActiveSeason(db);
  let lang: 'en' | 'fi' = 'en';

  if (season) {
    const config = await getConfig(db, season.id);
    lang = languageSchema.catch('en').parse(config?.language);
  }

  await bot.api.setMyCommands(commandDefinitions[lang]);
};

export type { BotContext } from './context';
