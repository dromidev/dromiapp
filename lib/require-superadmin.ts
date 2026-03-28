import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** Devuelve el id del usuario solo si es superadmin; si no, `null`. */
export async function getSuperadminUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin" || !session.user.id) return null;
  return session.user.id;
}
