/**
 * Apply Drizzle migrations to the database referenced by DATABASE_URL.
 *
 * Run via:  npm run db:migrate
 *
 * Idempotent: drizzle tracks applied migrations in a __drizzle_migrations
 * table, so re-running is safe.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.local.");

  console.log(`[db:migrate] connecting to ${url.replace(/:[^:@]+@/, ":***@")}`);
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log("[db:migrate] applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db:migrate] done.");

  await sql.end();
}

main().catch((err) => {
  console.error("[db:migrate] FAILED:", err);
  process.exit(1);
});
