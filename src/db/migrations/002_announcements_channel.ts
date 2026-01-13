import type { Kysely } from 'kysely';

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema.alterTable('config').addColumn('announcements_chat_id', 'text').execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.alterTable('config').dropColumn('announcements_chat_id').execute();
}
