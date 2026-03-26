"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold text-white">
          Acceso al panel
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Usa el mismo correo y contraseña que en{" "}
          <code className="rounded bg-zinc-900 px-1 text-zinc-400">
            SEED_ADMIN_EMAIL
          </code>{" "}
          y{" "}
          <code className="rounded bg-zinc-900 px-1 text-zinc-400">
            SEED_ADMIN_PASSWORD
          </code>{" "}
          (o los alias{" "}
          <code className="rounded bg-zinc-900 px-1 text-zinc-400">
            SEED_ADMIN
          </code>{" "}
          /{" "}
          <code className="rounded bg-zinc-900 px-1 text-zinc-400">
            SEED_PASSWORD
          </code>
          ) tras ejecutar{" "}
          <code className="text-zinc-400">npm run db:seed-admin</code>.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Correo
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1E6FFF] py-2.5 text-sm font-medium text-white transition hover:bg-[#185dcc] disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
