import { Menu } from '@grammyjs/menu';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { env } from '../env';
import { getTranslations } from '../i18n';
import { formatDateRange } from '../lib/format';
import { getCurrentWeek, getWeekDateRange } from '../lib/week';
import { buildLineupAnnouncement } from '../services/announcements';
import { getConfig } from '../services/config';
import { getLineup, setLineup } from '../services/match';
import { getRoster } from '../services/roster';
import { getActiveSeason } from '../services/season';

// getConfig is used in the dynamic menu handler for lineupSize

export const lineupMenu = new Menu<BotContext>('lineup').dynamic(async (ctx, range) => {
  if (!ctx.isAdmin) {
    return;
  }

  const season = await getActiveSeason(db);
  if (!season) {
    return;
  }

  const i18n = await getTranslations(db, season.id);
  const config = await getConfig(db, season.id);
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
    .text(i18n.lineup.done, async (ctx) => {
      const latestI18n = await getTranslations(db, season.id);
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      if (lineup.length !== lineupSize) {
        await ctx.answerCallbackQuery(latestI18n.lineup.needExact(lineupSize));
        return;
      }

      await ctx.answerCallbackQuery(latestI18n.lineup.saved(lineup.length));

      if (env.PUBLIC_CHANNEL_ID) {
        const { start, end } = getWeekDateRange(year, week);
        const dateRange = formatDateRange(start, end);
        const announcement = buildLineupAnnouncement(latestI18n, week, dateRange, lineup);
        await ctx.api.sendMessage(env.PUBLIC_CHANNEL_ID, announcement);
      }

      const playerList = lineup.map((p) => `• ${p.displayName}`).join('\n');
      await ctx.editMessageText(latestI18n.lineup.set(lineup.length, playerList));
    })
    .row();
});

export const getLineupMenuMessage = async (seasonId: number): Promise<string> => {
  const i18n = await getTranslations(db, seasonId);

  const { week, year } = getCurrentWeek();
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  return `${i18n.lineup.menuTitle(week, dateRange)}\n\n${i18n.lineup.selectPlayers}`;
};
