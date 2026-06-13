import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

// Cache the client across warm serverless invocations so we reuse pooled
// connections instead of opening a new one on every request.
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Drizzle client over Supabase Postgres (via the transaction pooler).
 * Throws if DATABASE_URL is not set at use time.
 */
export function getDb() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  if (_db) return _db;
  _client = postgres(databaseUrl, {
    // Supabase requires TLS; postgres-js does not enable it by default.
    ssl: "require",
    // The transaction pooler is incompatible with prepared statements.
    prepare: false,
    // Serverless: cap connections so concurrent function instances don't
    // exhaust the pooler.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  _db = drizzle(_client, { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
