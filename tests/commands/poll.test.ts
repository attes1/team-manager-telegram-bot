import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerPollCommand } from '@/bot/commands/user/poll';
import { createCommandUpdate, createTestBot } from './helpers';

const PLAYER_ID = 111;
const CHAT_ID = -100123456789;
const DM_CHAT_ID = 111; // DM chat ID equals user ID in Telegram

describe('/poll command', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Set to Wednesday of week 2, 2025 - before Thursday cutoff
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await mockDb.db.destroy();
  });

  const setupSeasonWithPlayer = async (registerDm = true) => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    if (registerDm) {
      await mockDb.db
        .insertInto('playerDmChats')
        .values({ playerId: PLAYER_ID, dmChatId: DM_CHAT_ID, canDm: 1 })
        .execute();
    }

    return season;
  };

  test('sends poll to DM when used in group with DM registered', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // First call: poll sent to DM, second call: confirmation in group
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.chat_id).toBe(DM_CHAT_ID);
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[1].method).toBe('sendMessage');
    expect(calls[1].payload.chat_id).toBe(CHAT_ID);
    expect(calls[1].payload.text).toContain('DM');
  });

  test('sends poll for specified week when parameter provided', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 5', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation in group
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 5');
  });

  test('rejects past week (week 1 when target is week 2)', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2/2025, week 1 is in the past
    const update = createCommandUpdate('/poll 1', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('must be 2 or later');
  });

  test('accepts current target week', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2, so week 2 should be allowed
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).not.toContain('past');
  });

  test('rejects past week when on late year', async () => {
    // Set to week 51 of 2025
    vi.setSystemTime(new Date('2025-12-18T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Request week 2 (without year) - defaults to current year 2025 which is past
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('must be 51 or later');
  });

  test('accepts explicit next year week', async () => {
    // Set to week 51 of 2025
    vi.setSystemTime(new Date('2025-12-18T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Request week 2/2026 with explicit year
    const update = createCommandUpdate('/poll 2/2026', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 2');
  });

  test('uses current year when week >= target week', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2, request week 10
    const update = createCommandUpdate('/poll 10', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.text).toContain('Week 10');
  });

  test('rejects invalid week number - too low', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 0', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('rejects invalid week number - too high', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 54', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('rejects non-numeric week parameter', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll abc', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('targets next week when after cutoff', async () => {
    // Set to Sunday of week 2 at 11:00 (after Sunday 10:00 cutoff)
    vi.setSystemTime(new Date('2025-01-12T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('rejects past week when target is next week', async () => {
    // Set to Sunday of week 2 at 11:00 (after Sunday 10:00 cutoff, target is week 3)
    vi.setSystemTime(new Date('2025-01-12T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target is week 3/2025, week 2 is in the past
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('must be 3 or later');
  });

  test('returns error when no active season', async () => {
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('returns error when user not in roster', async () => {
    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();
    const season = await mockDb.db.selectFrom('seasons').selectAll().executeTakeFirstOrThrow();
    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', 999, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('roster');
  });

  test('handles custom cutoff day configuration', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Set cutoff to Monday instead of Thursday
    await mockDb.db
      .insertInto('config')
      .values({
        seasonId: season.id,
        language: 'en',
        weekChangeDay: 'mon',
        weekChangeTime: '10:00',
      })
      .execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    // Register DM
    await mockDb.db
      .insertInto('playerDmChats')
      .values({ playerId: PLAYER_ID, dmChatId: DM_CHAT_ID, canDm: 1 })
      .execute();

    // Set to Tuesday of week 2 (after Monday cutoff, so target is week 3)
    vi.setSystemTime(new Date('2025-01-07T11:00:00'));

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('handles custom cutoff time configuration', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Set cutoff to Thursday 08:00 instead of 10:00
    await mockDb.db
      .insertInto('config')
      .values({
        seasonId: season.id,
        language: 'en',
        weekChangeDay: 'thu',
        weekChangeTime: '08:00',
      })
      .execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    // Register DM
    await mockDb.db
      .insertInto('playerDmChats')
      .values({ playerId: PLAYER_ID, dmChatId: DM_CHAT_ID, canDm: 1 })
      .execute();

    // Set to Thursday 09:00 (after 08:00 cutoff, so target is week 3)
    vi.setSystemTime(new Date('2025-01-09T09:00:00'));

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('year boundary - week 52 to week 1 of next year', async () => {
    // Set to Sunday of week 52, 2025 at 11:00 (after Sunday 10:00 cutoff)
    vi.setSystemTime(new Date('2025-12-28T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // Poll sent to DM + confirmation
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.text).toContain('Week 1');
    // Week 1 should be 2026 since we crossed the year boundary
  });

  test('shows dmFailed message when no DM registered', async () => {
    await setupSeasonWithPlayer(false); // Don't register DM
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    // getMe + sendMessage with dmFailed
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('getMe');
    expect(calls[1].method).toBe('sendMessage');
    expect(calls[1].payload.text).toContain('t.me/');
  });
});
