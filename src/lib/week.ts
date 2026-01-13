import { endOfISOWeek, getISOWeek, getISOWeekYear, setISOWeek, startOfISOWeek } from 'date-fns';

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
