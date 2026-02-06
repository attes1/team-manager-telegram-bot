import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { GrammyError } from 'grammy';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getDmChatId, isDmBlockedError, markDmFailed, registerDmChat } from '@/services/dm';

const PLAYER_ID = 111;
const DM_CHAT_ID = 222;

describe('DM service', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player' })
      .execute();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  describe('registerDmChat', () => {
    test('registers a new DM chat', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);

      const row = await mockDb.db
        .selectFrom('playerDmChats')
        .selectAll()
        .where('playerId', '=', PLAYER_ID)
        .executeTakeFirst();

      expect(row).toBeDefined();
      expect(row?.dmChatId).toBe(DM_CHAT_ID);
      expect(row?.canDm).toBe(1);
    });

    test('updates existing DM chat on conflict', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);
      await registerDmChat(mockDb.db, PLAYER_ID, 333);

      const row = await mockDb.db
        .selectFrom('playerDmChats')
        .selectAll()
        .where('playerId', '=', PLAYER_ID)
        .executeTakeFirst();

      expect(row?.dmChatId).toBe(333);
    });

    test('re-enables canDm on re-registration after failure', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);
      await markDmFailed(mockDb.db, PLAYER_ID);
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);

      const row = await mockDb.db
        .selectFrom('playerDmChats')
        .selectAll()
        .where('playerId', '=', PLAYER_ID)
        .executeTakeFirst();

      expect(row?.canDm).toBe(1);
    });
  });

  describe('getDmChatId', () => {
    test('returns chat ID for registered player', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);

      const chatId = await getDmChatId(mockDb.db, PLAYER_ID);
      expect(chatId).toBe(DM_CHAT_ID);
    });

    test('returns null for unregistered player', async () => {
      const chatId = await getDmChatId(mockDb.db, PLAYER_ID);
      expect(chatId).toBeNull();
    });

    test('returns null when canDm is disabled', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);
      await markDmFailed(mockDb.db, PLAYER_ID);

      const chatId = await getDmChatId(mockDb.db, PLAYER_ID);
      expect(chatId).toBeNull();
    });
  });

  describe('markDmFailed', () => {
    test('sets canDm to 0', async () => {
      await registerDmChat(mockDb.db, PLAYER_ID, DM_CHAT_ID);
      await markDmFailed(mockDb.db, PLAYER_ID);

      const row = await mockDb.db
        .selectFrom('playerDmChats')
        .select('canDm')
        .where('playerId', '=', PLAYER_ID)
        .executeTakeFirst();

      expect(row?.canDm).toBe(0);
    });
  });

  describe('isDmBlockedError', () => {
    test('returns true for GrammyError with code 403', () => {
      const err = new GrammyError(
        'Forbidden',
        {
          ok: false,
          error_code: 403,
          description: 'Forbidden: bot was blocked by the user',
        },
        'sendMessage',
        {},
      );
      expect(isDmBlockedError(err)).toBe(true);
    });

    test('returns false for GrammyError with other code', () => {
      const err = new GrammyError(
        'Bad Request',
        {
          ok: false,
          error_code: 400,
          description: 'Bad Request',
        },
        'sendMessage',
        {},
      );
      expect(isDmBlockedError(err)).toBe(false);
    });

    test('returns false for non-GrammyError', () => {
      expect(isDmBlockedError(new Error('random'))).toBe(false);
    });

    test('returns false for non-error values', () => {
      expect(isDmBlockedError(null)).toBe(false);
      expect(isDmBlockedError('string')).toBe(false);
    });
  });
});
