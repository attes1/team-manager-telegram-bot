import type { Bot } from 'grammy';
import { formatDateRange } from '../../../lib/format';
import { getCurrentWeek, getSchedulingWeek, getWeekDateRange } from '../../../lib/week';
import { getWeekAvailability } from '../../../services/availability';
import { getLineup, getMatchInfo } from '../../../services/match';
import { getRoster } from '../../../services/roster';
import { getWeek } from '../../../services/week';
import type { BotContext, RosterContext } from '../../context';
import { rosterCommand } from '../../middleware';

export const registerStatusCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'status',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, i18n } = ctx;

      // Use scheduling week for all status info
      const currentWeek = getCurrentWeek();
      const schedulingWeek = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
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

      const respondedCount = availability.length;
      const responseRate =
        roster.length > 0 ? Math.round((respondedCount / roster.length) * 100) : 0;

      const matchInfo = await getMatchInfo(db, { seasonId: season.id, weekNumber: week, year });
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      const matchDay = matchInfo?.matchDay ?? config.matchDay;
      const matchTime = matchInfo?.matchTime ?? config.matchTime;
      const dayName = i18n.poll.days[matchDay as keyof typeof i18n.poll.days] ?? matchDay;

      const lines: string[] = [
        `📊 <b>${i18n.status.title}</b>`,
        '',
        `<b>${i18n.status.season}:</b> ${season.name}`,
      ];

      // Show scheduling week indicator when different from current week
      if (currentWeek.week !== schedulingWeek.week || currentWeek.year !== schedulingWeek.year) {
        lines.push(`<b>${i18n.status.schedulingFor}:</b> ${i18n.status.weekLabel(week)}`);
      }

      lines.push(
        `<b>${i18n.status.week}:</b> ${week} (${dateRange})`,
        `<b>${i18n.status.weekType}:</b> ${weekType === 'match' ? '🏆 ' : '🏋️ '}${i18n.status.weekTypes[weekType]}`,
        '',
        `<b>${i18n.status.roster}:</b> ${roster.length} ${i18n.status.players}`,
        `<b>${i18n.status.responses}:</b> ${respondedCount}/${roster.length} (${responseRate}%)`,
      );

      if (weekType === 'match') {
        lines.push('');
        lines.push(`<b>${i18n.status.matchTime}:</b> ${dayName} ${matchTime}`);
        const lineupIcon = lineup.length < config.lineupSize ? '⚠️' : '👥';
        lines.push(
          `${lineupIcon} <b>${i18n.status.lineup}:</b> ${lineup.length}/${config.lineupSize} ${i18n.status.players}`,
        );
      }

      return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    }),
  );
};
