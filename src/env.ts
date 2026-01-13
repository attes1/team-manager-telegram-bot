import { z } from 'zod';

const commaSeparatedNumbers = (defaultVal?: string) =>
  z.preprocess(
    (val) => (val === undefined && defaultVal ? defaultVal : val),
    z.string().transform((val) => val.split(',').map((v) => Number(v.trim()))),
  );

const commaSeparatedStrings = (defaultVal?: string) =>
  z.preprocess(
    (val) => (val === undefined && defaultVal ? defaultVal : val),
    z.string().transform((val) => val.split(',').map((v) => v.trim())),
  );

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),

  TEAM_GROUP_ID: z.coerce.number(),
  PUBLIC_GROUP_ID: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? undefined : num;
    }),

  ADMIN_IDS: commaSeparatedNumbers(),

  DEFAULT_LANGUAGE: z.enum(['fi', 'en']).default('fi'),

  TZ: z.string().default('Europe/Helsinki'),

  DB_PATH: z.string().default('./data/bot.db'),

  DEFAULT_POLL_DAY: z.string().default('sun'),
  DEFAULT_POLL_TIME: z.string().default('10:00'),
  DEFAULT_POLL_DAYS: commaSeparatedStrings('mon,tue,wed,thu,fri,sat,sun'),
  DEFAULT_POLL_TIMES: commaSeparatedNumbers('19,20,21'),

  DEFAULT_POLL_REMINDER_DAY: z.string().default('wed'),
  DEFAULT_POLL_REMINDER_TIME: z.string().default('18:00'),
  DEFAULT_POLL_REMINDER_MODE: z.enum(['ping', 'quiet', 'off']).default('quiet'),

  DEFAULT_MATCH_DAY: z.string().default('sun'),
  DEFAULT_MATCH_TIME: z.string().default('20:00'),
  DEFAULT_MATCH_DAY_REMINDER_MODE: z.enum(['ping', 'quiet', 'off']).default('quiet'),
  DEFAULT_MATCH_DAY_REMINDER_TIME: z.string().default('18:00'),

  DEFAULT_LINEUP_SIZE: z.coerce.number().default(5),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
