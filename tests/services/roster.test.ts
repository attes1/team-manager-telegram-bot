import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  addPlayerToRoster,
  getPlayerByTelegramId,
  getRoster,
  isPlayerInRoster,
  removePlayerFromRoster,
} from '@/services/roster';
import type { DB } from '@/types/db';

describe('roster service', () => {
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

  describe('addPlayerToRoster', () => {
    test('creates new player and adds to roster', async () => {
      const result = await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
        username: 'testuser',
      });

      expect(result.telegramId).toBe(123456);
      expect(result.displayName).toBe('Test Player');
      expect(result.username).toBe('testuser');

      const player = await db
        .selectFrom('players')
        .selectAll()
        .where('telegramId', '=', 123456)
        .executeTakeFirst();
      expect(player).toBeDefined();

      const rosterEntry = await db
        .selectFrom('seasonRoster')
        .selectAll()
        .where('seasonId', '=', seasonId)
        .where('playerId', '=', 123456)
        .executeTakeFirst();
      expect(rosterEntry).toBeDefined();
    });

    test('adds existing player to roster without creating duplicate', async () => {
      await db
        .insertInto('players')
        .values({ telegramId: 123456, displayName: 'Existing', username: 'existing' })
        .execute();

      const result = await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Updated Name',
        username: 'updateduser',
      });

      expect(result.telegramId).toBe(123456);
      expect(result.displayName).toBe('Updated Name');
      expect(result.username).toBe('updateduser');

      const players = await db.selectFrom('players').selectAll().execute();
      expect(players).toHaveLength(1);
      expect(players[0].displayName).toBe('Updated Name');
    });

    test('allows null username', async () => {
      const result = await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'No Username',
      });

      expect(result.username).toBeNull();
    });

    test('returns existing roster entry if player already in roster', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      const result = await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      expect(result.telegramId).toBe(123456);

      const rosterEntries = await db
        .selectFrom('seasonRoster')
        .selectAll()
        .where('seasonId', '=', seasonId)
        .where('playerId', '=', 123456)
        .execute();
      expect(rosterEntries).toHaveLength(1);
    });
  });

  describe('removePlayerFromRoster', () => {
    test('removes player from roster', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      const removed = await removePlayerFromRoster(db, seasonId, 123456);
      expect(removed).toBe(true);

      const rosterEntry = await db
        .selectFrom('seasonRoster')
        .selectAll()
        .where('seasonId', '=', seasonId)
        .where('playerId', '=', 123456)
        .executeTakeFirst();
      expect(rosterEntry).toBeUndefined();
    });

    test('keeps player in players table after removal from roster', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      await removePlayerFromRoster(db, seasonId, 123456);

      const player = await db
        .selectFrom('players')
        .selectAll()
        .where('telegramId', '=', 123456)
        .executeTakeFirst();
      expect(player).toBeDefined();
    });

    test('returns false if player not in roster', async () => {
      const removed = await removePlayerFromRoster(db, seasonId, 999999);
      expect(removed).toBe(false);
    });
  });

  describe('getRoster', () => {
    test('returns empty array when no players', async () => {
      const roster = await getRoster(db, seasonId);
      expect(roster).toEqual([]);
    });

    test('returns all players in roster', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 111,
        displayName: 'Player 1',
        username: 'player1',
      });
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 222,
        displayName: 'Player 2',
      });

      const roster = await getRoster(db, seasonId);
      expect(roster).toHaveLength(2);
      expect(roster.map((p) => p.telegramId).sort()).toEqual([111, 222]);
    });

    test('only returns players for specified season', async () => {
      const season2 = await db
        .insertInto('seasons')
        .values({ name: 'Season 2' })
        .returningAll()
        .executeTakeFirstOrThrow();

      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 111,
        displayName: 'Season 1 Player',
      });
      await addPlayerToRoster(db, {
        seasonId: season2.id,
        telegramId: 222,
        displayName: 'Season 2 Player',
      });

      const roster1 = await getRoster(db, seasonId);
      const roster2 = await getRoster(db, season2.id);

      expect(roster1).toHaveLength(1);
      expect(roster1[0].telegramId).toBe(111);
      expect(roster2).toHaveLength(1);
      expect(roster2[0].telegramId).toBe(222);
    });

    test('returns players sorted by display name', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 111,
        displayName: 'Zebra',
      });
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 222,
        displayName: 'Alpha',
      });
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 333,
        displayName: 'Mike',
      });

      const roster = await getRoster(db, seasonId);
      expect(roster.map((p) => p.displayName)).toEqual(['Alpha', 'Mike', 'Zebra']);
    });
  });

  describe('isPlayerInRoster', () => {
    test('returns true if player is in roster', async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      const result = await isPlayerInRoster(db, seasonId, 123456);
      expect(result).toBe(true);
    });

    test('returns false if player not in roster', async () => {
      const result = await isPlayerInRoster(db, seasonId, 999999);
      expect(result).toBe(false);
    });

    test('returns false if player in different season', async () => {
      const season2 = await db
        .insertInto('seasons')
        .values({ name: 'Season 2' })
        .returningAll()
        .executeTakeFirstOrThrow();

      await addPlayerToRoster(db, {
        seasonId: season2.id,
        telegramId: 123456,
        displayName: 'Test Player',
      });

      const result = await isPlayerInRoster(db, seasonId, 123456);
      expect(result).toBe(false);
    });
  });

  describe('getPlayerByTelegramId', () => {
    test('returns player if exists', async () => {
      await db
        .insertInto('players')
        .values({ telegramId: 123456, displayName: 'Test', username: 'test' })
        .execute();

      const player = await getPlayerByTelegramId(db, 123456);
      expect(player).toBeDefined();
      expect(player?.telegramId).toBe(123456);
      expect(player?.displayName).toBe('Test');
    });

    test('returns undefined if player does not exist', async () => {
      const player = await getPlayerByTelegramId(db, 999999);
      expect(player).toBeUndefined();
    });
  });
});
