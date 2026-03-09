"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Hero() {
  return (
    <section className="overflow-hidden bg-gradient-to-b from-white to-blue-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
        <div className="order-1 text-center md:order-1 md:text-left">
          <motion.div
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.1 } },
            }}
            className="flex flex-col items-center gap-6 md:items-start"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-[#6B7280]"
            >
              <MapPin className="h-4 w-4" />
              Rastreo en tiempo real
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-extrabold leading-tight text-[#0D1B2A] sm:text-5xl lg:text-6xl"
            >
              Conoce dónde está{" "}
              <span className="text-[#20B486]">
                tu bus
              </span>{" "}
              en todo momento
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="max-w-xl text-lg text-[#6B7280]"
            >
              Rastrea la ubicación exacta de tu bus intermunicipal en tiempo real. Sin más esperas innecesarias, planifica tu viaje con confianza.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col gap-4 sm:flex-row sm:gap-4"
            >
              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#download")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-[#20B486] px-6 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Descargar Pronto ↓
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full border border-gray-300 bg-white px-6 py-3.5 font-semibold text-[#0D1B2A] transition-colors hover:bg-gray-50"
              >
                Cómo Funciona
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="order-2 flex justify-center md:order-2"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/iamge/hero-phone.png"
              alt="Dromi app mostrando mapa con rastreo de bus en tiempo real"
              width={420}
              height={840}
              priority
              className="w-auto max-w-[340px] sm:max-w-[400px] md:max-w-[420px] [filter:drop-shadow(0_30px_40px_rgba(32,180,134,0.5))_drop-shadow(0_10px_20px_rgba(32,180,134,0.3))]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
