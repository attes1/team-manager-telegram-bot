import { Menu } from '@grammyjs/menu';
import type { BotContext } from '@/bot/context';
import { formatDateRange, formatPlayerName } from '@/lib/format';
import { getSchedulingWeek, getWeekDateRange } from '@/lib/temporal';
import { getPublicGroupIds } from '@/services/group';
import { buildLineupMessage, getLineup, setLineup } from '@/services/match';
import { getRoster } from '@/services/roster';

// Payload format for buttons: "week:year" e.g. "5:2025"
const encodeWeekPayload = (week: number, year: number): string => `${week}:${year}`;

const decodeWeekPayload = (
  payload: string | RegExpMatchArray | undefined,
): { week: number; year: number } | null => {
  if (!payload || typeof payload !== 'string') return null;
  const [weekStr, yearStr] = payload.split(':');
  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(week) || Number.isNaN(year)) return null;
  return { week, year };
};

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

  // Get week from: 1) payload (button click), 2) context (initial render from command), 3) scheduling week
  const payloadWeek = decodeWeekPayload(ctx.match);
  const { week, year } =
    payloadWeek ??
    ctx.lineupTargetWeek ??
    getSchedulingWeek(config.weekChangeDay, config.weekChangeTime);
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

      const playerList = lineup.map((p) => `• ${formatPlayerName(p)}`).join('\n');
      await ctx.deleteMessage();
      await ctx.reply(ctx.i18n.lineup.set(lineup.length, playerList));
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
