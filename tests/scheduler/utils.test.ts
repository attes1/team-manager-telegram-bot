import { describe, expect, test } from 'vitest';
import { buildCronExpression, dayToCronWeekday, timeToCronTime } from '@/scheduler/utils';

describe('dayToCronWeekday', () => {
  test('converts sunday to 0', () => {
    expect(dayToCronWeekday('sun')).toBe(0);
  });

  test('converts monday to 1', () => {
    expect(dayToCronWeekday('mon')).toBe(1);
  });

  test('converts tuesday to 2', () => {
    expect(dayToCronWeekday('tue')).toBe(2);
  });

  test('converts wednesday to 3', () => {
    expect(dayToCronWeekday('wed')).toBe(3);
  });

  test('converts thursday to 4', () => {
    expect(dayToCronWeekday('thu')).toBe(4);
  });

  test('converts friday to 5', () => {
    expect(dayToCronWeekday('fri')).toBe(5);
  });

  test('converts saturday to 6', () => {
    expect(dayToCronWeekday('sat')).toBe(6);
  });

  test('throws for invalid day', () => {
    expect(() => dayToCronWeekday('invalid')).toThrow();
  });
});

describe('timeToCronTime', () => {
  test('parses 10:00', () => {
    expect(timeToCronTime('10:00')).toEqual({ minute: 0, hour: 10 });
  });

  test('parses 09:30', () => {
    expect(timeToCronTime('09:30')).toEqual({ minute: 30, hour: 9 });
  });

  test('parses 23:59', () => {
    expect(timeToCronTime('23:59')).toEqual({ minute: 59, hour: 23 });
  });

  test('parses 00:00', () => {
    expect(timeToCronTime('00:00')).toEqual({ minute: 0, hour: 0 });
  });

  test('parses single digit hour', () => {
    expect(timeToCronTime('9:30')).toEqual({ minute: 30, hour: 9 });
  });

  test('throws for invalid format', () => {
    expect(() => timeToCronTime('invalid')).toThrow('Invalid time format');
  });

  test('throws for missing colon', () => {
    expect(() => timeToCronTime('1030')).toThrow('Invalid time format');
  });

  test('throws for invalid hour', () => {
    expect(() => timeToCronTime('25:00')).toThrow('Invalid time');
  });

  test('throws for invalid minute', () => {
    expect(() => timeToCronTime('10:60')).toThrow('Invalid time');
  });
});

describe('buildCronExpression', () => {
  test('builds cron for sunday 10:00', () => {
    expect(buildCronExpression('sun', '10:00')).toBe('0 10 * * 0');
  });

  test('builds cron for monday 18:30', () => {
    expect(buildCronExpression('mon', '18:30')).toBe('30 18 * * 1');
  });

  test('builds cron for wednesday 09:00', () => {
    expect(buildCronExpression('wed', '09:00')).toBe('0 9 * * 3');
  });

  test('handles negative hour offset', () => {
    // Sunday 20:00 - 2 hours = Sunday 18:00
    expect(buildCronExpression('sun', '20:00', -2)).toBe('0 18 * * 0');
  });

  test('handles hour offset crossing midnight backwards', () => {
    // Sunday 01:00 - 2 hours = Saturday 23:00
    expect(buildCronExpression('sun', '01:00', -2)).toBe('0 23 * * 6');
  });

  test('handles positive hour offset', () => {
    // Sunday 10:00 + 2 hours = Sunday 12:00
    expect(buildCronExpression('sun', '10:00', 2)).toBe('0 12 * * 0');
  });

  test('handles hour offset crossing midnight forwards', () => {
    // Saturday 23:00 + 2 hours = Sunday 01:00
    expect(buildCronExpression('sat', '23:00', 2)).toBe('0 1 * * 0');
  });

  test('handles monday offset crossing to sunday', () => {
    // Monday 01:00 - 2 hours = Sunday 23:00
    expect(buildCronExpression('mon', '01:00', -2)).toBe('0 23 * * 0');
  });
});
