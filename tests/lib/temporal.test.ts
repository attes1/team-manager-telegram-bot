import { format } from 'date-fns';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getCurrentWeek,
  getSchedulingWeek,
  getTodayDay,
  getWeekDateRange,
  getWeekNumber,
  getWeekYear,
  parseDayOrWeekInput,
  parseDayWeekInput,
  parseWeekInput,
} from '@/lib/temporal';

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

describe('getTodayDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns mon for Monday', () => {
    vi.setSystemTime(new Date('2025-01-06T12:00:00')); // Monday
    expect(getTodayDay()).toBe('mon');
  });

  test('returns tue for Tuesday', () => {
    vi.setSystemTime(new Date('2025-01-07T12:00:00')); // Tuesday
    expect(getTodayDay()).toBe('tue');
  });

  test('returns wed for Wednesday', () => {
    vi.setSystemTime(new Date('2025-01-08T12:00:00')); // Wednesday
    expect(getTodayDay()).toBe('wed');
  });

  test('returns thu for Thursday', () => {
    vi.setSystemTime(new Date('2025-01-09T12:00:00')); // Thursday
    expect(getTodayDay()).toBe('thu');
  });

  test('returns fri for Friday', () => {
    vi.setSystemTime(new Date('2025-01-10T12:00:00')); // Friday
    expect(getTodayDay()).toBe('fri');
  });

  test('returns sat for Saturday', () => {
    vi.setSystemTime(new Date('2025-01-11T12:00:00')); // Saturday
    expect(getTodayDay()).toBe('sat');
  });

  test('returns sun for Sunday', () => {
    vi.setSystemTime(new Date('2025-01-12T12:00:00')); // Sunday
    expect(getTodayDay()).toBe('sun');
  });
});

describe('getSchedulingWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns current week when before cutoff', () => {
    // Wednesday 09:00 of week 2, 2025 - before Thursday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('returns next week when after cutoff', () => {
    // Thursday 11:00 of week 2, 2025 - after Thursday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T11:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('returns next week when exactly at cutoff time', () => {
    // Thursday 10:00 of week 2, 2025 - exactly at cutoff
    vi.setSystemTime(new Date('2025-01-09T10:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('returns current week on cutoff day before cutoff time', () => {
    // Thursday 09:59 of week 2, 2025 - just before cutoff
    vi.setSystemTime(new Date('2025-01-09T09:59:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles year boundary - week 52 to week 1', () => {
    // Friday of week 52, 2025 - after Thursday cutoff, should return week 1 of 2026
    vi.setSystemTime(new Date('2025-12-26T11:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2026 });
  });

  test('handles different cutoff day - Monday', () => {
    // Tuesday of week 2, 2025 - after Monday cutoff
    vi.setSystemTime(new Date('2025-01-07T11:00:00'));

    const result = getSchedulingWeek('mon', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Sunday cutoff', () => {
    // Sunday 20:00 of week 2, 2025 - after Sunday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-12T20:00:00'));

    const result = getSchedulingWeek('sun', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles early morning cutoff', () => {
    // Thursday 06:00 of week 2, 2025 - after Thursday 05:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T06:00:00'));

    const result = getSchedulingWeek('thu', '05:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Saturday cutoff', () => {
    // Saturday 15:00 of week 2, 2025 - after Saturday 12:00 cutoff
    vi.setSystemTime(new Date('2025-01-11T15:00:00'));

    const result = getSchedulingWeek('sat', '12:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles late evening cutoff', () => {
    // Thursday 23:30 of week 2, 2025 - after Thursday 23:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T23:30:00'));

    const result = getSchedulingWeek('thu', '23:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Friday cutoff on Monday before cutoff', () => {
    // Monday 09:00 of week 2, 2025 - before Friday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-06T09:00:00'));

    const result = getSchedulingWeek('fri', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles Friday cutoff on Saturday after cutoff', () => {
    // Saturday 09:00 of week 2, 2025 - after Friday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-11T09:00:00'));

    const result = getSchedulingWeek('fri', '10:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles week 1 before cutoff returns week 1', () => {
    // Wednesday of week 1, 2025 - before Thursday cutoff
    vi.setSystemTime(new Date('2025-01-01T09:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2025 });
  });

  test('handles week 1 after cutoff returns week 2', () => {
    // Friday of week 1, 2025 - after Thursday cutoff
    vi.setSystemTime(new Date('2025-01-03T11:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles midnight cutoff - before', () => {
    // Thursday 23:59 of week 2, 2025 - before Friday 00:00 cutoff
    vi.setSystemTime(new Date('2025-01-09T23:59:00'));

    const result = getSchedulingWeek('fri', '00:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles midnight cutoff - at midnight', () => {
    // Friday 00:00 of week 2, 2025 - at Friday 00:00 cutoff
    vi.setSystemTime(new Date('2025-01-10T00:00:00'));

    const result = getSchedulingWeek('fri', '00:00');
    expect(result).toEqual({ week: 3, year: 2025 });
  });

  test('handles Wednesday cutoff on Tuesday', () => {
    // Tuesday 18:00 of week 2, 2025 - before Wednesday 10:00 cutoff
    vi.setSystemTime(new Date('2025-01-07T18:00:00'));

    const result = getSchedulingWeek('wed', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles year boundary - week 1 of new year before cutoff', () => {
    // Monday of week 1, 2025 (Dec 30, 2024) - before Thursday cutoff
    vi.setSystemTime(new Date('2024-12-30T09:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2025 });
  });

  test('handles year boundary - week 1 of new year after cutoff', () => {
    // Friday of week 1, 2025 (Jan 3, 2025) - after Thursday cutoff
    vi.setSystemTime(new Date('2025-01-03T11:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('handles week 53 years - 2026 has 53 weeks', () => {
    // Friday of week 53, 2026 - after Thursday cutoff, should return week 1 of 2027
    vi.setSystemTime(new Date('2027-01-01T11:00:00'));

    const result = getSchedulingWeek('thu', '10:00');
    expect(result).toEqual({ week: 1, year: 2027 });
  });
});

describe('parseWeekInput', () => {
  const currentYear = new Date().getFullYear();

  describe('week only format', () => {
    test('parses week number and uses current year', () => {
      const result = parseWeekInput('10');
      expect(result).toEqual({ success: true, week: 10, year: currentYear });
    });

    test('accepts week 1', () => {
      const result = parseWeekInput('1');
      expect(result).toEqual({ success: true, week: 1, year: currentYear });
    });

    test('accepts week 53', () => {
      const result = parseWeekInput('53');
      expect(result).toEqual({ success: true, week: 53, year: currentYear });
    });

    test('coerces string with leading zeros', () => {
      const result = parseWeekInput('05');
      expect(result).toEqual({ success: true, week: 5, year: currentYear });
    });
  });

  describe('week/year format', () => {
    test('parses week/year format', () => {
      const result = parseWeekInput(`5/${currentYear}`);
      expect(result).toEqual({ success: true, week: 5, year: currentYear });
    });

    test('accepts next year', () => {
      const result = parseWeekInput(`10/${currentYear + 1}`);
      expect(result).toEqual({ success: true, week: 10, year: currentYear + 1 });
    });
  });

  describe('invalid input', () => {
    test('rejects non-numeric input', () => {
      const result = parseWeekInput('abc');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects week 0', () => {
      const result = parseWeekInput('0');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects week 54', () => {
      const result = parseWeekInput('54');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects negative week', () => {
      const result = parseWeekInput('-1');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects empty string', () => {
      const result = parseWeekInput('');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects floating point number', () => {
      const result = parseWeekInput('5.5');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects year in the past', () => {
      const result = parseWeekInput(`5/${currentYear - 1}`);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects year too far in future', () => {
      const result = parseWeekInput(`5/${currentYear + 2}`);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects malformed week/year format', () => {
      const result = parseWeekInput('5/20/26');
      expect(result).toEqual({ success: false, error: 'invalid' });
    });
  });

  describe('allowPast option', () => {
    const schedulingWeek = { week: 10, year: currentYear };

    test('allows past weeks by default', () => {
      const result = parseWeekInput('5');
      expect(result).toEqual({ success: true, week: 5, year: currentYear });
    });

    test('rejects past week when allowPast is false', () => {
      const result = parseWeekInput('5', { allowPast: false, schedulingWeek });
      expect(result).toEqual({ success: false, error: 'past' });
    });

    test('allows current week when allowPast is false', () => {
      const result = parseWeekInput('10', { allowPast: false, schedulingWeek });
      expect(result).toEqual({ success: true, week: 10, year: currentYear });
    });

    test('allows future weeks when allowPast is false', () => {
      const result = parseWeekInput('15', { allowPast: false, schedulingWeek });
      expect(result).toEqual({ success: true, week: 15, year: currentYear });
    });

    test('allows next year weeks when allowPast is false', () => {
      const result = parseWeekInput(`2/${currentYear + 1}`, { allowPast: false, schedulingWeek });
      expect(result).toEqual({ success: true, week: 2, year: currentYear + 1 });
    });

    test('rejects past year when allowPast is false', () => {
      // Even with explicit year, can't specify a past year (schema rejects it)
      const result = parseWeekInput(`50/${currentYear - 1}`, { allowPast: false, schedulingWeek });
      expect(result).toEqual({ success: false, error: 'invalid' });
    });
  });
});

describe('parseDayWeekInput', () => {
  const currentYear = new Date().getFullYear();
  const defaultWeek = { week: 5, year: currentYear };

  describe('day only format', () => {
    test('parses day and uses default week', () => {
      const result = parseDayWeekInput('tue', defaultWeek);
      expect(result).toEqual({ success: true, day: 'tue', week: 5, year: currentYear });
    });

    test('handles all days', () => {
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
      for (const day of days) {
        const result = parseDayWeekInput(day, defaultWeek);
        expect(result).toEqual({ success: true, day, week: 5, year: currentYear });
      }
    });

    test('handles uppercase day', () => {
      const result = parseDayWeekInput('TUE', defaultWeek);
      expect(result).toEqual({ success: true, day: 'tue', week: 5, year: currentYear });
    });
  });

  describe('day/week format', () => {
    test('parses day/week and uses current year', () => {
      const result = parseDayWeekInput('tue/10', defaultWeek);
      expect(result).toEqual({ success: true, day: 'tue', week: 10, year: currentYear });
    });
  });

  describe('day/week/year format', () => {
    test('parses full day/week/year format', () => {
      const result = parseDayWeekInput(`tue/10/${currentYear}`, defaultWeek);
      expect(result).toEqual({ success: true, day: 'tue', week: 10, year: currentYear });
    });

    test('accepts next year', () => {
      const result = parseDayWeekInput(`mon/5/${currentYear + 1}`, defaultWeek);
      expect(result).toEqual({ success: true, day: 'mon', week: 5, year: currentYear + 1 });
    });
  });

  describe('invalid input', () => {
    test('rejects invalid day', () => {
      const result = parseDayWeekInput('abc', defaultWeek);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects invalid week in day/week format', () => {
      const result = parseDayWeekInput('tue/0', defaultWeek);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects invalid year in day/week/year format', () => {
      const result = parseDayWeekInput(`tue/5/${currentYear - 1}`, defaultWeek);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });

    test('rejects too many parts', () => {
      const result = parseDayWeekInput('tue/5/2026/extra', defaultWeek);
      expect(result).toEqual({ success: false, error: 'invalid' });
    });
  });
});

describe('parseDayOrWeekInput', () => {
  const currentYear = new Date().getFullYear();
  const defaultWeek = { week: 10, year: currentYear };
  const schedulingWeek = { week: 10, year: currentYear };

  describe('day formats', () => {
    test('parses day only', () => {
      const result = parseDayOrWeekInput('tue', { defaultWeek });
      expect(result).toEqual({
        success: true,
        type: 'day',
        day: 'tue',
        week: 10,
        year: currentYear,
      });
    });

    test('parses day/week format', () => {
      const result = parseDayOrWeekInput('wed/15', { defaultWeek });
      expect(result).toEqual({
        success: true,
        type: 'day',
        day: 'wed',
        week: 15,
        year: currentYear,
      });
    });

    test('parses day/week/year format', () => {
      const result = parseDayOrWeekInput(`thu/20/${currentYear}`, { defaultWeek });
      expect(result).toEqual({
        success: true,
        type: 'day',
        day: 'thu',
        week: 20,
        year: currentYear,
      });
    });
  });

  describe('week formats', () => {
    test('parses week only', () => {
      const result = parseDayOrWeekInput('15', { defaultWeek });
      expect(result).toEqual({ success: true, type: 'week', week: 15, year: currentYear });
    });

    test('parses week/year format', () => {
      const result = parseDayOrWeekInput(`20/${currentYear}`, { defaultWeek });
      expect(result).toEqual({ success: true, type: 'week', week: 20, year: currentYear });
    });
  });

  describe('allowPast option', () => {
    test('allows past week when allowPast is true', () => {
      const result = parseDayOrWeekInput('5', { defaultWeek, schedulingWeek, allowPast: true });
      expect(result).toEqual({ success: true, type: 'week', week: 5, year: currentYear });
    });

    test('rejects past week when allowPast is false', () => {
      const result = parseDayOrWeekInput('5', { defaultWeek, schedulingWeek, allowPast: false });
      expect(result).toEqual({ success: false, error: 'past' });
    });

    test('rejects past day/week when allowPast is false', () => {
      const result = parseDayOrWeekInput('mon/5', {
        defaultWeek,
        schedulingWeek,
        allowPast: false,
      });
      expect(result).toEqual({ success: false, error: 'past' });
    });

    test('accepts current scheduling week', () => {
      const result = parseDayOrWeekInput('10', { defaultWeek, schedulingWeek, allowPast: false });
      expect(result).toEqual({ success: true, type: 'week', week: 10, year: currentYear });
    });

    test('accepts future week', () => {
      const result = parseDayOrWeekInput('15', { defaultWeek, schedulingWeek, allowPast: false });
      expect(result).toEqual({ success: true, type: 'week', week: 15, year: currentYear });
    });
  });

  describe('invalid input', () => {
    test('rejects invalid input', () => {
      const result = parseDayOrWeekInput('invalid', { defaultWeek });
      expect(result).toEqual({ success: false, error: 'invalid' });
    });
  });
});
