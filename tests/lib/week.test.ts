import { format } from 'date-fns';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getCurrentWeek,
  getTargetWeek,
  getWeekDateRange,
  getWeekNumber,
  getWeekYear,
  inferWeekYear,
} from '@/lib/week';

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

describe('getTargetWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns current week when before cutoff', () => {
    // Wednesday 09:00 of week 2, 2025 - before Thursday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('returns next week when after cutoff', () => {
    // Thursday 11:00 of week 2, 2025 - after Thursday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T11:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('returns next week when exactly at cutoff time', () => {
    // Thursday 10:00 of week 2, 2025 - exactly at cutoff
    vi.setSystemTime(new Date('2025-01-09T10:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('returns current week on cutoff day before cutoff time', () => {
    // Thursday 09:59 of week 2, 2025 - just before cutoff
    vi.setSystemTime(new Date('2025-01-09T09:59:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles year boundary - week 52 to week 1', () => {
    // Friday of week 52, 2025 - after Thursday cutoff, should return week 1 of 2026
    vi.setSystemTime(new Date('2025-12-26T11:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2026 });
  });

  test('handles different cutoff day - Monday', () => {
    // Tuesday of week 2, 2025 - after Monday cutoff
    vi.setSystemTime(new Date('2025-01-07T11:00:00'));

    const result = getTargetWeek('mon', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Sunday cutoff', () => {
    // Sunday 20:00 of week 2, 2025 - after Sunday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-12T20:00:00'));

    const result = getTargetWeek('sun', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles early morning cutoff', () => {
    // Thursday 06:00 of week 2, 2025 - after Thursday 05:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T06:00:00'));

    const result = getTargetWeek('thu', '05:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Saturday cutoff', () => {
    // Saturday 15:00 of week 2, 2025 - after Saturday 12:00 cutoff
    vi.setSystemTime(new Date('2025-01-11T15:00:00'));

    const result = getTargetWeek('sat', '12:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles late evening cutoff', () => {
    // Thursday 23:30 of week 2, 2025 - after Thursday 23:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T23:30:00'));

    const result = getTargetWeek('thu', '23:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Friday cutoff on Monday before cutoff', () => {
    // Monday 09:00 of week 2, 2025 - before Friday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-06T09:00:00'));

    const result = getTargetWeek('fri', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles Friday cutoff on Saturday after cutoff', () => {
    // Saturday 09:00 of week 2, 2025 - after Friday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-11T09:00:00'));

    const result = getTargetWeek('fri', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles week 1 before cutoff returns week 1', () => {
    // Wednesday of week 1, 2025 - before Thursday cutoff
    vi.setSystemTime(new Date('2025-01-01T09:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2025 });
  });

  test('handles week 1 after cutoff returns week 2', () => {
    // Friday of week 1, 2025 - after Thursday cutoff
    vi.setSystemTime(new Date('2025-01-03T11:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles midnight cutoff - before', () => {
    // Thursday 23:59 of week 2, 2025 - before Friday 00:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T23:59:00'));

    const result = getTargetWeek('fri', '00:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles midnight cutoff - at midnight', () => {
    // Friday 00:00 of week 2, 2025 - at Friday 00:00 cutoff
    vi.setSystemTime(new Date('2025-01-10T00:00:00'));

    const result = getTargetWeek('fri', '00:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Wednesday cutoff on Tuesday', () => {
    // Tuesday 18:00 of week 2, 2025 - before Wednesday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-07T18:00:00'));

    const result = getTargetWeek('wed', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles year boundary - week 1 of new year before cutoff', () => {
    // Monday of week 1, 2025 (Dec 30, 2024) - before Thursday cutoff
    vi.setSystemTime(new Date('2024-12-30T09:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2025 });
  });

  test('handles year boundary - week 1 of new year after cutoff', () => {
    // Friday of week 1, 2025 (Jan 3, 2025) - after Thursday cutoff
    vi.setSystemTime(new Date('2025-01-03T11:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles week 53 years - 2026 has 53 weeks', () => {
    // Friday of week 53, 2026 - after Thursday cutoff, should return week 1 of 2027
    vi.setSystemTime(new Date('2027-01-01T11:00:00'));

    const result = getTargetWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2027 });
  });
});

describe('inferWeekYear', () => {
  test('uses current year when requested week >= target week', () => {
    const targetWeek = { week: 5, year: 2025 };
    const result = inferWeekYear(8, targetWeek);
    expect(result).toEqual({ week: 8, year: 2025 });
  });

  test('uses current year when requested week equals target week', () => {
    const targetWeek = { week: 5, year: 2025 };
    const result = inferWeekYear(5, targetWeek);
    expect(result).toEqual({ week: 5, year: 2025 });
  });

  test('uses next year when requested week < target week', () => {
    const targetWeek = { week: 51, year: 2025 };
    const result = inferWeekYear(2, targetWeek);
    expect(result).toEqual({ week: 2, year: 2026 });
  });

  test('uses next year when on week 52 requesting week 1', () => {
    const targetWeek = { week: 52, year: 2025 };
    const result = inferWeekYear(1, targetWeek);
    expect(result).toEqual({ week: 1, year: 2026 });
  });

  test('uses current year when on week 1 requesting week 2', () => {
    const targetWeek = { week: 1, year: 2026 };
    const result = inferWeekYear(2, targetWeek);
    expect(result).toEqual({ week: 2, year: 2026 });
  });

  test('handles week 53 years', () => {
    // 2026 has 53 weeks
    const targetWeek = { week: 53, year: 2026 };
    const result = inferWeekYear(2, targetWeek);
    expect(result).toEqual({ week: 2, year: 2027 });
  });
});
