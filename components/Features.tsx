"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const features = [
  {
    title: "Ubicación en Tiempo Real",
    icon: "/iamge/icon-location.png",
    description: "Ve exactamente dónde se encuentra tu bus en el mapa, actualizado segundo a segundo.",
  },
  {
    title: "Tiempo Estimado de Llegada",
    icon: "/iamge/icon-clock.png",
    description: "Conoce cuánto falta para que tu bus llegue a la parada más cercana.",
  },
  {
    title: "Rutas Intermunicipales",
    icon: "/iamge/icon-route.png",
    description: "Accede a todas las rutas disponibles entre municipios con paradas detalladas.",
  },
  {
    title: "Alertas Inteligentes",
    icon: "/iamge/icon-bell.png",
    description: "Recibe notificaciones cuando tu bus esté cerca de tu ubicación.",
  },
  {
    title: "Viaja con Confianza",
    icon: "/iamge/icon-shield.png",
    description: "Información verificada y datos de seguridad de cada unidad de transporte.",
  },
  {
    title: "Fácil de Usar",
    icon: "/iamge/icon-phone.png",
    description: "Interfaz intuitiva diseñada para que cualquier persona pueda usarla sin complicaciones.",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
};

export default function Features() {
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#20B486]">
            Características
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[#0D1B2A] sm:text-4xl">
            Todo lo que necesitas para{" "}
            <span className="text-[#20B486]">
              moverte mejor
            </span>
          </h2>
          <p className="mt-6 text-lg text-[#6B7280]">
            Diseñada para hacer tu experiencia de transporte intermunicipal más simple, segura y predecible.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              {...fadeInUp}
              transition={{ ...fadeInUp.transition, delay: index * 0.1 }}
              className="rounded-xl bg-white p-8 shadow-lg transition-transform hover:-translate-y-1"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                className="mb-5"
              >
                <Image
                  src={feature.icon}
                  alt=""
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
                />
              </motion.div>
              <h3 className="text-xl font-bold text-[#0D1B2A]">{feature.title}</h3>
              <p className="mt-3 text-base text-[#6B7280]">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
