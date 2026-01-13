import { format } from 'date-fns';
import type { Day } from './schemas';
import { getWeekDateRange } from './temporal';

const DAY_NAMES_FI: Record<Day, string> = {
  mon: 'maanantai',
  tue: 'tiistai',
  wed: 'keskiviikko',
  thu: 'torstai',
  fri: 'perjantai',
  sat: 'lauantai',
  sun: 'sunnuntai',
};

const DAY_NAMES_EN: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DAY_NAMES_SHORT_FI: Record<Day, string> = {
  mon: 'ma',
  tue: 'ti',
  wed: 'ke',
  thu: 'to',
  fri: 'pe',
  sat: 'la',
  sun: 'su',
};

const DAY_NAMES_SHORT_EN: Record<Day, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const formatDateRange = (start: Date, end: Date): string => {
  const startStr = format(start, 'd.M.yyyy');
  const endStr = format(end, 'd.M.yyyy');
  return `${startStr} - ${endStr}`;
};

export const formatDate = (date: Date): string => format(date, 'd.M.yyyy');

export const formatDay = (day: Day, lang: 'fi' | 'en'): string =>
  lang === 'fi' ? DAY_NAMES_FI[day] : DAY_NAMES_EN[day];

export const formatDayShort = (day: Day, lang: 'fi' | 'en'): string =>
  lang === 'fi' ? DAY_NAMES_SHORT_FI[day] : DAY_NAMES_SHORT_EN[day];

// Format player name, preferring username over display name
// Use ping: true only for reminders (ping mode) and invitations
export const formatPlayerName = (
  player: { displayName: string; username: string | null },
  options?: { ping?: boolean },
): string => {
  if (!player.username) {
    return player.displayName;
  }
  return options?.ping ? `@${player.username}` : player.username;
};

const DAY_INDICES: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Format a specific day of a week as a date string (e.g., "7.1.2025")
export const formatDayDate = (year: number, week: number, day: Day): string => {
  const { start } = getWeekDateRange(year, week);
  const dayIndex = DAY_INDICES.indexOf(day);
  const dayDate = new Date(start);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  return formatDate(dayDate);
};

// Escape HTML special characters to prevent injection
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
