"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";

type FormData = {
  name: string;
  email: string;
  phone: string;
};

export default function EarlyAccess() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = () => {
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <section id="download" className="py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-[#20B486] p-12 text-center sm:p-16"
          >
            <p className="text-xl font-medium text-white sm:text-2xl">
              ¡Listo! Te avisaremos cuando Dromi esté disponible 🎉
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="download" className="py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-[#20B486] p-8 sm:p-12 lg:p-16"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Próximamente disponible
            </h2>
            <p className="mt-4 text-lg text-white/90">
              Estamos trabajando para traerte la mejor experiencia. Sé de los primeros en usar Dromi.
            </p>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-center"
            >
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:gap-3">
                <div className="flex-1">
                  <label htmlFor="name" className="sr-only">
                    Nombre
                  </label>
                  <input
                    {...register("name", { required: "El nombre es requerido" })}
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className="w-full rounded-lg bg-white/80 py-3 px-4 text-[#0D1B2A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1 text-sm text-white">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="email" className="sr-only">
                    Correo electrónico
                  </label>
                  <input
                    {...register("email", {
                      required: "El correo es requerido",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Correo electrónico inválido",
                      },
                    })}
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="w-full rounded-lg bg-white/80 py-3 px-4 text-[#0D1B2A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1 text-sm text-white">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="phone" className="sr-only">
                    Teléfono
                  </label>
                  <input
                    {...register("phone", { required: "El teléfono es requerido" })}
                    id="phone"
                    type="tel"
                    placeholder="300 000 0000"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className="w-full rounded-lg bg-white/80 py-3 px-4 text-[#0D1B2A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  {errors.phone && (
                    <p id="phone-error" className="mt-1 text-sm text-white">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-white px-6 py-3 font-semibold text-[#0D1B2A] transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
              >
                Notifícame
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
