import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { parseWeekInput } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { deleteActiveMenu, getActiveMenu, saveActiveMenu } from '@/services/menu';
import { isPlayerInRoster } from '@/services/roster';

// Helper to send poll menu and track it
const sendPollMenu = async (
  ctx: RosterContext,
  pollWeek: { week: number; year: number },
): Promise<void> => {
  const { db, season } = ctx;
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;

  // Delete existing poll menu if any
  if (chatId && userId) {
    const existing = await getActiveMenu(db, chatId, userId, 'poll');
    if (existing) {
      try {
        await ctx.api.deleteMessage(chatId, existing.messageId);
      } catch {
        // Message already deleted or >48h old, ignore
      }
      await deleteActiveMenu(db, chatId, userId, 'poll');
    }
  }

  // Set target week in context for menu's initial render
  ctx.pollTargetWeek = pollWeek;

  const message = await getPollMessage(season.id, pollWeek);
  const sent = await ctx.reply(message, { reply_markup: pollMenu, parse_mode: 'HTML' });

  // Track the new menu
  if (chatId && userId) {
    await saveActiveMenu(db, {
      seasonId: season.id,
      chatId,
      userId,
      menuType: 'poll',
      messageId: sent.message_id,
      weekNumber: pollWeek.week,
      year: pollWeek.year,
    });
  }
};

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  // Handle "Open Poll" button from scheduled messages
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
      // Send the interactive poll menu
      await sendPollMenu(ctx as RosterContext, { week, year });
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

      await sendPollMenu(ctx, pollWeek);
    }),
  );
};
