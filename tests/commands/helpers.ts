import { Bot } from 'grammy';
import type { Update, UserFromGetMe } from 'grammy/types';
import type { Kysely } from 'kysely';
import type { DB } from '@/types/db';

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

export const createTestBot = () => {
  const calls: ApiCall[] = [];

  const bot = new Bot('test-token', {
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

  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true as const, result: true as unknown });
  });

  return { bot, calls };
};

export const createCommandUpdate = (
  command: string,
  userId: number,
  chatId: number,
  extra?: Partial<Update['message']>,
): Update => ({
  update_id: 1,
  message: {
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: chatId, type: 'group', title: 'Test Group' },
    from: { id: userId, is_bot: false, first_name: 'Test' },
    text: command,
    entities: [{ type: 'bot_command', offset: 0, length: command.split(' ')[0].length }],
    ...extra,
  },
});

export const createMentionUpdate = (
  command: string,
  userId: number,
  chatId: number,
  mentionedUser: { id: number; firstName: string; lastName?: string; username?: string },
): Update => {
  const mentionText = `${mentionedUser.firstName}${mentionedUser.lastName ? ` ${mentionedUser.lastName}` : ''}`;
  const fullText = `${command} ${mentionText}`;
  const mentionOffset = command.length + 1;

  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: 'group', title: 'Test Group' },
      from: { id: userId, is_bot: false, first_name: 'Test' },
      text: fullText,
      entities: [
        { type: 'bot_command', offset: 0, length: command.split(' ')[0].length },
        {
          type: 'text_mention',
          offset: mentionOffset,
          length: mentionText.length,
          user: {
            id: mentionedUser.id,
            is_bot: false,
            first_name: mentionedUser.firstName,
            last_name: mentionedUser.lastName,
            username: mentionedUser.username,
          },
        },
      ],
    },
  };
};

// Type for mock db module
export type MockDb = {
  db: Kysely<DB>;
};

// Type for mock env module
export type MockEnv = {
  env: {
    ADMIN_IDS: number[];
    DEFAULT_LANGUAGE: string;
    [key: string]: unknown;
  };
};
