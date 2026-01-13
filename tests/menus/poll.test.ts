import Database from 'better-sqlite3';
import type { Kysely } from 'kysely';
import { CamelCasePlugin, Kysely as KyselyClass, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { up as up001 } from '@/db/migrations/001_initial';
import { up as up002 } from '@/db/migrations/002_roster_roles';
import { up as up003 } from '@/db/migrations/003_match_day_reminder_mode';
import { up as up004 } from '@/db/migrations/004_poll_cutoff';
import { getPollMessage } from '@/menus/poll';
import type { DB } from '@/types/db';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
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
}));

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

describe('getPollMessage', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    const db = new KyselyClass<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up001(db);
    await up002(db);
    await up003(db);
    await up004(db);
    mockDb.db = db;
  });

  afterEach(async () => {
    vi.useRealTimers();
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

  test('includes week marker at end of message', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id);

    expect(message).toMatch(/\[w:\d+\/\d+\]$/);
  });

  test('week marker contains correct week and year', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('[w:5/2025]');
  });

  test('week marker uses provided target week', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 10, year: 2026 });

    expect(message).toContain('[w:10/2026]');
  });

  test('uses current week when no target week provided', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id);

    // Current week is 2 (from 2025-01-08)
    expect(message).toContain('[w:2/2025]');
  });

  test('week marker format is parseable', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 15, year: 2025 });

    // Extract the week marker and parse it
    const match = message.match(/\[w:(\d+)\/(\d+)\]$/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(15);
    expect(Number(match?.[2])).toBe(2025);
  });

  test('handles year boundary week 1', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 1, year: 2026 });

    expect(message).toContain('[w:1/2026]');
    expect(message).toContain('Week 1');
  });

  test('handles week 52', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 52, year: 2025 });

    expect(message).toContain('[w:52/2025]');
  });

  test('handles week 53 in years that have it', async () => {
    const season = await setupSeason();
    // 2026 has 53 weeks
    const message = await getPollMessage(season.id, { week: 53, year: 2026 });

    expect(message).toContain('[w:53/2026]');
  });

  test('includes legend in message', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id);

    expect(message).toContain('✅');
    expect(message).toContain('❌');
  });

  test('includes date range in title', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 2, year: 2025 });

    // Week 2 of 2025 is Jan 6-12 (Finnish format: 6.1. - 12.1.)
    expect(message).toMatch(/6\.1\./);
  });

  test('shows match week title for match week', async () => {
    const season = await setupSeason();

    // Add a match week
    await mockDb.db
      .insertInto('weeks')
      .values({ seasonId: season.id, weekNumber: 5, year: 2025, type: 'match' })
      .execute();

    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('MATCH WEEK');
  });

  test('shows regular title for non-match week', async () => {
    const season = await setupSeason();

    // Add a practice week
    await mockDb.db
      .insertInto('weeks')
      .values({ seasonId: season.id, weekNumber: 5, year: 2025, type: 'practice' })
      .execute();

    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('availability poll');
  });
});

describe('week marker parsing regex', () => {
  // Test the regex pattern that will be used to parse week markers
  const WEEK_MARKER_REGEX = /\[w:(\d+)\/(\d+)\]$/;

  test('matches valid week marker at end of string', () => {
    const text = 'Some message text [w:5/2025]';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('5');
    expect(match?.[2]).toBe('2025');
  });

  test('matches double digit week', () => {
    const text = 'Some message text [w:52/2025]';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('52');
  });

  test('matches different years', () => {
    const text = 'Some message text [w:1/2026]';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[2]).toBe('2026');
  });

  test('does not match if not at end', () => {
    const text = '[w:5/2025] Some message text';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).toBeNull();
  });

  test('does not match invalid format', () => {
    const text = 'Some message text [w:abc/2025]';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).toBeNull();
  });

  test('extracts numbers correctly from complex message', () => {
    const text = `📅 Week 5 (27.1. – 2.2.)

✅ Available | ❌ Unavailable
[w:5/2025]`;
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(5);
    expect(Number(match?.[2])).toBe(2025);
  });
});
