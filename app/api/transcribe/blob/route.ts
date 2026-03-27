import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getDashboardUserId } from "@/lib/dashboard-user";

export const runtime = "nodejs";

const MAX_BYTES = 100 * 1024 * 1024;

/**
 * Tokens para subida directa del navegador a Vercel Blob (sin pasar el archivo por /api/transcribe).
 * Requiere BLOB_READ_WRITE_TOKEN en el proyecto (Storage → Blob en Vercel).
 */
export async function POST(request: Request) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión en el panel." },
      { status: 401 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "Almacenamiento Blob no configurado. Añade BLOB_READ_WRITE_TOKEN en Vercel (Blob Store) o en .env.local.",
      },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "audio/mp4",
            "audio/m4a",
            "audio/x-m4a",
            "audio/webm",
            "audio/ogg",
            "audio/flac",
            "audio/x-flac",
            "application/octet-stream",
          ],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId, pathname }),
        };
      },
      onUploadCompleted: async () => {
        /* opcional: persistir URL */
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar token de subida";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
