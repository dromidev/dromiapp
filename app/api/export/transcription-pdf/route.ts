import { NextResponse } from "next/server";
import { getDashboardUserId } from "@/lib/dashboard-user";
import { renderTranscriptionPdfBuffer } from "@/lib/pdf/transcription-pdf";

export const runtime = "nodejs";

const MAX_TRANSCRIPT_CHARS = 500_000;

export async function POST(request: Request) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión en el panel." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const transcript =
    typeof body === "object" &&
    body !== null &&
    "transcript" in body &&
    typeof (body as { transcript: unknown }).transcript === "string"
      ? (body as { transcript: string }).transcript
      : "";

  if (!transcript.trim()) {
    return NextResponse.json(
      { error: "No hay texto de transcripción para exportar." },
      { status: 400 }
    );
  }

  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: "La transcripción es demasiado larga para exportar." },
      { status: 400 }
    );
  }

  const generatedAtIso = new Date().toISOString();
  const buffer = await renderTranscriptionPdfBuffer(transcript, generatedAtIso);
  const filename = `transcripcion-${generatedAtIso.slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
