/**
 * Añade users.role, users.organization_name, meetings.acta_* (migración 0005).
 * Uso: npx tsx scripts/apply-user-role-acta.ts
 * (o npm run db:apply-user-role-acta)
 */
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const urlRaw = process.env.DATABASE_URL?.trim();
if (!urlRaw) {
  console.error("DATABASE_URL no definida en .env / .env.local");
  process.exit(1);
}
const databaseUrl: string = urlRaw;

const sqlPath = resolve("drizzle/0005_user_role_acta.sql");
const ddl = readFileSync(sqlPath, "utf8").trim();

async function main() {
  const db = postgres(databaseUrl, { max: 1 });
  try {
    await db.unsafe(ddl);
    console.log(
      "OK: columnas role / organization_name / acta_* aplicadas (0005)."
    );
  } finally {
    await db.end({ timeout: 5 });
  }
}

void main();
