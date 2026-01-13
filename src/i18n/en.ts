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
  },
  roster: {
    added: (name) => `${name} added to roster.`,
    removed: (name) => `${name} removed from roster.`,
    alreadyInRoster: (name) => `${name} is already in roster.`,
    empty: 'Roster is empty.',
    title: 'Roster:',
    playerLine: (name, username) => (username ? `• ${name} (@${username})` : `• ${name}`),
  },
};
