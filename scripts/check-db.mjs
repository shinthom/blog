#!/usr/bin/env node
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL required");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const tables = await client.query(`
  select tablename from pg_tables
  where schemaname = 'public' order by tablename
`);
console.log("public tables:", tables.rows.map((r) => r.tablename));

const counts = await client.query(`
  select status, count(*)::int as n from public.posts group by status
`);
console.log("post counts:", counts.rows);

const bucket = await client.query(
  `select id, public from storage.buckets where id = 'blog-images'`,
);
console.log("blog-images bucket:", bucket.rows);

const samples = await client.query(`
  select slug, title, category, status, published_at
  from public.posts order by published_at desc nulls last limit 10
`);
console.log("\nposts:");
for (const r of samples.rows) {
  console.log(
    `  [${r.status.padEnd(9)}] ${r.category ?? "-".padEnd(10)} ${r.slug.padEnd(28)} ${r.title}`,
  );
}

await client.end();
