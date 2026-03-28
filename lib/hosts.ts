function administradorHostCore(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h.startsWith("administrador.")) return true;
  const extra = process.env.ADMINISTRADOR_HOST?.toLowerCase();
  if (extra && h === extra) return true;
  return false;
}

/**
 * Panel principal Dromi (superadmin): producción `administrador.dromi.lat`.
 * En local: añade `127.0.0.1 administrador.localhost` al archivo hosts y usa
 * `http://administrador.localhost:3000`, o define `ADMINISTRADOR_HOST`.
 */
export function isAdministratorHost(host: string): boolean {
  return administradorHostCore(host);
}

/** Misma app en `localhost` / `127.0.0.1` (panel admin en `/admin` con superadmin). */
export function isLocalDevAppHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * Hosts where the voting app (encuesta) is served.
 * In production, add encuesta.dromi.lat. Localhost always allows both apps on one origin.
 */
export function isEncuestaHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (administradorHostCore(host)) return false;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.startsWith("encuesta.")) return true;
  const extra = process.env.ENCUESTA_HOST?.toLowerCase();
  if (extra && h === extra) return true;
  return false;
}

export function isMainMarketingHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (administradorHostCore(host)) return false;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return !h.startsWith("encuesta.");
}
