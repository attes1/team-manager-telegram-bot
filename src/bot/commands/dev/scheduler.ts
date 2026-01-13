import type { Bot } from 'grammy';
import type { AdminSeasonContext, BotContext } from '@/bot/context';
import { adminSeasonCommand } from '@/bot/middleware';
import { db } from '@/db';
import { env } from '@/env';
import {
  getScheduledTasks,
  getStoredBot,
  rescheduleTaskInMinutes,
  sendMatchDayReminder,
  sendReminder,
  sendWeeklyPoll,
  type TaskType,
} from '@/scheduler';
import { getTeamGroupId } from '@/services/group';

const devGuard = async (ctx: AdminSeasonContext): Promise<boolean> => {
  if (!env.DEV_MODE) {
    await ctx.reply(ctx.i18n.dev.notDevMode);
    return false;
  }
  return true;
};

export const registerDevSchedulerCommands = (bot: Bot<BotContext>) => {
  bot.command(
    'devpoll',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      if (!(await devGuard(ctx))) {
        return;
      }

      const { i18n } = ctx;
      const minutes = parseInt(ctx.match?.toString() ?? '1', 10) || 1;

      const success = rescheduleTaskInMinutes('weekly-poll', minutes);
      if (!success) {
        return ctx.reply(i18n.dev.noTeamGroup);
      }

      return ctx.reply(i18n.dev.pollScheduled(minutes));
    }),
  );

  bot.command(
    'devreminder',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      if (!(await devGuard(ctx))) {
        return;
      }

      const { i18n } = ctx;
      const minutes = parseInt(ctx.match?.toString() ?? '1', 10) || 1;

      const success = rescheduleTaskInMinutes('reminder', minutes);
      if (!success) {
        return ctx.reply(i18n.dev.noTeamGroup);
      }

      return ctx.reply(i18n.dev.reminderScheduled(minutes));
    }),
  );

  bot.command(
    'devmatchreminder',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      if (!(await devGuard(ctx))) {
        return;
      }

      const { i18n } = ctx;
      const minutes = parseInt(ctx.match?.toString() ?? '1', 10) || 1;

      const success = rescheduleTaskInMinutes('match-day', minutes);
      if (!success) {
        return ctx.reply(i18n.dev.noTeamGroup);
      }

      return ctx.reply(i18n.dev.matchReminderScheduled(minutes));
    }),
  );

  bot.command(
    'devtrigger',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      if (!(await devGuard(ctx))) {
        return;
      }

      const { i18n } = ctx;
      const taskArg = ctx.match?.toString().trim().toLowerCase();

      if (!taskArg) {
        return ctx.reply(i18n.dev.triggerUsage);
      }

      const taskMap: Record<string, TaskType> = {
        poll: 'weekly-poll',
        reminder: 'reminder',
        matchreminder: 'match-day',
      };

      const taskType = taskMap[taskArg];
      if (!taskType) {
        return ctx.reply(i18n.dev.triggerInvalidTask);
      }

      const bot = getStoredBot();
      if (!bot) {
        return ctx.reply(i18n.dev.noTeamGroup);
      }

      const teamGroupId = await getTeamGroupId(db);
      if (!teamGroupId) {
        return ctx.reply(i18n.dev.noTeamGroup);
      }

      // Trigger the task immediately
      await ctx.reply(i18n.dev.triggerStarted(taskArg));

      switch (taskType) {
        case 'weekly-poll':
          await sendWeeklyPoll(bot, teamGroupId);
          break;
        case 'reminder':
          await sendReminder(bot, teamGroupId);
          break;
        case 'match-day':
          await sendMatchDayReminder(bot, teamGroupId);
          break;
      }
    }),
  );

  bot.command(
    'devschedule',
    adminSeasonCommand(async (ctx: AdminSeasonContext) => {
      if (!(await devGuard(ctx))) {
        return;
      }

      const { i18n } = ctx;
      const tasks = getScheduledTasks();

      if (tasks.length === 0) {
        return ctx.reply(i18n.dev.noTasks);
      }

      const taskNames: Record<string, string> = {
        'weekly-poll': 'Poll',
        reminder: 'Reminder',
        'match-day': 'Match day reminder',
        'menu-cleanup': 'Menu cleanup',
      };

      const lines = [i18n.dev.scheduleTitle];
      for (const task of tasks) {
        const name = taskNames[task.name] ?? task.name;
        // node-cron doesn't expose next run time easily, so we just show status
        const status = 'scheduled';
        lines.push(i18n.dev.scheduleLine(name, status));
      }

      return ctx.reply(lines.join('\n'));
    }),
  );
};
