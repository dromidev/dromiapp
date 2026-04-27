import { Resend } from "resend";

/** Destino del aviso de leads (formulario). La landing sigue mostrando CONTACT_LANDING_EMAIL en la UI. */
const NOTIFY =
  process.env.CONTACT_NOTIFY_EMAIL?.trim() || "jesusdavidprieto@gmail.com";
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

export type SendLandingContactResult =
  | { ok: true; resendEmailId: string | null }
  | { ok: false; reason: string };

/**
 * Avisa por correo un nuevo lead de la landing. Requiere `RESEND_API_KEY`.
 *
 * **Importante (Resend):** con `onboarding@resend.dev` solo puedes enviar al
 * correo con el que diste de alta la cuenta en Resend, salvo que verifiques un
 * dominio en resend.com/domains y uses `RESEND_FROM` con ese dominio.
 *
 * @see https://resend.com/docs/dashboard/domains/introduction
 */
export async function sendLandingContactNotification(
  row: LandingContactPayload
): Promise<SendLandingContactResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "RESEND_API_KEY no configurada en el entorno" };
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

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [NOTIFY],
    subject: `Nuevo contacto — ${row.fullName} (${row.email})`,
    text: lines,
    replyTo: row.email,
  });

  if (error) {
    const reason = `${error.name}: ${error.message}`;
    console.error(
      "[landing-contact] Resend error:",
      JSON.stringify({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        to: NOTIFY,
        from: FROM,
      })
    );
    return { ok: false, reason };
  }

  const resendEmailId = data?.id ?? null;
  if (resendEmailId) {
    console.log("[landing-contact] Resend OK, email id:", resendEmailId);
  } else {
    console.warn("[landing-contact] Resend: respuesta sin data.id", data);
  }
  return { ok: true, resendEmailId };
}
