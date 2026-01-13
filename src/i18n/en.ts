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
};
