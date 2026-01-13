import { format } from 'date-fns';
import type { Day } from './schemas';

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
  const startStr = format(start, 'd.M.');
  const endStr = format(end, 'd.M.');
  return `${startStr} - ${endStr}`;
};

export const formatDate = (date: Date): string => format(date, 'd.M.yyyy');

export const formatDay = (day: Day, lang: 'fi' | 'en'): string =>
  lang === 'fi' ? DAY_NAMES_FI[day] : DAY_NAMES_EN[day];

export const formatDayShort = (day: Day, lang: 'fi' | 'en'): string =>
  lang === 'fi' ? DAY_NAMES_SHORT_FI[day] : DAY_NAMES_SHORT_EN[day];
