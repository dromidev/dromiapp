"use server";

import { z } from "zod";
import { db } from "@/db";
import { landingContactSubmissions } from "@/db/schema";
import { sendLandingContactNotification } from "@/lib/send-landing-contact-email";

const schema = z.object({
  nombre: z.string().min(1, "Requerido").max(200).trim(),
  email: z.string().email("Correo inválido").max(320).toLowerCase().trim(),
  whatsapp: z
    .string()
    .max(80)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  conjunto: z
    .string()
    .max(200)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  numero_copropietarios: z
    .string()
    .max(100)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  mensaje: z
    .string()
    .max(8000)
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});

export type SubmitLandingContactState =
  | { ok: true }
  | { ok: false; error: string };

export async function submitLandingContactAction(
  formData: FormData
): Promise<SubmitLandingContactState> {
  const raw = {
    nombre: String(formData.get("nombre") ?? ""),
    email: String(formData.get("email") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    conjunto: String(formData.get("conjunto") ?? ""),
    numero_copropietarios: String(formData.get("numero_copropietarios") ?? ""),
    mensaje: String(formData.get("mensaje") ?? ""),
    website: String(formData.get("website") ?? ""),
  };

  if (raw.website.length > 0) {
    return { ok: true };
  }

  const parsed = schema.safeParse({
    ...raw,
    whatsapp: raw.whatsapp || undefined,
    conjunto: raw.conjunto || undefined,
    numero_copropietarios: raw.numero_copropietarios || undefined,
    mensaje: raw.mensaje || undefined,
    website: raw.website || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.nombre?.[0] ||
      first.email?.[0] ||
      "Revisa los datos e intenta de nuevo.";
    return { ok: false, error: msg };
  }

  const d = parsed.data;

  try {
    const [row] = await db
      .insert(landingContactSubmissions)
      .values({
        fullName: d.nombre,
        email: d.email,
        whatsapp: d.whatsapp,
        buildingName: d.conjunto,
        coownersCount: d.numero_copropietarios,
        message: d.mensaje,
      })
      .returning({ id: landingContactSubmissions.id });

    if (!row) {
      return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
    }

    const payload = {
      id: row.id,
      fullName: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp ?? null,
      buildingName: d.conjunto ?? null,
      coownersCount: d.numero_copropietarios ?? null,
      message: d.mensaje ?? null,
    };

    try {
      const mail = await sendLandingContactNotification(payload);
      if (!mail.sent) {
        console.warn("[landing-contact] Email no enviado:", mail.reason);
      }
    } catch (e) {
      console.error("[landing-contact] Error notificando por correo:", e);
    }

    return { ok: true };
  } catch (e) {
    console.error("[landing-contact] Error guardando:", e);
    return {
      ok: false,
      error: "No se pudo guardar. Intenta de nuevo o escríbenos al correo de contacto.",
    };
  }
}
