import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/encuesta/login-form";
import { getEncuestaServerSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const result = await getEncuestaServerSession();

  if (result.ok && result.session?.user?.id) {
    redirect("/dashboard");
  }

  const configError =
    (!result.ok ? result.message : null) ??
    (sp.error === "config"
      ? "Configuración de autenticación incompleta en el servidor."
      : null);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold text-white">
        Acceso al panel
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Ingresa el correo y la contraseña del usuario registrado en la base de
        datos.
      </p>
      {configError ? (
        <div
          className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
          role="alert"
        >
          <p className="font-medium text-amber-50">
            El servidor no puede iniciar sesión todavía
          </p>
          <p className="mt-2 text-amber-200/90">{configError}</p>
          <p className="mt-3 text-xs text-amber-200/70">
            En <strong>Vercel</strong> (o tu hosting), define al menos:{" "}
            <code className="rounded bg-black/30 px-1">AUTH_SECRET</code> (o{" "}
            <code className="rounded bg-black/30 px-1">NEXTAUTH_SECRET</code>
            ),{" "}
            <code className="rounded bg-black/30 px-1">
              NEXTAUTH_URL=https://encuesta.dromi.lat
            </code>{" "}
            (URL exacta del subdominio) y{" "}
            <code className="rounded bg-black/30 px-1">DATABASE_URL</code>.
            Luego vuelve a desplegar.
          </p>
        </div>
      ) : null}
      <Suspense
        fallback={
          <div className="mt-8 h-48 animate-pulse rounded-2xl bg-zinc-900/50" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
