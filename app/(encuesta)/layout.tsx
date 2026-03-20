import type { Metadata } from "next";
import { SessionProvider } from "@/components/encuesta/session-provider";

export const metadata: Metadata = {
  title: "Encuesta — Asamblea",
  description:
    "Votaciones en tiempo real para asambleas de copropietarios y conjuntos residenciales.",
};

export default function EncuestaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#0f1419] text-zinc-100 antialiased">
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}
