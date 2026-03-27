import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  /**
   * Por defecto Next (proxy/middleware) bufferiza ~10 MB; si no, `request.formData()`
   * falla con archivos mayores (p. ej. 24 MB) aunque el lógico de la ruta sea 100 MB.
   */
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
