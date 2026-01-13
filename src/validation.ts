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

export const daysListSchema = z
  .string()
  .transform((val) => val.split(',').map((v) => v.trim()))
  .refine(
    (arr): arr is Day[] => arr.every((d) => daySchema.safeParse(d).success),
    'Invalid day in list',
  );

export const hoursListSchema = z
  .string()
  .transform((val) => val.split(',').map((v) => Number(v.trim())))
  .refine(
    (arr): arr is number[] => arr.every((h) => hourSchema.safeParse(h).success),
    'Invalid hour in list',
  );

export type Day = z.infer<typeof daySchema>;
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;
export type WeekType = z.infer<typeof weekTypeSchema>;
export type RemindersMode = z.infer<typeof remindersModeSchema>;
export type SeasonStatus = z.infer<typeof seasonStatusSchema>;
