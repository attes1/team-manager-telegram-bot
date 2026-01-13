import type { Bot } from 'grammy';
import type { Translations } from '../../../i18n';
import type { ParsedConfig } from '../../../lib/schemas';
import { updateConfig } from '../../../services/config';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';

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
  match_day_reminder_enabled: 'matchDayReminderEnabled',
  match_day_reminder_time: 'matchDayReminderTime',
};

const USER_KEYS = Object.keys(USER_TO_DB_KEY);

const isValidUserKey = (key: string): boolean => USER_KEYS.includes(key);
const toDbKey = (userKey: string): string => USER_TO_DB_KEY[userKey];

const formatConfigDisplay = (i18n: Translations, config: ParsedConfig): string => {
  const keys = i18n.config.keys;
  const lines = [
    i18n.config.line(keys.language, config.language),
    i18n.config.line(keys.poll_day, config.pollDay),
    i18n.config.line(keys.poll_time, config.pollTime),
    i18n.config.line(keys.poll_days, config.pollDays.join(',')),
    i18n.config.line(keys.poll_times, config.pollTimes),
    i18n.config.line(keys.reminder_day, config.reminderDay),
    i18n.config.line(keys.reminder_time, config.reminderTime),
    i18n.config.line(keys.reminders_mode, config.remindersMode),
    i18n.config.line(keys.match_day, config.matchDay),
    i18n.config.line(keys.match_time, config.matchTime),
    i18n.config.line(keys.lineup_size, String(config.lineupSize)),
    i18n.config.line(
      keys.match_day_reminder_enabled,
      config.matchDayReminderEnabled ? 'on' : 'off',
    ),
    i18n.config.line(keys.match_day_reminder_time, config.matchDayReminderTime),
  ];
  return `${i18n.config.title}\n${lines.join('\n')}\n\n${i18n.config.usage}`;
};

export const registerConfigCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'config',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const [key, ...rest] = args.split(/\s+/);
      const value = rest.join(' ').trim();

      if (!key || !value || !isValidUserKey(key)) {
        if (key && !isValidUserKey(key)) {
          return ctx.reply(i18n.errors.invalidConfigKey);
        }
        return ctx.reply(formatConfigDisplay(i18n, config));
      }

      try {
        const dbKey = toDbKey(key);
        await updateConfig(db, season.id, dbKey, value);
        return ctx.reply(i18n.config.updated(key, value));
      } catch {
        return ctx.reply(i18n.errors.invalidConfigValue(key));
      }
    }),
  );
};
