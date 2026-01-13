import { createTestDb } from '@tests/helpers';
import { mockDb, mockEnv } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerMatchCommands } from '@/bot/commands/admin/match';
import { addPlayerToRoster } from '@/services/roster';
import { createCommandUpdate, createMultiMentionUpdate, createTestBot } from './helpers';

const PUBLIC_GROUP_ID = -100999888777;
const ADMIN_ID = 123456;
const CHAT_ID = -100123456789;

describe('public announcements config', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
    mockEnv.env.PUBLIC_GROUP_ID = PUBLIC_GROUP_ID;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeasonWithRoster = async (publicAnnouncements: 'on' | 'off' = 'on') => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('config')
      .values({ seasonId: season.id, language: 'en', publicAnnouncements })
      .execute();

    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 111,
      displayName: 'Player One',
      username: 'player1',
    });

    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: 222,
      displayName: 'Player Two',
      username: 'player2',
    });

    return season;
  };

  describe('/setmatch announcements', () => {
    test('sends announcement to public group when enabled', async () => {
      await setupSeasonWithRoster('on');
      const { bot, calls } = createTestBot();
      registerMatchCommands(bot);

      const update = createCommandUpdate('/setmatch sun 20:00', ADMIN_ID, CHAT_ID);
      await bot.handleUpdate(update);

      // Should have 2 calls: announcement to public group + reply to user
      expect(calls).toHaveLength(2);
      expect(calls[0].payload.chat_id).toBe(PUBLIC_GROUP_ID);
      expect(calls[0].payload.text).toContain('Match scheduled');
      expect(calls[1].payload.chat_id).toBe(CHAT_ID);
    });

    test('does not send announcement when disabled', async () => {
      await setupSeasonWithRoster('off');
      const { bot, calls } = createTestBot();
      registerMatchCommands(bot);

      const update = createCommandUpdate('/setmatch sun 20:00', ADMIN_ID, CHAT_ID);
      await bot.handleUpdate(update);

      // Should only have 1 call: reply to user
      expect(calls).toHaveLength(1);
      expect(calls[0].payload.chat_id).toBe(CHAT_ID);
    });
  });

  describe('/setlineup announcements', () => {
    test('sends announcement to public group when enabled', async () => {
      await setupSeasonWithRoster('on');
      const { bot, calls } = createTestBot();
      registerMatchCommands(bot);

      const update = createMultiMentionUpdate('/setlineup', ADMIN_ID, CHAT_ID, [
        { id: 111, firstName: 'Player', lastName: 'One', username: 'player1' },
        { id: 222, firstName: 'Player', lastName: 'Two', username: 'player2' },
      ]);
      await bot.handleUpdate(update);

      // Should have 2 calls: announcement to public group + reply to user
      expect(calls).toHaveLength(2);
      expect(calls[0].payload.chat_id).toBe(PUBLIC_GROUP_ID);
      expect(calls[0].payload.text).toContain('Lineup');
      expect(calls[1].payload.chat_id).toBe(CHAT_ID);
    });

    test('does not send announcement when disabled', async () => {
      await setupSeasonWithRoster('off');
      const { bot, calls } = createTestBot();
      registerMatchCommands(bot);

      const update = createMultiMentionUpdate('/setlineup', ADMIN_ID, CHAT_ID, [
        { id: 111, firstName: 'Player', lastName: 'One', username: 'player1' },
        { id: 222, firstName: 'Player', lastName: 'Two', username: 'player2' },
      ]);
      await bot.handleUpdate(update);

      // Should only have 1 call: reply to user
      expect(calls).toHaveLength(1);
      expect(calls[0].payload.chat_id).toBe(CHAT_ID);
    });
  });

  describe('config update', () => {
    test('can toggle announcements on and off', async () => {
      const season = await setupSeasonWithRoster('on');

      // Check initial value
      let config = await mockDb.db
        .selectFrom('config')
        .selectAll()
        .where('seasonId', '=', season.id)
        .executeTakeFirstOrThrow();
      expect(config.publicAnnouncements).toBe('on');

      // Update to off
      await mockDb.db
        .updateTable('config')
        .set({ publicAnnouncements: 'off' })
        .where('seasonId', '=', season.id)
        .execute();

      config = await mockDb.db
        .selectFrom('config')
        .selectAll()
        .where('seasonId', '=', season.id)
        .executeTakeFirstOrThrow();
      expect(config.publicAnnouncements).toBe('off');

      // Update back to on
      await mockDb.db
        .updateTable('config')
        .set({ publicAnnouncements: 'on' })
        .where('seasonId', '=', season.id)
        .execute();

      config = await mockDb.db
        .selectFrom('config')
        .selectAll()
        .where('seasonId', '=', season.id)
        .executeTakeFirstOrThrow();
      expect(config.publicAnnouncements).toBe('on');
    });

    test('default value is on', async () => {
      const season = await mockDb.db
        .insertInto('seasons')
        .values({ name: 'Test Season' })
        .returningAll()
        .executeTakeFirstOrThrow();

      await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

      const config = await mockDb.db
        .selectFrom('config')
        .selectAll()
        .where('seasonId', '=', season.id)
        .executeTakeFirstOrThrow();

      expect(config.publicAnnouncements).toBe('on');
    });
  });
});
