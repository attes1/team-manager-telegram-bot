import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { getTranslations } from '@/i18n';
import { formatDateRange } from '@/lib/format';
import { getSchedulingWeek, getWeekDateRange } from '@/lib/temporal';
import { getPollMessage, pollMenu } from '@/menus/poll';
import { getConfig } from '@/services/config';
import { getRosterWithDmStatus, markDmFailed } from '@/services/dm';
import { getActiveSeason } from '@/services/season';

// Callback data format: "open_poll:{week}:{year}" - used by reminder messages
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
  const i18n = await getTranslations(db, season.id);
  const { start, end } = getWeekDateRange(schedulingWeek.year, schedulingWeek.week);
  const dateRange = formatDateRange(start, end);

  const botInfo = await bot.api.getMe();
  const botUsername = botInfo.username;

  const roster = await getRosterWithDmStatus(db, season.id);
  const sentTo: string[] = [];
  const failedTo: string[] = [];

  for (const player of roster) {
    if (player.dmChatId && player.canDm) {
      try {
        const message = await getPollMessage(season.id, schedulingWeek);
        await bot.api.sendMessage(player.dmChatId, message, {
          reply_markup: pollMenu,
          parse_mode: 'HTML',
        });
        sentTo.push(player.displayName);
        console.log(`Weekly poll DM sent to ${player.displayName} (${player.telegramId})`);
      } catch (err) {
        console.error(`Failed to send poll DM to ${player.displayName}:`, err);
        await markDmFailed(db, player.telegramId);
        failedTo.push(player.displayName);
      }
    } else {
      failedTo.push(player.displayName);
    }
  }

  const summaryParts: string[] = [i18n.poll.scheduledSummary(schedulingWeek.week, dateRange)];

  if (sentTo.length > 0) {
    summaryParts.push(i18n.poll.dmSentTo(sentTo.join(', ')));
  }

  if (failedTo.length > 0) {
    summaryParts.push(i18n.poll.dmFailedTo(failedTo.join(', '), botUsername));
  }

  await bot.api.sendMessage(chatId, summaryParts.join('\n\n'), { parse_mode: 'HTML' });

  console.log(
    `Weekly poll summary sent to chat ${chatId} for week ${schedulingWeek.week}/${schedulingWeek.year}`,
  );
};
