import type { Bot } from 'grammy';
import type { Translations } from '../../../i18n';
import { formatDateRange } from '../../../lib/format';
import type { AvailabilityStatus, Day } from '../../../lib/schemas';
import { daySchema, daysListSchema } from '../../../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../../../lib/week';
import { getWeekAvailability } from '../../../services/availability';
import type { BotContext, RosterContext } from '../../context';
import { rosterCommand } from '../../middleware';

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

const showDayAvailability = async (
  ctx: RosterContext,
  day: Day,
  i18n: Translations,
  week: number,
  year: number,
): Promise<void> => {
  const { db, season } = ctx;
  const availability = await getWeekAvailability(db, {
    seasonId: season.id,
    weekNumber: week,
    year,
  });

  const playersForDay = availability.filter((p) => p.responses[day]);

  if (playersForDay.length === 0) {
    await ctx.reply(i18n.practice.noResponsesForDay(i18n.poll.days[day]));
    return;
  }

  const { start } = getWeekDateRange(year, week);
  const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
  const dayDate = new Date(start);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const dateStr = `${dayDate.getDate()}.${dayDate.getMonth() + 1}.`;

  const lines: string[] = [i18n.practice.dayTitle(i18n.poll.days[day], dateStr), ''];

  for (const player of playersForDay) {
    const response = player.responses[day];
    if (response) {
      const timesStr = response.timeSlots.length > 0 ? response.timeSlots.join(', ') : '-';
      const statusIcon = STATUS_ICONS[response.status];
      lines.push(`• ${player.displayName}: ${timesStr} ${statusIcon}`);
    }
  }

  await ctx.reply(lines.join('\n'));
};

export const registerPracticeCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'practice',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, i18n } = ctx;
      const args = ctx.match?.toString().trim().toLowerCase() ?? '';
      const { week, year } = getCurrentWeek();
      const { start, end } = getWeekDateRange(year, week);
      const dateRange = formatDateRange(start, end);

      if (args === 'today') {
        return showDayAvailability(ctx, getTodayDay(), i18n, week, year);
      }

      if (args && args !== '') {
        const parseResult = daySchema.safeParse(args);
        if (!parseResult.success) {
          return ctx.reply(i18n.practice.invalidDay);
        }
        return showDayAvailability(ctx, parseResult.data, i18n, week, year);
      }

      const availability = await getWeekAvailability(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
      });

      if (availability.length === 0) {
        return ctx.reply(i18n.practice.noResponses);
      }

      const lines: string[] = [i18n.practice.title(week, dateRange), ''];

      const days = daysListSchema
        .catch(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
        .parse(config.pollDays);

      for (const day of days) {
        const dayHeader = i18n.poll.days[day];
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
    }),
  );
};
