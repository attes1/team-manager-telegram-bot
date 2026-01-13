import { Menu } from '@grammyjs/menu';
import type { Context } from 'grammy';
import { db } from '../db';
import { t } from '../i18n';
import { isAdmin } from '../lib/admin';
import { formatDateRange } from '../lib/format';
import { languageSchema } from '../lib/schemas';
import { getCurrentWeek, getWeekDateRange } from '../lib/week';
import { getConfig } from '../services/config';
import { getLineup, setLineup } from '../services/match';
import { getRoster } from '../services/roster';
import { getActiveSeason } from '../services/season';

export const lineupMenu = new Menu<Context>('lineup').dynamic(async (ctx, range) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    return;
  }

  const season = await getActiveSeason(db);
  if (!season) {
    return;
  }

  const config = await getConfig(db, season.id);
  const lang = languageSchema.catch('fi').parse(config?.language);
  const lineupSize = config?.lineupSize ?? 5;

  const { week, year } = getCurrentWeek();
  const roster = await getRoster(db, season.id);
  const currentLineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
  const selectedIds = new Set(currentLineup.map((p) => p.telegramId));

  for (let i = 0; i < roster.length; i++) {
    const player = roster[i];
    const isSelected = selectedIds.has(player.telegramId);
    const label = isSelected ? `✅ ${player.displayName}` : player.displayName;

    range.text(label, async (ctx) => {
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
      const currentIds = lineup.map((p) => p.telegramId);
      const isCurrentlySelected = currentIds.includes(player.telegramId);

      const newIds = isCurrentlySelected
        ? currentIds.filter((id) => id !== player.telegramId)
        : [...currentIds, player.telegramId];

      await setLineup(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
        playerIds: newIds,
      });

      await ctx.menu.update();
    });

    if ((i + 1) % 2 === 0) {
      range.row();
    }
  }

  if (roster.length % 2 !== 0) {
    range.row();
  }

  range
    .text(t(lang).lineup.done, async (ctx) => {
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      if (lineup.length !== lineupSize) {
        await ctx.answerCallbackQuery(t(lang).lineup.needExact(lineupSize));
        return;
      }

      await ctx.answerCallbackQuery(t(lang).lineup.saved(lineup.length));

      const playerList = lineup.map((p) => `• ${p.displayName}`).join('\n');
      await ctx.editMessageText(t(lang).lineup.set(lineup.length, playerList));
    })
    .row();
});

export const getLineupMenuMessage = async (seasonId: number): Promise<string> => {
  const config = await getConfig(db, seasonId);
  const lang = languageSchema.catch('fi').parse(config?.language);

  const { week, year } = getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  return `${t(lang).lineup.menuTitle(week, dateRange)}\n\n${t(lang).lineup.selectPlayers}`;
};
