import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerMatchCommands } from '@/bot/commands/admin/match';
import { registerMatchInfoCommand } from '@/bot/commands/player/match';
import { up } from '@/db/migrations/001_initial';
import { getCurrentWeek } from '@/lib/week';
import { setLineup, setMatchTime } from '@/services/match';
import { addPlayerToRoster } from '@/services/roster';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';
import { createCommandUpdate, createMultiMentionUpdate, createTestBot } from './helpers';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: {
    ADMIN_IDS: [123456],
    DEFAULT_LANGUAGE: 'en' as const,
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_REMINDER_DAY: 'wed',
    DEFAULT_REMINDER_TIME: '18:00',
    DEFAULT_REMINDERS_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
  },
}));

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

describe('/setmatch command', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up(db);
    mockDb.db = db;
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
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up(db);
    mockDb.db = db;

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
});

describe('/match command', () => {
  let seasonId: number;

  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up(db);
    mockDb.db = db;

    const season = await startSeason(mockDb.db, 'Test Season');
    seasonId = season.id;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('shows match info when scheduled', async () => {
    const { week, year } = getCurrentWeek();

    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: TEST_USER_ID,
      displayName: 'Test User',
    });

    await setMatchTime(mockDb.db, {
      seasonId,
      weekNumber: week,
      year,
      matchDay: 'sun',
      matchTime: '20:00',
    });

    const { bot, calls } = createTestBot();
    registerMatchInfoCommand(bot);

    const update = createCommandUpdate('/match', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
  });

  test('shows lineup when set', async () => {
    const { week, year } = getCurrentWeek();

    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: TEST_USER_ID,
      displayName: 'Test User',
    });

    await addPlayerToRoster(mockDb.db, {
      seasonId,
      telegramId: 111,
      displayName: 'Player One',
    });

    await setLineup(mockDb.db, {
      seasonId,
      weekNumber: week,
      year,
      playerIds: [111],
    });

    const { bot, calls } = createTestBot();
    registerMatchInfoCommand(bot);

    const update = createCommandUpdate('/match', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Player One');
  });

  test('requires active season', async () => {
    await mockDb.db.updateTable('seasons').set({ status: 'ended' }).execute();

    const { bot, calls } = createTestBot();
    registerMatchInfoCommand(bot);

    const update = createCommandUpdate('/match', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });
});
