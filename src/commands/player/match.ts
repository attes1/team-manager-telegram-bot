import type { Bot } from 'grammy';
import { db } from '../../db';
import { getTranslations, t } from '../../i18n';
import { formatDateRange } from '../../lib/format';
import type { Day } from '../../lib/schemas';
import { daySchema } from '../../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../../lib/week';
import { getConfig } from '../../services/config';
import { getLineup, getMatchInfo } from '../../services/match';
import { getActiveSeason } from '../../services/season';

export const registerMatchInfoCommand = (bot: Bot) => {
  bot.command('match', async (ctx) => {
    const season = await getActiveSeason(db);
    if (!season) {
      return ctx.reply(t().errors.noActiveSeason);
    }

    const i18n = await getTranslations(db, season.id);
    const config = await getConfig(db, season.id);

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
      const defaultDay = daySchema.catch('sun').parse(config?.matchDay) as Day;
      const defaultTime = config?.matchTime ?? '20:00';
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
  });
};
