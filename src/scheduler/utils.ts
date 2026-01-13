import type { Day } from '../lib/schemas';

const DAY_TO_WEEKDAY: Record<Day, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export const dayToCronWeekday = (day: string): number => {
  const weekday = DAY_TO_WEEKDAY[day as Day];
  if (weekday === undefined) {
    throw new Error(`Invalid day: ${day}`);
  }
  return weekday;
};

export const timeToCronTime = (time: string): { minute: number; hour: number } => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time: ${time}`);
  }

  return { minute, hour };
};

export const buildCronExpression = (day: string, time: string, hourOffset = 0): string => {
  const { minute, hour } = timeToCronTime(time);
  const weekday = dayToCronWeekday(day);

  let adjustedHour = hour + hourOffset;
  let adjustedWeekday = weekday;

  if (adjustedHour < 0) {
    adjustedHour += 24;
    adjustedWeekday = (weekday - 1 + 7) % 7;
  } else if (adjustedHour >= 24) {
    adjustedHour -= 24;
    adjustedWeekday = (weekday + 1) % 7;
  }

  return `${minute} ${adjustedHour} * * ${adjustedWeekday}`;
};
