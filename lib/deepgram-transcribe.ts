const LISTEN_BASE = "https://api.deepgram.com/v1/listen";

export type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
};

function parseDeepgramResponse(rawText: string): DeepgramListenResponse {
  return JSON.parse(rawText) as DeepgramListenResponse;
}

export function transcriptFromDeepgramJson(data: DeepgramListenResponse): string {
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

function listenQueryParams(): URLSearchParams {
  return new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    language: "es",
  });
}

/** Audio en bruto (multipart). */
export async function deepgramTranscribeBuffer(
  apiKey: string,
  buffer: Buffer,
  contentType: string
): Promise<{ rawText: string; data: DeepgramListenResponse }> {
  const dgRes = await fetch(
    `${LISTEN_BASE}?${listenQueryParams().toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": contentType,
      },
      body: new Uint8Array(buffer),
    }
  );
  const rawText = await dgRes.text();
  let data: DeepgramListenResponse;
  try {
    data = parseDeepgramResponse(rawText);
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (!dgRes.ok) {
    const errMsg =
      (data as { err_msg?: string }).err_msg ??
      rawText.slice(0, 300) ??
      dgRes.statusText;
    throw new Error(errMsg);
  }
  return { rawText, data };
}

/** URL pública del audio (p. ej. Vercel Blob). */
export async function deepgramTranscribeUrl(
  apiKey: string,
  audioUrl: string
): Promise<{ rawText: string; data: DeepgramListenResponse }> {
  const dgRes = await fetch(
    `${LISTEN_BASE}?${listenQueryParams().toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    }
  );
  const rawText = await dgRes.text();
  let data: DeepgramListenResponse;
  try {
    data = parseDeepgramResponse(rawText);
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (!dgRes.ok) {
    const errMsg =
      (data as { err_msg?: string }).err_msg ??
      rawText.slice(0, 300) ??
      dgRes.statusText;
    throw new Error(errMsg);
  }
  return { rawText, data };
}
