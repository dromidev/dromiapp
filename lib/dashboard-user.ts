import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Fila en `public.users` usada para el panel sin login.
 * Prioridad: `DASHBOARD_USER_ID` (uuid) → email en `DASHBOARD_ADMIN_EMAIL` o `SEED_ADMIN_EMAIL`.
 */
const getDashboardUserRow = cache(async () => {
  const envId = process.env.DASHBOARD_USER_ID?.trim();
  if (envId && UUID_RE.test(envId)) {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, envId))
      .limit(1);
    return row ?? null;
  }

  const emailRaw =
    process.env.DASHBOARD_ADMIN_EMAIL?.trim() ||
    process.env.SEED_ADMIN_EMAIL?.trim();
  if (!emailRaw) return null;

  const email = emailRaw.toLowerCase();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ?? null;
});

/** ID para `created_by_user_id` y comprobaciones de propiedad en server actions. */
export async function getDashboardUserId(): Promise<string | null> {
  const row = await getDashboardUserRow();
  return row?.id ?? null;
}

export type DashboardUserContext = {
  id: string;
  email: string;
  name: string | null;
};

export async function getDashboardUserContext(): Promise<DashboardUserContext | null> {
  const row = await getDashboardUserRow();
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name };
}
