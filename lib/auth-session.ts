import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export type EncuestaSessionResult =
  | { ok: true; session: Session | null }
  | { ok: false; message: string };

/**
 * Evita que un fallo de configuración (p. ej. sin AUTH_SECRET en prod) tumbe toda la página con error genérico de Next.
 */
export async function getEncuestaServerSession(): Promise<EncuestaSessionResult> {
  try {
    const session = await getServerSession(authOptions);
    return { ok: true, session };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "No se pudo validar la sesión";
    return { ok: false, message };
  }
}
