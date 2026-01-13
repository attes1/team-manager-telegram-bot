import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { parseWeekInput } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { getDmChatId, markDmFailed, registerDmChat } from '@/services/dm';
import { deleteActiveMenu, getActiveMenu, saveActiveMenu } from '@/services/menu';
import { isPlayerInRoster } from '@/services/roster';
import type { Season } from '@/types/db';

// Helper to send poll menu to a specific chat and track it
const sendPollMenuToChat = async (
  ctx: BotContext & { season: Season },
  targetChatId: number,
  pollWeek: { week: number; year: number },
): Promise<void> => {
  const { db, season } = ctx;
  const userId = ctx.from?.id;

  if (!userId) return;

  // Delete existing poll menu if any
  const existing = await getActiveMenu(db, targetChatId, userId, 'poll');
  if (existing) {
    try {
      await ctx.api.deleteMessage(targetChatId, existing.messageId);
    } catch {
      // Message already deleted or >48h old, ignore
    }
    await deleteActiveMenu(db, targetChatId, userId, 'poll');
  }

  // Set target week in context for menu's initial render
  ctx.pollTargetWeek = pollWeek;

  const message = await getPollMessage(season.id, pollWeek);
  const sent = await ctx.api.sendMessage(targetChatId, message, {
    reply_markup: pollMenu,
    parse_mode: 'HTML',
  });

  // Track the new menu
  await saveActiveMenu(db, {
    seasonId: season.id,
    chatId: targetChatId,
    userId,
    menuType: 'poll',
    messageId: sent.message_id,
    weekNumber: pollWeek.week,
    year: pollWeek.year,
  });
};

// Send poll to user's DM, with fallback to current chat if DM fails
const sendPollToDm = async (
  ctx: BotContext & { season: Season },
  pollWeek: { week: number; year: number },
): Promise<{ sentToDm: boolean }> => {
  const { db, i18n } = ctx;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const isPrivateChat = ctx.chat?.type === 'private';

  if (!userId || !chatId) return { sentToDm: false };

  // If already in private chat, register DM and send directly
  if (isPrivateChat) {
    await registerDmChat(db, userId, chatId);
    await sendPollMenuToChat(ctx, chatId, pollWeek);
    return { sentToDm: true };
  }

  // In group: try to send to DM
  const dmChatId = await getDmChatId(db, userId);

  if (dmChatId) {
    try {
      await sendPollMenuToChat(ctx, dmChatId, pollWeek);
      await ctx.reply(i18n.poll.dmSent);
      return { sentToDm: true };
    } catch (err) {
      console.error(`Failed to send poll DM to user ${userId}:`, err);
      await markDmFailed(db, userId);
    }
  }

  // DM failed or not registered - show instructions
  const botInfo = await ctx.api.getMe();
  await ctx.reply(i18n.poll.dmFailed(botInfo.username));
  return { sentToDm: false };
};

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  // Handle "Open Poll" button from old scheduled messages (legacy support)
  // New scheduled polls send DMs directly, but this handles any existing buttons
  bot.callbackQuery(/^open_poll:(\d+):(\d+)$/, async (ctx) => {
    const { db, season, i18n } = ctx;
    const userId = ctx.from?.id;

    if (!season || !userId) {
      return ctx.answerCallbackQuery();
    }

    // Check if user is in roster
    const inRoster = await isPlayerInRoster(db, season.id, userId);
    if (!inRoster) {
      return ctx.answerCallbackQuery({ text: i18n.poll.notInRoster, show_alert: true });
    }

    const match = ctx.match;
    const week = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);

    try {
      await sendPollToDm({ ...ctx, season }, { week, year });
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error('Error opening poll:', err);
      await ctx.answerCallbackQuery({ text: 'Error opening poll', show_alert: true });
    }
  });

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { schedulingWeek, i18n } = ctx;

      // Parse optional week parameter
      const args = ctx.message?.text?.split(' ').slice(1) ?? [];
      let pollWeek = schedulingWeek;

      if (args.length > 0) {
        const weekResult = parseWeekInput(args[0], { allowPast: false, schedulingWeek });

        if (!weekResult.success) {
          if (weekResult.error === 'past') {
            return ctx.reply(i18n.poll.weekInPast(schedulingWeek.week));
          }
          return ctx.reply(i18n.poll.invalidWeek);
        }

        pollWeek = { week: weekResult.week, year: weekResult.year };
      }

      await sendPollToDm(ctx, pollWeek);
    }),
  );
};
