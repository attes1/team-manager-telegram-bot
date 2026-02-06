// Payload format for buttons: "week:year" e.g. "5:2025"
// This is encoded in Telegram callback_data and always reliable
export const encodeWeekPayload = (week: number, year: number): string => `${week}:${year}`;

export const decodeWeekPayload = (
  payload: string | RegExpMatchArray | undefined,
): { week: number; year: number } | null => {
  if (!payload || typeof payload !== 'string') return null;
  const [weekStr, yearStr] = payload.split(':');
  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(week) || Number.isNaN(year)) return null;
  return { week, year };
};
