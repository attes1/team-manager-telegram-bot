import type { Bot } from 'grammy';
import cron, { type ScheduledTask as CronTask } from 'node-cron';
import type { BotContext } from '../bot/context';
import { db } from '../db';
import { env } from '../env';
import { getConfig } from '../services/config';
import { getActiveSeason } from '../services/season';
import { sendMatchDayReminder } from './match-day';
import { sendReminder } from './reminder';
import { buildCronExpression } from './utils';
import { sendWeeklyPoll } from './weekly-poll';

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

  const chatId = env.TEAM_GROUP_ID;

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

export const startScheduler = async (bot: Bot<BotContext>): Promise<void> => {
  storedBot = bot;
  await initScheduler(bot);
};

export { sendMatchDayReminder } from './match-day';
export { sendReminder } from './reminder';
export { sendWeeklyPoll } from './weekly-poll';
