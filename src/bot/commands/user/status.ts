import type { Bot } from 'grammy';
import type { BotContext, RosterContext } from '@/bot/context';
import { rosterCommand } from '@/bot/middleware';
import { env } from '@/env';
import { formatDateRange } from '@/lib/format';
import { buildStatusMessage } from '@/lib/status';
import { getCurrentWeek, getWeekDateRange } from '@/lib/temporal';
import { getWeekAvailability } from '@/services/availability';
import { getLineup, getMatchInfo } from '@/services/match';
import { getRoster } from '@/services/roster';
import { getWeek } from '@/services/week';

export const registerStatusCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'status',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, schedulingWeek, i18n } = ctx;

      const currentWeek = getCurrentWeek();
      const { week, year } = schedulingWeek;
      const { start, end } = getWeekDateRange(year, week);
      const dateRange = formatDateRange(start, end);

      const roster = await getRoster(db, season.id);
      const weekData = await getWeek(db, season.id, week, year);
      const weekType = weekData?.type ?? 'match';
      const availability = await getWeekAvailability(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
      });

      const matchInfo = await getMatchInfo(db, { seasonId: season.id, weekNumber: week, year });
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      const matchDay = matchInfo?.matchDay ?? config.matchDay;
      const matchTime = matchInfo?.matchTime ?? config.matchTime;

      const message = buildStatusMessage({
        seasonName: season.name,
        week,
        year,
        dateRange,
        schedulingWeek,
        currentWeek,
        weekType,
        rosterCount: roster.length,
        respondedCount: availability.length,
        matchDay,
        matchTime,
        lineupCount: lineup.length,
        lineupSize: config.lineupSize,
        config: {
          pollDay: config.pollDay,
          pollTime: config.pollTime,
          reminderDay: config.reminderDay,
          reminderTime: config.reminderTime,
          remindersMode: config.remindersMode,
          matchDayReminderMode: config.matchDayReminderMode,
          matchDayReminderTime: config.matchDayReminderTime,
          menuCleanupTime: config.menuCleanupTime,
        },
        devMode: env.DEV_MODE,
        i18n,
      });

      return ctx.reply(message, { parse_mode: 'HTML' });
    }),
  );
};
