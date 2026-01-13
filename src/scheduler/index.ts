import type { Bot } from 'grammy';
import cron, { type ScheduledTask as CronTask } from 'node-cron';
import { db } from '@/db';
import { env } from '@/env';
import { sendMatchDayReminder } from '@/scheduler/match-day';
import { cleanupExpiredMenus } from '@/scheduler/menu-cleanup';
import { sendReminder } from '@/scheduler/reminder';
import { buildCronExpression, buildDailyCronExpression } from '@/scheduler/utils';
import { sendWeeklyPoll } from '@/scheduler/weekly-poll';
import { getConfig } from '@/services/config';
import { getTeamGroupId } from '@/services/group';
import { getActiveSeason } from '@/services/season';
import type { BotContext } from '../bot/context';

export interface ScheduledTask {
  name: string;
  task: CronTask;
}

const tasks: ScheduledTask[] = [];
let storedBot: Bot<BotContext> | null = null;

const stopAllTasks = () => {
  for (const { task } of tasks) {
    task.stop();
  }
  tasks.length = 0;
};

const scheduleTask = (
  name: string,
  cronExpression: string,
  handler: () => Promise<void>,
): ScheduledTask => {
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await handler();
      } catch (error) {
        console.error(`Scheduler error [${name}]:`, error);
      }
    },
    { timezone: env.TZ },
  );

  return { name, task };
};

const initScheduler = async (bot: Bot<BotContext>): Promise<void> => {
  stopAllTasks();

  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Scheduler: No active season, tasks stopped');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config) {
    console.log('Scheduler: No config found, tasks stopped');
    return;
  }

  const teamGroupId = await getTeamGroupId(db);
  if (!teamGroupId) {
    console.log('Scheduler: No team group configured, tasks stopped');
    return;
  }

  const chatId = teamGroupId;

  // Weekly poll
  const pollCron = buildCronExpression(config.pollDay, config.pollTime);
  tasks.push(scheduleTask('weekly-poll', pollCron, () => sendWeeklyPoll(bot, chatId)));
  console.log(`Scheduler: Weekly poll scheduled for ${config.pollDay} at ${config.pollTime}`);

  // Mid-week reminder
  if (config.remindersMode !== 'off') {
    const reminderCron = buildCronExpression(config.reminderDay, config.reminderTime);
    tasks.push(scheduleTask('reminder', reminderCron, () => sendReminder(bot, chatId)));
    console.log(
      `Scheduler: Reminder scheduled for ${config.reminderDay} at ${config.reminderTime}`,
    );
  }

  // Match day reminder
  if (config.matchDayReminderMode !== 'off') {
    const matchDayCron = buildCronExpression(config.matchDay, config.matchDayReminderTime);
    tasks.push(scheduleTask('match-day', matchDayCron, () => sendMatchDayReminder(bot, chatId)));
    console.log(
      `Scheduler: Match day reminder scheduled for ${config.matchDay} at ${config.matchDayReminderTime}`,
    );
  }

  // Menu cleanup (daily)
  const menuCleanupCron = buildDailyCronExpression(config.menuCleanupTime);
  tasks.push(
    scheduleTask('menu-cleanup', menuCleanupCron, () =>
      cleanupExpiredMenus(bot, season.id, config.menuExpirationHours),
    ),
  );
  console.log(`Scheduler: Menu cleanup scheduled daily at ${config.menuCleanupTime}`);

  console.log(`Scheduler: ${tasks.length} task(s) scheduled`);
};

export const refreshScheduler = async (): Promise<void> => {
  if (!storedBot) {
    console.log('Scheduler: Bot not initialized, cannot refresh');
    return;
  }
  console.log('Scheduler: Refreshing tasks...');
  await initScheduler(storedBot);
};

export const getScheduledTasks = (): ScheduledTask[] => [...tasks];

export const getStoredBot = (): Bot<BotContext> | null => storedBot;

export type TaskType = 'weekly-poll' | 'reminder' | 'match-day';

export const rescheduleTaskInMinutes = (taskType: TaskType, minutes: number): boolean => {
  const taskIndex = tasks.findIndex((t) => t.name === taskType);
  if (taskIndex === -1) {
    return false;
  }

  // Stop the existing task
  tasks[taskIndex].task.stop();

  // Calculate new cron expression for X minutes from now
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  const cronExpression = `${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;

  // Schedule replacement task based on type
  const bot = storedBot;
  if (!bot) {
    return false;
  }

  // We need to get the chatId from the database
  const createHandler = async () => {
    const season = await getActiveSeason(db);
    if (!season) {
      return;
    }
    const teamGroupId = await getTeamGroupId(db);
    if (!teamGroupId) {
      return;
    }

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
  };

  const newTask = scheduleTask(taskType, cronExpression, createHandler);
  tasks[taskIndex] = newTask;

  console.log(`Scheduler: ${taskType} rescheduled to run at ${now.toLocaleTimeString()}`);
  return true;
};

export const startScheduler = async (bot: Bot<BotContext>): Promise<void> => {
  storedBot = bot;
  await initScheduler(bot);
};

export { sendMatchDayReminder } from './match-day';
export { cleanupExpiredMenus } from './menu-cleanup';
export { sendReminder } from './reminder';
export { sendWeeklyPoll } from './weekly-poll';
