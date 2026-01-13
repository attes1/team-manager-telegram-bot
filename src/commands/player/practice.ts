import type { Bot, Context } from 'grammy';
import { db } from '../../db';
import { t } from '../../i18n';
import { formatDateRange } from '../../lib/format';
import type { AvailabilityStatus, Day } from '../../lib/schemas';
import { daySchema, daysListSchema, languageSchema } from '../../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../../lib/week';
import { getWeekAvailability } from '../../services/availability';
import { getConfig } from '../../services/config';
import { getActiveSeason } from '../../services/season';

const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  practice_only: '🏋️',
  match_only: '🏆',
  if_needed: '⚠️',
  unavailable: '❌',
};

const getTodayDay = (): Day => {
  const days: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
};

export const registerPracticeCommand = (bot: Bot) => {
  bot.command('practice', async (ctx) => {
    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const config = await getConfig(db, season.id);
    const lang = languageSchema.catch('en').parse(config?.language);

    const args = ctx.match?.toString().trim().toLowerCase() ?? '';
    const { week, year } = getCurrentWeek();
    const { start, end } = getWeekDateRange(year, week);
    const dateRange = formatDateRange(start, end);

    if (args === 'today') {
      return showDayAvailability(ctx, season.id, getTodayDay(), lang, week, year);
    }

    if (args && args !== '') {
      const parseResult = daySchema.safeParse(args);
      if (!parseResult.success) {
        return ctx.reply(t(lang).practice.invalidDay);
      }
      return showDayAvailability(ctx, season.id, parseResult.data, lang, week, year);
    }

    const availability = await getWeekAvailability(db, {
      seasonId: season.id,
      weekNumber: week,
      year,
    });

    if (availability.length === 0) {
      return ctx.reply(t(lang).practice.noResponses);
    }

    const lines: string[] = [t(lang).practice.title(week, dateRange), ''];

    const days = daysListSchema
      .catch(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
      .parse(config?.pollDays);

    for (const day of days) {
      const dayHeader = t(lang).poll.days[day];
      const playersForDay = availability.filter((p) => p.responses[day]);

      if (playersForDay.length === 0) {
        continue;
      }

      lines.push(`${dayHeader}:`);
      for (const player of playersForDay) {
        const response = player.responses[day];
        if (response) {
          const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
          const statusIcon = STATUS_ICONS[response.status];
          lines.push(`  • ${player.displayName}: ${timesStr} ${statusIcon}`);
        }
      }
      lines.push('');
    }

    return ctx.reply(lines.join('\n'));
  });
};

const showDayAvailability = async (
  ctx: Context,
  seasonId: number,
  day: Day,
  lang: 'fi' | 'en',
  week: number,
  year: number,
) => {
  const availability = await getWeekAvailability(db, {
    seasonId,
    weekNumber: week,
    year,
  });

  const playersForDay = availability.filter((p) => p.responses[day]);

  if (playersForDay.length === 0) {
    return ctx.reply(t(lang).practice.noResponsesForDay(t(lang).poll.days[day]));
  }

  const { start } = getWeekDateRange(year, week);
  const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
  const dayDate = new Date(start);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const dateStr = `${dayDate.getDate()}.${dayDate.getMonth() + 1}.`;

  const lines: string[] = [t(lang).practice.dayTitle(t(lang).poll.days[day], dateStr), ''];

  for (const player of playersForDay) {
    const response = player.responses[day];
    if (response) {
      const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
      const statusIcon = STATUS_ICONS[response.status];
      lines.push(`• ${player.displayName}: ${timesStr} ${statusIcon}`);
    }
  }

  return ctx.reply(lines.join('\n'));
};
