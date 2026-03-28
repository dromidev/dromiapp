import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import EarlyAccess from "@/components/EarlyAccess";

/** Vista de inicio anterior (Dromi / marketing clásico). La raíz `/` usa la nueva landing. */
export default function InicioOriginalPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <EarlyAccess />
    </main>
  );
}
