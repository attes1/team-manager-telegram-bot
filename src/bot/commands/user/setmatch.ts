import type { Bot } from 'grammy';
import type { BotContext, CaptainSeasonContext } from '@/bot/context';
import { captainSeasonCommand } from '@/bot/middleware';
import { formatDateRange, formatDay } from '@/lib/format';
import { dayWeekInputSchema, timeSchema } from '@/lib/schemas';
import { getWeekDateRange, parseWeekInput } from '@/lib/temporal';
import { getPublicGroupIds } from '@/services/group';
import { buildMatchScheduledMessage, getMatchTargetWeek, setMatchTime } from '@/services/match';

export const registerSetmatchCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'setmatch',
    captainSeasonCommand(async (ctx: CaptainSeasonContext) => {
      const { db, season, config, schedulingWeek, i18n } = ctx;
      const args = ctx.match?.toString().trim() ?? '';
      const [dayWeekStr, timeStr] = args.split(/\s+/);

      if (!dayWeekStr || !timeStr) {
        return ctx.reply(i18n.match.usage);
      }

      // Parse day[/week[/year]] format
      const dayWeekResult = dayWeekInputSchema.safeParse(dayWeekStr.toLowerCase());
      if (!dayWeekResult.success) {
        return ctx.reply(i18n.match.invalidDay);
      }

      const timeResult = timeSchema.safeParse(timeStr);
      if (!timeResult.success) {
        return ctx.reply(i18n.match.invalidTime);
      }

      const { day, week: parsedWeek, year: parsedYear } = dayWeekResult.data;

      // Use parsed week/year or fall back to match target week
      const defaultWeek = await getMatchTargetWeek(db, season.id, config, schedulingWeek);
      let weekNumber = parsedWeek ?? defaultWeek.week;
      let year = parsedYear ?? (parsedWeek !== null ? new Date().getFullYear() : defaultWeek.year);

      // Validate week is not in the past if explicitly provided
      if (parsedWeek !== null) {
        const result = parseWeekInput(`${weekNumber}/${year}`, {
          allowPast: false,
          schedulingWeek,
        });
        if (!result.success) {
          if (result.error === 'past') {
            return ctx.reply(i18n.match.weekInPast(schedulingWeek.week));
          }
          return ctx.reply(i18n.match.invalidWeek);
        }
        weekNumber = result.week;
        year = result.year;
      }

      await setMatchTime(db, {
        seasonId: season.id,
        weekNumber,
        year,
        matchDay: day,
        matchTime: timeResult.data,
      });

      const { start, end } = getWeekDateRange(year, weekNumber);
      const dateRange = formatDateRange(start, end);
      const dayName = i18n.poll.days[day];
      const dayFormatted = formatDay(day, config.language);

      if (config.publicAnnouncements === 'on') {
        const publicGroupIds = await getPublicGroupIds(db);
        if (publicGroupIds.length > 0) {
          const announcement = buildMatchScheduledMessage(i18n, dayFormatted, timeResult.data);
          for (const groupId of publicGroupIds) {
            try {
              await ctx.api.sendMessage(groupId, announcement);
            } catch (error) {
              console.error(`Failed to send match announcement to group ${groupId}:`, error);
            }
          }
        }
      }

      return ctx.reply(i18n.match.scheduled(dayName, timeResult.data, weekNumber, dateRange));
    }),
  );
};
