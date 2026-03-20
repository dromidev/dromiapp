import { config as loadEnv } from "dotenv";
import { hash } from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";

// Misma convención que Next.js / drizzle-kit: priorizar `.env.local`
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en el entorno o en .env"
    );
  }
  const passwordHash = await hash(password, 12);
  await db
    .insert(users)
    .values({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: "Administrador",
    })
    .onConflictDoNothing({ target: users.email });
  console.log("Listo. Si el email ya existía, no se duplicó la fila.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
