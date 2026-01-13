import { type Kysely, sql } from 'kysely';

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .alterTable('season_roster')
    .addColumn('role', 'text', (col) =>
      col.notNull().defaultTo('player').check(sql`role IN ('player', 'captain')`),
    )
    .execute();
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.alterTable('season_roster').dropColumn('role').execute();
}
