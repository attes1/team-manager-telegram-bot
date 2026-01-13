import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  getGroup,
  getPublicGroupIds,
  getPublicGroups,
  getTeamGroup,
  getTeamGroupId,
  isTeamGroup,
  registerGroup,
  setGroupType,
  unregisterGroup,
} from '@/services/group';
import type { DB } from '@/types/db';

describe('group service', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('registerGroup', () => {
    test('registers a new group with public type by default', async () => {
      const group = await registerGroup(db, -100123456789, 'Test Group');

      expect(group.telegramId).toBe(-100123456789);
      expect(group.type).toBe('public');
      expect(group.title).toBe('Test Group');
      expect(group.removedAt).toBeNull();
    });

    test('registers group without title', async () => {
      const group = await registerGroup(db, -100123456789);

      expect(group.telegramId).toBe(-100123456789);
      expect(group.title).toBeNull();
    });

    test('reactivates a soft-deleted group', async () => {
      const group1 = await registerGroup(db, -100123456789, 'Test Group');
      await unregisterGroup(db, -100123456789);

      const group2 = await registerGroup(db, -100123456789, 'Updated Title');

      expect(group2.id).toBe(group1.id);
      expect(group2.removedAt).toBeNull();
      expect(group2.title).toBe('Updated Title');
    });

    test('reactivates and keeps existing title if no new title provided', async () => {
      await registerGroup(db, -100123456789, 'Original Title');
      await unregisterGroup(db, -100123456789);

      const group = await registerGroup(db, -100123456789);

      expect(group.title).toBe('Original Title');
    });
  });

  describe('unregisterGroup', () => {
    test('soft deletes a group by setting removedAt', async () => {
      await registerGroup(db, -100123456789, 'Test Group');
      const result = await unregisterGroup(db, -100123456789);

      expect(result).toBe(true);

      const raw = await db
        .selectFrom('groups')
        .selectAll()
        .where('telegramId', '=', -100123456789)
        .executeTakeFirst();

      expect(raw).toBeDefined();
      expect(raw?.removedAt).not.toBeNull();
    });

    test('returns false if group does not exist', async () => {
      const result = await unregisterGroup(db, -100999999999);
      expect(result).toBe(false);
    });

    test('returns false if group already unregistered', async () => {
      await registerGroup(db, -100123456789);
      await unregisterGroup(db, -100123456789);

      const result = await unregisterGroup(db, -100123456789);
      expect(result).toBe(false);
    });
  });

  describe('getGroup', () => {
    test('returns group by telegram ID', async () => {
      await registerGroup(db, -100123456789, 'Test Group');

      const group = await getGroup(db, -100123456789);

      expect(group).toBeDefined();
      expect(group?.title).toBe('Test Group');
    });

    test('returns undefined for non-existent group', async () => {
      const group = await getGroup(db, -100999999999);
      expect(group).toBeUndefined();
    });

    test('returns undefined for soft-deleted group', async () => {
      await registerGroup(db, -100123456789, 'Test Group');
      await unregisterGroup(db, -100123456789);

      const group = await getGroup(db, -100123456789);
      expect(group).toBeUndefined();
    });
  });

  describe('setGroupType', () => {
    test('sets group type to team', async () => {
      await registerGroup(db, -100123456789, 'Test Group');
      const group = await setGroupType(db, -100123456789, 'team');

      expect(group?.type).toBe('team');
    });

    test('sets group type to public', async () => {
      await registerGroup(db, -100123456789, 'Test Group');
      await setGroupType(db, -100123456789, 'team');
      const group = await setGroupType(db, -100123456789, 'public');

      expect(group?.type).toBe('public');
    });

    test('demotes existing team group when setting another as team', async () => {
      await registerGroup(db, -100111111111, 'Group 1');
      await registerGroup(db, -100222222222, 'Group 2');

      await setGroupType(db, -100111111111, 'team');
      await setGroupType(db, -100222222222, 'team');

      const group1 = await getGroup(db, -100111111111);
      const group2 = await getGroup(db, -100222222222);

      expect(group1?.type).toBe('public');
      expect(group2?.type).toBe('team');
    });

    test('returns undefined for non-existent group', async () => {
      const group = await setGroupType(db, -100999999999, 'team');
      expect(group).toBeUndefined();
    });

    test('returns undefined for soft-deleted group', async () => {
      await registerGroup(db, -100123456789);
      await unregisterGroup(db, -100123456789);

      const group = await setGroupType(db, -100123456789, 'team');
      expect(group).toBeUndefined();
    });
  });

  describe('getTeamGroup', () => {
    test('returns the team group', async () => {
      await registerGroup(db, -100123456789, 'Team Group');
      await setGroupType(db, -100123456789, 'team');

      const group = await getTeamGroup(db);

      expect(group).toBeDefined();
      expect(group?.title).toBe('Team Group');
      expect(group?.type).toBe('team');
    });

    test('returns undefined when no team group exists', async () => {
      await registerGroup(db, -100123456789, 'Public Group');

      const group = await getTeamGroup(db);
      expect(group).toBeUndefined();
    });

    test('ignores soft-deleted team group', async () => {
      await registerGroup(db, -100123456789, 'Team Group');
      await setGroupType(db, -100123456789, 'team');
      await unregisterGroup(db, -100123456789);

      const group = await getTeamGroup(db);
      expect(group).toBeUndefined();
    });
  });

  describe('getTeamGroupId', () => {
    test('returns team group telegram ID', async () => {
      await registerGroup(db, -100123456789, 'Team Group');
      await setGroupType(db, -100123456789, 'team');

      const id = await getTeamGroupId(db);
      expect(id).toBe(-100123456789);
    });

    test('returns null when no team group', async () => {
      const id = await getTeamGroupId(db);
      expect(id).toBeNull();
    });
  });

  describe('getPublicGroups', () => {
    test('returns all public groups', async () => {
      await registerGroup(db, -100111111111, 'Public 1');
      await registerGroup(db, -100222222222, 'Public 2');
      await registerGroup(db, -100333333333, 'Team');
      await setGroupType(db, -100333333333, 'team');

      const groups = await getPublicGroups(db);

      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.title)).toEqual(['Public 1', 'Public 2']);
    });

    test('excludes soft-deleted groups', async () => {
      await registerGroup(db, -100111111111, 'Public 1');
      await registerGroup(db, -100222222222, 'Public 2');
      await unregisterGroup(db, -100222222222);

      const groups = await getPublicGroups(db);

      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('Public 1');
    });

    test('returns empty array when no public groups', async () => {
      await registerGroup(db, -100123456789, 'Team');
      await setGroupType(db, -100123456789, 'team');

      const groups = await getPublicGroups(db);
      expect(groups).toHaveLength(0);
    });
  });

  describe('getPublicGroupIds', () => {
    test('returns telegram IDs of public groups', async () => {
      await registerGroup(db, -100111111111, 'Public 1');
      await registerGroup(db, -100222222222, 'Public 2');

      const ids = await getPublicGroupIds(db);

      expect(ids).toHaveLength(2);
      expect(ids).toContain(-100111111111);
      expect(ids).toContain(-100222222222);
    });

    test('returns empty array when no public groups', async () => {
      const ids = await getPublicGroupIds(db);
      expect(ids).toHaveLength(0);
    });
  });

  describe('isTeamGroup', () => {
    test('returns true for team group', async () => {
      await registerGroup(db, -100123456789);
      await setGroupType(db, -100123456789, 'team');

      const result = await isTeamGroup(db, -100123456789);
      expect(result).toBe(true);
    });

    test('returns false for public group', async () => {
      await registerGroup(db, -100123456789);

      const result = await isTeamGroup(db, -100123456789);
      expect(result).toBe(false);
    });

    test('returns false for non-existent group', async () => {
      const result = await isTeamGroup(db, -100999999999);
      expect(result).toBe(false);
    });
  });
});
