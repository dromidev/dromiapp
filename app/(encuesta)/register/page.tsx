import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdministratorHost } from "@/lib/hosts";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const h = (await headers()).get("host") ?? "";
  if (isAdministratorHost(h)) {
    const origin =
      process.env.NEXT_PUBLIC_ENCUESTA_ORIGIN ?? "https://encuesta.dromi.lat";
    redirect(`${origin}/register`);
  }

  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-500">
          Cargando…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
