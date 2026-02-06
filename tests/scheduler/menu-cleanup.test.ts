import { createMockBot, createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { BotContext } from '@/bot/context';
import { cleanupExpiredMenus } from '@/scheduler/menu-cleanup';
import { saveActiveMenu } from '@/services/menu';

const CHAT_ID = -100123456789;

describe('cleanupExpiredMenus', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  const setupSeason = async () => {
    return mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();
  };

  test('does nothing when no expired menus', async () => {
    const season = await setupSeason();

    const { bot, calls } = createMockBot();
    await cleanupExpiredMenus(bot, season.id, 24);

    expect(calls).toHaveLength(0);
  });

  test('deletes expired menus via API and database', async () => {
    const season = await setupSeason();

    // Create a menu with old timestamp (25h ago)
    const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await mockDb.db
      .insertInto('activeMenus')
      .values({
        seasonId: season.id,
        chatId: CHAT_ID,
        userId: 100,
        menuType: 'poll',
        messageId: 999,
        weekNumber: 2,
        year: 2025,
        createdAt: oldTime,
      })
      .execute();

    const { bot, calls } = createMockBot();
    await cleanupExpiredMenus(bot, season.id, 24);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('deleteMessage');
    expect(calls[0].payload.chat_id).toBe(CHAT_ID);
    expect(calls[0].payload.message_id).toBe(999);

    const remaining = await mockDb.db.selectFrom('activeMenus').selectAll().execute();
    expect(remaining).toHaveLength(0);
  });

  test('keeps non-expired menus', async () => {
    const season = await setupSeason();

    await saveActiveMenu(mockDb.db, {
      seasonId: season.id,
      chatId: CHAT_ID,
      userId: 100,
      menuType: 'poll',
      messageId: 888,
      weekNumber: 2,
      year: 2025,
    });

    const { bot, calls } = createMockBot();
    await cleanupExpiredMenus(bot, season.id, 24);

    expect(calls).toHaveLength(0);

    const remaining = await mockDb.db.selectFrom('activeMenus').selectAll().execute();
    expect(remaining).toHaveLength(1);
  });

  test('handles API error gracefully when message already deleted', async () => {
    const season = await setupSeason();

    const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await mockDb.db
      .insertInto('activeMenus')
      .values({
        seasonId: season.id,
        chatId: CHAT_ID,
        userId: 100,
        menuType: 'poll',
        messageId: 999,
        weekNumber: 2,
        year: 2025,
        createdAt: oldTime,
      })
      .execute();

    const bot = new Bot<BotContext>('test-token', {
      botInfo: {
        id: 1,
        is_bot: true,
        first_name: 'TestBot',
        username: 'test_bot',
        can_join_groups: true,
        can_read_all_group_messages: true,
        supports_inline_queries: false,
        can_connect_to_business: false,
        has_main_web_app: false,
      } satisfies UserFromGetMe,
    });

    bot.api.config.use(() => {
      throw new Error('Message not found');
    });

    // Should not throw even when API fails
    await cleanupExpiredMenus(bot, season.id, 24);

    // DB records should still be cleaned up
    const remaining = await mockDb.db.selectFrom('activeMenus').selectAll().execute();
    expect(remaining).toHaveLength(0);
  });
});
