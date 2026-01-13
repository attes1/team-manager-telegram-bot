import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  deleteActiveMenu,
  deleteExpiredMenus,
  getActiveMenu,
  getExpiredMenus,
  saveActiveMenu,
} from '@/services/menu';
import type { DB } from '@/types/db';

describe('menu service', () => {
  let db: Kysely<DB>;
  let seasonId: number;

  beforeEach(async () => {
    db = await createTestDb();
    const season = await db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();
    seasonId = season.id;
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('saveActiveMenu', () => {
    test('saves a new active menu', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });

      const menu = await getActiveMenu(db, 123, 456, 'poll');
      expect(menu).toBeDefined();
      expect(menu?.messageId).toBe(789);
      expect(menu?.weekNumber).toBe(5);
      expect(menu?.year).toBe(2025);
    });

    test('updates existing menu on conflict', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 100,
        weekNumber: 5,
        year: 2025,
      });

      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 200,
        weekNumber: 6,
        year: 2025,
      });

      const menu = await getActiveMenu(db, 123, 456, 'poll');
      expect(menu?.messageId).toBe(200);
      expect(menu?.weekNumber).toBe(6);
    });

    test('allows different menu types for same user/chat', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 100,
        weekNumber: 5,
        year: 2025,
      });

      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'lineup',
        messageId: 200,
        weekNumber: 5,
        year: 2025,
      });

      const pollMenu = await getActiveMenu(db, 123, 456, 'poll');
      const lineupMenu = await getActiveMenu(db, 123, 456, 'lineup');

      expect(pollMenu?.messageId).toBe(100);
      expect(lineupMenu?.messageId).toBe(200);
    });
  });

  describe('getActiveMenu', () => {
    test('returns undefined when no menu exists', async () => {
      const menu = await getActiveMenu(db, 123, 456, 'poll');
      expect(menu).toBeUndefined();
    });

    test('returns menu when exists', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });

      const menu = await getActiveMenu(db, 123, 456, 'poll');
      expect(menu).toEqual({
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });
    });

    test('does not return menu for different user', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });

      const menu = await getActiveMenu(db, 123, 999, 'poll');
      expect(menu).toBeUndefined();
    });
  });

  describe('deleteActiveMenu', () => {
    test('deletes existing menu', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });

      await deleteActiveMenu(db, 123, 456, 'poll');

      const menu = await getActiveMenu(db, 123, 456, 'poll');
      expect(menu).toBeUndefined();
    });

    test('does not throw when menu does not exist', async () => {
      await expect(deleteActiveMenu(db, 123, 456, 'poll')).resolves.not.toThrow();
    });

    test('only deletes specific menu type', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 100,
        weekNumber: 5,
        year: 2025,
      });

      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'lineup',
        messageId: 200,
        weekNumber: 5,
        year: 2025,
      });

      await deleteActiveMenu(db, 123, 456, 'poll');

      const pollMenu = await getActiveMenu(db, 123, 456, 'poll');
      const lineupMenu = await getActiveMenu(db, 123, 456, 'lineup');

      expect(pollMenu).toBeUndefined();
      expect(lineupMenu).toBeDefined();
    });
  });

  describe('getExpiredMenus', () => {
    test('returns empty array when no menus', async () => {
      const expired = await getExpiredMenus(db, seasonId, 24);
      expect(expired).toEqual([]);
    });

    test('returns menus older than expiration hours', async () => {
      // Insert menu with old timestamp
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await db
        .insertInto('activeMenus')
        .values({
          seasonId,
          chatId: 123,
          userId: 456,
          menuType: 'poll',
          messageId: 789,
          weekNumber: 5,
          year: 2025,
          createdAt: oldTime,
        })
        .execute();

      const expired = await getExpiredMenus(db, seasonId, 24);
      expect(expired).toHaveLength(1);
      expect(expired[0].messageId).toBe(789);
    });

    test('does not return recent menus', async () => {
      await saveActiveMenu(db, {
        seasonId,
        chatId: 123,
        userId: 456,
        menuType: 'poll',
        messageId: 789,
        weekNumber: 5,
        year: 2025,
      });

      const expired = await getExpiredMenus(db, seasonId, 24);
      expect(expired).toEqual([]);
    });
  });

  describe('deleteExpiredMenus', () => {
    test('returns 0 when no expired menus', async () => {
      const deleted = await deleteExpiredMenus(db, seasonId, 24);
      expect(deleted).toBe(0);
    });

    test('deletes expired menus and returns count', async () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await db
        .insertInto('activeMenus')
        .values([
          {
            seasonId,
            chatId: 123,
            userId: 456,
            menuType: 'poll',
            messageId: 100,
            weekNumber: 5,
            year: 2025,
            createdAt: oldTime,
          },
          {
            seasonId,
            chatId: 124,
            userId: 457,
            menuType: 'poll',
            messageId: 200,
            weekNumber: 5,
            year: 2025,
            createdAt: oldTime,
          },
        ])
        .execute();

      const deleted = await deleteExpiredMenus(db, seasonId, 24);
      expect(deleted).toBe(2);

      const remaining = await db.selectFrom('activeMenus').selectAll().execute();
      expect(remaining).toHaveLength(0);
    });

    test('only deletes menus for specified season', async () => {
      const season2 = await db
        .insertInto('seasons')
        .values({ name: 'Season 2' })
        .returningAll()
        .executeTakeFirstOrThrow();

      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await db
        .insertInto('activeMenus')
        .values([
          {
            seasonId,
            chatId: 123,
            userId: 456,
            menuType: 'poll',
            messageId: 100,
            weekNumber: 5,
            year: 2025,
            createdAt: oldTime,
          },
          {
            seasonId: season2.id,
            chatId: 124,
            userId: 457,
            menuType: 'poll',
            messageId: 200,
            weekNumber: 5,
            year: 2025,
            createdAt: oldTime,
          },
        ])
        .execute();

      const deleted = await deleteExpiredMenus(db, seasonId, 24);
      expect(deleted).toBe(1);

      const remaining = await db.selectFrom('activeMenus').selectAll().execute();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].seasonId).toBe(season2.id);
    });
  });
});
