import { createTestDb, registerTeamGroup } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerRemindCommand } from '@/bot/commands/user/remind';
import { createCommandUpdate, createTestBot } from './helpers';

const ADMIN_ID = 123456;
const PLAYER_ID = 111;
const CHAT_ID = -100123456789;

describe('/remind command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
    await registerTeamGroup(mockDb.db, CHAT_ID);
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeasonWithRoster = async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values([
        { telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' },
        { telegramId: PLAYER_ID, displayName: 'Player', username: 'player' },
      ])
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values([
        { seasonId: season.id, playerId: ADMIN_ID, role: 'captain' },
        { seasonId: season.id, playerId: PLAYER_ID, role: 'player' },
      ])
      .execute();

    return season;
  };

  test('shows target week in reminder', async () => {
    await setupSeasonWithRoster();
    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    // Week 2 is target (before Sunday 10:00 cutoff)
    expect(calls[0].payload.text).toContain('Week 2');
  });

  test('targets next week when after cutoff', async () => {
    // Set to Sunday of week 2 at 11:00 (after Sunday 10:00 cutoff)
    vi.setSystemTime(new Date('2025-01-12T11:00:00'));
    await setupSeasonWithRoster();
    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Week 3 is target (after Sunday 10:00 cutoff)
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('lists players who have not responded for target week', async () => {
    await setupSeasonWithRoster();
    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Both players should be listed as they haven't responded (using username format)
    expect(calls[0].payload.text).toContain('• admin');
    expect(calls[0].payload.text).toContain('• player');
  });

  test('excludes players who have responded for target week', async () => {
    const season = await setupSeasonWithRoster();

    // Add response for PLAYER_ID for week 2
    await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: PLAYER_ID,
        weekNumber: 2,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Only Admin should be listed (Player has responded)
    expect(calls[0].payload.text).toContain('• admin');
    expect(calls[0].payload.text).not.toContain('• player');
  });

  test('shows all responded message when everyone has responded', async () => {
    const season = await setupSeasonWithRoster();

    // Add responses for both players for week 2
    await mockDb.db
      .insertInto('dayResponses')
      .values([
        {
          seasonId: season.id,
          playerId: ADMIN_ID,
          weekNumber: 2,
          year: 2025,
          day: 'mon',
          status: 'available',
        },
        {
          seasonId: season.id,
          playerId: PLAYER_ID,
          weekNumber: 2,
          year: 2025,
          day: 'mon',
          status: 'available',
        },
      ])
      .execute();

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Everyone has responded');
  });

  test('checks response for correct week based on cutoff', async () => {
    const season = await setupSeasonWithRoster();

    // Add response for week 2, but we're after cutoff so target is week 3
    await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: PLAYER_ID,
        weekNumber: 2,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    // Set to Sunday of week 2 at 11:00 (after Sunday 10:00 cutoff, target is week 3)
    vi.setSystemTime(new Date('2025-01-12T11:00:00'));

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Player's response is for week 2, but we're checking week 3
    // So Player should still be listed as not responded
    expect(calls[0].payload.text).toContain('• player');
  });

  test('handles custom cutoff day', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Set cutoff to Monday
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
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID, role: 'captain' })
      .execute();

    // Tuesday of week 2 (after Monday cutoff, target is week 3)
    vi.setSystemTime(new Date('2025-01-07T11:00:00'));

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('year boundary - reminds for week 1 of new year', async () => {
    await setupSeasonWithRoster();

    // Set to Sunday of week 52, 2025 at 11:00 (after Sunday 10:00 cutoff)
    vi.setSystemTime(new Date('2025-12-28T11:00:00'));

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 1');
  });

  test('response for week 1 of correct year counts', async () => {
    const season = await setupSeasonWithRoster();

    // Add response for week 1 of 2026
    await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: PLAYER_ID,
        weekNumber: 1,
        year: 2026,
        day: 'mon',
        status: 'available',
      })
      .execute();

    // Set to Friday of week 52, 2025 (target is week 1 of 2026)
    vi.setSystemTime(new Date('2025-12-26T11:00:00'));

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Player responded for week 1/2026, should not be in the reminder list
    expect(calls[0].payload.text).not.toContain('• Player');
  });

  test('response for week 1 of wrong year does not count', async () => {
    const season = await setupSeasonWithRoster();

    // Add response for week 1 of 2025 (wrong year)
    await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: PLAYER_ID,
        weekNumber: 1,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    // Set to Friday of week 52, 2025 (target is week 1 of 2026)
    vi.setSystemTime(new Date('2025-12-26T11:00:00'));

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Player's response is for week 1/2025, not 2026
    expect(calls[0].payload.text).toContain('• player');
  });

  test('returns error when no active season', async () => {
    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('returns error when not captain', async () => {
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

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/captain/i);
  });

  test('returns error for empty roster', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID, role: 'captain' })
      .execute();

    // Remove all roster entries (except captain, but they're the only one)
    // Actually, need to keep captain but have empty roster to check
    // The captain IS in the roster, so let's delete the roster and re-add just captain
    await mockDb.db.deleteFrom('seasonRoster').execute();

    const { bot, calls } = createTestBot();
    registerRemindCommand(bot);

    const update = createCommandUpdate('/remind', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Rosteri on tyhjä');
  });
});
