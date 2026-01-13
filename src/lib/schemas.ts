import { z } from 'zod';

export const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'Invalid time format, expected HH:MM (e.g., 09:00, 14:30, 21:00)',
  );

export const hourSchema = z.coerce.number().int().min(0).max(23);

export const daySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const availabilityStatusSchema = z.enum([
  'available',
  'practice_only',
  'match_only',
  'if_needed',
  'unavailable',
]);

export const weekTypeSchema = z.enum(['match', 'practice']);

export const remindersModeSchema = z.enum(['ping', 'quiet', 'off']);

export const seasonStatusSchema = z.enum(['active', 'ended']);

export const rosterRoleSchema = z.enum(['player', 'captain']);

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

export type Day = z.infer<typeof daySchema>;
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;
export type WeekType = z.infer<typeof weekTypeSchema>;
export type RemindersMode = z.infer<typeof remindersModeSchema>;
export type SeasonStatus = z.infer<typeof seasonStatusSchema>;
export type RosterRole = z.infer<typeof rosterRoleSchema>;
export type Language = z.infer<typeof languageSchema>;

export const configSchema = z.object({
  seasonId: z.number(),
  language: languageSchema.catch('fi'),
  pollDay: daySchema.catch('sun'),
  pollTime: timeSchema.catch('10:00'),
  pollDays: daysListSchema.catch(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  pollTimes: pollTimesSchema.catch('19,20,21'),
  reminderDay: daySchema.catch('wed'),
  reminderTime: timeSchema.catch('18:00'),
  remindersMode: remindersModeSchema.catch('quiet'),
  matchDay: daySchema.catch('sun'),
  matchTime: timeSchema.catch('20:00'),
  lineupSize: z.number().catch(5),
  matchDayReminderEnabled: z.coerce.boolean().catch(true),
  matchDayReminderTime: timeSchema.catch('18:00'),
});

export type ParsedConfig = z.infer<typeof configSchema>;
