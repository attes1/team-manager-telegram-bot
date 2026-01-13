import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { getTranslations } from '@/i18n';
import { getSchedulingWeek } from '@/lib/temporal';
import { getPollMessage } from '@/menus/poll';
import { getConfig } from '@/services/config';
import { getActiveSeason } from '@/services/season';

// Callback data format: "open_poll:{week}:{year}"
export const createOpenPollKeyboard = (
  week: number,
  year: number,
  buttonText: string,
): InlineKeyboard => {
  return new InlineKeyboard().text(buttonText, `open_poll:${week}:${year}`);
};

export const sendWeeklyPoll = async (bot: Bot<BotContext>, chatId: number): Promise<void> => {
  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Weekly poll: No active season, skipping');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config) {
    console.log('Weekly poll: No config found, skipping');
    return;
  }

  const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const message = await getPollMessage(season.id, schedulingWeek);
  const i18n = await getTranslations(db, season.id);

  const keyboard = createOpenPollKeyboard(
    schedulingWeek.week,
    schedulingWeek.year,
    i18n.poll.openPollButton,
  );

  await bot.api.sendMessage(chatId, message, {
    reply_markup: keyboard,
    parse_mode: 'HTML',
  });

  console.log(
    `Weekly poll sent to chat ${chatId} for week ${schedulingWeek.week}/${schedulingWeek.year}`,
  );
};
