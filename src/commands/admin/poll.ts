import type { Bot } from 'grammy';
import { db } from '../../db';
import { env } from '../../env';
import { t } from '../../i18n';
import { getPollMessage, pollMenu } from '../../menus/poll';
import { getActiveSeason } from '../../services/season';

const isAdmin = (userId: number | undefined): boolean => {
  if (!userId) {
    return false;
  }
  return env.ADMIN_IDS.includes(userId);
};

export const registerPollCommand = (bot: Bot) => {
  bot.use(pollMenu);

  bot.command('poll', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
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
