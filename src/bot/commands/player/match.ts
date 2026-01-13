import type { Bot } from 'grammy';
import { formatDateRange } from '../../../lib/format';
import type { Day } from '../../../lib/schemas';
import { daySchema } from '../../../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../../../lib/week';
import { getLineup, getMatchInfo } from '../../../services/match';
import type { BotContext, RosterContext } from '../../context';
import { rosterCommand } from '../../middleware';

export const registerMatchInfoCommand = (bot: Bot<BotContext>) => {
  bot.command(
    'match',
    rosterCommand(async (ctx: RosterContext) => {
      const { db, season, config, i18n } = ctx;
      const { week, year } = getCurrentWeek();
      const { start, end } = getWeekDateRange(year, week);
      const dateRange = formatDateRange(start, end);

      const matchInfo = await getMatchInfo(db, { seasonId: season.id, weekNumber: week, year });
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      const lines: string[] = [i18n.match.info(week, dateRange), ''];

      if (matchInfo?.matchDay && matchInfo?.matchTime) {
        const dayName = i18n.poll.days[matchInfo.matchDay];
        lines.push(i18n.match.time(dayName, matchInfo.matchTime));
      } else {
        const defaultDay = daySchema.catch('sun').parse(config.matchDay) as Day;
        const defaultTime = config.matchTime ?? '20:00';
        const dayName = i18n.poll.days[defaultDay];
        lines.push(i18n.match.timeDefault(dayName, defaultTime));
      }

      lines.push('');

      if (lineup.length > 0) {
        lines.push(i18n.match.lineupTitle);
        for (const player of lineup) {
          lines.push(i18n.match.lineupPlayer(player.displayName));
        }
      } else {
        lines.push(i18n.match.lineupEmpty);
      }

      return ctx.reply(lines.join('\n'));
    }),
  );
};
