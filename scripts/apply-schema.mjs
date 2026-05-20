#!/usr/bin/env node
// One-shot: applies supabase/schema.sql (and optionally seed.sql) against
// the Postgres database pointed to by SUPABASE_DB_URL.
//
// Usage:
//   SUPABASE_DB_URL='postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres' \
//     node scripts/apply-schema.mjs [--seed]
//
// On Supabase free tier, the direct host (db.<ref>.supabase.co) may be
// IPv6-only. If it fails, use the transaction pooler:
//   postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:6543/postgres

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("error: SUPABASE_DB_URL is required");
    process.exit(1);
  }

  const includeSeed = process.argv.includes("--seed");

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log(
    `→ connecting to ${url.replace(/:[^:@/]+@/, ":***@")} ...`,
  );
  await client.connect();

  for (const file of includeSeed
    ? ["supabase/schema.sql", "supabase/seed.sql"]
    : ["supabase/schema.sql"]) {
    const sql = await readFile(resolve(root, file), "utf-8");
    console.log(`→ executing ${file} (${sql.length} bytes)`);
    await client.query(sql);
    console.log(`✓ ${file}`);
  }

  await client.end();
  console.log("done.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
