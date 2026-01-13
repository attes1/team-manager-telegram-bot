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

export const initScheduler = async (
  bot: Bot<BotContext>,
  handlers: {
    onWeeklyPoll: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
    onReminder: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
    onMatchDay: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
  },
): Promise<void> => {
  stopAllTasks();

  const season = await getActiveSeason(db);
  if (!season) {
    console.log('Scheduler: No active season, skipping initialization');
    return;
  }

  const config = await getConfig(db, season.id);
  if (!config) {
    console.log('Scheduler: No config found, skipping initialization');
    return;
  }

  const chatId = env.TEAM_GROUP_ID;

  // Weekly poll
  const pollCron = buildCronExpression(config.pollDay, config.pollTime);
  tasks.push(scheduleTask('weekly-poll', pollCron, () => handlers.onWeeklyPoll(bot, chatId)));
  console.log(`Scheduler: Weekly poll scheduled for ${config.pollDay} at ${config.pollTime}`);

  // Mid-week reminder
  if (config.remindersMode !== 'off') {
    const reminderCron = buildCronExpression(config.reminderDay, config.reminderTime);
    tasks.push(scheduleTask('reminder', reminderCron, () => handlers.onReminder(bot, chatId)));
    console.log(
      `Scheduler: Reminder scheduled for ${config.reminderDay} at ${config.reminderTime}`,
    );
  }

  // Match day reminder
  const matchDayCron = buildCronExpression(config.matchDay, config.matchTime, -2);
  tasks.push(scheduleTask('match-day', matchDayCron, () => handlers.onMatchDay(bot, chatId)));
  console.log(
    `Scheduler: Match day reminder scheduled for ${config.matchDay}, 2 hours before ${config.matchTime}`,
  );

  console.log(`Scheduler: ${tasks.length} task(s) scheduled`);
};

export const refreshScheduler = async (
  bot: Bot<BotContext>,
  handlers: {
    onWeeklyPoll: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
    onReminder: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
    onMatchDay: (bot: Bot<BotContext>, chatId: number) => Promise<void>;
  },
): Promise<void> => {
  console.log('Scheduler: Refreshing tasks...');
  await initScheduler(bot, handlers);
};

export const getScheduledTasks = (): ScheduledTask[] => [...tasks];

export const startScheduler = async (bot: Bot<BotContext>): Promise<void> => {
  await initScheduler(bot, {
    onWeeklyPoll: sendWeeklyPoll,
    onReminder: sendReminder,
    onMatchDay: sendMatchDayReminder,
  });
};

export { sendMatchDayReminder } from './match-day';
export { sendReminder } from './reminder';
export { sendWeeklyPoll } from './weekly-poll';
