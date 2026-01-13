import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { BotContext } from '@/bot/context';
import { sendWeeklyPoll } from '@/scheduler/weekly-poll';

const CHAT_ID = -100123456789;
const PLAYER_ID = 111;
const PLAYER_DM_CHAT_ID = 111;

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

  const setupSeason = async (options?: { addRosterWithDm?: boolean }) => {
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

    if (options?.addRosterWithDm) {
      await mockDb.db
        .insertInto('players')
        .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
        .execute();

      await mockDb.db
        .insertInto('seasonRoster')
        .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
        .execute();

      await mockDb.db
        .insertInto('playerDmChats')
        .values({ playerId: PLAYER_ID, dmChatId: PLAYER_DM_CHAT_ID, canDm: 1 })
        .execute();
    }

    return season;
  };

  test('skips if no active season', async () => {
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    expect(calls).toHaveLength(0);
  });

  test('sends DM to roster players and summary to group', async () => {
    await setupSeason({ addRosterWithDm: true });
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    // getMe + sendMessage to DM + sendMessage summary to group
    expect(calls).toHaveLength(3);
    expect(calls[0].method).toBe('getMe');

    // DM to player with poll menu
    expect(calls[1].method).toBe('sendMessage');
    expect(calls[1].payload.chat_id).toBe(PLAYER_DM_CHAT_ID);

    // Summary to group
    expect(calls[2].method).toBe('sendMessage');
    expect(calls[2].payload.chat_id).toBe(CHAT_ID);
  });

  test('summary shows sent players', async () => {
    await setupSeason({ addRosterWithDm: true });
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    const summaryMessage = calls[2].payload.text as string;
    expect(summaryMessage).toContain('Player'); // The player who received DM
    expect(summaryMessage).toContain('Week 2');
  });

  test('sends only summary when no roster has DM registered', async () => {
    await setupSeason(); // No roster
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    // getMe + sendMessage summary to group
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('getMe');
    expect(calls[1].method).toBe('sendMessage');
    expect(calls[1].payload.chat_id).toBe(CHAT_ID);
  });

  test('summary contains week information', async () => {
    await setupSeason({ addRosterWithDm: true });
    const { bot, calls } = createMockBot();

    await sendWeeklyPoll(bot, CHAT_ID);

    // Summary message is the last one
    const summaryMessage = calls[calls.length - 1].payload.text as string;
    expect(summaryMessage).toContain('Week 2');
  });
});
