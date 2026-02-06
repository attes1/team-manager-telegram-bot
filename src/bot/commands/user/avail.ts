import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import type { Translations } from '@/i18n';
import { formatDateRange, formatDayDate, formatPlayerName, STATUS_ICONS } from '@/lib/format';
import { type AvailabilityStatus, availFilterSchema, type Day } from '@/lib/schemas';
import { getTodayDay, getWeekDateRange, parseDayOrWeekInput } from '@/lib/temporal';
import type { PlayerWeekAvailability } from '@/services/availability';
import { getWeekAvailability } from '@/services/availability';

type AvailFilter = 'all' | 'practice' | 'match';

const PRACTICE_STATUSES: AvailabilityStatus[] = ['available', 'practice_only', 'if_needed'];
const MATCH_STATUSES: AvailabilityStatus[] = ['available', 'match_only', 'if_needed'];

const matchesFilter = (status: AvailabilityStatus, filter: AvailFilter): boolean => {
  if (filter === 'all') {
    return status !== 'unavailable';
  } else if (filter === 'practice') {
    return PRACTICE_STATUSES.includes(status);
  } else if (filter === 'match') {
    return MATCH_STATUSES.includes(status);
  } else {
    return true;
  }
};

const formatPlayerLine = (
  player: PlayerWeekAvailability,
  day: Day,
  indent: string = '',
): string | null => {
  const response = player.responses[day];
  if (!response) {
    return null;
  }
  const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
  const statusIcon = STATUS_ICONS[response.status];
  return `${indent}• ${formatPlayerName(player)}: ${timesStr} ${statusIcon}`;
};

const getTitle = (
  i18n: Translations,
  week: number,
  dateRange: string,
  filter: AvailFilter,
): string => {
  if (filter === 'practice') {
    return i18n.avail.practiceTitle(week, dateRange);
  } else if (filter === 'match') {
    return i18n.avail.matchTitle(week, dateRange);
  }

  return i18n.avail.title(week, dateRange);
};

const showDayAvailability = async (
  ctx: RosterContext,
  day: Day,
  week: number,
  year: number,
  filter: AvailFilter,
): Promise<void> => {
  const { db, season, i18n } = ctx;
  const availability = await getWeekAvailability(db, {
    seasonId: season.id,
    weekNumber: week,
    year,
  });

  const playersForDay = availability.filter((p) => {
    const response = p.responses[day];
    return response && matchesFilter(response.status, filter);
  });

  if (playersForDay.length === 0) {
    await ctx.reply(i18n.avail.noResponsesForDay(i18n.poll.days[day]));
    return;
  }

  const dateStr = formatDayDate(year, week, day);
  const lines: string[] = [i18n.avail.dayTitle(i18n.poll.days[day], dateStr, week), ''];

  for (const player of playersForDay) {
    const line = formatPlayerLine(player, day);
    if (line) {
      lines.push(line);
    }
  }

  await ctx.reply(lines.join('\n'));
};

const showWeekAvailability = async (
  ctx: RosterContext,
  week: number,
  year: number,
  filter: AvailFilter,
): Promise<void> => {
  const { db, season, config, i18n } = ctx;

  const availability = await getWeekAvailability(db, {
    seasonId: season.id,
    weekNumber: week,
    year,
  });

  if (availability.length === 0) {
    await ctx.reply(i18n.avail.noResponses);
    return;
  }

  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);
  const title = getTitle(i18n, week, dateRange, filter);
  const lines: string[] = [title, ''];

  for (const dayKey of config.pollDays) {
    const playersForDay = availability.filter((p) => {
      const response = p.responses[dayKey];
      return response && matchesFilter(response.status, filter);
    });

    if (playersForDay.length === 0) {
      continue;
    }

    lines.push(`${i18n.poll.days[dayKey]}:`);
    for (const player of playersForDay) {
      const line = formatPlayerLine(player, dayKey, '  ');
      if (line) {
        lines.push(line);
      }
    }
    lines.push('');
  }

  await ctx.reply(lines.join('\n'));
};

type ParsedArgs =
  | { type: 'week'; filter: AvailFilter; week: number; year: number }
  | { type: 'day'; filter: AvailFilter; day: Day; week: number; year: number }
  | { type: 'error'; error: 'invalid' | 'past' };

const parseAvailArgs = (
  args: string,
  schedulingWeek: { week: number; year: number },
): ParsedArgs => {
  const parts = args.split(/\s+/).filter(Boolean);

  let filter: AvailFilter = 'all';
  let day: Day | 'today' | null = null;
  let week: number | null = null;
  let year: number | null = null;

  for (const part of parts) {
    const filterResult = availFilterSchema.safeParse(part.toLowerCase());

    if (filterResult.success) {
      filter = filterResult.data;
    } else if (part.toLowerCase() === 'today') {
      day = 'today';
    } else {
      const parsed = parseDayOrWeekInput(part, {
        defaultWeek: schedulingWeek,
        allowPast: false,
        schedulingWeek,
      });

      if (parsed.success) {
        week = parsed.week;
        year = parsed.year;
        if (parsed.type === 'day') {
          day = parsed.day;
        }
      } else if (parsed.error === 'past') {
        return { type: 'error', error: 'past' };
      }
    }
  }

  const finalWeek = week ?? schedulingWeek.week;
  const finalYear = year ?? schedulingWeek.year;

  if (day === 'today') {
    return {
      type: 'day',
      filter,
      day: getTodayDay(),
      week: finalWeek,
      year: finalYear,
    };
  } else if (day) {
    return { type: 'day', filter, day, week: finalWeek, year: finalYear };
  }

  return { type: 'week', filter, week: finalWeek, year: finalYear };
};

export const registerAvailCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'avail',
    rosterCommand(async (ctx: RosterContext) => {
      const { schedulingWeek, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      const parsed = parseAvailArgs(args, schedulingWeek);

      if (parsed.type === 'error') {
        if (parsed.error === 'past') {
          return ctx.reply(i18n.avail.weekInPast(schedulingWeek.week));
        }
        return ctx.reply(i18n.avail.invalidWeek);
      }

      if (parsed.type === 'day') {
        return showDayAvailability(ctx, parsed.day, parsed.week, parsed.year, parsed.filter);
      }

      return showWeekAvailability(ctx, parsed.week, parsed.year, parsed.filter);
    }),
  );
};
