import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerPlayerCommands } from '@/bot/commands/admin/players';
import { registerRosterCommand } from '@/bot/commands/player/roster';
import { up } from '@/db/migrations/001_initial';
import { clearAll } from '@/services/pending-invitations';
import { addPlayerToRoster } from '@/services/roster';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';
import { createCommandUpdate, createMentionUpdate, createTestBot } from './helpers';

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

describe('/addplayer command', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up(db);
    mockDb.db = db;
    clearAll();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
    clearAll();
  });

  test('admin can send invitation with text_mention', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createMentionUpdate('/addplayer', TEST_ADMIN_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
    });
    await bot.handleUpdate(update);

    // Should have 2 calls: invitation message, setMessageReaction
    expect(calls.length).toBe(2);

    // First call should be the invitation message
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('join the roster');
    expect(calls[0].payload.text).toContain('John Doe');

    // Second call should be setMessageReaction
    expect(calls[1].method).toBe('setMessageReaction');
  });

  test('admin can send invitation with username arg', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createCommandUpdate('/addplayer johndoe', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    // Should have 2 calls: invitation message, setMessageReaction
    expect(calls.length).toBe(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('@johndoe');
    expect(calls[0].payload.text).toContain('join the roster');
  });

  test('admin can send invitation with @username arg', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createCommandUpdate('/addplayer @johndoe', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls.length).toBe(2);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('@johndoe');
  });

  test('non-admin cannot add a player', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createMentionUpdate('/addplayer', TEST_USER_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
    });
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createMentionUpdate('/addplayer', TEST_ADMIN_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
    });
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows usage when no user specified', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createCommandUpdate('/addplayer', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });
});

describe('/removeplayer command', () => {
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

  test('admin can remove a player with text_mention', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    // Directly add player to roster (bypassing invitation flow)
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 111222,
      displayName: 'John',
      username: 'johndoe',
    });

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const removeUpdate = createMentionUpdate('/removeplayer', TEST_ADMIN_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
    });
    await bot.handleUpdate(removeUpdate);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('John');
    expect(calls[0].payload.text).toContain('removed');
  });

  test('admin can remove a player by username', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 111222,
      displayName: 'John Doe',
      username: 'johndoe',
    });

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const removeUpdate = createCommandUpdate('/removeplayer johndoe', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(removeUpdate);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('John Doe');
    expect(calls[0].payload.text).toContain('removed');
  });

  test('non-admin cannot remove a player', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createMentionUpdate('/removeplayer', TEST_USER_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
    });
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('returns error when player not in roster', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerPlayerCommands(bot);

    const update = createMentionUpdate('/removeplayer', TEST_ADMIN_ID, TEST_CHAT_ID, {
      id: 111222,
      firstName: 'John',
    });
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('not in the roster');
  });
});

describe('/roster command', () => {
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

  test('shows empty roster message', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerRosterCommand(bot);

    const update = createCommandUpdate('/roster', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('empty');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerRosterCommand(bot);

    const update = createCommandUpdate('/roster', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows players in roster', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    // Directly add players (bypassing invitation flow)
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 111,
      displayName: 'Alice',
      username: 'alice',
    });
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 222,
      displayName: 'Bob',
    });

    const { bot, calls } = createTestBot();
    registerRosterCommand(bot);

    const rosterUpdate = createCommandUpdate('/roster', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(rosterUpdate);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Alice');
    expect(calls[0].payload.text).toContain('@alice');
    expect(calls[0].payload.text).toContain('Bob');
  });
});
