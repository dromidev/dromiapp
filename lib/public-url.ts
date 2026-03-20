export function getEncuestaBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_ENCUESTA_ORIGIN ?? "https://encuesta.dromi.lat";
  return raw.replace(/\/$/, "");
}
