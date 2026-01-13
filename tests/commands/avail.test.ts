import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { getISOWeek } from 'date-fns';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerAvailCommand } from '@/bot/commands/player/avail';
import { createCommandUpdate, createTestBot } from './helpers';

const ADMIN_ID = 123456;
const CHAT_ID = -100123456789;

describe('/avail command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('returns error when no active season', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const update = createCommandUpdate('/avail', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows no responses message when no availability data', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

    const update = createCommandUpdate('/avail', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('No responses');
  });

  test('shows availability grid with players', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values([
        { telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' },
        { telegramId: 111, displayName: 'Player One', username: 'playerone' },
      ])
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values([
        { seasonId: season.id, playerId: ADMIN_ID },
        { seasonId: season.id, playerId: 111 },
      ])
      .execute();

    const dayResponse = await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: 111,
        weekNumber: getISOWeek(new Date()),
        year: new Date().getFullYear(),
        day: 'mon',
        status: 'available',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('timeSlots')
      .values([
        { dayResponseId: dayResponse.id, timeSlot: '19' },
        { dayResponseId: dayResponse.id, timeSlot: '20' },
      ])
      .execute();

    const update = createCommandUpdate('/avail', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('playerone');
  });

  test('shows availability for specific day', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

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
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

    const update = createCommandUpdate('/avail mon', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
  });

  test('filters practice-only availability', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values([
        { telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' },
        { telegramId: 111, displayName: 'Player One', username: 'playerone' },
        { telegramId: 222, displayName: 'Player Two', username: 'playertwo' },
      ])
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values([
        { seasonId: season.id, playerId: ADMIN_ID },
        { seasonId: season.id, playerId: 111 },
        { seasonId: season.id, playerId: 222 },
      ])
      .execute();

    const week = getISOWeek(new Date());
    const year = new Date().getFullYear();

    await mockDb.db
      .insertInto('dayResponses')
      .values([
        {
          seasonId: season.id,
          playerId: 111,
          weekNumber: week,
          year,
          day: 'mon',
          status: 'practice_only',
        },
        {
          seasonId: season.id,
          playerId: 222,
          weekNumber: week,
          year,
          day: 'mon',
          status: 'match_only',
        },
      ])
      .execute();

    const update = createCommandUpdate('/avail practice', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('playerone');
    expect(calls[0].payload.text).not.toContain('playertwo');
  });

  test('filters match-only availability', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values([
        { telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' },
        { telegramId: 111, displayName: 'Player One', username: 'playerone' },
        { telegramId: 222, displayName: 'Player Two', username: 'playertwo' },
      ])
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values([
        { seasonId: season.id, playerId: ADMIN_ID },
        { seasonId: season.id, playerId: 111 },
        { seasonId: season.id, playerId: 222 },
      ])
      .execute();

    const week = getISOWeek(new Date());
    const year = new Date().getFullYear();

    await mockDb.db
      .insertInto('dayResponses')
      .values([
        {
          seasonId: season.id,
          playerId: 111,
          weekNumber: week,
          year,
          day: 'mon',
          status: 'practice_only',
        },
        {
          seasonId: season.id,
          playerId: 222,
          weekNumber: week,
          year,
          day: 'mon',
          status: 'match_only',
        },
      ])
      .execute();

    const update = createCommandUpdate('/avail match', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('playertwo');
    expect(calls[0].payload.text).not.toContain('playerone');
  });

  test('accepts Finnish aliases for filters', async () => {
    const { bot, calls } = createTestBot();
    registerAvailCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

    const week = getISOWeek(new Date());
    const year = new Date().getFullYear();

    await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: ADMIN_ID,
        weekNumber: week,
        year,
        day: 'mon',
        status: 'available',
      })
      .execute();

    const update = createCommandUpdate('/avail treeni', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('practice');
  });
});
