/**
 * Seed the Chart of Accounts for an organisation.
 *
 * Run via:  npm run db:seed-coa
 *
 * Reads docs/finance/coa-proposed.csv — the 199-line fuel-haulage chart, 6-digit
 * codes, KES base. Idempotent: any (orgId, code) that already exists is skipped,
 * so this is safe to re-run after a migration adds new accounts.
 *
 * Selects the target org by slug (default 'nile-valley'); override with
 * ORG_SLUG=<slug>. Aborts if the org doesn't exist (run db:seed-admin first).
 *
 * Columns expected in the CSV (header row):
 *   Code,Name,Class,Group,Type,Normal Balance,Currency,Status,Notes
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as schema from "./schema";

interface CoaRow {
  code: string;
  name: string;
  class: string;
  group: string;
  type: string;
  normalBalance: string;
  currency: string;
  status: string;
  notes: string | null;
}

/**
 * Minimal RFC-4180 line splitter: respects double-quoted cells (which may
 * contain commas) and "" as an escaped quote inside a quoted cell. The CoA CSV
 * has at least one quoted cell ("Trucks, prime movers, trailers") so a naive
 * `split(",")` corrupts row 3.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out;
}

function parseCsv(text: string): CoaRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CoA CSV has no data rows.");
  const rows: CoaRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    if (cells.length < 8) {
      throw new Error(`Row ${i + 1}: expected at least 8 columns, got ${cells.length}.`);
    }
    const [code, name, cls, group, type, normalBalance, currency, status, notes] = cells.map((c) =>
      c.trim(),
    );
    if (!code) continue;
    rows.push({
      code: code!,
      name: name!,
      class: cls!,
      group: group!,
      type: type!,
      normalBalance: normalBalance!,
      currency: (currency || "KES").toUpperCase(),
      status: status || "Active",
      notes: notes && notes.length > 0 ? notes : null,
    });
  }
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Check .env.local.");

  const orgSlug = process.env.ORG_SLUG ?? "nile-valley";
  const csvPath = resolve(process.cwd(), "docs/finance/coa-proposed.csv");

  let csvText: string;
  try {
    csvText = readFileSync(csvPath, "utf8");
  } catch (err) {
    throw new Error(`Failed to read CoA CSV at ${csvPath}: ${(err as Error).message}`);
  }

  const rows = parseCsv(csvText);
  console.log(`[seed-coa] read ${rows.length} rows from ${csvPath}`);

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  const orgs = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, orgSlug))
    .limit(1);
  const org = orgs[0];
  if (!org) {
    await sql.end();
    throw new Error(
      `No organisation with slug '${orgSlug}'. Run \`npm run db:seed-admin\` first, or set ORG_SLUG.`,
    );
  }
  console.log(`[seed-coa] target organisation: ${org.name} (${org.id})`);

  // Find which codes already exist so we can skip them — idempotent re-run.
  const codes = rows.map((r) => r.code);
  const existing = await db
    .select({ code: schema.chartOfAccounts.code })
    .from(schema.chartOfAccounts)
    .where(
      and(
        eq(schema.chartOfAccounts.organizationId, org.id),
        inArray(schema.chartOfAccounts.code, codes),
      ),
    );
  const have = new Set(existing.map((e) => e.code));
  const toInsert = rows.filter((r) => !have.has(r.code));

  if (toInsert.length === 0) {
    console.log(`[seed-coa] every code already present — nothing to do.`);
    await sql.end();
    return;
  }

  await db.insert(schema.chartOfAccounts).values(
    toInsert.map((r) => ({
      organizationId: org.id,
      code: r.code,
      name: r.name,
      class: r.class,
      group: r.group,
      type: r.type,
      normalBalance: r.normalBalance,
      currency: r.currency,
      status: r.status,
      notes: r.notes,
    })),
  );

  console.log(`[seed-coa] ✓ seeded ${toInsert.length} · skipped ${have.size}`);
  console.log(`[seed-coa] verify in Supabase: select count(*) from chart_of_accounts where organization_id = '${org.id}';`);
  await sql.end();
}

main().catch((err) => {
  console.error("[seed-coa] FAILED:", err);
  process.exit(1);
});
