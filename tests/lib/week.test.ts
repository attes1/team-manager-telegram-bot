import { getCurrentWeek, getWeekDateRange, getWeekNumber, getWeekYear } from '@/lib/week';
import { format } from 'date-fns';
import { describe, expect, test } from 'vitest';

const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

describe('getWeekNumber', () => {
  test('returns correct ISO week number', () => {
    expect(getWeekNumber(new Date('2025-01-06'))).toBe(2);
  });

  test('handles year boundary - late December can be week 1', () => {
    expect(getWeekNumber(new Date('2024-12-30'))).toBe(1);
  });

  test('handles year boundary - early January can be week 52/53', () => {
    expect(getWeekNumber(new Date('2025-01-01'))).toBe(1);
  });

  test('returns week 1 for first full week of year', () => {
    expect(getWeekNumber(new Date('2025-01-06'))).toBe(2);
  });
});

describe('getWeekYear', () => {
  test('returns ISO week year', () => {
    expect(getWeekYear(new Date('2025-01-06'))).toBe(2025);
  });

  test('late December can belong to next year', () => {
    expect(getWeekYear(new Date('2024-12-30'))).toBe(2025);
  });
});

describe('getWeekDateRange', () => {
  test('returns monday to sunday range', () => {
    const { start, end } = getWeekDateRange(2025, 2);
    expect(formatDate(start)).toBe('2025-01-06');
    expect(formatDate(end)).toBe('2025-01-12');
  });

  test('returns correct range for week 1', () => {
    const { start, end } = getWeekDateRange(2025, 1);
    expect(formatDate(start)).toBe('2024-12-30');
    expect(formatDate(end)).toBe('2025-01-05');
  });
});

describe('getCurrentWeek', () => {
  test('returns object with week and year', () => {
    const result = getCurrentWeek();
    expect(result).toHaveProperty('week');
    expect(result).toHaveProperty('year');
    expect(typeof result.week).toBe('number');
    expect(typeof result.year).toBe('number');
  });

  test('week is between 1 and 53', () => {
    const { week } = getCurrentWeek();
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});
