import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import type { Translations } from '@/i18n';
import { formatDateRange, formatPlayerName } from '@/lib/format';
import type { AvailabilityStatus, Day } from '@/lib/schemas';
import { dayWeekInputSchema, weekInputSchema } from '@/lib/schemas';
import { getSchedulingWeek, getWeekDateRange } from '@/lib/week';
import { getWeekAvailability } from '@/services/availability';

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  practice_only: '🏋️',
  match_only: '🏆',
  if_needed: '⚠️',
  unavailable: '❌',
};

type AvailFilter = 'all' | 'practice' | 'match';

const PRACTICE_STATUSES: AvailabilityStatus[] = ['available', 'practice_only', 'if_needed'];
const MATCH_STATUSES: AvailabilityStatus[] = ['available', 'match_only', 'if_needed'];

const matchesFilter = (status: AvailabilityStatus, filter: AvailFilter): boolean => {
  if (filter === 'all') {
    return status !== 'unavailable';
  }
  if (filter === 'practice') {
    return PRACTICE_STATUSES.includes(status);
  }
  if (filter === 'match') {
    return MATCH_STATUSES.includes(status);
  }
  return true;
};

const getTodayDay = (): Day => {
  const days: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
};

const showDayAvailability = async (
  ctx: RosterContext,
  day: Day,
  i18n: Translations,
  week: number,
  year: number,
  filter: AvailFilter,
): Promise<void> => {
  const { db, season } = ctx;
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

  const { start } = getWeekDateRange(year, week);
  const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
  const dayDate = new Date(start);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const dateStr = `${dayDate.getDate()}.${dayDate.getMonth() + 1}.`;

  const lines: string[] = [i18n.avail.dayTitle(i18n.poll.days[day], dateStr, week), ''];

  for (const player of playersForDay) {
    const response = player.responses[day];
    if (response) {
      const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
      const statusIcon = STATUS_ICONS[response.status];
      lines.push(`• ${formatPlayerName(player)}: ${timesStr} ${statusIcon}`);
    }
  }

  await ctx.reply(lines.join('\n'));
};

type ParsedArgs = {
  filter: AvailFilter;
  day: Day | 'today' | null;
  week: number | null;
  year: number | null;
};

const parseArgs = (args: string): ParsedArgs => {
  const parts = args.split(/\s+/).filter(Boolean);

  let filter: AvailFilter = 'all';
  let day: Day | 'today' | null = null;
  let week: number | null = null;
  let year: number | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();

    // Check for filter keywords
    if (lower === 'practice' || lower === 'treeni') {
      filter = 'practice';
      continue;
    }
    if (lower === 'match' || lower === 'matsi') {
      filter = 'match';
      continue;
    }
    if (lower === 'today' || lower === 'tänään') {
      day = 'today';
      continue;
    }

    // Try parsing as day/week format (tue, tue/5, tue/5/2026)
    const dayWeekResult = dayWeekInputSchema.safeParse(lower);
    if (dayWeekResult.success) {
      day = dayWeekResult.data.day;
      if (dayWeekResult.data.week !== null) {
        week = dayWeekResult.data.week;
        year = dayWeekResult.data.year ?? new Date().getFullYear();
      }
      continue;
    }

    // Try parsing as week format (5, 5/2026)
    const weekResult = weekInputSchema.safeParse(part);
    if (weekResult.success) {
      week = weekResult.data.week;
      year = weekResult.data.year;
    }
  }

  return { filter, day, week, year };
};

export const registerAvailCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'avail',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';

      // Default to scheduling week
      const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);

      const { filter, day, week: parsedWeek, year: parsedYear } = parseArgs(args);

      // Use parsed week/year or fall back to scheduling week
      const week = parsedWeek ?? schedulingWeek.week;
      const year = parsedYear ?? schedulingWeek.year;

      const { start, end } = getWeekDateRange(year, week);
      const dateRange = formatDateRange(start, end);

      if (day === 'today') {
        return showDayAvailability(ctx, getTodayDay(), i18n, week, year, filter);
      }

      if (day) {
        return showDayAvailability(ctx, day, i18n, week, year, filter);
      }

      const availability = await getWeekAvailability(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
      });

      if (availability.length === 0) {
        return ctx.reply(i18n.avail.noResponses);
      }

      const title =
        filter === 'practice'
          ? i18n.avail.practiceTitle(week, dateRange)
          : filter === 'match'
            ? i18n.avail.matchTitle(week, dateRange)
            : i18n.avail.title(week, dateRange);

      const lines: string[] = [title, ''];

      for (const dayKey of config.pollDays) {
        const dayHeader = i18n.poll.days[dayKey];
        const playersForDay = availability.filter((p) => {
          const response = p.responses[dayKey];
          return response && matchesFilter(response.status, filter);
        });

        if (playersForDay.length === 0) {
          continue;
        }

        lines.push(`${dayHeader}:`);
        for (const player of playersForDay) {
          const response = player.responses[dayKey];
          if (response) {
            const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
            const statusIcon = STATUS_ICONS[response.status];
            lines.push(`  • ${formatPlayerName(player)}: ${timesStr} ${statusIcon}`);
          }
        }
        lines.push('');
      }

      return ctx.reply(lines.join('\n'));
    }),
  );
};
