import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { getSchedulingWeek, parseWeekInput } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { deleteActiveMenu, getActiveMenu, saveActiveMenu } from '@/services/menu';

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, i18n } = ctx;
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;

      const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);

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

      return sent;
    }),
  );
};
