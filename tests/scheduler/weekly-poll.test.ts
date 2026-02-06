import { createMockBot, createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { sendWeeklyPoll } from '@/scheduler/weekly-poll';

const CHAT_ID = -100123456789;

describe('sendWeeklyPoll', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeason = async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('config')
      .values({
        seasonId: season.id,
        language: 'en',
        pollDays: 'mon,tue,wed',
        pollTimes: '19,20,21',
      })
      .execute();

    return season;
  };

  test('skips if no active season', async () => {
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    expect(calls).toHaveLength(0);
  });

  test('sends group message with callback button', async () => {
    await setupSeason();
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.chat_id).toBe(CHAT_ID);
  });

  test('group message contains week info and callback button', async () => {
    await setupSeason();
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    const message = calls[0].payload.text as string;
    expect(message).toContain('Week 2');

    const replyMarkup = calls[0].payload.reply_markup as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const button = replyMarkup.inline_keyboard[0][0];
    expect(button.callback_data).toBe('open_poll:2:2025');
  });

  test('sends only summary when no config found', async () => {
    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();

    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    // No config → skips entirely
    expect(calls).toHaveLength(0);
  });
});
