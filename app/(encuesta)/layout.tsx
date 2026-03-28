import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";

export const metadata: Metadata = {
  title: "Encuesta — Asamblea",
  description:
    "Votaciones en tiempo real para asambleas de copropietarios y conjuntos residenciales.",
};

export default function EncuestaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-[#f4f6f9] text-slate-900 antialiased">
        {children}
      </div>
    </AuthSessionProvider>
  );
}
