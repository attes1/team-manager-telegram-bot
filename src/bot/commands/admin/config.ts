import type { Bot } from 'grammy';
import { ZodError } from 'zod';
import type { Language, Translations } from '../../../i18n';
import type { ParsedConfig } from '../../../lib/schemas';
import { refreshScheduler } from '../../../scheduler';
import { updateConfig } from '../../../services/config';
import type { AdminSeasonContext, BotContext } from '../../context';
import { adminSeasonCommand } from '../../middleware';
import { commandDefinitions } from '../definitions';

const USER_TO_DB_KEY: Record<string, string> = {
  language: 'language',
  poll_day: 'pollDay',
  poll_time: 'pollTime',
  poll_days: 'pollDays',
  poll_times: 'pollTimes',
  poll_cutoff_day: 'pollCutoffDay',
  poll_cutoff_time: 'pollCutoffTime',
  reminder_day: 'reminderDay',
  reminder_time: 'reminderTime',
  reminders_mode: 'remindersMode',
  match_day: 'matchDay',
  match_time: 'matchTime',
  lineup_size: 'lineupSize',
  match_day_reminder_mode: 'matchDayReminderMode',
  match_day_reminder_time: 'matchDayReminderTime',
  public_announcements: 'publicAnnouncements',
};

const SCHEDULER_KEYS = [
  'poll_day',
  'poll_time',
  'reminder_day',
  'reminder_time',
  'reminders_mode',
  'match_day',
  'match_day_reminder_mode',
  'match_day_reminder_time',
];

const USER_KEYS = Object.keys(USER_TO_DB_KEY);

const isValidUserKey = (key: string): boolean => USER_KEYS.includes(key);
const toDbKey = (userKey: string): string => USER_TO_DB_KEY[userKey];
const affectsScheduler = (key: string): boolean => SCHEDULER_KEYS.includes(key);

const formatConfigLine = (label: string, key: string, value: string): string =>
  `${label} (${key}): ${value}`;

const formatConfigDisplay = (i18n: Translations, config: ParsedConfig): string => {
  const labels = i18n.config.keys;
  const lines = [
    formatConfigLine(labels.language, 'language', config.language),
    formatConfigLine(labels.poll_day, 'poll_day', config.pollDay),
    formatConfigLine(labels.poll_time, 'poll_time', config.pollTime),
    formatConfigLine(labels.poll_days, 'poll_days', config.pollDays.join(',')),
    formatConfigLine(labels.poll_times, 'poll_times', config.pollTimes),
    formatConfigLine(labels.poll_cutoff_day, 'poll_cutoff_day', config.pollCutoffDay),
    formatConfigLine(labels.poll_cutoff_time, 'poll_cutoff_time', config.pollCutoffTime),
    formatConfigLine(labels.reminder_day, 'reminder_day', config.reminderDay),
    formatConfigLine(labels.reminder_time, 'reminder_time', config.reminderTime),
    formatConfigLine(labels.reminders_mode, 'reminders_mode', config.remindersMode),
    formatConfigLine(labels.match_day, 'match_day', config.matchDay),
    formatConfigLine(labels.match_time, 'match_time', config.matchTime),
    formatConfigLine(labels.lineup_size, 'lineup_size', String(config.lineupSize)),
    formatConfigLine(
      labels.match_day_reminder_mode,
      'match_day_reminder_mode',
      config.matchDayReminderMode,
    ),
    formatConfigLine(
      labels.match_day_reminder_time,
      'match_day_reminder_time',
      config.matchDayReminderTime,
    ),
    formatConfigLine(
      labels.public_announcements,
      'public_announcements',
      config.publicAnnouncements,
    ),
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
        if (affectsScheduler(key)) {
          await refreshScheduler();
        }
        // Update bot command descriptions when language changes
        if (key === 'language' && (value === 'en' || value === 'fi') && ctx.chat) {
          const lang = value as Language;
          const commands = commandDefinitions[lang];
          // Set commands globally and for this specific chat
          await ctx.api.setMyCommands(commands);
          await ctx.api.setMyCommands(commands, {
            scope: { type: 'chat', chat_id: ctx.chat.id },
          });
        }
        return ctx.reply(i18n.config.updated(key, value));
      } catch (err) {
        const message =
          err instanceof ZodError ? err.issues[0]?.message : i18n.errors.invalidConfigValue(key);
        return ctx.reply(message);
      }
    }),
  );
};
