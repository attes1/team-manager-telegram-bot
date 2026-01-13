import { describe, expect, test } from 'vitest';
import { formatDateRange, formatDay, formatDayShort } from '@/lib/format';

describe('formatDateRange', () => {
  test('formats date range for same month', () => {
    const start = new Date('2025-01-06');
    const end = new Date('2025-01-12');
    expect(formatDateRange(start, end)).toBe('6.1.2025 - 12.1.2025');
  });

  test('formats date range across months', () => {
    const start = new Date('2025-01-27');
    const end = new Date('2025-02-02');
    expect(formatDateRange(start, end)).toBe('27.1.2025 - 2.2.2025');
  });

  test('formats date range across years', () => {
    const start = new Date('2024-12-30');
    const end = new Date('2025-01-05');
    expect(formatDateRange(start, end)).toBe('30.12.2024 - 5.1.2025');
  });
});

describe('formatDay', () => {
  test('formats monday in Finnish', () => {
    expect(formatDay('mon', 'fi')).toBe('maanantai');
  });

  test('formats sunday in Finnish', () => {
    expect(formatDay('sun', 'fi')).toBe('sunnuntai');
  });

  test('formats monday in English', () => {
    expect(formatDay('mon', 'en')).toBe('Monday');
  });

  test('formats sunday in English', () => {
    expect(formatDay('sun', 'en')).toBe('Sunday');
  });
});

describe('formatDayShort', () => {
  test('formats monday short in Finnish', () => {
    expect(formatDayShort('mon', 'fi')).toBe('ma');
  });

  test('formats sunday short in Finnish', () => {
    expect(formatDayShort('sun', 'fi')).toBe('su');
  });

  test('formats monday short in English', () => {
    expect(formatDayShort('mon', 'en')).toBe('Mon');
  });

  test('formats sunday short in English', () => {
    expect(formatDayShort('sun', 'en')).toBe('Sun');
  });
});
