import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// En este repo el archivo de entorno usado localmente es `.env.local`.
// `drizzle-kit` necesita `DATABASE_URL` para el driver Postgres.
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
