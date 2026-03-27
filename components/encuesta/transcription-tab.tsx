"use client";

import { upload } from "@vercel/blob/client";
import { FileDown, Loader2, Mic } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const MAX_DURATION_SEC = 40 * 60;
const ICON = { className: "h-5 w-5 shrink-0", strokeWidth: 1.25 } as const;

type Phase =
  | "idle"
  | "uploading"
  | "transcribing"
  | "done"
  | "error";

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("No se pudo determinar la duración del audio."));
        return;
      }
      resolve(d);
    };
    audio.onerror = () => {
      cleanup();
      reject(
        new Error(
          "No se pudo leer la duración. Prueba con MP3, M4A o WAV."
        )
      );
    };
    audio.src = url;
  });
}

function safeBlobPathname(file: File): string {
  const safe = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  return `transcribe/${Date.now()}-${safe || "audio"}`;
}

async function downloadTranscriptionPdf(transcript: string) {
  const res = await fetch("/api/export/transcription-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) {
    let msg = "No se pudo generar el PDF.";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transcripcion-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function shouldFallbackToFormDataAfterBlobError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|BLOB|Almacenamiento|no configurado|Blob no/i.test(msg);
}

type TranscribeHandlers = {
  setPhase: (p: Phase) => void;
  setUploadProgress: (n: number) => void;
  setTranscript: (t: string) => void;
  setErrorMessage: (m: string | null) => void;
};

function applyTranscribeJsonResponse(
  body: { transcript?: string; error?: string; details?: string },
  handlers: TranscribeHandlers
) {
  const text = body.transcript?.trim() ?? "";
  handlers.setTranscript(text);
  handlers.setPhase("done");
  if (!text) {
    handlers.setErrorMessage(
      "La transcripción está vacía. Comprueba que el audio tenga voz audible."
    );
  }
}

/** Subida directa a Vercel Blob + transcripción por URL (recomendado en Vercel). */
async function transcribeViaBlob(
  file: File,
  handlers: TranscribeHandlers
): Promise<void> {
  handlers.setPhase("uploading");
  handlers.setUploadProgress(0);

  const putBlob = await upload(safeBlobPathname(file), file, {
    access: "public",
    handleUploadUrl: "/api/transcribe/blob",
    multipart: file.size > 4 * 1024 * 1024,
    contentType: file.type || undefined,
    onUploadProgress: ({ percentage }) => {
      handlers.setUploadProgress(Math.round(percentage));
    },
  });

  handlers.setPhase("transcribing");
  handlers.setUploadProgress(100);

  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: putBlob.url, fileName: file.name }),
  });

  let body: { transcript?: string; error?: string; details?: string };
  try {
    body = (await res.json()) as {
      transcript?: string;
      error?: string;
      details?: string;
    };
  } catch {
    handlers.setErrorMessage("Respuesta inválida del servidor.");
    handlers.setPhase("error");
    return;
  }

  if (!res.ok) {
    let msg = body.error ?? "No se pudo transcribir el audio.";
    if (body.details) msg = `${msg} ${body.details}`;
    handlers.setErrorMessage(msg);
    handlers.setPhase("error");
    return;
  }

  applyTranscribeJsonResponse(body, handlers);
}

/** Multipart a /api/transcribe (local o archivos pequeños en Vercel). */
function transcribeViaFormData(
  file: File,
  handlers: TranscribeHandlers
): Promise<void> {
  return new Promise((resolve) => {
    const fd = new FormData();
    fd.set("file", file);

    handlers.setPhase("uploading");
    handlers.setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/transcribe");
    xhr.responseType = "json";

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        handlers.setUploadProgress(
          Math.round((ev.loaded / ev.total) * 100)
        );
      }
    });

    xhr.addEventListener("load", () => {
      handlers.setUploadProgress(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = xhr.response as {
          transcript?: string;
          error?: string;
          details?: string;
        };
        applyTranscribeJsonResponse(body, handlers);
        resolve();
        return;
      }
      if (xhr.status === 413) {
        handlers.setErrorMessage(
          "El archivo supera el límite del hosting (~4,5 MB en Vercel). Configura Vercel Blob (BLOB_READ_WRITE_TOKEN) para subidas grandes."
        );
        handlers.setPhase("error");
        resolve();
        return;
      }
      let msg = "No se pudo transcribir el audio.";
      try {
        const body = xhr.response as { error?: string; details?: string };
        if (body?.error) msg = body.error;
        if (body?.details) msg = `${msg} ${body.details}`;
      } catch {
        /* ignore */
      }
      handlers.setErrorMessage(msg);
      handlers.setPhase("error");
      resolve();
    });

    xhr.addEventListener("error", () => {
      handlers.setErrorMessage("Error de red al subir el archivo.");
      handlers.setPhase("error");
      resolve();
    });

    xhr.addEventListener("abort", () => {
      handlers.setPhase("idle");
      resolve();
    });

    xhr.upload.addEventListener("load", () => {
      handlers.setPhase("transcribing");
      handlers.setUploadProgress(100);
    });

    xhr.send(fd);
  });
}

export function TranscriptionTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setUploadProgress(0);
    setTranscript("");
    setSourceFileName(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onPickFile = useCallback(() => {
    setErrorMessage(null);
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setErrorMessage(null);
      setTranscript("");
      setSourceFileName(file.name);

      try {
        const duration = await getAudioDuration(file);
        if (duration > MAX_DURATION_SEC) {
          const maxMin = MAX_DURATION_SEC / 60;
          setErrorMessage(
            `El audio dura más de ${maxMin} minutos (${Math.ceil(duration / 60)} min). Sube un archivo de hasta ${maxMin} minutos.`
          );
          setSourceFileName(null);
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "No se pudo validar el audio."
        );
        setSourceFileName(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const handlers: TranscribeHandlers = {
        setPhase,
        setUploadProgress,
        setTranscript,
        setErrorMessage,
      };

      try {
        await transcribeViaBlob(file, handlers);
      } catch (err) {
        if (shouldFallbackToFormDataAfterBlobError(err)) {
          setErrorMessage(null);
          await transcribeViaFormData(file, handlers);
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : "Error al subir el audio."
          );
          setPhase("error");
        }
      }
    },
    []
  );

  const onDownloadPdf = useCallback(async () => {
    if (!transcript.trim()) return;
    setErrorMessage(null);
    try {
      await downloadTranscriptionPdf(transcript);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Error al descargar.");
    }
  }, [transcript]);

  const busy = phase === "uploading" || phase === "transcribing";

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
          <Mic {...ICON} className="h-5 w-5 text-violet-300" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Transcripción</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sube un audio (hasta{" "}
            <strong className="text-zinc-400">40 minutos</strong> de duración).
            Se envía a Deepgram para transcribir y luego puedes descargar el
            texto en PDF.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPickFile}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
            Subir audio
          </button>
          {sourceFileName && phase !== "idle" ? (
            <span className="truncate text-xs text-zinc-500" title={sourceFileName}>
              {sourceFileName}
            </span>
          ) : null}
          {phase === "done" || phase === "error" ? (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Nuevo audio
            </button>
          ) : null}
        </div>

        {busy ? (
          <div
            className="mt-6 space-y-3"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-sm font-medium text-zinc-200">
              Estamos transcribiendo tu audio
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              {phase === "uploading" ? (
                <div
                  className="h-full rounded-full bg-violet-500 transition-[width] duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-full bg-violet-500/90" />
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {phase === "uploading"
                ? `Subiendo… ${uploadProgress}%`
                : "Procesando con el servicio de transcripción…"}
            </p>
          </div>
        ) : null}

        {phase === "done" && transcript.trim() ? (
          <div
            className="mt-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4"
            role="status"
          >
            <p className="text-sm font-semibold text-emerald-100">
              Tu Transcripción está lista!
            </p>
            <button
              type="button"
              onClick={() => void onDownloadPdf()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              <FileDown className="h-4 w-4 shrink-0" aria-hidden />
              Descargar Transcripción
            </button>
          </div>
        ) : null}

        {phase === "done" && !transcript.trim() ? (
          <p className="mt-4 text-sm text-amber-200/90">
            No se obtuvo texto. Prueba con otro archivo o comprueba el volumen
            del audio.
          </p>
        ) : null}

        {errorMessage ? (
          <div
            className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100/95 whitespace-pre-wrap"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
