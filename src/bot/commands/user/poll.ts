import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { parseWeekInput } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { getDmChatId, isDmBlockedError, markDmFailed, registerDmChat } from '@/services/dm';
import { deleteActiveMenu, getActiveMenu, saveActiveMenu } from '@/services/menu';
import { isPlayerInRoster } from '@/services/roster';
import type { Season } from '@/types/db';

const sendPollMenuToChat = async (
  ctx: BotContext,
  season: Season,
  targetChatId: number,
  pollWeek: { week: number; year: number },
): Promise<void> => {
  const { db } = ctx;
  const userId = ctx.from?.id;

  if (!userId) return;

  const existing = await getActiveMenu(db, targetChatId, userId, 'poll');
  if (existing) {
    try {
      await ctx.api.deleteMessage(targetChatId, existing.messageId);
    } catch {
      // Message already deleted or >48h old
    }
    await deleteActiveMenu(db, targetChatId, userId, 'poll');
  }

  ctx.pollTargetWeek = pollWeek;

  const message = await getPollMessage(season.id, pollWeek);
  const sent = await ctx.api.sendMessage(targetChatId, message, {
    reply_markup: pollMenu,
    parse_mode: 'HTML',
  });

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

const sendPollToDm = async (
  ctx: RosterContext,
  pollWeek: { week: number; year: number },
): Promise<void> => {
  const { db, season, i18n } = ctx;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const isPrivateChat = ctx.chat?.type === 'private';

  if (!userId || !chatId) return;

  if (isPrivateChat) {
    await registerDmChat(db, userId, chatId);
    await sendPollMenuToChat(ctx, season, chatId, pollWeek);
    return;
  }

  const dmChatId = await getDmChatId(db, userId);

  if (dmChatId) {
    try {
      await sendPollMenuToChat(ctx, season, dmChatId, pollWeek);
      await ctx.reply(i18n.poll.dmSent);
      return;
    } catch (err) {
      console.error(`Failed to send poll DM to user ${userId}:`, err);
      if (isDmBlockedError(err)) {
        await markDmFailed(db, userId);
      }
    }
  }

  const botInfo = await ctx.api.getMe();
  await ctx.reply(i18n.poll.dmFailed(botInfo.username));
};

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.callbackQuery(/^open_poll:(\d+):(\d+)$/, async (ctx) => {
    const { db, season, i18n } = ctx;
    const userId = ctx.from?.id;

    if (!season || !userId) {
      return ctx.answerCallbackQuery();
    }

    const inRoster = await isPlayerInRoster(db, season.id, userId);
    if (!inRoster) {
      return ctx.answerCallbackQuery({ text: i18n.poll.notInRoster, show_alert: true });
    }

    const week = parseInt(ctx.match[1], 10);
    const year = parseInt(ctx.match[2], 10);

    const dmChatId = await getDmChatId(db, userId);

    if (dmChatId) {
      try {
        await sendPollMenuToChat(ctx, season, dmChatId, { week, year });
        await ctx.answerCallbackQuery({ text: i18n.poll.dmSent });
        return;
      } catch (err) {
        console.error(`Failed to send poll DM to user ${userId}:`, err);
        if (isDmBlockedError(err)) {
          await markDmFailed(db, userId);
        }
      }
    }

    const botInfo = await ctx.api.getMe();
    await ctx.answerCallbackQuery({
      text: i18n.poll.dmFailed(botInfo.username),
      show_alert: true,
    });
  });

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { schedulingWeek, i18n } = ctx;

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
