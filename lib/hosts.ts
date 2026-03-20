/**
 * Hosts where the voting app (encuesta) is served.
 * In production, add encuesta.dromi.lat. Localhost always allows both apps on one origin.
 */
export function isEncuestaHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.startsWith("encuesta.")) return true;
  const extra = process.env.ENCUESTA_HOST?.toLowerCase();
  if (extra && h === extra) return true;
  return false;
}

export function isMainMarketingHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h === "localhost" || h === "127.0.0.1") return true;
  return !h.startsWith("encuesta.");
}
