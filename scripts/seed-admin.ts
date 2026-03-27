import { config as loadEnv } from "dotenv";
import { hash } from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";

// Misma convención que Next.js / drizzle-kit: priorizar `.env.local`
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

async function main() {
  const email =
    process.env.SEED_ADMIN_EMAIL?.trim() ||
    process.env.SEED_ADMIN?.trim() ||
    "";
  const password = (
    process.env.SEED_ADMIN_PASSWORD ??
    process.env.SEED_PASSWORD ??
    ""
  ).trim();
  if (!email || !password) {
    throw new Error(
      "Define SEED_ADMIN_EMAIL (o SEED_ADMIN) y SEED_ADMIN_PASSWORD (o SEED_PASSWORD) en .env / .env.local"
    );
  }
  const passwordHash = await hash(password, 12);
  const emailNorm = email.trim().toLowerCase();

  /**
   * Upsert por email: si el usuario ya existía (p. ej. fila creada por el trigger
   * de Supabase Auth con password_hash vacío), actualizamos el hash para que el
   * login por Credentials funcione. onConflictDoNothing dejaba la contraseña rota.
   */
  await db
    .insert(users)
    .values({
      email: emailNorm,
      passwordHash,
      name: "Administrador",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        name: "Administrador",
        updatedAt: new Date(),
      },
    });

  console.log(
    "Listo. Contraseña guardada para",
    emailNorm,
    "(nuevo usuario o actualización del existente)."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
