import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerWeekCommand } from '@/bot/commands/admin/week';
import { startSeason } from '@/services/season';
import { createCommandUpdate, createTestBot } from './helpers';

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

describe('/setweek command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('admin can set week as practice', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 5');
    expect(calls[0].payload.text).toContain('practice');
  });

  test('admin can set week as match', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 10 match', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 10');
    expect(calls[0].payload.text).toContain('match');
  });

  test('non-admin cannot set week', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows usage when missing arguments', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('shows invalid type when week number provided without type', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid type');
  });

  test('rejects invalid week number', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 0 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid week');
  });

  test('rejects week number over 53', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 54 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid week');
  });

  test('rejects invalid type', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 invalid', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid type');
  });
});

describe('/setweek with optional week number', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await mockDb.db.destroy();
  });

  test('uses target week when only type is provided (practice)', async () => {
    // Tuesday 2025-01-07 09:00 - before cutoff (default: Sun 23:59)
    // Target week should be week 2 of 2025
    vi.setSystemTime(new Date('2025-01-07T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).toContain('practice');
  });

  test('uses target week when only type is provided (match)', async () => {
    // Tuesday 2025-01-07 09:00
    vi.setSystemTime(new Date('2025-01-07T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek match', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).toContain('match');
  });

  test('advances to next week after cutoff (Monday after Sunday cutoff)', async () => {
    // Monday 2025-01-13 09:00 - after Sunday cutoff
    // Should target week 3 (not week 2)
    vi.setSystemTime(new Date('2025-01-13T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('explicit week number still works (backward compatibility)', async () => {
    vi.setSystemTime(new Date('2025-01-07T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    // Explicitly setting week 10 should override the target week logic
    const update = createCommandUpdate('/setweek 10 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 10');
  });

  test('type argument is case insensitive', async () => {
    vi.setSystemTime(new Date('2025-01-07T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek PRACTICE', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('practice');
  });

  test('handles year boundary correctly (week 1 of new year)', async () => {
    // Wednesday 2025-12-31 09:00 - week 1 of 2026 per ISO
    vi.setSystemTime(new Date('2025-12-31T09:00:00'));
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    // Week 1 of 2026 starts Mon Dec 29, 2025
    expect(calls[0].payload.text).toContain('Week 1');
  });
});
