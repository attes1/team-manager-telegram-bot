import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  addInvitation,
  clearAll,
  getAll,
  getInvitation,
  removeInvitation,
} from '@/services/pending-invitations';

describe('pending-invitations service', () => {
  beforeEach(() => {
    clearAll();
  });

  afterEach(() => {
    clearAll();
  });

  describe('addInvitation', () => {
    test('stores invitation with username', () => {
      addInvitation(123, {
        username: 'testuser',
        displayName: 'Test User',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      const invitation = getInvitation(123);
      expect(invitation).toBeDefined();
      expect(invitation?.username).toBe('testuser');
      expect(invitation?.displayName).toBe('Test User');
      expect(invitation?.chatId).toBe(-100123);
      expect(invitation?.seasonId).toBe(1);
      expect(invitation?.adminId).toBe(456);
      expect(invitation?.createdAt).toBeInstanceOf(Date);
    });

    test('stores invitation with userId', () => {
      addInvitation(456, {
        userId: 789,
        displayName: 'No Username User',
        chatId: -100123,
        messageId: 456,
        seasonId: 1,
        adminId: 456,
      });

      const invitation = getInvitation(456);
      expect(invitation).toBeDefined();
      expect(invitation?.userId).toBe(789);
      expect(invitation?.username).toBeUndefined();
    });

    test('overwrites existing invitation for same messageId', () => {
      addInvitation(123, {
        username: 'user1',
        displayName: 'User 1',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      addInvitation(123, {
        username: 'user2',
        displayName: 'User 2',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      const invitation = getInvitation(123);
      expect(invitation?.username).toBe('user2');
    });
  });

  describe('getInvitation', () => {
    test('returns undefined for non-existent messageId', () => {
      const invitation = getInvitation(999);
      expect(invitation).toBeUndefined();
    });

    test('returns invitation for valid messageId', () => {
      addInvitation(123, {
        username: 'testuser',
        displayName: 'Test User',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      const invitation = getInvitation(123);
      expect(invitation).toBeDefined();
      expect(invitation?.username).toBe('testuser');
    });

    test('returns undefined and removes expired invitation', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      addInvitation(123, {
        username: 'testuser',
        displayName: 'Test User',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      // Advance time by 25 hours (past 24h expiration)
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const invitation = getInvitation(123);
      expect(invitation).toBeUndefined();

      // Verify it was removed from storage
      expect(getAll().size).toBe(0);
    });

    test('returns valid invitation before expiration', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      addInvitation(123, {
        username: 'testuser',
        displayName: 'Test User',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      // Advance time by 23 hours (still valid)
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);

      const invitation = getInvitation(123);
      expect(invitation).toBeDefined();
    });
  });

  describe('removeInvitation', () => {
    test('removes existing invitation and returns true', () => {
      addInvitation(123, {
        username: 'testuser',
        displayName: 'Test User',
        chatId: -100123,
        messageId: 123,
        seasonId: 1,
        adminId: 456,
      });

      const result = removeInvitation(123);
      expect(result).toBe(true);
      expect(getInvitation(123)).toBeUndefined();
    });

    test('returns false for non-existent invitation', () => {
      const result = removeInvitation(999);
      expect(result).toBe(false);
    });
  });
});
