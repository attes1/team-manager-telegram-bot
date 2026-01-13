import type { Generated, Selectable } from 'kysely';
import type {
  AvailabilityStatus,
  Day,
  RemindersMode,
  RosterRole,
  SeasonStatus,
  WeekType,
} from '../lib/schemas';

export interface SeasonsTable {
  id: Generated<number>;
  name: string;
  status: Generated<SeasonStatus>;
  createdAt: Generated<string>;
  endedAt: string | null;
}

export interface ConfigTable {
  seasonId: number;
  language: Generated<string>;
  pollDay: Generated<string>;
  pollTime: Generated<string>;
  pollDays: Generated<string>;
  pollTimes: Generated<string>;
  pollCutoffDay: Generated<string>;
  pollCutoffTime: Generated<string>;
  reminderDay: Generated<string>;
  reminderTime: Generated<string>;
  remindersMode: Generated<RemindersMode>;
  matchDay: Generated<string>;
  matchTime: Generated<string>;
  lineupSize: Generated<number>;
  matchDayReminderMode: Generated<RemindersMode>;
  matchDayReminderTime: Generated<string>;
  publicAnnouncements: Generated<string>;
}

export interface PlayersTable {
  telegramId: number;
  username: string | null;
  displayName: string;
  createdAt: Generated<string>;
}

export interface SeasonRosterTable {
  seasonId: number;
  playerId: number;
  role: Generated<RosterRole>;
  addedAt: Generated<string>;
}

export interface DayResponsesTable {
  id: Generated<number>;
  seasonId: number;
  playerId: number;
  weekNumber: number;
  year: number;
  day: Day;
  status: AvailabilityStatus;
  updatedAt: Generated<string>;
}

export interface TimeSlotsTable {
  id: Generated<number>;
  dayResponseId: number;
  timeSlot: string;
}

export interface WeeksTable {
  seasonId: number;
  weekNumber: number;
  year: number;
  type: Generated<WeekType>;
  matchDay: Day | null;
  matchTime: string | null;
}

export interface LineupsTable {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerId: number;
}

export interface DB {
  seasons: SeasonsTable;
  config: ConfigTable;
  players: PlayersTable;
  seasonRoster: SeasonRosterTable;
  dayResponses: DayResponsesTable;
  timeSlots: TimeSlotsTable;
  weeks: WeeksTable;
  lineups: LineupsTable;
}

export type Season = Selectable<SeasonsTable>;
export type Config = Selectable<ConfigTable>;
export type Player = Selectable<PlayersTable>;
export type Week = Selectable<WeeksTable>;
