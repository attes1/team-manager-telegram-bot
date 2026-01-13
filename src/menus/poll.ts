import { Menu } from '@grammyjs/menu';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { getTranslations } from '../i18n';
import { formatDateRange } from '../lib/format';
import type { AvailabilityStatus } from '../lib/schemas';
import { getCurrentWeek, getSchedulingWeek, getWeekDateRange } from '../lib/week';
import { getPlayerWeekAvailability, setDayAvailability } from '../services/availability';
import { isPlayerInRoster } from '../services/roster';
import { getWeek } from '../services/week';

// Week marker: hidden in an invisible HTML link
// Format: <a href="w:5/2025">​</a> - zero-width space as link text
const WEEK_MARKER_REGEX = /href="w:(\d+)\/(\d+)"/;

const parseWeekFromMessage = (text: string | undefined): { week: number; year: number } | null => {
  if (!text) {
    return null;
  }
  const match = text.match(WEEK_MARKER_REGEX);
  if (match) {
    return { week: Number(match[1]), year: Number(match[2]) };
  }
  return null;
};

// Creates invisible marker using zero-width space in a link
const createWeekMarker = (week: number, year: number): string =>
  `<a href="w:${week}/${year}">\u200B</a>`;

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  practice_only: '🏋️',
  match_only: '🏆',
  if_needed: '⚠️',
  unavailable: '❌',
};

const NO_RESPONSE_ICON = '·';

const PRACTICE_STATUS_ORDER: AvailabilityStatus[] = ['practice_only', 'unavailable'];

const MATCH_STATUS_ORDER: AvailabilityStatus[] = [
  'available',
  'practice_only',
  'match_only',
  'if_needed',
  'unavailable',
];

export const getNextStatus = (
  current: AvailabilityStatus,
  isPracticeWeek: boolean,
): AvailabilityStatus => {
  const order = isPracticeWeek ? PRACTICE_STATUS_ORDER : MATCH_STATUS_ORDER;
  const idx = order.indexOf(current);
  // If status not in order (e.g., 'available' in practice week), start from first
  if (idx === -1) {
    return order[0];
  }
  return order[(idx + 1) % order.length];
};

export const getDisplayStatus = (
  status: AvailabilityStatus,
  isPracticeWeek: boolean,
): AvailabilityStatus => {
  if (!isPracticeWeek) {
    return status;
  }
  // In practice weeks, map match-related statuses to practice_only for UI display
  if (status === 'available' || status === 'match_only' || status === 'if_needed') {
    return 'practice_only';
  }
  return status;
};

export const pollMenu = new Menu<BotContext>('poll').dynamic(async (ctx, range) => {
  const { db, season, config, i18n } = ctx;
  const userId = ctx.from?.id;

  if (!userId || !season || !config) {
    return;
  }

  const inRoster = await isPlayerInRoster(db, season.id, userId);
  if (!inRoster) {
    range.text(i18n.poll.notInRoster, (ctx) => ctx.answerCallbackQuery());
    return;
  }

  // Parse week from message, fall back to target week
  const messageText = ctx.callbackQuery?.message?.text;
  const parsedWeek = parseWeekFromMessage(messageText);
  const { week, year } =
    parsedWeek ?? getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const days = config.pollDays;
  const times = config.pollTimes.split(',');

  // Fetch week type for practice week handling
  const weekData = await getWeek(db, season.id, week, year);
  const isPracticeWeek = weekData?.type === 'practice';

  // Header row with time slots
  range.text(' ', (ctx) => ctx.answerCallbackQuery());
  for (const time of times) {
    range.text(time, (ctx) => ctx.answerCallbackQuery());
  }
  range.text(' ', (ctx) => ctx.answerCallbackQuery());
  range.row();

  const availability = await getPlayerWeekAvailability(db, {
    seasonId: season.id,
    playerId: userId,
    weekNumber: week,
    year,
  });

  for (const day of days) {
    const dayData = availability[day];
    const hasResponse = dayData !== undefined;
    const currentStatus: AvailabilityStatus = dayData?.status ?? 'available';
    const currentSlots = dayData?.timeSlots ?? [];
    const hasTimeslots = currentSlots.length > 0;

    range.text(i18n.poll.days[day], (ctx) => ctx.answerCallbackQuery());

    for (const time of times) {
      const hasSlot = currentSlots.includes(time);
      const icon = hasSlot ? '✓' : '·';

      range.text(icon, async (ctx) => {
        const newSlots = hasSlot ? currentSlots.filter((s) => s !== time) : [...currentSlots, time];
        // When adding a timeslot: default to appropriate status if no response or if currently 'unavailable'
        const isAdding = !hasSlot;
        const defaultStatus = isPracticeWeek ? 'practice_only' : 'available';
        const status =
          isAdding && (!hasResponse || currentStatus === 'unavailable')
            ? defaultStatus
            : currentStatus;

        await setDayAvailability(db, {
          seasonId: season.id,
          playerId: userId,
          weekNumber: week,
          year,
          day,
          status,
          timeSlots: newSlots,
        });

        await ctx.menu.update();
      });
    }

    // Show neutral icon if no response yet, otherwise show status icon
    // In practice weeks, map match-related statuses to practice_only for display
    const displayStatus = getDisplayStatus(currentStatus, isPracticeWeek);
    const statusIcon = hasResponse ? STATUS_ICONS[displayStatus] : NO_RESPONSE_ICON;

    range.text(statusIcon, async (ctx) => {
      let nextStatus: AvailabilityStatus;

      if (!hasResponse && !hasTimeslots) {
        // No response and no timeslots: go directly to unavailable
        nextStatus = 'unavailable';
      } else if (!hasResponse && hasTimeslots) {
        // Has timeslots but no explicit response yet: start cycling
        const defaultStatus = isPracticeWeek ? 'practice_only' : 'available';
        nextStatus = getNextStatus(defaultStatus, isPracticeWeek);
      } else {
        // Has response: normal cycling (using display status for practice weeks)
        nextStatus = getNextStatus(displayStatus, isPracticeWeek);
      }

      const newSlots = nextStatus === 'unavailable' ? [] : currentSlots;

      await setDayAvailability(db, {
        seasonId: season.id,
        playerId: userId,
        weekNumber: week,
        year,
        day,
        status: nextStatus,
        timeSlots: newSlots,
      });

      await ctx.menu.update();
    });

    range.row();
  }
});

export const getPollMessage = async (
  seasonId: number,
  targetWeek?: { week: number; year: number },
): Promise<string> => {
  const i18n = await getTranslations(db, seasonId);

  const { week, year } = targetWeek ?? getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const weekData = await getWeek(db, seasonId, week, year);
  const isMatchWeek = weekData?.type === 'match' || !weekData;

  const title = isMatchWeek
    ? i18n.poll.matchWeekTitle(week, dateRange)
    : i18n.poll.title(week, dateRange);

  // Use appropriate legend based on week type
  const legend = isMatchWeek ? i18n.poll.legend : i18n.poll.practiceLegend;

  // Append week marker for menu to parse
  const weekMarker = createWeekMarker(week, year);

  return `${title}\n\n${legend}\n${weekMarker}`;
};
