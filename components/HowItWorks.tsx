"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Descarga la App",
    description: "Disponible próximamente en App Store y Google Play. Regístrate gratis.",
    image: "/iamge/step-download.png",
  },
  {
    number: "02",
    title: "Selecciona tu Ruta",
    description: "Elige la ruta intermunicipal que necesitas y tu parada más cercana.",
    image: "/iamge/step-select-route.png",
  },
  {
    number: "03",
    title: "Rastrea en Tiempo Real",
    description: "Observa la ubicación exacta del bus en el mapa y recibe tu tiempo estimado de llegada.",
    image: "/iamge/step-track.png",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#20B486]">
            Cómo Funciona
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[#0D1B2A] sm:text-4xl">
            Tres pasos simples
          </h2>
          <p className="mt-6 text-lg text-[#6B7280]">
            Empieza a rastrear tu bus en menos de un minuto.
          </p>
        </div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            animate: { transition: { staggerChildren: 0.15 } },
          }}
          className="mt-16 grid gap-12 md:grid-cols-3 lg:mt-20"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
              }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                className="mb-4 flex h-[180px] items-center justify-center"
              >
                <Image
                  src={step.image}
                  alt={step.title}
                  width={200}
                  height={180}
                  className="object-contain"
                />
              </motion.div>
              <p className="text-3xl font-bold text-[#20B486]">{step.number}</p>
              <h3 className="mt-4 text-xl font-bold text-[#0D1B2A]">{step.title}</h3>
              <p className="mt-3 text-[#6B7280]">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
