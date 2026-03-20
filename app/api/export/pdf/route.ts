import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getMeetingExportPayload } from "@/lib/meeting-export";
import { renderActaPdfBuffer } from "@/lib/pdf/acta-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId requerido" }, { status: 400 });
  }
  const data = await getMeetingExportPayload(meetingId, userId);
  if (!data.ok) {
    return NextResponse.json({ error: data.error }, { status: 404 });
  }
  const buffer = await renderActaPdfBuffer(data.meeting, data.questions);
  const filename = `acta-votacion-${meetingId.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
