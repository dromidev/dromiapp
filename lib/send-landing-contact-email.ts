import { Resend } from "resend";

const NOTIFY =
  process.env.CONTACT_NOTIFY_EMAIL?.trim() || "jesusprieto@snrg.lat";
const FROM =
  process.env.RESEND_FROM?.trim() || "Dromi <onboarding@resend.dev>";

export type LandingContactPayload = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  buildingName: string | null;
  coownersCount: string | null;
  message: string | null;
};

/**
 * Avisa por correo un nuevo lead de la landing. Requiere `RESEND_API_KEY`.
 * Con `onboarding@resend.dev` el destinatario puede estar restringido según
 * el plan; en producción conviene un dominio verificado en `RESEND_FROM`.
 */
export async function sendLandingContactNotification(
  row: LandingContactPayload
): Promise<{ sent: true } | { sent: false; reason: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { sent: false, reason: "RESEND_API_KEY no configurada" };
  }

  const resend = new Resend(key);
  const lines = [
    `Nueva solicitud desde la web (Dromi).`,
    ``,
    `ID: ${row.id}`,
    `Nombre: ${row.fullName}`,
    `Email: ${row.email}`,
    row.whatsapp ? `WhatsApp: ${row.whatsapp}` : null,
    row.buildingName ? `Conjunto: ${row.buildingName}` : null,
    row.coownersCount ? `N.º copropietarios: ${row.coownersCount}` : null,
    row.message ? `Mensaje:\n${row.message}` : null,
  ]
    .filter((x): x is string => x != null)
    .join("\n");

  const { error } = await resend.emails.send({
    from: FROM,
    to: [NOTIFY],
    subject: `Nuevo contacto — ${row.fullName} (${row.email})`,
    text: lines,
  });

  if (error) {
    console.error("[landing-contact] Resend:", error);
    return { sent: false, reason: String(error.message ?? error) };
  }
  return { sent: true };
}
