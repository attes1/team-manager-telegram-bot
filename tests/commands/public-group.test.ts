import { createTestDb } from '@tests/helpers';
import { mockDb, mockEnv } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerSeasonCommands } from '@/bot/commands/admin/season';
import { registerWeekCommand } from '@/bot/commands/admin/week';
import { registerAvailCommand } from '@/bot/commands/player/avail';
import { registerHelpCommand } from '@/bot/commands/player/help';
import { registerNextMatchCommand } from '@/bot/commands/player/nextmatch';
import { registerRosterCommand } from '@/bot/commands/player/roster';
import { addPlayerToRoster, setPlayerRole } from '@/services/roster';
import { startSeason } from '@/services/season';
import { createCommandUpdate, createTestBot } from './helpers';

const TEST_ADMIN_ID = 123456;
const TEST_CAPTAIN_ID = 111111;
const TEST_PLAYER_ID = 222222;
const TEST_USER_ID = 999999;
const TEAM_GROUP_ID = -100123;
const PUBLIC_GROUP_ID = -100456;

describe('public group restrictions', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
    mockEnv.env.TEAM_GROUP_ID = TEAM_GROUP_ID;
    mockEnv.env.PUBLIC_GROUP_ID = PUBLIC_GROUP_ID;
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
    mockDb.db = await createTestDb();
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
