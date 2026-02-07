import type { Translations } from '@/i18n';
import { escapeHtml } from './format';
import type { WeekType } from './schemas';

export interface StatusData {
  seasonName: string;
  week: number;
  year: number;
  dateRange: string;
  schedulingWeek: { week: number; year: number };
  currentWeek: { week: number; year: number };
  weekType: WeekType;
  rosterCount: number;
  respondedCount: number;
  matchDay: string;
  matchTime: string;
  lineupCount: number;
  lineupSize: number;
  config: {
    pollDay: string;
    pollTime: string;
    reminderDay: string;
    reminderTime: string;
    remindersMode: string;
    matchDayReminderMode: string;
    matchDayReminderTime: string;
    menuCleanupTime: string;
  };
  devMode: boolean;
  i18n: Translations;
}

export const buildStatusMessage = (data: StatusData): string => {
  const { i18n } = data;
  const responseRate =
    data.rosterCount > 0 ? Math.round((data.respondedCount / data.rosterCount) * 100) : 0;

  const getDayLabel = (day: string) => i18n.poll.days[day as keyof typeof i18n.poll.days] ?? day;

  const dayName = getDayLabel(data.matchDay);
  const devBadge = data.devMode ? ` ${i18n.status.devBadge}` : '';

  const lines: string[] = [
    `📊 <b>${i18n.status.title}</b>${devBadge}`,
    '',
    `<b>${i18n.status.season}:</b> ${escapeHtml(data.seasonName)}`,
  ];

  if (
    data.currentWeek.week !== data.schedulingWeek.week ||
    data.currentWeek.year !== data.schedulingWeek.year
  ) {
    lines.push(`<b>${i18n.status.schedulingFor}:</b> ${i18n.status.weekLabel(data.week)}`);
  }

  lines.push(
    `<b>${i18n.status.week}:</b> ${data.week} (${data.dateRange})`,
    `<b>${i18n.status.weekType}:</b> ${data.weekType === 'match' ? '🏆 ' : '🏋️ '}${i18n.status.weekTypes[data.weekType]}`,
    '',
    `<b>${i18n.status.roster}:</b> ${data.rosterCount} ${i18n.status.players}`,
    `<b>${i18n.status.responses}:</b> ${data.respondedCount}/${data.rosterCount} (${responseRate}%)`,
  );

  if (data.weekType === 'match') {
    lines.push('');
    lines.push(`<b>${i18n.status.matchTime}:</b> ${dayName} ${data.matchTime}`);
    const lineupIcon = data.lineupCount < data.lineupSize ? '⚠️' : '👥';
    lines.push(
      `${lineupIcon} <b>${i18n.status.lineup}:</b> ${data.lineupCount}/${data.lineupSize} ${i18n.status.players}`,
    );
  }

  lines.push('');
  lines.push(`<b>${i18n.status.schedulesTitle}:</b>`);
  lines.push(
    `• ${i18n.status.pollSchedule}: ${getDayLabel(data.config.pollDay)} ${data.config.pollTime}`,
  );

  if (data.config.remindersMode !== 'off') {
    lines.push(
      `• ${i18n.status.reminderSchedule}: ${getDayLabel(data.config.reminderDay)} ${data.config.reminderTime}`,
    );
  } else {
    lines.push(`• ${i18n.status.reminderSchedule}: ${i18n.status.scheduleOff}`);
  }

  if (data.config.matchDayReminderMode !== 'off') {
    lines.push(
      `• ${i18n.status.matchDayReminderSchedule}: ${getDayLabel(data.matchDay)} ${data.config.matchDayReminderTime}`,
    );
  } else {
    lines.push(`• ${i18n.status.matchDayReminderSchedule}: ${i18n.status.scheduleOff}`);
  }

  if (data.devMode) {
    lines.push(`• ${i18n.status.menuCleanupSchedule}: ${data.config.menuCleanupTime}`);
  }

  return lines.join('\n');
};
