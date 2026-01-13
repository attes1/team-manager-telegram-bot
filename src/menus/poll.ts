import { Menu } from '@grammyjs/menu';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { getTranslations } from '../i18n';
import { formatDateRange } from '../lib/format';
import type { AvailabilityStatus } from '../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../lib/week';
import { getPlayerWeekAvailability, setDayAvailability } from '../services/availability';
import { isPlayerInRoster } from '../services/roster';
import { getWeek } from '../services/week';

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  practice_only: '🏋️',
  match_only: '🏆',
  if_needed: '⚠️',
  unavailable: '❌',
};

const NO_RESPONSE_ICON = '·';

const STATUS_ORDER: AvailabilityStatus[] = [
  'available',
  'practice_only',
  'match_only',
  'if_needed',
  'unavailable',
];

const getNextStatus = (current: AvailabilityStatus): AvailabilityStatus => {
  const currentIndex = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
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

  const { week, year } = getCurrentWeek();
  const days = config.pollDays;
  const times = config.pollTimes.split(',');

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
        // When adding a timeslot: default to 'available' if no response or if currently 'unavailable'
        const isAdding = !hasSlot;
        const status =
          isAdding && (!hasResponse || currentStatus === 'unavailable')
            ? 'available'
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
    const statusIcon = hasResponse ? STATUS_ICONS[currentStatus] : NO_RESPONSE_ICON;

    range.text(statusIcon, async (ctx) => {
      let nextStatus: AvailabilityStatus;

      if (!hasResponse && !hasTimeslots) {
        // No response and no timeslots: go directly to unavailable
        nextStatus = 'unavailable';
      } else if (!hasResponse && hasTimeslots) {
        // Has timeslots but no explicit response yet: start cycling from available
        nextStatus = getNextStatus('available');
      } else {
        // Has response: normal cycling
        nextStatus = getNextStatus(currentStatus);
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

export const getPollMessage = async (seasonId: number): Promise<string> => {
  const i18n = await getTranslations(db, seasonId);

  const { week, year } = getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const weekData = await getWeek(db, seasonId, week, year);
  const isMatchWeek = weekData?.type === 'match' || !weekData;

  const title = isMatchWeek
    ? i18n.poll.matchWeekTitle(week, dateRange)
    : i18n.poll.title(week, dateRange);

  return `${title}\n\n${i18n.poll.legend}`;
};
