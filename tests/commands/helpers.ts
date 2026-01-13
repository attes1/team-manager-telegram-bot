import { Bot } from 'grammy';
import type { MessageEntity, Update, UserFromGetMe } from 'grammy/types';
import type { Kysely } from 'kysely';
import type { BotContext } from '@/bot/context';
import { contextMiddleware } from '@/bot/middleware';
import type { DB } from '@/types/db';

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

export const createTestBot = () => {
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

  bot.api.config.use((_prev, method, payload, _signal) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as ReturnType<typeof _prev>;
  });

  bot.use(contextMiddleware);

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

export const createMultiMentionUpdate = (
  command: string,
  userId: number,
  chatId: number,
  mentionedUsers: Array<{ id: number; firstName: string; lastName?: string; username?: string }>,
): Update => {
  const mentionTexts = mentionedUsers.map(
    (u) => `${u.firstName}${u.lastName ? ` ${u.lastName}` : ''}`,
  );
  const fullText = `${command} ${mentionTexts.join(' ')}`;

  const entities: MessageEntity[] = [
    { type: 'bot_command', offset: 0, length: command.split(' ')[0].length },
  ];

  let offset = command.length + 1;
  for (let i = 0; i < mentionedUsers.length; i++) {
    const user = mentionedUsers[i];
    const text = mentionTexts[i];
    entities.push({
      type: 'text_mention',
      offset,
      length: text.length,
      user: {
        id: user.id,
        is_bot: false,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
      },
    });
    offset += text.length + 1;
  }

  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: 'group', title: 'Test Group' },
      from: { id: userId, is_bot: false, first_name: 'Test' },
      text: fullText,
      entities,
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
    DEFAULT_LANGUAGE: 'en' | 'fi';
    DEFAULT_POLL_DAY: string;
    DEFAULT_POLL_TIME: string;
    DEFAULT_POLL_DAYS: string[];
    DEFAULT_POLL_TIMES: number[];
    DEFAULT_POLL_REMINDER_DAY: string;
    DEFAULT_POLL_REMINDER_TIME: string;
    DEFAULT_POLL_REMINDER_MODE: 'ping' | 'quiet' | 'off';
    DEFAULT_MATCH_DAY: string;
    DEFAULT_MATCH_TIME: string;
    DEFAULT_LINEUP_SIZE: number;
    DEFAULT_MATCH_DAY_REMINDER_MODE: 'ping' | 'quiet' | 'off';
    DEFAULT_MATCH_DAY_REMINDER_TIME: string;
  };
};

export const createMockEnv = (adminIds: number[]): MockEnv => ({
  env: {
    ADMIN_IDS: adminIds,
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_POLL_REMINDER_DAY: 'wed',
    DEFAULT_POLL_REMINDER_TIME: '18:00',
    DEFAULT_POLL_REMINDER_MODE: 'quiet',
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
    DEFAULT_MATCH_DAY_REMINDER_MODE: 'quiet',
    DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
  },
});
