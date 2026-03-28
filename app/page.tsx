import type { Metadata } from "next";
import HomeLanding from "@/components/landing/home-landing";

export const metadata: Metadata = {
  title:
    "Dromi — Actas con IA y votaciones digitales para propiedad horizontal",
  description:
    "Transcripción con IA, actas en 48 horas y votación digital en tiempo real. Presencia física en cada asamblea. Costa Caribe de Colombia.",
};

export default function Home() {
  return <HomeLanding />;
}
