import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getDisplayStatus, getNextStatus, getPollMessage } from '@/menus/poll';
import { decodeWeekPayload } from '@/menus/shared';

describe('getPollMessage', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
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

  test('includes week number in title', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 5, year: 2025 });

    expect(message).toContain('Week 5');
  });

  test('handles year boundary week 1', async () => {
    const season = await setupSeason();
    const message = await getPollMessage(season.id, { week: 1, year: 2026 });

    expect(message).toContain('Week 1');
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

describe('decodeWeekPayload', () => {
  test('decodes valid payload', () => {
    const result = decodeWeekPayload('5:2025');
    expect(result).not.toBeNull();
    expect(result?.week).toBe(5);
    expect(result?.year).toBe(2025);
  });

  test('decodes double digit week', () => {
    const result = decodeWeekPayload('52:2025');
    expect(result).not.toBeNull();
    expect(result?.week).toBe(52);
    expect(result?.year).toBe(2025);
  });

  test('decodes week 1 of different year', () => {
    const result = decodeWeekPayload('1:2026');
    expect(result).not.toBeNull();
    expect(result?.week).toBe(1);
    expect(result?.year).toBe(2026);
  });

  test('returns null for undefined', () => {
    const result = decodeWeekPayload(undefined);
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = decodeWeekPayload('');
    expect(result).toBeNull();
  });

  test('returns null for invalid format - no colon', () => {
    const result = decodeWeekPayload('52025');
    expect(result).toBeNull();
  });

  test('returns null for invalid format - non-numeric week', () => {
    const result = decodeWeekPayload('abc:2025');
    expect(result).toBeNull();
  });

  test('returns null for invalid format - non-numeric year', () => {
    const result = decodeWeekPayload('5:abcd');
    expect(result).toBeNull();
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
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
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
