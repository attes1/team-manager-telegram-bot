import { Menu } from '@grammyjs/menu';
import type { BotContext } from '@/bot/context';
import { formatDateRange, formatPlayerName } from '@/lib/format';
import { getWeekDateRange } from '@/lib/temporal';
import { getPublicGroupIds } from '@/services/group';
import { buildLineupMessage, getLineup, setLineup } from '@/services/match';
import { getRoster } from '@/services/roster';
import { decodeWeekPayload, encodeWeekPayload } from './shared';

export const lineupMenu = new Menu<BotContext>('lineup').dynamic(async (ctx, range) => {
  const { db, season, config, schedulingWeek, i18n } = ctx;

  if (!season || !config || !schedulingWeek) {
    return;
  }

  if (!ctx.isCaptain) {
    range.text(i18n.lineup.notCaptain, (ctx) => ctx.answerCallbackQuery());
    return;
  }

  const lineupSize = config.lineupSize;

  // Get week from: 1) payload (button click), 2) context (initial render from command), 3) scheduling week
  const payloadWeek = decodeWeekPayload(ctx.match);
  const { week, year } = payloadWeek ?? ctx.lineupTargetWeek ?? schedulingWeek;
  const weekPayload = encodeWeekPayload(week, year);

  const roster = await getRoster(db, season.id);
  const currentLineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
  const selectedIds = new Set(currentLineup.map((p) => p.telegramId));

  for (let i = 0; i < roster.length; i++) {
    const player = roster[i];
    const isSelected = selectedIds.has(player.telegramId);
    const name = formatPlayerName(player);
    const label = isSelected ? `🔫 ${name}` : name;

    range.text({ text: label, payload: weekPayload }, async (ctx) => {
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });
      const currentIds = lineup.map((p) => p.telegramId);
      const isCurrentlySelected = currentIds.includes(player.telegramId);

      const newIds = isCurrentlySelected
        ? currentIds.filter((id) => id !== player.telegramId)
        : [...currentIds, player.telegramId];

      const result = await setLineup(db, {
        seasonId: season.id,
        weekNumber: week,
        year,
        playerIds: newIds,
      });

      if (!result.success && result.reason === 'practice_week') {
        return ctx.answerCallbackQuery(i18n.lineup.practiceWeek);
      }

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
    .text({ text: i18n.lineup.done, payload: weekPayload }, async (ctx) => {
      const lineup = await getLineup(db, { seasonId: season.id, weekNumber: week, year });

      await ctx.answerCallbackQuery(ctx.i18n.lineup.saved(lineup.length));

      if (config.publicAnnouncements === 'on' && lineup.length === lineupSize) {
        const publicGroupIds = await getPublicGroupIds(db);
        if (publicGroupIds.length > 0) {
          const { start, end } = getWeekDateRange(year, week);
          const dateRange = formatDateRange(start, end);
          const announcement = buildLineupMessage(ctx.i18n, week, dateRange, lineup);
          for (const groupId of publicGroupIds) {
            try {
              await ctx.api.sendMessage(groupId, announcement);
            } catch (error) {
              console.error(`Failed to send lineup announcement to group ${groupId}:`, error);
            }
          }
        }
      }

      const { start: weekStart, end: weekEnd } = getWeekDateRange(year, week);
      const weekDateRange = formatDateRange(weekStart, weekEnd);
      const playerList = lineup.map((p) => `• ${formatPlayerName(p)}`).join('\n');
      await ctx.deleteMessage();
      await ctx.reply(ctx.i18n.lineup.set(lineup.length, playerList, week, weekDateRange));
    })
    .row();
});

export const getLineupMenuMessage = (
  i18n: BotContext['i18n'],
  week: number,
  year: number,
): string => {
  const { start, end } = getWeekDateRange(year, week);
  const dateRange = formatDateRange(start, end);

  return `${i18n.lineup.menuTitle(week, dateRange)}\n\n${i18n.lineup.selectPlayers}`;
};
