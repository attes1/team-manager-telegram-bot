import { z } from 'zod';

const commaSeparatedNumbers = (defaultVal?: string) =>
  z.preprocess(
    (val) => (val === undefined && defaultVal ? defaultVal : val),
    z
      .string()
      .transform((val) => val.split(',').map((v) => Number(v.trim())))
      .pipe(z.array(z.number().int().finite())),
  );

const commaSeparatedStrings = (defaultVal?: string) =>
  z.preprocess(
    (val) => (val === undefined && defaultVal ? defaultVal : val),
    z.string().transform((val) => val.split(',').map((v) => v.trim())),
  );

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),

  DEV_MODE: z.coerce.boolean().default(false),

  ADMIN_IDS: commaSeparatedNumbers(),

  DEFAULT_LANGUAGE: z.enum(['fi', 'en']).default('fi'),

  TZ: z.string().default('Europe/Helsinki'),

  DB_PATH: z.string().default('./data/bot.db'),

  DEFAULT_POLL_DAY: z.string().default('sun'),
  DEFAULT_POLL_TIME: z.string().default('10:00'),
  DEFAULT_POLL_DAYS: commaSeparatedStrings('mon,tue,wed,thu,fri,sat,sun'),
  DEFAULT_POLL_TIMES: commaSeparatedNumbers('19,20,21'),
  DEFAULT_WEEK_CHANGE_DAY: z.string().default('sun'),
  DEFAULT_WEEK_CHANGE_TIME: z.string().default('10:00'),

  DEFAULT_POLL_REMINDER_DAY: z.string().default('wed'),
  DEFAULT_POLL_REMINDER_TIME: z.string().default('18:00'),
  DEFAULT_POLL_REMINDER_MODE: z.enum(['ping', 'quiet', 'off']).default('quiet'),

  DEFAULT_MATCH_DAY: z.string().default('sun'),
  DEFAULT_MATCH_TIME: z.string().default('20:00'),
  DEFAULT_MATCH_DAY_REMINDER_MODE: z.enum(['ping', 'quiet', 'off']).default('quiet'),
  DEFAULT_MATCH_DAY_REMINDER_TIME: z.string().default('18:00'),

  DEFAULT_LINEUP_SIZE: z.coerce.number().default(5),

  DEFAULT_PUBLIC_ANNOUNCEMENTS: z.enum(['on', 'off']).default('off'),
  DEFAULT_PUBLIC_COMMANDS_MODE: z.enum(['all', 'admins']).default('admins'),

  DEFAULT_MENU_EXPIRATION_HOURS: z.coerce.number().min(1).max(168).default(24),
  DEFAULT_MENU_CLEANUP_TIME: z.string().default('04:00'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
