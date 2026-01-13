import { Menu } from '@grammyjs/menu';
import type { BotContext } from '@/bot/context';
import { db } from '@/db';
import { getTranslations } from '@/i18n';
import { formatDateRange } from '@/lib/format';
import type { AvailabilityStatus } from '@/lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '@/lib/temporal';
import { getPlayerWeekAvailability, setDayAvailability } from '@/services/availability';
import { isPlayerInRoster } from '@/services/roster';
import { getWeek } from '@/services/week';

// Payload format for buttons: "week:year" e.g. "5:2025"
// This is encoded in Telegram callback_data and always reliable
const encodeWeekPayload = (week: number, year: number): string => `${week}:${year}`;

export const decodeWeekPayload = (
  payload: string | RegExpMatchArray | undefined,
): { week: number; year: number } | null => {
  if (!payload || typeof payload !== 'string') return null;
  const [weekStr, yearStr] = payload.split(':');
  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(week) || Number.isNaN(year)) return null;
  return { week, year };
};

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
  const { db, season, config, schedulingWeek, i18n } = ctx;
  const userId = ctx.from?.id;

  if (!userId || !season || !config || !schedulingWeek) {
    return;
  }

  // Get week from: 1) payload (button click), 2) context (initial render from command), 3) scheduling week
  const payloadWeek = decodeWeekPayload(ctx.match);
  const { week, year } = payloadWeek ?? ctx.pollTargetWeek ?? schedulingWeek;
  const weekPayload = encodeWeekPayload(week, year);
  const days = config.pollDays;
  const times = config.pollTimes.split(',');

  const inRoster = await isPlayerInRoster(db, season.id, userId);

  // For unauthorized users: render static grid that shows error on any click
  if (!inRoster) {
    const showError = async (ctx: BotContext) => {
      await ctx.answerCallbackQuery({ text: i18n.poll.notInRoster, show_alert: true });
    };

    // Header row
    range.text(' ', showError);
    for (const time of times) {
      range.text(time, showError);
    }
    range.text(' ', showError);
    range.row();

    // Day rows with placeholder dots
    for (const day of days) {
      range.text(i18n.poll.days[day], showError);
      for (const _ of times) {
        range.text({ text: '·', payload: weekPayload }, showError);
      }
      range.text({ text: '·', payload: weekPayload }, showError);
      range.row();
    }
    return;
  }

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

      range.text({ text: icon, payload: weekPayload }, async (ctx) => {
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

    range.text({ text: statusIcon, payload: weekPayload }, async (ctx) => {
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
  schedulingWeek?: { week: number; year: number },
): Promise<string> => {
  const i18n = await getTranslations(db, seasonId);

  const { week, year } = schedulingWeek ?? getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const weekData = await getWeek(db, seasonId, week, year);
  const isMatchWeek = weekData?.type === 'match' || !weekData;

  const title = isMatchWeek
    ? i18n.poll.matchWeekTitle(week, dateRange)
    : i18n.poll.title(week, dateRange);

  // Use appropriate legend based on week type
  const legend = isMatchWeek ? i18n.poll.legend : i18n.poll.practiceLegend;

  return `${title}\n\n${legend}`;
};
