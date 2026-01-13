import { Menu } from '@grammyjs/menu';
import type { BotContext } from '../bot/context';
import { env } from '../env';
import { formatDateRange, formatPlayerName } from '../lib/format';
import type { ParsedConfig } from '../lib/schemas';
import { getSchedulingWeek, getWeekDateRange } from '../lib/week';
import { buildLineupMessage, getLineup, setLineup } from '../services/match';
import { getRoster } from '../services/roster';

export const lineupMenu = new Menu<BotContext>('lineup').dynamic(async (ctx, range) => {
  const { db, season, config, i18n } = ctx;

  if (!season || !config) {
    return;
  }

  if (!ctx.isCaptain) {
    range.text(i18n.lineup.notCaptain, (ctx) => ctx.answerCallbackQuery());
    return;
  }

  const lineupSize = config.lineupSize;

  const { week, year } = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const roster = await getRoster(db, season.id);
  const currentLineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
  const selectedIds = new Set(currentLineup.map((p) => p.telegramId));

  for (let i = 0; i < roster.length; i++) {
    const player = roster[i];
    const isSelected = selectedIds.has(player.telegramId);
    const name = formatPlayerName(player);
    const label = isSelected ? `🔫 ${name}` : name;

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
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      await ctx.answerCallbackQuery(ctx.i18n.lineup.saved(lineup.length));

      if (
        env.PUBLIC_GROUP_ID &&
        config.publicAnnouncements === 'on' &&
        lineup.length === lineupSize
      ) {
        const { start, end } = getWeekDateRange(year, week);
        const dateRange = formatDateRange(start, end);
        const announcement = buildLineupMessage(ctx.i18n, week, dateRange, lineup);
        await ctx.api.sendMessage(env.PUBLIC_GROUP_ID, announcement);
      }

      const playerList = lineup.map((p) => `• ${formatPlayerName(p)}`).join('\n');
      await ctx.deleteMessage();
      await ctx.reply(ctx.i18n.lineup.set(lineup.length, playerList));
    })
    .row();
});

export const getLineupMenuMessage = (i18n: BotContext['i18n'], config: ParsedConfig): string => {
  const { week, year } = getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  return `${i18n.lineup.menuTitle(week, dateRange)}\n\n${i18n.lineup.selectPlayers}`;
};
