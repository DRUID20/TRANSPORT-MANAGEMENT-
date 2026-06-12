/**
 * Seed the first admin user.
 *
 * Run via:  npm run db:seed-admin
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from env. Idempotent:
 * if a user with that email already exists, the script does nothing.
 *
 * Also seeds the default organisation (Nile Valley) if missing — so a
 * fresh database is fully ready to log into after one command.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.local.");

  const email = (process.env.ADMIN_EMAIL ?? "admin@nilevalley.co.ke").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME ?? "System Administrator";

  if (!password || password.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD must be set (min 8 chars). Example:\n  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123 npm run db:seed-admin",
    );
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  // 1. Ensure default organisation exists
  const existingOrgs = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, "nile-valley"))
    .limit(1);
  let org = existingOrgs[0];
  if (!org) {
    const inserted = await db
      .insert(schema.organizations)
      .values({
        name: "Nile Valley Logistics",
        slug: "nile-valley",
        baseCurrency: "KES",
        countryCode: "KE",
      })
      .returning();
    org = inserted[0];
    if (!org) throw new Error("Failed to create organisation row.");
    console.log(`[seed] created organisation ${org.name} (${org.id})`);
  } else {
    console.log(`[seed] organisation already exists: ${org.name}`);
  }

  // 2. Check if user already exists
  const existing = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (existing) {
    console.log(`[seed] admin user already exists: ${existing.email} (id=${existing.id}, role=${existing.roleKey})`);
    console.log("[seed] no changes made.");
    await sql.end();
    return;
  }

  // 3. Create admin
  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await db
    .insert(schema.users)
    .values({
      organizationId: org.id,
      email,
      fullName,
      passwordHash,
      roleKey: "admin",
      isActive: true,
    })
    .returning();
  const user = inserted[0];
  if (!user) throw new Error("Failed to create admin user row.");

  console.log("[seed] ✓ created admin user");
  console.log(`       email: ${user.email}`);
  console.log(`       id:    ${user.id}`);
  console.log("[seed] sign in at /login with the password you provided.");

  await sql.end();
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
