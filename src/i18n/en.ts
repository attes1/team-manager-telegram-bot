import type { Translations } from './fi';

export const en: Translations = {
  bot: {
    started: 'Pappaliiga Bot started!',
  },
  errors: {
    notAdmin: 'You do not have permission for this command.',
    noActiveSeason: 'No active season. Start one with /season start <name>',
    noUserMentioned: 'Mention a user in the command (e.g. /addplayer @user)',
    playerNotFound: 'Player not found.',
    playerNotInRoster: 'Player is not in the roster.',
    missingSeasonName: 'Provide a season name (e.g. /season start Spring 2025)',
    invalidConfigKey: 'Unknown setting. Use /config to see options.',
    invalidConfigValue: (key) => `Invalid value for "${key}".`,
    notInRoster: 'You are not in the roster. Ask an admin to add you.',
  },
  roster: {
    added: (name) => `${name} added to roster.`,
    removed: (name) => `${name} removed from roster.`,
    alreadyInRoster: (name) => `${name} is already in roster.`,
    empty: 'Roster is empty.',
    title: 'Roster:',
    playerLine: (name, username) => (username ? `• ${name} (@${username})` : `• ${name}`),
  },
  season: {
    started: (name) => `Season "${name}" started!`,
    ended: (name) => `Season "${name}" ended.`,
    alreadyEnded: 'No active season to end.',
    info: (name, status, createdAt) => `Season: ${name}\nStatus: ${status}\nStarted: ${createdAt}`,
    statusActive: 'Active',
    statusEnded: 'Ended',
  },
  config: {
    title: 'Settings:',
    updated: (key, value) => `${key} = ${value}`,
    line: (key, value) => `${key}: ${value}`,
    usage: 'Usage: /config <setting> <value>',
    keys: {
      language: 'Language',
      poll_day: 'Poll day',
      poll_time: 'Poll time',
      poll_days: 'Poll days',
      poll_times: 'Poll times',
      reminder_day: 'Reminder day',
      reminder_time: 'Reminder time',
      reminders_mode: 'Reminders mode',
      match_day: 'Default match day',
      match_time: 'Default match time',
      lineup_size: 'Lineup size',
    },
  },
  week: {
    setPractice: (week, dateRange) => `Week ${week} (${dateRange}) set as practice week.`,
    setMatch: (week, dateRange) => `Week ${week} (${dateRange}) set as match week.`,
    usage: 'Usage: /setweek <week> practice|match',
    invalidWeek: 'Invalid week number.',
    invalidType: 'Invalid type. Use "practice" or "match".',
  },
  poll: {
    title: (week, dateRange) =>
      `Week ${week} (${dateRange}) availability poll.\nMark when you can play:`,
    matchWeekTitle: (week, dateRange) =>
      `Week ${week} (${dateRange}) - MATCH WEEK!\nDefault: Sun 20:00. Mark your availability:`,
    legend: '✅ Available | 🏋️ Practice | 🏆 Match | ⚠️ If needed | ❌ Unavailable',
    days: {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    },
  },
};
