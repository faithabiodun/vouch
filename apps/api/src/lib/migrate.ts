import pg from "pg";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

/**
 * Runs the SQL migrations on boot when DATABASE_URL is set. Every migration is
 * idempotent (`create table if not exists`, `on conflict do nothing`), so this
 * is safe to run on every deploy — no separate migration step to forget.
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const dir =
    process.env.MIGRATIONS_DIR ??
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../supabase/migrations",
    );

  if (!existsSync(dir)) {
    console.warn(`[migrate] no migrations dir at ${dir}, skipping`);
    return;
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (const f of files) {
      const sql = readFileSync(join(dir, f), "utf8");
      await client.query(sql);
      console.log(`[migrate] applied ${f}`);
    }
  } finally {
    await client.end();
  }
}
