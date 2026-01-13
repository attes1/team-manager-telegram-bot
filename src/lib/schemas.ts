import { z } from 'zod';

export const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'Invalid time format, expected HH:MM (e.g., 09:00, 14:30, 21:00)',
  );

export const hourSchema = z.coerce.number().int().min(0).max(23);

export const weekNumberSchema = z.coerce.number().int().min(1).max(53);

export const daySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const availabilityStatusSchema = z.enum([
  'available',
  'practice_only',
  'match_only',
  'if_needed',
  'unavailable',
]);

export const weekTypeSchema = z.enum(['match', 'practice']);

export const availFilterSchema = z.enum(['practice', 'match']);

export const remindersModeSchema = z.enum(['ping', 'quiet', 'off']);

export const onOffSchema = z.enum(['on', 'off']);

export const seasonStatusSchema = z.enum(['active', 'ended']);

export const rosterRoleSchema = z.enum(['player', 'captain']);

export const groupTypeSchema = z.enum(['public', 'team']);

export const languageSchema = z.enum(['fi', 'en']);

export const daysListSchema = z
  .string()
  .transform((val) => val.split(',').map((v) => v.trim()))
  .pipe(z.array(daySchema));

export const hoursListSchema = z
  .string()
  .transform((val) => val.split(',').map((v) => hourSchema.parse(v.trim())));

export const pollTimesSchema = z
  .string()
  .refine((val) => val.split(',').length <= 5, 'Maximum 5 time slots allowed');

// Year schema: accepts current year or next year only
export const yearSchema = z.coerce
  .number()
  .int()
  .refine(
    (year) => {
      const currentYear = new Date().getFullYear();
      return year >= currentYear && year <= currentYear + 1;
    },
    { message: 'Year must be current or next year' },
  );

// Week input: "5" or "5/2026" -> { week, year }
export const weekInputSchema = z.string().transform((input, ctx) => {
  const parts = input.split('/');

  if (parts.length === 1) {
    const weekResult = weekNumberSchema.safeParse(parts[0]);
    if (!weekResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid week number (1-53)' });
      return z.NEVER;
    }
    return { week: weekResult.data, year: new Date().getFullYear() };
  }

  if (parts.length === 2) {
    const weekResult = weekNumberSchema.safeParse(parts[0]);
    const yearResult = yearSchema.safeParse(parts[1]);
    if (!weekResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid week number (1-53)' });
      return z.NEVER;
    }
    if (!yearResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Year must be current or next year' });
      return z.NEVER;
    }
    return { week: weekResult.data, year: yearResult.data };
  }

  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid format. Use: 5 or 5/2026' });
  return z.NEVER;
});

// Day+week input: "tue", "tue/5", or "tue/5/2026" -> { day, week, year }
// week and year are null if not specified (caller provides defaults)
export const dayWeekInputSchema = z.string().transform((input, ctx) => {
  const parts = input.toLowerCase().split('/');

  if (parts.length === 1) {
    const dayResult = daySchema.safeParse(parts[0]);
    if (!dayResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid day (mon-sun)' });
      return z.NEVER;
    }
    return { day: dayResult.data, week: null as number | null, year: null as number | null };
  }

  if (parts.length === 2) {
    const dayResult = daySchema.safeParse(parts[0]);
    const weekResult = weekNumberSchema.safeParse(parts[1]);
    if (!dayResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid day (mon-sun)' });
      return z.NEVER;
    }
    if (!weekResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid week number (1-53)' });
      return z.NEVER;
    }
    return { day: dayResult.data, week: weekResult.data, year: null as number | null };
  }

  if (parts.length === 3) {
    const dayResult = daySchema.safeParse(parts[0]);
    const weekResult = weekNumberSchema.safeParse(parts[1]);
    const yearResult = yearSchema.safeParse(parts[2]);
    if (!dayResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid day (mon-sun)' });
      return z.NEVER;
    }
    if (!weekResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid week number (1-53)' });
      return z.NEVER;
    }
    if (!yearResult.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Year must be current or next year' });
      return z.NEVER;
    }
    return { day: dayResult.data, week: weekResult.data, year: yearResult.data };
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Invalid format. Use: tue, tue/5, or tue/5/2026',
  });
  return z.NEVER;
});

export type Day = z.infer<typeof daySchema>;
export type WeekInput = z.infer<typeof weekInputSchema>;
export type DayWeekInput = z.infer<typeof dayWeekInputSchema>;
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;
export type WeekType = z.infer<typeof weekTypeSchema>;
export type RemindersMode = z.infer<typeof remindersModeSchema>;
export type OnOff = z.infer<typeof onOffSchema>;
export type SeasonStatus = z.infer<typeof seasonStatusSchema>;
export type RosterRole = z.infer<typeof rosterRoleSchema>;
export type GroupType = z.infer<typeof groupTypeSchema>;
export type Language = z.infer<typeof languageSchema>;

export const configSchema = z.object({
  seasonId: z.number(),
  language: languageSchema.catch('fi'),
  pollDay: daySchema.catch('sun'),
  pollTime: timeSchema.catch('10:00'),
  pollDays: daysListSchema.catch(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  pollTimes: pollTimesSchema.catch('19,20,21'),
  weekChangeDay: daySchema.catch('thu'),
  weekChangeTime: timeSchema.catch('10:00'),
  reminderDay: daySchema.catch('wed'),
  reminderTime: timeSchema.catch('18:00'),
  remindersMode: remindersModeSchema.catch('quiet'),
  matchDay: daySchema.catch('sun'),
  matchTime: timeSchema.catch('20:00'),
  lineupSize: z.number().catch(5),
  matchDayReminderMode: remindersModeSchema.catch('quiet'),
  matchDayReminderTime: timeSchema.catch('18:00'),
  publicAnnouncements: onOffSchema.catch('on'),
  menuExpirationHours: z.number().int().min(1).max(168).catch(24),
  menuCleanupTime: timeSchema.catch('04:00'),
});

export type ParsedConfig = z.infer<typeof configSchema>;
