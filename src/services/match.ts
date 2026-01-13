import { addWeeks } from 'date-fns';
import type { Kysely } from 'kysely';
import { formatDateRange, formatDay, formatPlayerName } from '@/lib/format';
import type { Day, ParsedConfig } from '@/lib/schemas';
import {
  getCurrentWeek,
  getWeekDateRange,
  getWeekNumber,
  getWeekYear,
  isMatchInFuture,
} from '@/lib/week';
import type { DB, Player, Week } from '@/types/db';
import type { Translations } from '../i18n';
import { getWeek } from './week';

const MAX_LOOKAHEAD_WEEKS = 4;

export interface SetMatchTimeParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  matchDay: Day;
  matchTime: string;
}

export interface SetOpponentParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  opponentName: string;
  opponentUrl?: string;
}

export interface WeekParams {
  seasonId: number;
  weekNumber: number;
  year: number;
}

export interface LineupPlayerParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerId: number;
}

export interface SetLineupParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerIds: number[];
}

export interface MatchInfoContext {
  db: Kysely<DB>;
  config: ParsedConfig;
  i18n: Translations;
  season: { id: number };
}

export interface MatchDisplayData {
  week: number;
  year: number;
  dateRange: string;
  matchDay: string | null;
  matchTime: string | null;
  isDefault: boolean;
  lineup: Player[];
  lineupSize: number;
  opponentName: string | null;
  opponentUrl: string | null;
}

export type NextMatchResult =
  | { type: 'upcoming'; data: MatchDisplayData }
  | { type: 'no_match_this_week'; nextMatch: MatchDisplayData | null }
  | { type: 'already_played'; nextMatch: MatchDisplayData | null };

export const setMatchTime = async (db: Kysely<DB>, params: SetMatchTimeParams): Promise<Week> => {
  const { seasonId, weekNumber, year, matchDay, matchTime } = params;

  return db
    .insertInto('weeks')
    .values({ seasonId, weekNumber, year, matchDay, matchTime })
    .onConflict((oc) =>
      oc.columns(['seasonId', 'weekNumber', 'year']).doUpdateSet({ matchDay, matchTime }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const getMatchInfo = async (
  db: Kysely<DB>,
  params: WeekParams,
): Promise<Week | undefined> => {
  const { seasonId, weekNumber, year } = params;

  return db
    .selectFrom('weeks')
    .selectAll()
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();
};

export const addPlayerToLineup = async (
  db: Kysely<DB>,
  params: LineupPlayerParams,
): Promise<boolean> => {
  const { seasonId, weekNumber, year, playerId } = params;

  const existing = await db
    .selectFrom('lineups')
    .select('playerId')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('playerId', '=', playerId)
    .executeTakeFirst();

  if (existing) {
    return false;
  }

  await db.insertInto('lineups').values({ seasonId, weekNumber, year, playerId }).execute();

  return true;
};

export const removePlayerFromLineup = async (
  db: Kysely<DB>,
  params: LineupPlayerParams,
): Promise<boolean> => {
  const { seasonId, weekNumber, year, playerId } = params;

  const result = await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('playerId', '=', playerId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};

export const setLineup = async (db: Kysely<DB>, params: SetLineupParams): Promise<void> => {
  const { seasonId, weekNumber, year, playerIds } = params;

  await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .execute();

  if (playerIds.length > 0) {
    await db
      .insertInto('lineups')
      .values(playerIds.map((playerId) => ({ seasonId, weekNumber, year, playerId })))
      .execute();
  }
};

export const getLineup = async (db: Kysely<DB>, params: WeekParams): Promise<Player[]> => {
  const { seasonId, weekNumber, year } = params;

  return db
    .selectFrom('lineups')
    .innerJoin('players', 'players.telegramId', 'lineups.playerId')
    .select(['players.telegramId', 'players.displayName', 'players.username', 'players.createdAt'])
    .where('lineups.seasonId', '=', seasonId)
    .where('lineups.weekNumber', '=', weekNumber)
    .where('lineups.year', '=', year)
    .execute();
};

export const clearLineup = async (db: Kysely<DB>, params: WeekParams): Promise<boolean> => {
  const { seasonId, weekNumber, year } = params;

  const result = await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};

export const setOpponent = async (db: Kysely<DB>, params: SetOpponentParams): Promise<Week> => {
  const { seasonId, weekNumber, year, opponentName, opponentUrl } = params;

  return db
    .insertInto('weeks')
    .values({
      seasonId,
      weekNumber,
      year,
      opponentName,
      opponentUrl: opponentUrl ?? null,
    })
    .onConflict((oc) =>
      oc
        .columns(['seasonId', 'weekNumber', 'year'])
        .doUpdateSet({ opponentName, opponentUrl: opponentUrl ?? null }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const clearOpponent = async (db: Kysely<DB>, params: WeekParams): Promise<boolean> => {
  const { seasonId, weekNumber, year } = params;

  const result = await db
    .updateTable('weeks')
    .set({ opponentName: null, opponentUrl: null })
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};

const findNextMatchWeek = async (
  db: Kysely<DB>,
  seasonId: number,
  startWeek: { week: number; year: number },
): Promise<{ week: number; year: number } | null> => {
  const { start } = getWeekDateRange(startWeek.year, startWeek.week);

  for (let i = 1; i <= MAX_LOOKAHEAD_WEEKS; i++) {
    const futureDate = addWeeks(start, i);
    const checkWeek = getWeekNumber(futureDate);
    const checkYear = getWeekYear(futureDate);

    const weekInfo = await getWeek(db, seasonId, checkWeek, checkYear);

    // Default to match week if no weekInfo, or if explicitly set to match
    if (!weekInfo || weekInfo.type === 'match') {
      return { week: checkWeek, year: checkYear };
    }
  }

  return null;
};

const buildMatchDisplayData = async (
  ctx: MatchInfoContext,
  week: number,
  year: number,
): Promise<MatchDisplayData> => {
  const { db, config } = ctx;
  const seasonId = ctx.season.id;

  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const matchInfo = await getMatchInfo(db, { seasonId, weekNumber: week, year });
  const lineup = await getLineup(db, { seasonId, weekNumber: week, year });

  let matchDay: string | null = null;
  let matchTime: string | null = null;
  let isDefault = false;

  if (matchInfo?.matchDay && matchInfo?.matchTime) {
    matchDay = formatDay(matchInfo.matchDay, config.language);
    matchTime = matchInfo.matchTime;
    isDefault = false;
  } else {
    matchDay = formatDay(config.matchDay, config.language);
    matchTime = config.matchTime;
    isDefault = true;
  }

  return {
    week,
    year,
    dateRange,
    matchDay,
    matchTime,
    isDefault,
    lineup,
    lineupSize: config.lineupSize,
    opponentName: matchInfo?.opponentName ?? null,
    opponentUrl: matchInfo?.opponentUrl ?? null,
  };
};

export const getNextMatchResult = async (ctx: MatchInfoContext): Promise<NextMatchResult> => {
  const { db, config } = ctx;
  const seasonId = ctx.season.id;

  // Use current week (not scheduling week) - we want to show what's coming up
  const { week, year } = getCurrentWeek();

  const weekInfo = await getWeek(db, seasonId, week, year);

  // Case 1: Current week is explicitly marked as practice
  if (weekInfo?.type === 'practice') {
    const nextMatchWeek = await findNextMatchWeek(db, seasonId, { week, year });
    const nextMatch = nextMatchWeek
      ? await buildMatchDisplayData(ctx, nextMatchWeek.week, nextMatchWeek.year)
      : null;
    return { type: 'no_match_this_week', nextMatch };
  }

  // Case 2 & 3: Current week is a match week (default or explicit)
  // Determine match day/time to check if it's in the future
  const matchDay: Day = weekInfo?.matchDay ?? config.matchDay;
  const matchTime: string = weekInfo?.matchTime ?? config.matchTime;

  if (isMatchInFuture(year, week, matchDay, matchTime)) {
    // Match is still upcoming
    const data = await buildMatchDisplayData(ctx, week, year);
    return { type: 'upcoming', data };
  } else {
    // Match was already played
    const nextMatchWeek = await findNextMatchWeek(db, seasonId, { week, year });
    const nextMatch = nextMatchWeek
      ? await buildMatchDisplayData(ctx, nextMatchWeek.week, nextMatchWeek.year)
      : null;
    return { type: 'already_played', nextMatch };
  }
};

const buildMatchDetails = (i18n: Translations, data: MatchDisplayData): string[] => {
  const lines: string[] = [];

  lines.push(i18n.announcements.nextMatch(data.week, data.dateRange), '');

  if (data.opponentName) {
    if (data.opponentUrl) {
      lines.push(i18n.announcements.opponentWithUrl(data.opponentName, data.opponentUrl));
    } else {
      lines.push(i18n.announcements.opponent(data.opponentName));
    }
    lines.push('');
  }

  if (data.matchDay && data.matchTime) {
    const timeText = data.isDefault
      ? i18n.announcements.matchTimeDefault(data.matchDay, data.matchTime)
      : i18n.announcements.matchTime(data.matchDay, data.matchTime);
    lines.push(timeText);
  } else {
    lines.push(i18n.announcements.matchTimeNotSet);
  }

  lines.push('');
  const isPartialLineup = data.lineup.length > 0 && data.lineup.length < data.lineupSize;
  const lineupIcon = isPartialLineup ? '⚠️' : '👥';
  lines.push(`${lineupIcon} ${i18n.announcements.lineupTitle}`);

  if (data.lineup.length > 0) {
    for (const player of data.lineup) {
      lines.push(`• ${formatPlayerName(player)}`);
    }
  } else {
    lines.push(i18n.announcements.lineupEmpty);
  }

  return lines;
};

export const buildNextMatchMessage = (i18n: Translations, result: NextMatchResult): string => {
  const lines: string[] = [];

  if (result.type === 'upcoming') {
    lines.push(...buildMatchDetails(i18n, result.data));
  } else if (result.type === 'no_match_this_week') {
    lines.push(i18n.announcements.noMatchWeek, '');
    if (result.nextMatch) {
      lines.push(...buildMatchDetails(i18n, result.nextMatch));
    } else {
      lines.push(i18n.announcements.noUpcomingMatch);
    }
  } else if (result.type === 'already_played') {
    lines.push(i18n.announcements.matchAlreadyPlayed, '');
    if (result.nextMatch) {
      lines.push(...buildMatchDetails(i18n, result.nextMatch));
    } else {
      lines.push(i18n.announcements.noUpcomingMatch);
    }
  }

  return lines.join('\n');
};

export const buildLineupMessage = (
  i18n: Translations,
  week: number,
  dateRange: string,
  lineup: Player[],
): string => {
  const lines: string[] = [
    i18n.announcements.lineupSet(lineup.length),
    '',
    i18n.announcements.nextMatch(week, dateRange),
    '',
    `👥 ${i18n.announcements.lineupTitle}`,
  ];

  for (const player of lineup) {
    lines.push(`• ${formatPlayerName(player)}`);
  }

  return lines.join('\n');
};

export const buildMatchScheduledMessage = (i18n: Translations, day: string, time: string): string =>
  i18n.announcements.matchScheduled(day, time);
