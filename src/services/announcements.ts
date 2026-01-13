import type { Kysely } from 'kysely';
import { formatDateRange, formatDay } from '@/lib/format';
import type { ParsedConfig } from '@/lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '@/lib/week';
import type { DB, Player } from '@/types/db';
import type { Translations } from '../i18n';
import { getLineup, getMatchInfo } from './match';
import { getWeek } from './week';

export interface AnnouncementContext {
  db: Kysely<DB>;
  config: ParsedConfig;
  i18n: Translations;
  season: { id: number };
}

export interface MatchAnnouncementData {
  week: number;
  dateRange: string;
  matchDay: string | null;
  matchTime: string | null;
  isDefault: boolean;
  lineup: Player[];
}

export const buildMatchAnnouncement = (i18n: Translations, data: MatchAnnouncementData): string => {
  const lines: string[] = [i18n.announcements.nextMatch(data.week, data.dateRange), ''];

  if (data.matchDay && data.matchTime) {
    const timeText = data.isDefault
      ? i18n.announcements.matchTimeDefault(data.matchDay, data.matchTime)
      : i18n.announcements.matchTime(data.matchDay, data.matchTime);
    lines.push(timeText);
  } else {
    lines.push(i18n.announcements.matchTimeNotSet);
  }

  lines.push('');
  lines.push(i18n.announcements.lineupTitle);

  if (data.lineup.length > 0) {
    for (const player of data.lineup) {
      lines.push(i18n.announcements.lineupPlayer(player.displayName));
    }
  } else {
    lines.push(i18n.announcements.lineupEmpty);
  }

  return lines.join('\n');
};

export const buildLineupAnnouncement = (
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
    i18n.announcements.lineupTitle,
  ];

  for (const player of lineup) {
    lines.push(i18n.announcements.lineupPlayer(player.displayName));
  }

  return lines.join('\n');
};

export const buildMatchScheduledAnnouncement = (
  i18n: Translations,
  day: string,
  time: string,
): string => {
  return i18n.announcements.matchScheduled(day, time);
};

export const getMatchAnnouncementData = async (
  ctx: AnnouncementContext,
): Promise<MatchAnnouncementData | null> => {
  const { db, config } = ctx;
  const seasonId = ctx.season.id;
  const { week, year } = getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const weekInfo = await getWeek(db, seasonId, week, year);

  if (weekInfo?.type === 'practice') {
    return null;
  }

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
    dateRange,
    matchDay,
    matchTime,
    isDefault,
    lineup,
  };
};
