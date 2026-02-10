import { createTestDb, registerTeamGroup } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerSeasonCommands } from '@/bot/commands/admin/season';
import { registerHelpCommand } from '@/bot/commands/public/help';
import { registerNextMatchCommand } from '@/bot/commands/public/nextmatch';
import { registerRosterCommand } from '@/bot/commands/public/roster';
import { registerAvailCommand } from '@/bot/commands/user/avail';
import { registerWeekCommand } from '@/bot/commands/user/week';
import { publicCommandsRestriction } from '@/bot/middleware';
import { updateConfig } from '@/services/config';
import { registerGroup, setGroupType } from '@/services/group';
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
    // Register groups in database
    await registerGroup(mockDb.db, TEAM_GROUP_ID, 'Team Group');
    await setGroupType(mockDb.db, TEAM_GROUP_ID, 'team');
    await registerGroup(mockDb.db, PUBLIC_GROUP_ID, 'Public Group');
    // PUBLIC_GROUP_ID defaults to 'public' type
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

describe('publicCommandsMode = admins', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
    await registerGroup(mockDb.db, PUBLIC_GROUP_ID, 'Public Group');
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('non-admin cannot run /roster when mode is admins', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await updateConfig(mockDb.db, season.id, 'publicCommandsMode', 'admins');

    const { bot, calls } = createTestBot();
    bot.use(publicCommandsRestriction);
    registerRosterCommand(bot);

    const update = createCommandUpdate('/roster', TEST_USER_ID, PUBLIC_GROUP_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(0);
  });

  test('admin can run /roster when mode is admins', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await updateConfig(mockDb.db, season.id, 'publicCommandsMode', 'admins');

    const { bot, calls } = createTestBot();
    bot.use(publicCommandsRestriction);
    registerRosterCommand(bot);

    const update = createCommandUpdate('/roster', TEST_ADMIN_ID, PUBLIC_GROUP_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
  });

  test('non-admin can run /roster when mode is all', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    bot.use(publicCommandsRestriction);
    registerRosterCommand(bot);

    const update = createCommandUpdate('/roster', TEST_USER_ID, PUBLIC_GROUP_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
  });
});

describe('when not in public group', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('commands work normally in a team group', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: TEST_CAPTAIN_ID,
      displayName: 'Captain',
    });
    await setPlayerRole(mockDb.db, season.id, TEST_CAPTAIN_ID, 'captain');
    await registerTeamGroup(mockDb.db, -100999);

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    // In a team group - should work
    const update = createCommandUpdate('/setweek 5 practice', TEST_CAPTAIN_ID, -100999);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('practice');
  });
});
