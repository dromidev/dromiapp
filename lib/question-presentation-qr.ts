import QRCode from "qrcode";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, questions } from "@/db/schema";
import { getDashboardUserId } from "@/lib/dashboard-user";
import { getEncuestaBaseUrl } from "@/lib/public-url";

/**
 * Datos para armar el enlace de voto (y metadata). Dedup en la misma petición.
 */
export const getQuestionPresentationPayload = cache(
  async (
    publicId: string
  ): Promise<{ voteUrl: string; title: string } | null> => {
    const userId = await getDashboardUserId();
    if (!userId) return null;

    const rows = await db
      .select({
        publicId: questions.publicId,
        accessCode: questions.accessCode,
        title: questions.title,
      })
      .from(questions)
      .innerJoin(meetings, eq(questions.meetingId, meetings.id))
      .where(
        and(
          eq(questions.publicId, publicId),
          eq(questions.isActive, true),
          eq(meetings.isActive, true),
          eq(meetings.createdByUserId, userId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const base = getEncuestaBaseUrl();
    const voteUrl = `${base}/votar/${row.publicId}#a=${encodeURIComponent(row.accessCode)}`;
    return { voteUrl, title: row.title };
  }
);

/**
 * QR grande para la página de proyección: misma autorización que el panel
 * (pregunta pertenece a una asamblea del usuario del dashboard).
 */
export async function getQuestionPresentationQr(
  publicId: string
): Promise<{ dataUrl: string; title: string } | null> {
  const payload = await getQuestionPresentationPayload(publicId);
  if (!payload) return null;
  const dataUrl = await QRCode.toDataURL(payload.voteUrl, {
    width: 1024,
    margin: 2,
  });
  return { dataUrl, title: payload.title };
}
