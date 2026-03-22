/**
 * Añade questions.is_active si falta (migración 0003). Uso: npx tsx scripts/apply-questions-is-active.ts
 */
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env.local" });

const urlRaw = process.env.DATABASE_URL?.trim();
if (!urlRaw) {
  console.error("DATABASE_URL no definida en .env.local");
  process.exit(1);
}
const databaseUrl: string = urlRaw;

const sqlPath = resolve("drizzle/0003_questions_is_active.sql");
const ddl = readFileSync(sqlPath, "utf8").trim();

async function main() {
  const db = postgres(databaseUrl, { max: 1 });
  try {
    await db.unsafe(ddl);
    console.log("OK: columna is_active aplicada en questions.");
  } finally {
    await db.end({ timeout: 5 });
  }
}

void main();
