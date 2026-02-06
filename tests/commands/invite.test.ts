import { createTestDb } from '@tests/helpers';
import { mockDb } from '@tests/setup';
import { Bot } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { BotContext } from '@/bot/context';
import { contextMiddleware } from '@/bot/middleware';
import { getTranslations } from '@/i18n';
import { registerDmChat } from '@/services/dm';
import {
  addInvitation,
  clearAll,
  getInvitation,
  removeInvitation,
} from '@/services/pending-invitations';
import { addPlayerToRoster, getPlayerByTelegramId, isPlayerInRoster } from '@/services/roster';
import { startSeason } from '@/services/season';

interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

const USER_ID = 38745;
const DM_CHAT_ID = USER_ID;
const GROUP_CHAT_ID = -100123;

const createInviteBot = () => {
  const calls: ApiCall[] = [];

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

  let messageIdCounter = 1000;

  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (method === 'sendMessage') {
      const chatId = (payload as { chat_id?: number }).chat_id;
      return {
        ok: true,
        result: {
          message_id: messageIdCounter++,
          date: Math.floor(Date.now() / 1000),
          chat: { id: chatId, type: 'private', first_name: 'Test' },
          from: { id: 1, is_bot: true, first_name: 'TestBot' },
          text: (payload as { text?: string }).text ?? '',
        },
      } as ReturnType<typeof _prev>;
    }
    return { ok: true, result: true } as ReturnType<typeof _prev>;
  });

  bot.use(contextMiddleware);

  // Replicate the /start handler from src/bot/index.ts
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (ctx.chat?.type === 'private' && userId && chatId) {
      const payload = ctx.match;

      const inviteMatch = payload?.match(/^invite_(\d+)$/);
      if (inviteMatch) {
        const messageId = parseInt(inviteMatch[1], 10);

        const invitation = getInvitation(messageId);
        if (invitation) {
          const username = ctx.from?.username;
          const isCorrectUser = invitation.userId
            ? userId === invitation.userId
            : username?.toLowerCase() === invitation.username?.toLowerCase();

          if (isCorrectUser) {
            const i18n = await getTranslations(ctx.db, invitation.seasonId);
            const alreadyInRoster = await isPlayerInRoster(ctx.db, invitation.seasonId, userId);

            if (alreadyInRoster) {
              removeInvitation(messageId);
              await registerDmChat(ctx.db, userId, chatId);
              await ctx.reply(i18n.roster.alreadyInRoster(invitation.displayName));
              return;
            }

            const firstName = ctx.from?.first_name || '';
            const lastName = ctx.from?.last_name || '';
            const displayName =
              firstName + (lastName ? ` ${lastName}` : '') || invitation.displayName;

            await addPlayerToRoster(ctx.db, {
              seasonId: invitation.seasonId,
              telegramId: userId,
              displayName,
              username,
            });

            await registerDmChat(ctx.db, userId, chatId);
            removeInvitation(messageId);

            await ctx.reply(i18n.roster.invitationAcceptedDm);
            const messageName = username ? `@${username}` : displayName;
            await ctx.api.sendMessage(
              invitation.chatId,
              i18n.roster.invitationAccepted(messageName),
            );
            return;
          }
        }
      }

      const player = await getPlayerByTelegramId(ctx.db, userId);
      if (player) {
        await registerDmChat(ctx.db, userId, chatId);
      }
    }

    return ctx.reply(ctx.i18n.bot.started);
  });

  return { bot, calls };
};

const createStartUpdate = (
  userId: number,
  payload: string,
  extra?: { username?: string; firstName?: string; lastName?: string },
): Update => ({
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: userId, type: 'private', first_name: extra?.firstName ?? 'Test' },
    from: {
      id: userId,
      is_bot: false,
      first_name: extra?.firstName ?? 'Test',
      last_name: extra?.lastName,
      username: extra?.username,
    },
    text: `/start ${payload}`,
    entities: [{ type: 'bot_command', offset: 0, length: 6 }],
  },
});

describe('invite deep link via /start', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
    clearAll();
  });

  afterEach(async () => {
    clearAll();
    await mockDb.db.destroy();
  });

  test('accepts invitation and adds player to roster', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    addInvitation(873, {
      userId: USER_ID,
      displayName: 'Test User',
      chatId: GROUP_CHAT_ID,
      messageId: 873,
      seasonId: season.id,
      adminId: 123456,
    });

    const { bot, calls } = createInviteBot();
    const update = createStartUpdate(USER_ID, 'invite_873', {
      firstName: 'Test',
      lastName: 'User',
    });
    await bot.handleUpdate(update);

    // Should be in roster now
    const inRoster = await isPlayerInRoster(mockDb.db, season.id, USER_ID);
    expect(inRoster).toBe(true);

    // Should have registered DM
    const dm = await mockDb.db
      .selectFrom('playerDmChats')
      .selectAll()
      .where('playerId', '=', USER_ID)
      .executeTakeFirst();
    expect(dm).toBeDefined();
    expect(dm?.canDm).toBe(1);

    // Invitation should be removed
    expect(getInvitation(873)).toBeUndefined();

    // Should reply to DM + announce in group
    const dmReply = calls.find(
      (c) => c.method === 'sendMessage' && c.payload.chat_id === DM_CHAT_ID,
    );
    const groupAnnounce = calls.find(
      (c) => c.method === 'sendMessage' && c.payload.chat_id === GROUP_CHAT_ID,
    );
    expect(dmReply).toBeDefined();
    expect(groupAnnounce).toBeDefined();
  });

  test('rejects invitation when wrong user clicks', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    addInvitation(874, {
      userId: 99999,
      displayName: 'Someone Else',
      chatId: GROUP_CHAT_ID,
      messageId: 874,
      seasonId: season.id,
      adminId: 123456,
    });

    const { bot, calls } = createInviteBot();
    const update = createStartUpdate(USER_ID, 'invite_874');
    await bot.handleUpdate(update);

    // Should NOT be in roster
    const inRoster = await isPlayerInRoster(mockDb.db, season.id, USER_ID);
    expect(inRoster).toBe(false);

    // Invitation should still exist
    expect(getInvitation(874)).toBeDefined();

    // Should fall through to welcome message
    const lastCall = calls[calls.length - 1];
    expect(lastCall.payload.text).toContain('started');
  });

  test('handles non-existent invitation gracefully', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createInviteBot();
    const update = createStartUpdate(USER_ID, 'invite_999');
    await bot.handleUpdate(update);

    // Should fall through to welcome message
    const lastCall = calls[calls.length - 1];
    expect(lastCall.payload.text).toContain('started');
  });

  test('handles already-in-roster player', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: USER_ID,
      displayName: 'Test User',
    });

    addInvitation(875, {
      userId: USER_ID,
      displayName: 'Test User',
      chatId: GROUP_CHAT_ID,
      messageId: 875,
      seasonId: season.id,
      adminId: 123456,
    });

    const { bot, calls } = createInviteBot();
    const update = createStartUpdate(USER_ID, 'invite_875');
    await bot.handleUpdate(update);

    // Invitation should be removed
    expect(getInvitation(875)).toBeUndefined();

    // Should reply with already-in-roster message
    const reply = calls.find((c) => c.method === 'sendMessage' && c.payload.chat_id === DM_CHAT_ID);
    expect(reply?.payload.text).toContain('already');

    // DM should be registered
    const dm = await mockDb.db
      .selectFrom('playerDmChats')
      .selectAll()
      .where('playerId', '=', USER_ID)
      .executeTakeFirst();
    expect(dm).toBeDefined();
  });

  test('matches by username when userId not set on invitation', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    addInvitation(876, {
      username: 'testplayer',
      displayName: 'Test Player',
      chatId: GROUP_CHAT_ID,
      messageId: 876,
      seasonId: season.id,
      adminId: 123456,
    });

    const { bot } = createInviteBot();
    const update = createStartUpdate(USER_ID, 'invite_876', {
      username: 'TestPlayer',
    });
    await bot.handleUpdate(update);

    const inRoster = await isPlayerInRoster(mockDb.db, season.id, USER_ID);
    expect(inRoster).toBe(true);
  });

  test('registers DM for existing player on plain /start', async () => {
    const season = await startSeason(mockDb.db, 'Test Season');
    await addPlayerToRoster(mockDb.db, {
      seasonId: season.id,
      telegramId: USER_ID,
      displayName: 'Test User',
    });

    const { bot } = createInviteBot();
    const update = createStartUpdate(USER_ID, '');
    await bot.handleUpdate(update);

    const dm = await mockDb.db
      .selectFrom('playerDmChats')
      .selectAll()
      .where('playerId', '=', USER_ID)
      .executeTakeFirst();
    expect(dm).toBeDefined();
    expect(dm?.canDm).toBe(1);
  });

  test('does not register DM for unknown user on plain /start', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot } = createInviteBot();
    const update = createStartUpdate(USER_ID, '');
    await bot.handleUpdate(update);

    const dm = await mockDb.db
      .selectFrom('playerDmChats')
      .selectAll()
      .where('playerId', '=', USER_ID)
      .executeTakeFirst();
    expect(dm).toBeUndefined();
  });
});
