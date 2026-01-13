import type { Bot } from 'grammy';
import { db } from '@/db';
import { getTranslations } from '@/i18n';
import { getInvitation, removeInvitation } from '@/services/pending-invitations';
import { addPlayerToRoster, isPlayerInRoster } from '@/services/roster';
import type { BotContext } from '../context';

export const registerReactionHandlers = (bot: Bot<BotContext>) => {
  // 👍 = accept, 👎 = decline
  bot.reaction(['👍', '👎'], async (ctx) => {
    // For reaction updates, use ctx.messageReaction (ctx.msgId doesn't include reactions)
    const messageId = ctx.messageReaction?.message_id;
    const reactorId = ctx.from?.id;
    const reactorUsername = ctx.from?.username;
    const reactorFirstName = ctx.from?.first_name || '';
    const reactorLastName = ctx.from?.last_name || '';

    if (!messageId || !reactorId) {
      return;
    }

    // Check if this message has a pending invitation
    const invitation = getInvitation(messageId);
    if (!invitation) {
      return; // Not an invitation message, ignore
    }

    // Verify the reactor is the invited user
    const isCorrectUser = invitation.userId
      ? reactorId === invitation.userId
      : reactorUsername?.toLowerCase() === invitation.username?.toLowerCase();

    if (!isCorrectUser) {
      return; // Wrong user reacted, ignore silently
    }

    // Get translations for this season
    const i18n = await getTranslations(db, invitation.seasonId);

    // Check which reaction was added
    const reactions = ctx.reactions();
    const accepted = reactions.emojiAdded.includes('👍');
    const declined = reactions.emojiAdded.includes('👎');

    if (accepted) {
      // Check if already in roster
      const alreadyInRoster = await isPlayerInRoster(db, invitation.seasonId, reactorId);
      if (alreadyInRoster) {
        const name = reactorUsername ? `@${reactorUsername}` : invitation.displayName;
        removeInvitation(messageId);
        return ctx.reply(i18n.roster.alreadyInRoster(name));
      }

      // Build display name from reactor's actual info (stored in DB for roster display)
      const displayName =
        reactorFirstName + (reactorLastName ? ` ${reactorLastName}` : '') || invitation.displayName;

      // Add player to roster
      await addPlayerToRoster(db, {
        seasonId: invitation.seasonId,
        telegramId: reactorId,
        displayName,
        username: reactorUsername,
      });

      // Use @username in messages when available
      const messageName = reactorUsername ? `@${reactorUsername}` : displayName;
      removeInvitation(messageId);
      return ctx.reply(i18n.roster.invitationAccepted(messageName));
    }

    if (declined) {
      const messageName = reactorUsername ? `@${reactorUsername}` : invitation.displayName;
      removeInvitation(messageId);
      return ctx.reply(i18n.roster.invitationDeclined(messageName));
    }
  });
};
