import type { BotCommand } from 'grammy/types';
import type { Language } from '../../i18n';

const commandsEn: BotCommand[] = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show available commands' },
  { command: 'roster', description: 'View team roster' },
  { command: 'match', description: 'View match info and lineup' },
  { command: 'practice', description: 'View practice availability' },
  { command: 'startseason', description: 'Start a new season (admin)' },
  { command: 'endseason', description: 'End current season (admin)' },
  { command: 'season', description: 'View season info (admin)' },
  { command: 'config', description: 'View/edit settings (admin)' },
  { command: 'addplayer', description: 'Add player to roster (admin)' },
  { command: 'removeplayer', description: 'Remove player from roster (admin)' },
  { command: 'setweek', description: 'Set week type (admin)' },
  { command: 'setmatch', description: 'Schedule a match (admin)' },
  { command: 'setlineup', description: 'Set match lineup (admin)' },
  { command: 'poll', description: 'Send availability poll (admin)' },
  { command: 'remind', description: 'Send reminder to non-responders (admin)' },
  { command: 'status', description: 'View status overview (admin)' },
];

const commandsFi: BotCommand[] = [
  { command: 'start', description: 'Käynnistä botti' },
  { command: 'help', description: 'Näytä käytettävissä olevat komennot' },
  { command: 'roster', description: 'Näytä joukkueen rosteri' },
  { command: 'match', description: 'Näytä matsitiedot ja kokoonpano' },
  { command: 'practice', description: 'Näytä treenien saatavuudet' },
  { command: 'startseason', description: 'Aloita uusi kausi (admin)' },
  { command: 'endseason', description: 'Päätä nykyinen kausi (admin)' },
  { command: 'season', description: 'Näytä kauden tiedot (admin)' },
  { command: 'config', description: 'Näytä/muokkaa asetuksia (admin)' },
  { command: 'addplayer', description: 'Lisää pelaaja rosteriin (admin)' },
  { command: 'removeplayer', description: 'Poista pelaaja rosterista (admin)' },
  { command: 'setweek', description: 'Aseta viikon tyyppi (admin)' },
  { command: 'setmatch', description: 'Ajoita matsi (admin)' },
  { command: 'setlineup', description: 'Aseta matsikokoonpano (admin)' },
  { command: 'poll', description: 'Lähetä saatavuuskysely (admin)' },
  { command: 'remind', description: 'Lähetä muistutus vastaamattomille (admin)' },
  { command: 'status', description: 'Näytä tilannekatsaus (admin)' },
];

export const commandDefinitions: Record<Language, BotCommand[]> = {
  en: commandsEn,
  fi: commandsFi,
};
