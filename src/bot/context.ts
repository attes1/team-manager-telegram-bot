import type { Context } from 'grammy';
import type { Kysely } from 'kysely';
import type { Translations } from '../i18n';
import type { ParsedConfig } from '../lib/schemas';
import type { DB, Season } from '../types/db';

export interface SchedulingWeek {
  week: number;
  year: number;
}

export interface BotContext extends Context {
  db: Kysely<DB>;
  userId: number;
  isAdmin: boolean;
  isCaptain: boolean;
  isInRoster: boolean;
  isInPublicGroup: boolean;
  season?: Season;
  config?: ParsedConfig;
  schedulingWeek?: SchedulingWeek;
  i18n: Translations;
  // Used by /poll command to pass target week to menu on initial render
  pollTargetWeek?: { week: number; year: number };
  // Used by /match command to pass target week to lineup menu on initial render
  lineupTargetWeek?: { week: number; year: number };
}

export type SeasonContext = BotContext & {
  season: Season;
  config: ParsedConfig;
  schedulingWeek: SchedulingWeek;
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

export type CaptainContext = BotContext & {
  isCaptain: true;
};

export type CaptainSeasonContext = SeasonContext & {
  isCaptain: true;
};
