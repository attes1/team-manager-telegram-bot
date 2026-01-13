import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerSeasonCommands } from '@/bot/commands/admin/season';
import { registerWeekCommand } from '@/bot/commands/admin/week';
import { registerAvailCommand } from '@/bot/commands/player/avail';
import { registerHelpCommand } from '@/bot/commands/player/help';
import { registerNextMatchCommand } from '@/bot/commands/player/nextmatch';
import { registerRosterCommand } from '@/bot/commands/player/roster';
import { up as up001 } from '@/db/migrations/001_initial';
import { up as up002 } from '@/db/migrations/002_roster_roles';
import { up as up003 } from '@/db/migrations/003_match_day_reminder_mode';
import { addPlayerToRoster, setPlayerRole } from '@/services/roster';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot } from './helpers';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: {
    ADMIN_IDS: [123456],
    TEAM_GROUP_ID: -100123,
    PUBLIC_GROUP_ID: -100456,
    DEFAULT_LANGUAGE: 'en' as const,
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_POLL_REMINDER_DAY: 'wed',
    DEFAULT_POLL_REMINDER_TIME: '18:00',
    DEFAULT_POLL_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
    DEFAULT_MATCH_DAY_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
  },
}));

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

const TEST_ADMIN_ID = 123456;
const TEST_CAPTAIN_ID = 111111;
const TEST_PLAYER_ID = 222222;
const TEST_USER_ID = 999999;
const TEAM_GROUP_ID = -100123;
const PUBLIC_GROUP_ID = -100456;

describe('public group restrictions', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up001(db);
    await up002(db);
    await up003(db);
    mockDb.db = db;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  describe('captain commands in public group', () => {
    test('captain cannot run /setweek in public group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_CAPTAIN_ID,
        displayName: 'Captain',
      });
      await setPlayerRole(mockDb.db, season.id, TEST_CAPTAIN_ID, 'captain');

      const { bot, calls } = createTestBot();
      registerWeekCommand(bot);

      const update = createCommandUpdate('/setweek 5 practice', TEST_CAPTAIN_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('not available in public group');
    });

    test('admin CAN run /setweek in public group', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerWeekCommand(bot);

      const update = createCommandUpdate('/setweek 5 practice', TEST_ADMIN_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('practice');
      expect(calls[0].payload.text).not.toContain('not available');
    });

    test('captain CAN run /setweek in team group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_CAPTAIN_ID,
        displayName: 'Captain',
      });
      await setPlayerRole(mockDb.db, season.id, TEST_CAPTAIN_ID, 'captain');

      const { bot, calls } = createTestBot();
      registerWeekCommand(bot);

      const update = createCommandUpdate('/setweek 5 practice', TEST_CAPTAIN_ID, TEAM_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('practice');
    });
  });

  describe('roster commands in public group', () => {
    test('player cannot run /avail in public group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_PLAYER_ID,
        displayName: 'Player',
      });

      const { bot, calls } = createTestBot();
      registerAvailCommand(bot);

      const update = createCommandUpdate('/avail', TEST_PLAYER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('not available in public group');
    });

    test('admin CAN run /avail in public group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_ADMIN_ID,
        displayName: 'Admin',
      });

      const { bot, calls } = createTestBot();
      registerAvailCommand(bot);

      const update = createCommandUpdate('/avail', TEST_ADMIN_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).not.toContain('not available');
    });

    test('player CAN run /avail in team group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_PLAYER_ID,
        displayName: 'Player',
      });

      const { bot, calls } = createTestBot();
      registerAvailCommand(bot);

      const update = createCommandUpdate('/avail', TEST_PLAYER_ID, TEAM_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).not.toContain('not available in public group');
    });
  });

  describe('public commands in public group', () => {
    test('anyone can run /roster in public group', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerRosterCommand(bot);

      const update = createCommandUpdate('/roster', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).not.toContain('not available');
    });

    test('anyone can run /nextmatch in public group', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerNextMatchCommand(bot);

      const update = createCommandUpdate('/nextmatch', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).not.toContain('not available');
    });

    test('anyone can run /help in public group', async () => {
      const { bot, calls } = createTestBot();
      registerHelpCommand(bot);

      const update = createCommandUpdate('/help', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).not.toContain('not available');
    });
  });

  describe('admin commands in public group', () => {
    test('admin can run /startseason in public group', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/startseason Test', TEST_ADMIN_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Test');
      expect(calls[0].payload.text).not.toContain('not available');
    });

    test('non-admin cannot run /startseason anywhere', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/startseason Test', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('permission');
    });
  });

  describe('commands in team group work normally', () => {
    test('captain can run captain commands in team group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_CAPTAIN_ID,
        displayName: 'Captain',
      });
      await setPlayerRole(mockDb.db, season.id, TEST_CAPTAIN_ID, 'captain');

      const { bot, calls } = createTestBot();
      registerWeekCommand(bot);

      const update = createCommandUpdate('/setweek 5 match', TEST_CAPTAIN_ID, TEAM_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('match');
    });

    test('player can run roster commands in team group', async () => {
      const season = await startSeason(mockDb.db, 'Test Season');
      await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: TEST_PLAYER_ID,
        displayName: 'Player',
      });

      const { bot, calls } = createTestBot();
      registerAvailCommand(bot);

      const update = createCommandUpdate('/avail', TEST_PLAYER_ID, TEAM_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      // Should show availability or "no responses" but not "not available in public group"
      expect(calls[0].payload.text).not.toContain('not available in public group');
    });
  });

  describe('non-roster users in public group', () => {
    test('non-roster user gets appropriate error for roster commands', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerAvailCommand(bot);

      // In public group, should get "not available in public group"
      const update = createCommandUpdate('/avail', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('not available in public group');
    });

    test('non-captain user gets appropriate error for captain commands', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerWeekCommand(bot);

      // In public group, should get "not available in public group"
      const update = createCommandUpdate('/setweek 5 practice', TEST_USER_ID, PUBLIC_GROUP_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('not available in public group');
    });
  });
});

describe('when not in public group', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up001(db);
    await up002(db);
    await up003(db);
    mockDb.db = db;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('commands work normally in a different group than PUBLIC_GROUP_ID', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: TEST_CAPTAIN_ID,
      displayName: 'Captain',
    });
    await setPlayerRole(mockDb.db, season.id, TEST_CAPTAIN_ID, 'captain');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    // In a group that is NOT the public group - should work
    const update = createCommandUpdate('/setweek 5 practice', TEST_CAPTAIN_ID, -100999);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('practice');
  });
});
