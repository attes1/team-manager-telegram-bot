import { Menu } from '@grammyjs/menu';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { getTranslations } from '../i18n';
import { formatDateRange } from '../lib/format';
import type { AvailabilityStatus } from '../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../lib/week';
import { getPlayerWeekAvailability, setDayAvailability } from '../services/availability';
import { getConfig } from '../services/config';
import { isPlayerInRoster } from '../services/roster';
import { getWeek } from '../services/week';

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  practice_only: '🏋️',
  match_only: '🏆',
  if_needed: '⚠️',
  unavailable: '❌',
};

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
    return;
  }

  const { week, year } = getCurrentWeek();
  const days = config.pollDays;
  const times = config.pollTimes.split(',');

  const availability = await getPlayerWeekAvailability(db, {
    seasonId: season.id,
    playerId: userId,
    weekNumber: week,
    year,
  });

  for (const day of days) {
    const dayData = availability[day];
    const currentStatus: AvailabilityStatus = dayData?.status ?? 'available';
    const currentSlots = dayData?.timeSlots ?? [];

    range.text(i18n.poll.days[day], (ctx) => ctx.answerCallbackQuery());

    for (const time of times) {
      const hasSlot = currentSlots.includes(time);
      const icon = hasSlot ? '✓' : '·';

      range.text(icon, async (ctx) => {
        const newSlots = hasSlot ? currentSlots.filter((s) => s !== time) : [...currentSlots, time];

        await setDayAvailability(db, {
          seasonId: season.id,
          playerId: userId,
          weekNumber: week,
          year,
          day,
          status: currentStatus,
          timeSlots: newSlots,
        });

        await ctx.menu.update();
      });
    }

    range.text(STATUS_ICONS[currentStatus], async (ctx) => {
      const nextStatus = getNextStatus(currentStatus);
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
  const config = await getConfig(db, seasonId);

  const { week, year } = getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  const weekData = await getWeek(db, seasonId, week, year);
  const isMatchWeek = weekData?.type === 'match' || !weekData;

  const times = config?.pollTimes ?? '19,20,21';
  const header = `      ${times
    .split(',')
    .map((t) => t.padStart(2))
    .join('  ')}`;

  const title = isMatchWeek
    ? i18n.poll.matchWeekTitle(week, dateRange)
    : i18n.poll.title(week, dateRange);

  return `${title}\n\n${header}\n\n${i18n.poll.legend}`;
};
