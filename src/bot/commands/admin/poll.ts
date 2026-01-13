import type { Bot } from 'grammy';
import { getTargetWeek, inferWeekYear } from '../../../lib/week';
import { getPollMessage, pollMenu } from '../../../menus/poll';
import type { BotContext, RosterContext } from '../../context';
import { rosterCommand } from '../../middleware';

export const registerPollCommand = (bot: Bot<BotContext>) => {
  bot.use(pollMenu);

  bot.command(
    'poll',
    rosterCommand(async (ctx: RosterContext) => {
      const { season, config, i18n } = ctx;

      // Get target week using cutoff logic
      const targetWeek = getTargetWeek(config.pollCutoffDay, config.pollCutoffTime);

      // Parse optional week parameter
      const args = ctx.message?.text?.split(' ').slice(1) ?? [];
      let pollWeek = targetWeek;

      if (args.length > 0) {
        const weekNum = Number.parseInt(args[0], 10);
        if (Number.isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
          return ctx.reply(i18n.poll.invalidWeek);
        }

        // Use smart year inference
        pollWeek = inferWeekYear(weekNum, targetWeek);

        // Validate: must be >= target week (future only)
        const isInPast =
          pollWeek.year < targetWeek.year ||
          (pollWeek.year === targetWeek.year && pollWeek.week < targetWeek.week);

        if (isInPast) {
          return ctx.reply(i18n.poll.weekInPast(targetWeek.week));
        }
      }

      const message = await getPollMessage(season.id, pollWeek);
      return ctx.reply(message, { reply_markup: pollMenu });
    }),
  );
};
