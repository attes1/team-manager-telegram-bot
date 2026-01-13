import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getDisplayStatus, getNextStatus, getPollMessage } from '@/menus/poll';

describe('getPollMessage', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    mockDb.db = await createTestDb();
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

    expect(message).toMatch(/href="w:\d+\/\d+"/);
  });

  test('week marker contains correct week and year', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('href="w:5/2025"');
  });

  test('week marker uses provided target week', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 10, year: 2026 });

    expect(message).toContain('href="w:10/2026"');
  });

  test('uses current week when no target week provided', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id);

    // Current week is 2 (from 2025-01-08)
    expect(message).toContain('href="w:2/2025"');
  });

  test('week marker format is parseable', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 15, year: 2025 });

    // Extract the week marker and parse it
    const match = message.match(/href="w:(\d+)\/(\d+)"/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(15);
    expect(Number(match?.[2])).toBe(2025);
  });

  test('handles year boundary week 1', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 1, year: 2026 });

    expect(message).toContain('href="w:1/2026"');
    expect(message).toContain('Week 1');
  });

  test('handles week 52', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 52, year: 2025 });

    expect(message).toContain('href="w:52/2025"');
  });

  test('handles week 53 in years that have it', async () => {
    const season = await setupSeason();
    // 2026 has 53 weeks
    const message = await getPollMessage(season.id, { week: 53, year: 2026 });

    expect(message).toContain('href="w:53/2026"');
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

    expect(message).toContain('practice week');
  });
});

describe('week marker parsing regex', () => {
  // Test the regex pattern that will be used to parse week markers (hidden in HTML link)
  const WEEK_MARKER_REGEX = /href="w:(\d+)\/(\d+)"/;

  test('matches valid week marker in HTML link', () => {
    const text = 'Some message text <a href="w:5/2025">\u200B</a>';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('5');
    expect(match?.[2]).toBe('2025');
  });

  test('matches double digit week', () => {
    const text = 'Some message text <a href="w:52/2025">\u200B</a>';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('52');
  });

  test('matches different years', () => {
    const text = 'Some message text <a href="w:1/2026">\u200B</a>';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(match?.[2]).toBe('2026');
  });

  test('matches anywhere in message', () => {
    const text = '<a href="w:5/2025">\u200B</a> Some message text';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
  });

  test('does not match invalid format', () => {
    const text = 'Some message text <a href="w:abc/2025">\u200B</a>';
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).toBeNull();
  });

  test('extracts numbers correctly from complex message', () => {
    const text = `📅 Week 5 (27.1.2025 – 2.2.2025)

✅ Available | ❌ Unavailable
<a href="w:5/2025">\u200B</a>`;
    const match = text.match(WEEK_MARKER_REGEX);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(5);
    expect(Number(match?.[2])).toBe(2025);
  });
});

describe('getNextStatus', () => {
  describe('match week (isPracticeWeek = false)', () => {
    test('cycles through all 5 statuses in order', () => {
      expect(getNextStatus('available', false)).toBe('practice_only');
      expect(getNextStatus('practice_only', false)).toBe('match_only');
      expect(getNextStatus('match_only', false)).toBe('if_needed');
      expect(getNextStatus('if_needed', false)).toBe('unavailable');
      expect(getNextStatus('unavailable', false)).toBe('available');
    });

    test('full cycle returns to start', () => {
      let status = getNextStatus('available', false);
      status = getNextStatus(status, false);
      status = getNextStatus(status, false);
      status = getNextStatus(status, false);
      status = getNextStatus(status, false);
      expect(status).toBe('available');
    });
  });

  describe('practice week (isPracticeWeek = true)', () => {
    test('cycles between practice_only and unavailable only', () => {
      expect(getNextStatus('practice_only', true)).toBe('unavailable');
      expect(getNextStatus('unavailable', true)).toBe('practice_only');
    });

    test('jumps to practice_only when status not in practice order', () => {
      expect(getNextStatus('available', true)).toBe('practice_only');
      expect(getNextStatus('match_only', true)).toBe('practice_only');
      expect(getNextStatus('if_needed', true)).toBe('practice_only');
    });

    test('full practice week cycle returns to start', () => {
      let status = getNextStatus('practice_only', true);
      status = getNextStatus(status, true);
      expect(status).toBe('practice_only');
    });
  });
});

describe('getDisplayStatus', () => {
  describe('match week (isPracticeWeek = false)', () => {
    test('returns all statuses unchanged', () => {
      expect(getDisplayStatus('available', false)).toBe('available');
      expect(getDisplayStatus('practice_only', false)).toBe('practice_only');
      expect(getDisplayStatus('match_only', false)).toBe('match_only');
      expect(getDisplayStatus('if_needed', false)).toBe('if_needed');
      expect(getDisplayStatus('unavailable', false)).toBe('unavailable');
    });
  });

  describe('practice week (isPracticeWeek = true)', () => {
    test('maps available to practice_only', () => {
      expect(getDisplayStatus('available', true)).toBe('practice_only');
    });

    test('maps match_only to practice_only', () => {
      expect(getDisplayStatus('match_only', true)).toBe('practice_only');
    });

    test('maps if_needed to practice_only', () => {
      expect(getDisplayStatus('if_needed', true)).toBe('practice_only');
    });

    test('keeps practice_only as is', () => {
      expect(getDisplayStatus('practice_only', true)).toBe('practice_only');
    });

    test('keeps unavailable as is', () => {
      expect(getDisplayStatus('unavailable', true)).toBe('unavailable');
    });
  });
});

describe('poll message legend', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));
    mockDb.db = await createTestDb();
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

  test('shows full legend for match week', async () => {
    const season = await setupSeason();

    await mockDb.db
      .insertInto('weeks')
      .values({ seasonId: season.id, weekNumber: 5, year: 2025, type: 'match' })
      .execute();

    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('✅');
    expect(message).toContain('🏋️');
    expect(message).toContain('🏆');
    expect(message).toContain('⚠️');
    expect(message).toContain('❌');
  });

  test('shows simplified legend for practice week', async () => {
    const season = await setupSeason();

    await mockDb.db
      .insertInto('weeks')
      .values({ seasonId: season.id, weekNumber: 5, year: 2025, type: 'practice' })
      .execute();

    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('🏋️');
    expect(message).toContain('❌');
    expect(message).not.toContain('✅');
    expect(message).not.toContain('🏆');
    expect(message).not.toContain('⚠️');
  });

  test('uses match week legend when week type not set (default)', async () => {
    const season = await setupSeason();

    // No week record - defaults to match behavior
    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('✅');
    expect(message).toContain('🏋️');
    expect(message).toContain('🏆');
    expect(message).toContain('⚠️');
    expect(message).toContain('❌');
  });
});
