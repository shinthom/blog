#!/usr/bin/env node
// Probes Supabase pooler hostnames across known regions and prefixes
// to find the one that owns the given project. Prints the first that connects.

import pg from "pg";

const REF = process.argv[2];
const PW = process.argv[3];
if (!REF || !PW) {
  console.error("usage: node scripts/probe-pooler.mjs <project_ref> <password>");
  process.exit(1);
}

const regions = [
  "ap-northeast-2",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-south-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-north-1",
  "sa-east-1",
  "ca-central-1",
];

const prefixes = ["aws-1", "aws-0"];

async function tryHost(host) {
  const url = `postgresql://postgres.${REF}:${encodeURIComponent(PW)}@${host}:6543/postgres`;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return { ok: true, host };
  } catch (e) {
    return { ok: false, host, error: e.message };
  }
}

for (const prefix of prefixes) {
  for (const region of regions) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    process.stdout.write(`→ ${host} ... `);
    const r = await tryHost(host);
    if (r.ok) {
      console.log("OK");
      console.log(`\nFOUND: ${host}`);
      console.log(
        `connection: postgresql://postgres.${REF}:<password>@${host}:6543/postgres`,
      );
      process.exit(0);
    } else {
      console.log(`fail (${r.error.slice(0, 80)})`);
    }
  }
}

console.error("\nno pooler host accepted the credentials");
process.exit(1);
