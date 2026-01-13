import type { BotCommand } from 'grammy/types';
import type { Language } from '../../i18n';

const commandsEn: BotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show available commands' },
  { command: 'roster', description: 'View team roster' },
  { command: 'avail', description: 'View player availability' },
  { command: 'nextmatch', description: 'View next match info' },
  { command: 'poll', description: 'View availability poll' },
  { command: 'status', description: 'View status overview' },
  { command: 'setweek', description: 'Set week type (captain)' },
  { command: 'setmatch', description: 'Schedule a match (captain)' },
  { command: 'setlineup', description: 'Set match lineup (captain)' },
  { command: 'remind', description: 'Send reminder to non-responders (captain)' },
  { command: 'startseason', description: 'Start a new season (admin)' },
  { command: 'endseason', description: 'End current season (admin)' },
  { command: 'season', description: 'View season info (admin)' },
  { command: 'config', description: 'View/edit settings (admin)' },
  { command: 'addplayer', description: 'Add player to roster (admin)' },
  { command: 'removeplayer', description: 'Remove player from roster (admin)' },
  { command: 'promote', description: 'Promote player to captain (admin)' },
  { command: 'demote', description: 'Demote captain to player (admin)' },
];

const commandsFi: BotCommand[] = [
  { command: 'start', description: 'Käynnistä botti' },
  { command: 'help', description: 'Näytä käytettävissä olevat komennot' },
  { command: 'roster', description: 'Näytä joukkueen rosteri' },
  { command: 'avail', description: 'Näytä pelaajien aikataulut' },
  { command: 'nextmatch', description: 'Näytä seuraavan matsin tiedot' },
  { command: 'poll', description: 'Näytä aikataulukysely' },
  { command: 'status', description: 'Näytä tilannekatsaus' },
  { command: 'setweek', description: 'Aseta viikon tyyppi (kapteeni)' },
  { command: 'setmatch', description: 'Ajoita matsi (kapteeni)' },
  { command: 'setlineup', description: 'Aseta matsin linari (kapteeni)' },
  { command: 'remind', description: 'Lähetä muistutus vastaamattomille (kapteeni)' },
  { command: 'startseason', description: 'Aloita uusi kausi (admin)' },
  { command: 'endseason', description: 'Päätä nykyinen kausi (admin)' },
  { command: 'season', description: 'Näytä kauden tiedot (admin)' },
  { command: 'config', description: 'Näytä/muokkaa asetuksia (admin)' },
  { command: 'addplayer', description: 'Lisää pelaaja rosteriin (admin)' },
  { command: 'removeplayer', description: 'Poista pelaaja rosterista (admin)' },
  { command: 'promote', description: 'Ylennä pelaaja kapteniksi (admin)' },
  { command: 'demote', description: 'Alenna kapteeni pelaajaksi (admin)' },
];

export const commandDefinitions: Record<Language, BotCommand[]> = {
  en: commandsEn,
  fi: commandsFi,
};
