import { createMockBot, createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { sendMatchDayReminder } from '@/scheduler/match-day';
import { setLineup } from '@/services/match';
import { addPlayerToRoster } from '@/services/roster';
import { setWeekType } from '@/services/week';

const CHAT_ID = -100123456789;

describe('sendMatchDayReminder', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeason = async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    return season;
  };

  test('skips if no active season', async () => {
    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('skips for practice week', async () => {
    const season = await setupSeason();
    await setWeekType(mockDb.db, season.id, 2, 2025, 'practice');

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('skips if no config', async () => {
    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('sends reminder with no lineup warning', async () => {
    await setupSeason();

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    const text = calls[0].payload.text as string;
    expect(text).toContain('Match today');
    expect(text).toContain('not been set');
  });

  test('sends reminder with lineup', async () => {
    const season = await setupSeason();

    const player = await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 100,
      displayName: 'Player 1',
    });

    await setWeekType(mockDb.db, season.id, 2, 2025, 'match');
    await setLineup(mockDb.db, {
      seasonId: season.id,
      weekNumber: 2,
      year: 2025,
      playerIds: [player.telegramId],
    });

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    const text = calls[0].payload.text as string;
    expect(text).toContain('Match today');
    expect(text).toContain('Player 1');
    expect(text).not.toContain('not been set');
  });

  test('uses ping mode for lineup mentions', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('config')
      .values({ seasonId: season.id, language: 'en', matchDayReminderMode: 'ping' })
      .execute();

    const player = await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 100,
      displayName: 'Player 1',
    });

    await setWeekType(mockDb.db, season.id, 2, 2025, 'match');
    await setLineup(mockDb.db, {
      seasonId: season.id,
      weekNumber: 2,
      year: 2025,
      playerIds: [player.telegramId],
    });

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);

    const text = calls[0].payload.text as string;
    expect(text).toContain('<a href=');
    expect(calls[0].payload.parse_mode).toBe('HTML');
  });

  test('uses default match day/time from config', async () => {
    await setupSeason();

    const { bot, calls } = createMockBot();
    await sendMatchDayReminder(bot, CHAT_ID);

    const text = calls[0].payload.text as string;
    expect(text).toContain('Sun');
    expect(text).toContain('20:00');
  });
});
