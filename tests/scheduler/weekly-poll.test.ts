import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { BotContext } from '@/bot/context';
import { sendWeeklyPoll } from '@/scheduler/weekly-poll';

const CHAT_ID = -100123456789;

interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

const createMockBot = () => {
  const calls: ApiCall[] = [];

  const bot = new Bot<BotContext>('test-token', {
    botInfo: {
      id: 1,
      is_bot: true,
      first_name: 'TestBot',
      username: 'test_bot',
      can_join_groups: true,
      can_read_all_group_messages: true,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    } satisfies UserFromGetMe,
  });

  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return {
      ok: true,
      result: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: CHAT_ID, type: 'group', title: 'Test Group' },
        from: { id: 1, is_bot: true, first_name: 'TestBot' },
        text: '',
        username: 'test_bot',
      },
    } as ReturnType<typeof _prev>;
  });

  return { bot, calls };
};

describe('sendWeeklyPoll', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    vi.useRealTimers();
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
