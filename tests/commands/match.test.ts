import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerMatchCommands } from '@/bot/commands/user/match';
import { getSchedulingWeek } from '@/lib/temporal';
import { addPlayerToRoster } from '@/services/roster';
import { startSeason } from '@/services/season';
import { setWeekType } from '@/services/week';
import {
  createCommandUpdate,
  createMultiMentionUpdate,
  createTestBot,
  createUsernameMentionUpdate,
} from './helpers';

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

describe('/setmatch command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('admin can set match time', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Match scheduled');
    expect(calls[0].payload.text).toContain('Sun');
    expect(calls[0].payload.text).toContain('20:00');
  });

  test('admin can set match on different day', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch wed 19:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Wed');
    expect(calls[0].payload.text).toContain('19:00');
  });

  test('non-admin cannot set match', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows usage when missing arguments', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('shows usage when missing time', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('rejects invalid day', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch invalid 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid day');
  });

  test('rejects invalid time format', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 2000', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid time');
  });

  test('rejects time without colon', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid time');
  });
});

describe('/setlineup command', () => {
  let seasonId: number;

  beforeEach(async () => {
    mockDb.db = await createTestDb();

    const season = await startSeason(mockDb.db, 'Test Season');
    seasonId = season.id;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('admin can set lineup with mentions', async () => {
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 111,
      displayName: 'Player One',
      username: 'player1',
    });
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 222,
      displayName: 'Player Two',
      username: 'player2',
    });

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createMultiMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      { id: 111, firstName: 'Player', lastName: 'One', username: 'player1' },
      { id: 222, firstName: 'Player', lastName: 'Two', username: 'player2' },
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Lineup set');
    expect(calls[0].payload.text).toContain('2 players');
  });

  test('non-admin cannot set lineup', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createMultiMentionUpdate('/setlineup', TEST_USER_ID, TEST_CHAT_ID, [
      { id: 111, firstName: 'Player', lastName: 'One' },
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    await mockDb.db.updateTable('seasons').set({ status: 'ended' }).execute();

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createMultiMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      { id: 111, firstName: 'Player', lastName: 'One' },
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows interactive menu when no mentions', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.reply_markup).toBeDefined();
  });

  test('admin can clear lineup', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setlineup clear', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('cleared');
  });

  test('rejects player not in roster', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createMultiMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      { id: 999, firstName: 'Unknown', lastName: 'Player' },
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('not in the roster');
  });

  test('admin can set lineup with @username mentions', async () => {
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 111,
      displayName: 'Player One',
      username: 'player1',
    });
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 222,
      displayName: 'Player Two',
      username: 'player2',
    });

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createUsernameMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      'player1',
      'player2',
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Lineup set');
    expect(calls[0].payload.text).toContain('2 players');
  });

  test('@username mention for player not in roster shows error', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createUsernameMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      'unknownplayer',
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('not in the roster');
  });

  test('@username mention for player without username in roster shows error', async () => {
    // Player exists but without username
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 333,
      displayName: 'No Username Player',
      username: null,
    });

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    // Try to mention by a made-up username
    const update = createUsernameMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      'nousernameuser',
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('not in the roster');
  });

  test('rejects lineup on practice week with mentions', async () => {
    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 111,
      displayName: 'Player One',
      username: 'player1',
    });

    // Set current scheduling week as practice
    const { week, year } = getSchedulingWeek('sun', '10:00');
    await setWeekType(mockDb.db, seasonId, week, year, 'practice');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createMultiMentionUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID, [
      { id: 111, firstName: 'Player', lastName: 'One', username: 'player1' },
    ]);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('practice');
  });

  test('rejects lineup menu on practice week immediately', async () => {
    // Set current scheduling week as practice
    const { week, year } = getSchedulingWeek('sun', '10:00');
    await setWeekType(mockDb.db, seasonId, week, year, 'practice');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setlineup', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Should show practice week error, NOT a menu
    expect(calls[0].payload.reply_markup).toBeUndefined();
    expect(calls[0].payload.text).toContain('practice');
  });
});
