import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    ALTER TABLE config ADD COLUMN public_commands_mode TEXT NOT NULL DEFAULT 'all'
    CHECK(public_commands_mode IN ('all', 'admins'))
  `.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`ALTER TABLE config DROP COLUMN public_commands_mode`.execute(db);
};
