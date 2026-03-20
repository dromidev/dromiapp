import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

/**
 * Usuario autenticado del panel (NextAuth, tabla `public.users`).
 * Devuelve `null` si no hay sesión (API / acciones deben responder 401 o error).
 */
export async function getDashboardUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || typeof id !== "string") return null;
  return id;
}
