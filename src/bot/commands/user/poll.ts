import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { getSchedulingWeek, parseWeekInput } from '@/lib/week';
import { getPollMessage, pollMenu } from '@/menus/poll';

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { season, config, i18n } = ctx;

      const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);

      // Parse optional week parameter
      const args = ctx.message?.text?.split(' ').slice(1) ?? [];
      let pollWeek = schedulingWeek;

      if (args.length > 0) {
        const weekResult = parseWeekInput(args[0], schedulingWeek, { allowPast: false });

        if (!weekResult.success) {
          if (weekResult.error === 'past') {
            return ctx.reply(i18n.poll.weekInPast(schedulingWeek.week));
          }
          return ctx.reply(i18n.poll.invalidWeek);
        }

        pollWeek = { week: weekResult.week, year: weekResult.year };
      }

      const message = await getPollMessage(season.id, pollWeek);
      return ctx.reply(message, { reply_markup: pollMenu, parse_mode: 'HTML' });
    }),
  );
};
