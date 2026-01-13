import type { Bot } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { getPollMessage, pollMenu } from '../../menus/poll';
import { getActiveSeason } from '../../services/season';

export const registerPollCommand = (bot: Bot) => {
  bot.use(pollMenu);

  bot.command('poll', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const message = await getPollMessage(season.id);
    return ctx.reply(message, { reply_markup: pollMenu });
  });
};
