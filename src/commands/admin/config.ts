import type { Bot } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { isAdmin } from '../../lib/admin';
import { getConfig, updateConfig } from '../../services/config';
import { getActiveSeason } from '../../services/season';

const USER_TO_DB_KEY: Record<string, string> = {
  language: 'language',
  poll_day: 'pollDay',
  poll_time: 'pollTime',
  poll_days: 'pollDays',
  poll_times: 'pollTimes',
  reminder_day: 'reminderDay',
  reminder_time: 'reminderTime',
  reminders_mode: 'remindersMode',
  match_day: 'matchDay',
  match_time: 'matchTime',
  lineup_size: 'lineupSize',
};

const USER_KEYS = Object.keys(USER_TO_DB_KEY);

const isValidUserKey = (key: string): boolean => USER_KEYS.includes(key);
const toDbKey = (userKey: string): string => USER_TO_DB_KEY[userKey];

const formatConfigDisplay = (config: {
  language: string;
  pollDay: string;
  pollTime: string;
  pollDays: string;
  pollTimes: string;
  reminderDay: string;
  reminderTime: string;
  remindersMode: string;
  matchDay: string;
  matchTime: string;
  lineupSize: number;
}): string => {
  const keys = t().config.keys;
  const lines = [
    t().config.line(keys.language, config.language),
    t().config.line(keys.poll_day, config.pollDay),
    t().config.line(keys.poll_time, config.pollTime),
    t().config.line(keys.poll_days, config.pollDays),
    t().config.line(keys.poll_times, config.pollTimes),
    t().config.line(keys.reminder_day, config.reminderDay),
    t().config.line(keys.reminder_time, config.reminderTime),
    t().config.line(keys.reminders_mode, config.remindersMode),
    t().config.line(keys.match_day, config.matchDay),
    t().config.line(keys.match_time, config.matchTime),
    t().config.line(keys.lineup_size, String(config.lineupSize)),
  ];
  return `${t().config.title}\n${lines.join('\n')}\n\n${t().config.usage}`;
};

export const registerConfigCommand = (bot: Bot) => {
  bot.command('config', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
      return ctx.reply(t().errors.notAdmin);
    }

    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const args = ctx.match?.toString().trim() ?? '';
    const [key, ...rest] = args.split(/\s+/);
    const value = rest.join(' ').trim();

    if (!key) {
      const config = await getConfig(db, season.id);
      if (!config) {
        return ctx.reply(t().errors.noActiveSeason);
      }
      return ctx.reply(formatConfigDisplay(config));
    }

    if (!isValidUserKey(key)) {
      return ctx.reply(t().errors.invalidConfigKey);
    }

    if (!value) {
      const config = await getConfig(db, season.id);
      if (!config) {
        return ctx.reply(t().errors.noActiveSeason);
      }
      return ctx.reply(formatConfigDisplay(config));
    }

    try {
      const dbKey = toDbKey(key);
      await updateConfig(db, season.id, dbKey, value);
      return ctx.reply(t().config.updated(key, value));
    } catch {
      return ctx.reply(t().errors.invalidConfigValue(key));
    }
  });
};
