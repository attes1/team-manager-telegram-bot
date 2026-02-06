import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import { CamelCasePlugin, FileMigrationProvider, Kysely, Migrator, SqliteDialect } from 'kysely';
import type { BotContext } from '@/bot/context';
import type { DB } from '@/types/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createTestDb = async (): Promise<Kysely<DB>> => {
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new Database(':memory:'),
    }),
    plugins: [new CamelCasePlugin()],
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../src/db/migrations'),
    }),
  });

  const { error } = await migrator.migrateToLatest();

  if (error) {
    throw error;
  }

  return db;
};

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

const DEFAULT_BOT_INFO: UserFromGetMe = {
  id: 1,
  is_bot: true,
  first_name: 'TestBot',
  username: 'test_bot',
  can_join_groups: true,
  can_read_all_group_messages: true,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

export const createMockBot = (chatId = -100123456789) => {
  const calls: ApiCall[] = [];

  const bot = new Bot<BotContext>('test-token', { botInfo: DEFAULT_BOT_INFO });

  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return {
      ok: true,
      result: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'group' as const, title: 'Test Group' },
        from: { id: 1, is_bot: true, first_name: 'TestBot' },
        text: '',
      },
    } as ReturnType<typeof _prev>;
  });

  return { bot, calls };
};
