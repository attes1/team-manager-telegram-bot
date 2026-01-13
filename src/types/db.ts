import type { Generated, Selectable } from 'kysely';
import type {
  AvailabilityStatus,
  Day,
  GroupType,
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
  weekChangeDay: Generated<string>;
  weekChangeTime: Generated<string>;
  reminderDay: Generated<string>;
  reminderTime: Generated<string>;
  remindersMode: Generated<RemindersMode>;
  matchDay: Generated<string>;
  matchTime: Generated<string>;
  lineupSize: Generated<number>;
  matchDayReminderMode: Generated<RemindersMode>;
  matchDayReminderTime: Generated<string>;
  publicAnnouncements: Generated<string>;
  publicCommandsMode: Generated<string>;
  menuExpirationHours: Generated<number>;
  menuCleanupTime: Generated<string>;
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
  opponentName: string | null;
  opponentUrl: string | null;
}

export interface LineupsTable {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerId: number;
}

export type MenuType = 'poll' | 'lineup';

export interface ActiveMenusTable {
  id: Generated<number>;
  seasonId: number;
  chatId: number;
  userId: number;
  menuType: MenuType;
  messageId: number;
  weekNumber: number;
  year: number;
  createdAt: Generated<string>;
}

export interface GroupsTable {
  id: Generated<number>;
  telegramId: number;
  type: Generated<GroupType>;
  title: string | null;
  addedAt: Generated<string>;
  removedAt: string | null;
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
  activeMenus: ActiveMenusTable;
  groups: GroupsTable;
}

export type Season = Selectable<SeasonsTable>;
export type Config = Selectable<ConfigTable>;
export type Player = Selectable<PlayersTable>;
export type Week = Selectable<WeeksTable>;
export type ActiveMenu = Selectable<ActiveMenusTable>;
export type Group = Selectable<GroupsTable>;
