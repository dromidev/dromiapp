"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const safeCallback =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: safeCallback,
    });
    setLoading(false);

    if (r?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    if (r?.url) {
      window.location.assign(r.url);
      return;
    }

    window.location.assign(safeCallback);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-8 max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
    >
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
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
        {loading ? "Entrando…" : "Entrar al panel"}
      </button>
      <p className="text-center text-xs text-zinc-600">
        Usuario creado en <span className="font-mono">public.users</span> (p. ej.{" "}
        <span className="font-mono">npm run db:seed-admin</span>).
      </p>
    </form>
  );
}
