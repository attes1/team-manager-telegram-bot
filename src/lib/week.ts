import {
  addWeeks,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  isBefore,
  setISOWeek,
  startOfISOWeek,
} from 'date-fns';
import type { Day } from './schemas';

const DAY_TO_ISO_WEEKDAY: Record<Day, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export const getWeekNumber = (date: Date): number => getISOWeek(date);

export const getWeekYear = (date: Date): number => getISOWeekYear(date);

export const getWeekDateRange = (year: number, week: number): { start: Date; end: Date } => {
  const dateInWeek = setISOWeek(new Date(year, 0, 4), week);
  return {
    start: startOfISOWeek(dateInWeek),
    end: endOfISOWeek(dateInWeek),
  };
};

export const getCurrentWeek = (): { week: number; year: number } => {
  const now = new Date();
  return {
    week: getWeekNumber(now),
    year: getWeekYear(now),
  };
};

export const getTargetWeek = (
  cutoffDay: Day,
  cutoffTime: string,
): { week: number; year: number } => {
  const now = new Date();
  const currentWeek = getCurrentWeek();

  // Calculate cutoff datetime for current week
  const cutoffWeekday = DAY_TO_ISO_WEEKDAY[cutoffDay];
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

  // Get the start of current week (Monday)
  const { start } = getWeekDateRange(currentWeek.year, currentWeek.week);

  // Create cutoff date by adding days from Monday (weekday 1)
  const cutoffDate = new Date(start);
  cutoffDate.setDate(cutoffDate.getDate() + (cutoffWeekday - 1));
  cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);

  // If current time is at or past cutoff, return next week
  if (!isBefore(now, cutoffDate)) {
    const nextWeekDate = addWeeks(now, 1);
    return {
      week: getWeekNumber(nextWeekDate),
      year: getWeekYear(nextWeekDate),
    };
  }

  return currentWeek;
};

export const inferWeekYear = (
  requestedWeek: number,
  targetWeek: { week: number; year: number },
): { week: number; year: number } => {
  // If requested week is less than target week, assume next year
  if (requestedWeek < targetWeek.week) {
    return { week: requestedWeek, year: targetWeek.year + 1 };
  }
  return { week: requestedWeek, year: targetWeek.year };
};
