import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

/**
 * Drizzle client. Will throw if DATABASE_URL is not set at use time.
 * Phase 0 doesn't actually connect — this is wired in Phase 1 when we
 * build real domain queries.
 */
export function getDb() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
