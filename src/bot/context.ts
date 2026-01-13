import type { Context } from 'grammy';
import type { Kysely } from 'kysely';
import type { Translations } from '../i18n';
import type { ParsedConfig } from '../lib/schemas';
import type { DB, Season } from '../types/db';

export interface BotContext extends Context {
  db: Kysely<DB>;
  userId: number;
  isAdmin: boolean;
  isInRoster: boolean;
  season?: Season;
  config?: ParsedConfig;
  i18n: Translations;
}

export type SeasonContext = BotContext & {
  season: Season;
  config: ParsedConfig;
};

export type RosterContext = SeasonContext & {
  isInRoster: true;
};

export type AdminContext = BotContext & {
  isAdmin: true;
};

export type AdminSeasonContext = SeasonContext & {
  isAdmin: true;
};
