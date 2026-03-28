/**
 * Columna meetings.acta_step_completed_at (0006).
 * Uso: npm run db:apply-acta-step-times
 */
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const urlRaw = process.env.DATABASE_URL?.trim();
if (!urlRaw) {
  console.error("DATABASE_URL no definida");
  process.exit(1);
}
const databaseUrl: string = urlRaw;

const sqlPath = resolve("drizzle/0006_acta_step_completed_at.sql");
const ddl = readFileSync(sqlPath, "utf8").trim();

async function main() {
  const db = postgres(databaseUrl, { max: 1 });
  try {
    await db.unsafe(ddl);
    console.log("OK: acta_step_completed_at listo.");
  } finally {
    await db.end({ timeout: 5 });
  }
}

void main();
