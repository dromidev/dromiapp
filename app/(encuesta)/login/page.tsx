import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { LoginForm } from "@/components/encuesta/login-form";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold text-white">
        Acceso al panel
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Ingresa el correo y la contraseña del usuario registrado en la base de
        datos.
      </p>
      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl bg-zinc-900/50" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
