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

const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const getDayOffset = (day: Day): number => DAYS.indexOf(day);

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
 * Get today's day of week as a Day type.
 * Uses JavaScript's getDay() (0=Sunday) and converts to ISO weekday format.
 */
export const getTodayDay = (): Day => {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Convert: Sun(0)->6, Mon(1)->0, Tue(2)->1, etc.
  const isoIndex = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS[isoIndex];
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
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

  const { start } = getWeekDateRange(currentWeek.year, currentWeek.week);

  const cutoffDate = new Date(start);
  cutoffDate.setDate(cutoffDate.getDate() + getDayOffset(cutoffDay));
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

const isWeekInPast = (
  week: number,
  year: number,
  reference: { week: number; year: number },
): boolean => year < reference.year || (year === reference.year && week < reference.week);

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

  if (!allowPast && schedulingWeek && isWeekInPast(week, year, schedulingWeek)) {
    return { success: false, error: 'past' };
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

export type ParseDayOrWeekResult =
  | { success: true; type: 'day'; day: Day; week: number; year: number }
  | { success: true; type: 'week'; week: number; year: number }
  | { success: false; error: 'invalid' | 'past' };

/**
 * Parse input that can be either day-based or week-based.
 * Handles: "tue", "tue/5", "tue/5/2026", "5", "5/2026"
 */
export const parseDayOrWeekInput = (
  input: string,
  options: {
    defaultWeek: { week: number; year: number };
    allowPast?: boolean;
    schedulingWeek?: { week: number; year: number };
  },
): ParseDayOrWeekResult => {
  const { defaultWeek, allowPast = true, schedulingWeek } = options;

  // Try day+week format first (tue, tue/5, tue/5/2026)
  const dayWeekResult = parseDayWeekInput(input.toLowerCase(), defaultWeek);
  if (dayWeekResult.success) {
    if (
      !allowPast &&
      schedulingWeek &&
      isWeekInPast(dayWeekResult.week, dayWeekResult.year, schedulingWeek)
    ) {
      return { success: false, error: 'past' };
    }
    return {
      success: true,
      type: 'day',
      day: dayWeekResult.day,
      week: dayWeekResult.week,
      year: dayWeekResult.year,
    };
  }

  // Try week-only format (5, 5/2026)
  const weekResult = parseWeekInput(input, { allowPast, schedulingWeek });
  if (weekResult.success) {
    return { success: true, type: 'week', week: weekResult.week, year: weekResult.year };
  }

  return { success: false, error: weekResult.error };
};

/**
 * Get the datetime for a match on a specific week/year/day/time.
 */
export const getMatchDateTime = (year: number, week: number, day: Day, time: string): Date => {
  const { start } = getWeekDateRange(year, week);
  const dayOffset = getDayOffset(day);
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
