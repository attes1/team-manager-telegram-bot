import { createMockBot, createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { sendReminder } from '@/scheduler/reminder';
import { setDayAvailability } from '@/services/availability';
import { addPlayerToRoster } from '@/services/roster';

const CHAT_ID = -100123456789;

describe('sendReminder', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeasonWithRoster = async (playerCount = 2) => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    const players = [];
    for (let i = 0; i < playerCount; i++) {
      const player = await addPlayerToRoster(mockDb.db, {
        seasonId: season.id,
        telegramId: 100 + i,
        displayName: `Player ${i + 1}`,
      });
      players.push(player);
    }

    return { season, players };
  };

  test('skips if no active season', async () => {
    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('skips if reminders are off', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('config')
      .values({ seasonId: season.id, language: 'en', remindersMode: 'off' })
      .execute();

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('skips if roster is empty', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);
    expect(calls).toHaveLength(0);
  });

  test('sends all-responded message when everyone has answered', async () => {
    const { season, players } = await setupSeasonWithRoster(2);

    for (const player of players) {
      await setDayAvailability(mockDb.db, {
        seasonId: season.id,
        playerId: player.telegramId,
        weekNumber: 2,
        year: 2025,
        day: 'mon',
        status: 'available',
        timeSlots: [],
      });
    }

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Everyone has responded');
  });

  test('lists non-responders in quiet mode', async () => {
    await setupSeasonWithRoster(2);

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    const text = calls[0].payload.text as string;
    expect(text).toContain('Missing responses');
    expect(text).toContain('Player 1');
    expect(text).toContain('Player 2');
    expect(text).not.toContain('<a href=');
  });

  test('uses HTML mentions in ping mode', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('config')
      .values({ seasonId: season.id, language: 'en', remindersMode: 'ping' })
      .execute();

    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 100,
      displayName: 'Player 1',
    });

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);

    expect(calls).toHaveLength(1);
    const text = calls[0].payload.text as string;
    expect(text).toContain('<a href=');
    expect(calls[0].payload.parse_mode).toBe('HTML');
  });

  test('includes callback button', async () => {
    await setupSeasonWithRoster(1);

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);

    const replyMarkup = calls[0].payload.reply_markup as {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string }>>;
    };
    const button = replyMarkup.inline_keyboard[0][0];
    expect(button.callback_data).toBe('open_poll:2:2025');
  });

  test('only lists players who have not responded', async () => {
    const { season, players } = await setupSeasonWithRoster(3);

    await setDayAvailability(mockDb.db, {
      seasonId: season.id,
      playerId: players[0].telegramId,
      weekNumber: 2,
      year: 2025,
      day: 'mon',
      status: 'available',
      timeSlots: [],
    });

    const { bot, calls } = createMockBot();
    await sendReminder(bot, CHAT_ID);

    const text = calls[0].payload.text as string;
    expect(text).not.toContain('Player 1');
    expect(text).toContain('Player 2');
    expect(text).toContain('Player 3');
  });
});
