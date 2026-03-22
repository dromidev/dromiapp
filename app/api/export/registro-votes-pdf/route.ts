import { NextResponse } from "next/server";
import { getDashboardUserId } from "@/lib/dashboard-user";
import { renderRegistroVotosPdfBuffer } from "@/lib/pdf/registro-votos-pdf";
import { getRegistroVotosPdfPayload } from "@/lib/registro-votos-pdf-payload";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Configura DASHBOARD_USER_ID o SEED_ADMIN_EMAIL" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");
  const questionId = searchParams.get("questionId");
  if (!meetingId || !questionId) {
    return NextResponse.json(
      { error: "meetingId y questionId son requeridos" },
      { status: 400 }
    );
  }

  const payload = await getRegistroVotosPdfPayload(
    meetingId,
    questionId,
    userId
  );
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 404 });
  }

  const buffer = await renderRegistroVotosPdfBuffer(payload.data);
  const safe = payload.data.questionTitle
    .slice(0, 24)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const filename = `registro-votos-${safe || "pregunta"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
