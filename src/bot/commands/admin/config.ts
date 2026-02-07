import type { Bot } from 'grammy';
import { ZodError } from 'zod';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import type { Translations } from '@/i18n';
import type { ParsedConfig } from '@/lib/schemas';
import { languageSchema } from '@/lib/schemas';
import { refreshScheduler } from '@/scheduler';
import { updateConfig } from '@/services/config';
import { commandDefinitions } from '../definitions';

type UserConfigKey = keyof Translations['config']['keys'];

const USER_TO_DB_KEY: Record<UserConfigKey, keyof ParsedConfig> = {
  language: 'language',
  poll_day: 'pollDay',
  poll_time: 'pollTime',
  poll_days: 'pollDays',
  poll_times: 'pollTimes',
  week_change_day: 'weekChangeDay',
  week_change_time: 'weekChangeTime',
  reminder_day: 'reminderDay',
  reminder_time: 'reminderTime',
  reminders_mode: 'remindersMode',
  match_day: 'matchDay',
  match_time: 'matchTime',
  lineup_size: 'lineupSize',
  match_day_reminder_mode: 'matchDayReminderMode',
  match_day_reminder_time: 'matchDayReminderTime',
  public_announcements: 'publicAnnouncements',
  public_commands_mode: 'publicCommandsMode',
  menu_expiration_hours: 'menuExpirationHours',
  menu_cleanup_time: 'menuCleanupTime',
};

const SCHEDULER_KEYS: readonly UserConfigKey[] = [
  'poll_day',
  'poll_time',
  'reminder_day',
  'reminder_time',
  'reminders_mode',
  'match_day',
  'match_day_reminder_mode',
  'match_day_reminder_time',
  'menu_cleanup_time',
];

const USER_KEYS: ReadonlySet<string> = new Set(Object.keys(USER_TO_DB_KEY));

const isValidUserKey = (key: string): key is UserConfigKey => USER_KEYS.has(key);

const affectsScheduler = (key: UserConfigKey): boolean => SCHEDULER_KEYS.includes(key);

const getConfigValue = (config: ParsedConfig, userKey: UserConfigKey): string => {
  const dbKey = USER_TO_DB_KEY[userKey];
  const value = config[dbKey];
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return String(value);
};

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
    formatConfigLine(labels.week_change_day, 'week_change_day', config.weekChangeDay),
    formatConfigLine(labels.week_change_time, 'week_change_time', config.weekChangeTime),
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
    formatConfigLine(
      labels.public_commands_mode,
      'public_commands_mode',
      config.publicCommandsMode,
    ),
    formatConfigLine(
      labels.menu_expiration_hours,
      'menu_expiration_hours',
      String(config.menuExpirationHours),
    ),
    formatConfigLine(labels.menu_cleanup_time, 'menu_cleanup_time', config.menuCleanupTime),
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

      // No args - show all config
      if (!key) {
        return ctx.reply(formatConfigDisplay(i18n, config));
      }

      // Invalid key
      if (!isValidUserKey(key)) {
        return ctx.reply(i18n.errors.invalidConfigKey);
      }

      // Key only, no value - show current value and options
      if (!value) {
        const label = i18n.config.keys[key];
        const currentValue = getConfigValue(config, key);
        const options = i18n.config.options[key];
        const lines = [
          `<b>${label}</b> (${key})`,
          `${i18n.config.currentValue}: ${currentValue}`,
          `${i18n.config.availableOptions}: ${options}`,
        ];
        return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
      }

      try {
        const dbKey = USER_TO_DB_KEY[key];
        await updateConfig(db, season.id, dbKey, value);
        if (affectsScheduler(key)) {
          await refreshScheduler();
        }
        // Update bot command descriptions when language changes
        const langResult = key === 'language' ? languageSchema.safeParse(value) : null;
        if (langResult?.success && ctx.chat) {
          const commands = commandDefinitions[langResult.data];
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
