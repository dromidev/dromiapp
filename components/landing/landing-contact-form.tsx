"use client";

import { useState, useTransition } from "react";
import { submitLandingContactAction } from "@/app/actions/landing-contact";

export function LandingContactForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await submitLandingContactAction(fd);
      if (r.ok) {
        setSuccess(true);
        form.reset();
        return;
      }
      setError(r.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative space-y-4"
      noValidate
    >
      <input
        type="text"
        name="website"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      {(
        [
          {
            name: "nombre" as const,
            label: "Nombre completo",
            placeholder: "Carlos Rodríguez",
            type: "text" as const,
            required: true,
          },
          {
            name: "email" as const,
            label: "Correo electrónico",
            placeholder: "admin@miconjunto.com",
            type: "email" as const,
            required: true,
          },
          {
            name: "whatsapp" as const,
            label: "WhatsApp",
            placeholder: "+57 300 000 0000",
            type: "tel" as const,
            required: false,
          },
          {
            name: "conjunto" as const,
            label: "Nombre del conjunto",
            placeholder: "Conjunto Mirla",
            type: "text" as const,
            required: false,
          },
          {
            name: "numero_copropietarios" as const,
            label: "Número de copropietarios",
            placeholder: "Ej. 48",
            type: "text" as const,
            required: false,
          },
        ] as const
      ).map(({ name, label, placeholder, type, required }) => (
        <div key={name}>
          <label
            htmlFor={`contact-${name}`}
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >
            {label}
            {required ? (
              <span className="text-rose-500" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </label>
          <input
            id={`contact-${name}`}
            name={name}
            type={type}
            required={required}
            disabled={isPending}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
          />
        </div>
      ))}
      <div>
        <label
          htmlFor="contact-mensaje"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500"
        >
          ¿En qué podemos ayudarte?
        </label>
        <textarea
          id="contact-mensaje"
          name="mensaje"
          rows={3}
          disabled={isPending}
          placeholder="Fecha estimada de la asamblea, inquietudes, etc."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
        />
      </div>
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-700" role="status">
          Listo, recibimos tu mensaje. Te contactaremos pronto.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary mt-2 w-full justify-center py-3.5 text-[13px] disabled:cursor-wait disabled:opacity-80"
      >
        {isPending ? "Enviando…" : "Solicitar información →"}
      </button>
    </form>
  );
}
