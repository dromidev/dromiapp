"use client";

import { registerConjuntoAdminAction } from "@/app/(encuesta)/register-actions";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.set("organizationName", organizationName.trim());
    fd.set("email", email.trim());
    fd.set("password", password);
    const res = await registerConjuntoAdminAction(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/login?registered=1&email=${encodeURIComponent(res.email)}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 pt-0 shadow-sm shadow-slate-200/60">
        <header className="flex items-center justify-center gap-2.5 border-b border-slate-100 px-2 py-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <Building2 className="h-3.5 w-3.5 text-white" aria-hidden />
          </div>
          <span className="text-[12px] font-light uppercase tracking-[0.22em] text-slate-500">
            Dromi
          </span>
        </header>

        <h1 className="pt-6 text-center text-xl font-semibold text-slate-900">
          Crear usuario — administración
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Registra el conjunto para acceder al panel de asambleas y votación.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="reg-org"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Nombre del conjunto
            </label>
            <input
              id="reg-org"
              name="organizationName"
              type="text"
              autoComplete="organization"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-400/30 focus:border-slate-400 focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Correo
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-400/30 focus:border-slate-400 focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Contraseña
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-400/30 focus:border-slate-400 focus:ring-2"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Mínimo 8 caracteres.
            </p>
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Creando cuenta…" : "Crear usuario"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-900 underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
