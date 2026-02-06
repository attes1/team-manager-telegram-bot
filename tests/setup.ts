import type { Kysely } from 'kysely';
import { beforeEach, vi } from 'vitest';
import type { DB } from '@/types/db';

/**
 * Shared mock objects that tests can import and mutate in beforeEach hooks.
 * These are set up globally via vi.mock() so all test files get the same mocks.
 */

// Mock for @/db - tests should set mockDb.db in beforeEach
export const mockDb = {
  db: null as unknown as Kysely<DB>,
};

// Default env values - tests can override specific properties
export const mockEnv = {
  env: {
    ADMIN_IDS: [123456],
    DEFAULT_LANGUAGE: 'en' as const,
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_POLL_REMINDER_DAY: 'wed',
    DEFAULT_POLL_REMINDER_TIME: '18:00',
    DEFAULT_POLL_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
    DEFAULT_MATCH_DAY_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
  },
};

// Mock for @/scheduler
export const mockRefreshScheduler = vi.fn();

// Pin system time at module level so describe-level new Date() calls see the faked time
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-08T09:00:00'));

// Reset time before each test (in case a previous test changed it)
beforeEach(() => {
  vi.setSystemTime(new Date('2025-01-08T09:00:00'));
});

// Set up global mocks
vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);
vi.mock('@/scheduler', () => ({ refreshScheduler: mockRefreshScheduler }));
