import { NextResponse } from "next/server";
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

type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
};

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo leer el archivo completo. Suele ser un tope del entorno antes de nuestro límite de 100 MB: Next.js bufferiza el body (~10 MB por defecto; en el proyecto está en 100 MB en next.config — reinicia `npm run dev`). En Vercel las funciones suelen limitar el cuerpo a ~4.5 MB: comprime el audio (MP3) o evita pasar el archivo por esa ruta.",
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
        error: `El archivo supera el límite de ${MAX_FILE_BYTES / (1024 * 1024)} MB. Usa un formato comprimido (MP3, M4A) o un audio más corto.`,
      },
      { status: 400 }
    );
  }

  const contentType = resolveContentType(file);
  if (!contentType) {
    return NextResponse.json(
      {
        error:
          "Formato no reconocido. Usa MP3, WAV, M4A, WEBM, OGG o FLAC.",
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const params = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    language: "es",
  });

  const dgRes = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": contentType,
      },
      body: buffer,
    }
  );

  const rawText = await dgRes.text();
  let data: DeepgramListenResponse;
  try {
    data = JSON.parse(rawText) as DeepgramListenResponse;
  } catch {
    return NextResponse.json(
      {
        error: "Respuesta inválida del servicio de transcripción.",
        details: dgRes.ok ? undefined : rawText.slice(0, 200),
      },
      { status: 502 }
    );
  }

  if (!dgRes.ok) {
    const errMsg =
      (data as { err_msg?: string }).err_msg ??
      rawText.slice(0, 300) ??
      dgRes.statusText;
    return NextResponse.json(
      { error: "Deepgram rechazó la petición.", details: errMsg },
      { status: 502 }
    );
  }

  const transcript =
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

  return NextResponse.json({
    transcript,
    fileName: file.name,
  });
}
