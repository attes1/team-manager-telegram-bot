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

  let messageIdCounter = 1000;

  bot.api.config.use((_prev, method, payload, _signal) => {
    calls.push({ method, payload: payload as Record<string, unknown> });

    // Return proper message object for sendMessage calls
    if (method === 'sendMessage') {
      const chatId = (payload as { chat_id?: number }).chat_id;
      return {
        ok: true,
        result: {
          message_id: messageIdCounter++,
          date: Math.floor(Date.now() / 1000),
          chat: { id: chatId, type: 'group', title: 'Test Group' },
          from: { id: 1, is_bot: true, first_name: 'TestBot' },
          text: (payload as { text?: string }).text ?? '',
        },
      } as ReturnType<typeof _prev>;
    }

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

export const createCallbackQueryUpdate = (
  callbackData: string,
  userId: number,
  chatId: number,
  message: {
    text: string;
    entities?: MessageEntity[];
  },
): Update => ({
  update_id: 1,
  callback_query: {
    id: 'test-callback-id',
    from: { id: userId, is_bot: false, first_name: 'Test' },
    chat_instance: 'test-chat-instance',
    data: callbackData,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: 'group', title: 'Test Group' },
      from: { id: 1, is_bot: true, first_name: 'TestBot' },
      text: message.text,
      entities: message.entities,
    },
  },
});
