import type { Generated } from 'kysely';
import type { AvailabilityStatus, Day, RemindersMode, SeasonStatus, WeekType } from '../validation';

export interface SeasonsTable {
  id: Generated<number>;
  name: string;
  status: Generated<SeasonStatus>;
  created_at: Generated<string>;
  ended_at: string | null;
}

export interface ConfigTable {
  season_id: number;
  language: Generated<string>;
  poll_day: Generated<string>;
  poll_time: Generated<string>;
  poll_days: Generated<string>;
  poll_times: Generated<string>;
  reminder_day: Generated<string>;
  reminder_time: Generated<string>;
  reminders_mode: Generated<RemindersMode>;
  match_day: Generated<string>;
  match_time: Generated<string>;
  lineup_size: Generated<number>;
}

export interface PlayersTable {
  telegram_id: number;
  username: string | null;
  display_name: string;
  created_at: Generated<string>;
}

export interface SeasonRosterTable {
  season_id: number;
  player_id: number;
  added_at: Generated<string>;
}

export interface DayResponsesTable {
  id: Generated<number>;
  season_id: number;
  player_id: number;
  week_number: number;
  year: number;
  day: Day;
  status: AvailabilityStatus;
  updated_at: Generated<string>;
}

export interface TimeSlotsTable {
  id: Generated<number>;
  day_response_id: number;
  time_slot: string;
}

export interface WeeksTable {
  season_id: number;
  week_number: number;
  year: number;
  type: Generated<WeekType>;
  match_day: Day | null;
  match_time: string | null;
}

export interface LineupsTable {
  season_id: number;
  week_number: number;
  year: number;
  player_id: number;
}

export interface DB {
  seasons: SeasonsTable;
  config: ConfigTable;
  players: PlayersTable;
  season_roster: SeasonRosterTable;
  day_responses: DayResponsesTable;
  time_slots: TimeSlotsTable;
  weeks: WeeksTable;
  lineups: LineupsTable;
}
