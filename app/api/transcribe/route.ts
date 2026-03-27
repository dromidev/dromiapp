import { NextResponse } from "next/server";
import {
  deepgramTranscribeBuffer,
  deepgramTranscribeUrl,
  transcriptFromDeepgramJson,
  type DeepgramListenResponse,
} from "@/lib/deepgram-transcribe";
import { getDashboardUserId } from "@/lib/dashboard-user";

export const runtime = "nodejs";
export const maxDuration = 300;

/** ~40 min a bitrate medio; WAV largo puede superar esto (usar MP3/M4A). */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
};

function resolveContentType(file: File): string | null {
  const t = file.type?.trim();
  if (t && t.startsWith("audio/")) return t;
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = name.slice(dot);
  return EXT_TO_MIME[ext] ?? null;
}

/** Evita SSRF: solo URLs HTTPS de Vercel Blob (públicas para Deepgram). */
function isAllowedTranscribeAudioUrl(href: string): boolean {
  try {
    const u = new URL(href);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

async function respondDeepgramOk(
  data: DeepgramListenResponse,
  fileName: string
) {
  const transcript = transcriptFromDeepgramJson(data);
  return NextResponse.json({ transcript, fileName });
}

export async function POST(request: Request) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión en el panel." },
      { status: 401 }
    );
  }

  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Servicio de transcripción no configurado (falta DEEPGRAM_API_KEY en el servidor).",
      },
      { status: 503 }
    );
  }

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  /** Flujo Vercel Blob: JSON { url, fileName? } — cuerpo pequeño, sin límite 4,5 MB. */
  if (contentTypeHeader.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const url =
      typeof body === "object" &&
      body !== null &&
      "url" in body &&
      typeof (body as { url: unknown }).url === "string"
        ? (body as { url: string }).url.trim()
        : "";
    const fileName =
      typeof body === "object" &&
      body !== null &&
      "fileName" in body &&
      typeof (body as { fileName: unknown }).fileName === "string"
        ? (body as { fileName: string }).fileName
        : "audio";

    if (!url) {
      return NextResponse.json({ error: "Falta url del audio." }, { status: 400 });
    }
    if (!isAllowedTranscribeAudioUrl(url)) {
      return NextResponse.json(
        {
          error:
            "URL no permitida. Usa solo archivos subidos al almacenamiento del proyecto (Vercel Blob).",
        },
        { status: 400 }
      );
    }

    try {
      const { data } = await deepgramTranscribeUrl(key, url);
      return respondDeepgramOk(data, fileName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: "Deepgram rechazó la petición.", details: msg },
        { status: 502 }
      );
    }
  }

  /** Flujo clásico: multipart (local o sin Blob). */
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo leer el archivo completo. Si el archivo es grande, configura Vercel Blob y BLOB_READ_WRITE_TOKEN para subida directa.",
      },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Adjunta un archivo de audio válido." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo supera el límite de ${MAX_FILE_BYTES / (1024 * 1024)} MB. Usa Vercel Blob + URL, o un formato comprimido (MP3, M4A).`,
      },
      { status: 400 }
    );
  }

  const ct = resolveContentType(file);
  if (!ct) {
    return NextResponse.json(
      {
        error:
          "Formato no reconocido. Usa MP3, WAV, M4A, WEBM, OGG o FLAC.",
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { data } = await deepgramTranscribeBuffer(key, buffer, ct);
    return respondDeepgramOk(data, file.name);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_JSON") {
      return NextResponse.json(
        { error: "Respuesta inválida del servicio de transcripción." },
        { status: 502 }
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Deepgram rechazó la petición.", details: msg },
      { status: 502 }
    );
  }
}
