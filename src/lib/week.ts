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
import { dayWeekInputSchema, weekInputSchema } from './schemas';

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

/**
 * Get the scheduling week based on the week change boundary.
 * Before the boundary, returns current week. After boundary, returns next week.
 */
export const getSchedulingWeek = (
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

export type ParseWeekResult =
  | { success: true; week: number; year: number }
  | { success: false; error: 'invalid' | 'past' };

/**
 * Parse week input in format "5" or "5/2026".
 * Week only: uses current year.
 * Week/year: uses specified year.
 */
export const parseWeekInput = (
  input: string,
  options: { allowPast?: boolean; schedulingWeek?: { week: number; year: number } } = {},
): ParseWeekResult => {
  const { allowPast = true, schedulingWeek } = options;

  const parsed = weekInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'invalid' };
  }

  const { week, year } = parsed.data;

  if (!allowPast && schedulingWeek) {
    const isInPast =
      year < schedulingWeek.year || (year === schedulingWeek.year && week < schedulingWeek.week);

    if (isInPast) {
      return { success: false, error: 'past' };
    }
  }

  return { success: true, week, year };
};

export type ParseDayWeekResult =
  | { success: true; day: Day; week: number; year: number }
  | { success: false; error: 'invalid' };

/**
 * Parse day+week input in format "tue", "tue/5", or "tue/5/2026".
 * Day only: uses provided defaults.
 * Day/week: uses current year.
 * Day/week/year: uses specified year.
 */
export const parseDayWeekInput = (
  input: string,
  defaultWeek: { week: number; year: number },
): ParseDayWeekResult => {
  const parsed = dayWeekInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'invalid' };
  }

  const { day, week, year } = parsed.data;

  return {
    success: true,
    day,
    week: week ?? defaultWeek.week,
    year: year ?? (week !== null ? new Date().getFullYear() : defaultWeek.year),
  };
};

/**
 * Get the datetime for a match on a specific week/year/day/time.
 */
export const getMatchDateTime = (year: number, week: number, day: Day, time: string): Date => {
  const { start } = getWeekDateRange(year, week);
  const dayOffset = DAY_TO_ISO_WEEKDAY[day] - 1; // Monday is 0 offset
  const [hour, minute] = time.split(':').map(Number);

  const matchDate = new Date(start);
  matchDate.setDate(matchDate.getDate() + dayOffset);
  matchDate.setHours(hour, minute, 0, 0);

  return matchDate;
};

/**
 * Check if a match is in the future (hasn't been played yet).
 */
export const isMatchInFuture = (year: number, week: number, day: Day, time: string): boolean => {
  const matchDateTime = getMatchDateTime(year, week, day, time);
  return isBefore(new Date(), matchDateTime);
};
