"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { LandingContactForm } from "@/components/landing/landing-contact-form";
import {
  motion,
  useInView,
  AnimatePresence,
  useAnimationFrame,
} from "framer-motion";
import {
  Mic,
  FileText,
  Vote,
  CheckCircle,
  ArrowRight,
  Clock,
  Star,
  Menu,
  X,
  Zap,
  Mail,
  MapPin,
  UserCheck,
  ClipboardCheck,
  Pencil,
} from "lucide-react";

/** Logo en `public/iamge/` (ruta del proyecto). */
const DROMI_LOGO_SRC = "/iamge/dromi%20logo.svg";

const CONTACT_LANDING_EMAIL = "jesusprieto@snrg.lat";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

function voteOptionBarClass(label: string): string {
  if (label === "A favor") return "bg-emerald-500";
  if (label === "En contra") return "bg-red-500";
  return "bg-amber-400";
}

/** Vista al entrar en viewport (los hijos motion usan esto con whileInView). */
const viewOnce = { once: true as const, margin: "-80px" as const };

function AnimatedSection({
  children,
  className = "",
  id,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section id={id} className={className} style={style}>
      {children}
    </section>
  );
}

function ProcessStep({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className="flex items-start gap-5"
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[11px] font-bold tracking-widest text-slate-500"
      >
        {num}
      </div>
      <div>
        <h4 className="mb-1.5 text-[15px] font-semibold text-slate-900">
          {title}
        </h4>
        <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
      </div>
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <X className="h-4 w-4 flex-shrink-0 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const testimonials = [
  {
    name: "Ariadna Noriega",
    role: "Administradora · Conjunto Mirla",
    text: "La persona que enviaron estuvo presente toda la asamblea, manejó la grabación y las votaciones sin ningún inconveniente. El acta llegó en pocos días, impecable.",
    rating: 5,
  },
  {
    name: "Jorge Palomino",
    role: "Presidente de Consejo · Reserva del Mar, Cartagena",
    text: "La votación digital nos dio total tranquilidad. Cada propietario votó desde su teléfono y los resultados fueron inmediatos. Nunca más discusiones sobre el conteo.",
    rating: 5,
  },
  {
    name: "Carmen Liévano",
    role: "Administradora · Torres del Prado, Barranquilla",
    text: "Antes me demoraba 3 días en redactar el acta. Ahora al día siguiente ya tenía el borrador listo. La precisión del documento fue sorprendente.",
    rating: 5,
  },
  {
    name: "Mauricio Soto",
    role: "Consejo de Administración · Villas del Norte, Santa Marta",
    text: "El equipo llegó puntual, instaló todo y manejó la sesión de votaciones con profesionalismo. Los copropietarios quedaron muy impresionados con la tecnología.",
    rating: 5,
  },
  {
    name: "Patricia Díaz",
    role: "Administradora · Parque Residencial El Bosque",
    text: "Lo que más valoro es que cumplen con la Ley 675. El acta incluye todos los requisitos legales y eso le da mucha seriedad al proceso.",
    rating: 5,
  },
  {
    name: "Hernán Castro",
    role: "Presidente · Conjunto Las Palmas, Barranquilla",
    text: "Nuestra asamblea tenía 80 unidades y todo fluyó sin problemas. La transparencia en las votaciones eliminó cualquier discusión sobre los resultados.",
    rating: 5,
  },
];

const testimonioFotos = [
  {
    src: "/iamge/testimonios/testimonio-asamblea-1.png",
    alt: "Asamblea de copropietarios al aire libre, presentación en la fachada del conjunto",
  },
  {
    src: "/iamge/testimonios/testimonio-asamblea-2.png",
    alt: "Reunión comunitaria con asistentes en sillas, equipo de sonido y conjunto residencial al fondo",
  },
  {
    src: "/iamge/testimonios/testimonio-asamblea-3.png",
    alt: "Asamblea nocturna con proyección en pantalla y copropietarios atentos",
  },
  {
    src: "/iamge/testimonios/testimonio-asamblea-4.png",
    alt: "Sesión informativa nocturna con presentación a la comunidad en el parqueadero del conjunto",
  },
] as const;

function TestimonialCard({
  name,
  role,
  text,
  rating,
}: (typeof testimonials)[0]) {
  return (
    <div className="mx-3 flex w-[320px] flex-shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-0.5">
        {Array.from({ length: rating }).map((_, i) => (
          <Star
            key={i}
            className="h-3 w-3 fill-amber-400 text-amber-400"
          />
        ))}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-slate-600">
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-800">
          {name[0]}
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-900">{name}</p>
          <p className="text-[11px] text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function InfiniteCarousel() {
  const doubled = [...testimonials, ...testimonials];
  const trackRef = useRef<HTMLDivElement>(null);
  const posX = useRef(0);
  const singleWidth = useRef(0);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        singleWidth.current = trackRef.current.scrollWidth / 2;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useAnimationFrame(() => {
    posX.current -= 0.45;
    if (
      singleWidth.current > 0 &&
      Math.abs(posX.current) >= singleWidth.current
    ) {
      posX.current = 0;
    }
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${posX.current}px)`;
    }
  });

  return (
    <div className="w-full overflow-hidden">
      <div ref={trackRef} className="flex py-2 will-change-transform">
        {doubled.map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </div>
    </div>
  );
}

export default function HomeLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  const faqs = [
    {
      q: "¿Necesito instalar algún software especial?",
      a: "No. Todo funciona desde el navegador. Los copropietarios solo necesitan su teléfono con conexión a internet para participar en las votaciones.",
    },
    {
      q: "¿Un miembro del equipo estará presente en la asamblea?",
      a: "Sí, siempre. Una persona de nuestro equipo asiste presencialmente para manejar la grabación y el sistema de votaciones, garantizando que todo se capture correctamente desde el inicio hasta el cierre de la sesión.",
    },
    {
      q: "¿Las actas tienen validez legal en Colombia?",
      a: "Sí. Las actas cumplen con todos los requisitos de la Ley 675 de 2001 — quórum, orden del día, deliberaciones, votaciones con resultados y firmas.",
    },
    {
      q: "¿En cuánto tiempo recibo el acta?",
      a: "En un máximo de 3 días hábiles después de realizada la asamblea. El proceso incluye transcripción con IA, validación de contenido y revisión especializada antes de la entrega.",
    },
    {
      q: "¿El precio varía según el número de copropietarios?",
      a: "No. El valor de $1.950.000 COP aplica sin importar el número de copropietarios ni de asistentes del conjunto.",
    },
    {
      q: "¿Puedo contratar solo uno de los dos servicios?",
      a: "El plan incluye ambos servicios como paquete integrado para garantizar que lo que se vota quede consistentemente reflejado en el acta. Escríbenos si tienes un caso particular.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-slate-900 antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&display=swap');
        .home-landing { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .label-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 99px;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          background: #0f172a;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
          cursor: pointer;
        }
        .btn-primary:hover { background: #1e293b; transform: translateY(-1px); }
        .home-landing nav .btn-primary {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .home-landing nav .btn-ghost.nav-header-login {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 13px;
          font-weight:500;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .btn-ghost:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .home-landing ::placeholder { color: #94a3b8; }
        .home-landing input:focus, .home-landing textarea:focus {
          outline: none;
          border-color: #64748b !important;
          box-shadow: 0 0 0 3px rgba(100,116,139,0.15);
        }
      `}</style>

      <div className="home-landing">
        <nav
          className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:h-[4.5rem]">
            <a
              href="#"
              className="flex items-center py-1"
              aria-label="Dromi — inicio"
            >
              <img
                src={DROMI_LOGO_SRC}
                alt=""
                width={260}
                height={72}
                className="h-11 w-auto max-h-[2.75rem] object-contain object-left sm:h-12 sm:max-h-14 md:h-14 md:max-h-[3.75rem]"
                decoding="async"
              />
            </a>

            <div className="hidden items-center gap-8 md:flex">
              {[
                ["#servicios", "Servicios"],
                ["#como-funciona", "Cómo funciona"],
                ["#testimonios", "Clientes"],
                ["#precio", "Precio"],
                ["#faq", "FAQ"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="text-[11px] font-light uppercase tracking-[0.16em] text-slate-500 transition-colors duration-150 hover:text-slate-800"
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-2.5 md:flex">
              <a
                href="https://encuesta.dromi.lat"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost nav-header-login px-4 py-2"
              >
                Iniciar sesión
              </a>
              <a href="#contacto" className="btn-primary px-4 py-2">
                Solicitar más info
              </a>
            </div>

            <button
              type="button"
              className="text-slate-400 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 md:hidden"
              >
                {[
                  ["#servicios", "Servicios"],
                  ["#como-funciona", "Cómo funciona"],
                  ["#testimonios", "Clientes"],
                  ["#precio", "Precio"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[11px] font-light uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-800"
                  >
                    {label}
                  </a>
                ))}
                <a
                  href="https://encuesta.dromi.lat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost nav-header-login mt-2 justify-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Iniciar sesión
                </a>
                <a
                  href="#contacto"
                  className="btn-primary justify-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Solicitar más info
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32 md:pt-36">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(14,165,233,0.08) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mb-7 flex flex-col items-center lowercase"
            >
              <span className="label-tag">
                <Zap className="h-3 w-3" />
                tecnología ia para propiedad horizontal
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.09 }}
              className="mb-6 max-w-4xl mx-auto text-balance font-light"
              style={{
                fontSize: "clamp(40px, 7vw, 78px)",
                letterSpacing: "-0.035em",
                lineHeight: 1.06,
                color: "#0f172a",
              }}
            >
              Asambleas más{" "}
              <span className="font-semibold">ágiles</span>,{" "}
              <span className="font-semibold">transparentes</span> y bien{" "}
              <span className="font-semibold italic text-emerald-500">
                documentadas.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.18 }}
              className="mx-auto mb-10 max-w-lg text-[15px] leading-relaxed text-slate-600 lowercase"
            >
              transcripción con ia, validación especializada y votación digital
              en tiempo real. un profesional de nuestro equipo estará presente
              en tu asamblea para garantizarlo todo.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.27 }}
              className="mb-10 flex flex-col justify-center gap-3 sm:flex-row"
            >
              <a href="#contacto" className="btn-primary px-7 py-3 text-[13px]">
                Solicitar más info <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#como-funciona" className="btn-ghost px-7 py-3 text-[13px]">
                Ver cómo funciona
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.36 }}
              className="flex flex-wrap justify-center gap-5 text-xs text-slate-500"
            >
              {[
                "Sin instalación requerida",
                "Compatible con Ley 675",
                "Presencia física garantizada",
                "Datos cifrados",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-emerald-600" /> {item}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.75,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-10 mx-auto mt-16 max-w-3xl px-6"
          >
            <div
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
              style={{ boxShadow: "0 40px 100px rgba(15,23,42,0.08)" }}
            >
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex gap-1.5">
                  {["#fca5a5", "#fcd34d", "#86efac"].map((c, i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="mx-3 flex h-5 flex-1 items-center rounded border border-slate-200 bg-white px-3">
                  <span className="text-[10px] text-slate-400">
                    encuesta.dromi.lat/2025-06
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Acta en proceso
                    </span>
                  </div>
                  <div className="space-y-3.5">
                    {[
                      { label: "Grabación recibida", done: true, time: "hace 2h" },
                      {
                        label: "Transcripción IA",
                        done: true,
                        time: "hace 1h 20min",
                      },
                      {
                        label: "Validación de contenido",
                        done: true,
                        time: "hace 40min",
                      },
                      { label: "Redacción del acta", done: false, time: "en curso…" },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white"
                          >
                            {step.done ? (
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ) : (
                              <div
                                className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-900"
                              />
                            )}
                          </div>
                          <span
                            className={`text-xs ${step.done ? "text-slate-500" : "font-medium text-slate-800"}`}
                          >
                            {step.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{step.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-slate-200/80 pt-3.5">
                    <p className="text-[11px] text-slate-500">
                      Entrega estimada:{" "}
                      <span className="font-medium text-slate-700">
                        3 días hábiles
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <Vote className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Votación activa
                    </span>
                  </div>
                  <p className="mb-5 text-xs font-medium text-slate-900">
                    ¿Aprobar presupuesto de mantenimiento $45M COP?
                  </p>
                  <div className="mb-4 space-y-3">
                    {[
                      { label: "A favor", pct: 72, votes: "18 votos" },
                      { label: "En contra", pct: 20, votes: "5 votos" },
                      { label: "Abstención", pct: 8, votes: "2 votos" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex justify-between text-[11px]">
                          <span className="text-slate-600">{row.label}</span>
                          <span className="text-slate-500">
                            {row.pct}% · {row.votes}
                          </span>
                        </div>
                        <div className="h-[3px] overflow-hidden rounded-full bg-slate-200">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${row.pct}%` }}
                            transition={{
                              duration: 1,
                              delay: 0.6 + row.pct * 0.005,
                              ease: "easeOut",
                            }}
                            className={`h-full rounded-full ${voteOptionBarClass(row.label)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Quórum: 25/34 unidades · 73.5% coeficiente
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="border-y border-slate-200 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6 py-4 text-xs text-slate-500">
            {["Barranquilla", "Cartagena", "Santa Marta"].map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {c}
              </span>
            ))}
            <span className="text-slate-300">—</span>
            <span>Ley 675 de 2001</span>
            <span className="text-slate-300">—</span>
            <span>Presencia física en cada asamblea</span>
          </div>
        </div>

        <AnimatedSection id="servicios" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mb-14"
            >
              <span className="label-tag">Nuestros paquetes</span>
              <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <h2
                  className="leading-[1.1]"
                  style={{
                    fontSize: "clamp(30px, 4.5vw, 50px)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: "#0f172a",
                  }}
                >
                  Dos soluciones,
                  <br />
                  <span className="text-slate-500">un solo objetivo.</span>
                </h2>
                <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                  Incluyen presencia física de un especialista. Contrátalos juntos
                  o por separado.
                </p>
              </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
                className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <span className="label-tag">Paquete 01</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
                    Grabación y Redacción de Actas
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Un miembro de nuestro equipo asiste presencialmente a tu
                    asamblea, realiza la grabación y gestiona el proceso
                    completo. La IA transcribe, valida y redacta el acta oficial.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Flujo del proceso
                  </p>
                  <div className="flex items-center gap-1.5">
                    {[
                      { icon: Mic, label: "Grabación" },
                      { icon: Pencil, label: "Transcripción IA" },
                      { icon: ClipboardCheck, label: "Validación" },
                      { icon: FileText, label: "Acta PDF" },
                    ].map((step, i, arr) => (
                      <div key={step.label} className="flex flex-1 items-center gap-1.5">
                        <div className="flex flex-1 flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
                            <step.icon className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="w-full text-center text-[9px] leading-tight text-slate-500">
                            {step.label}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="h-px w-3 flex-shrink-0 bg-slate-200" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Especialista presente en tu asamblea",
                    "Grabación de audio profesional",
                    "Transcripción y estructuración con IA",
                    "Validación y revisión",
                    "Acta en PDF en máximo 3 días hábiles",
                    "Cumplimiento con Ley 675 de 2001",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] text-slate-600"
                    >
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Entrega en 3 días hábiles
                  </span>
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
                className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <Vote className="h-5 w-5 text-slate-600" />
                  </div>
                  <span className="label-tag">Paquete 02</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
                    Votaciones Digitales en Tiempo Real
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    El mismo especialista opera el sistema de votaciones durante
                    la                     asamblea. Los copropietarios votan desde su celular y los
                    resultados se muestran al instante según los votantes.
                  </p>
                </div>
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Vista en tiempo real
                  </p>
                  {[
                    { label: "A favor", pct: 72 },
                    { label: "En contra", pct: 20 },
                    { label: "Abstención", pct: 8 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div
                        className="mb-1 flex justify-between text-[11px] text-slate-500"
                      >
                        <span>{row.label}</span>
                        <span>{row.pct}%</span>
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${voteOptionBarClass(row.label)}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="space-y-2.5">
                  {[
                    "Especialista opera el sistema en la asamblea",
                    "Votación desde cualquier celular, sin app",
                    "Cálculo automático por votantes",
                    "Resultados en pantalla al instante",
                    "Historial y trazabilidad completa",
                    "Exportación de resultados para adjuntar al acta",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] text-slate-600"
                    >
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <Zap className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Resultado visible al instante
                  </span>
                </div>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mt-4 flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <UserCheck className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-900">
                  Presencia física en cada asamblea, siempre.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Un profesional de Dromi asiste presencialmente para manejar
                  la grabación y las votaciones. No dependes de que alguien en tu
                  copropiedad sepa usar la tecnología — nosotros nos encargamos
                  de todo.
                </p>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="como-funciona"
          className="border-t border-slate-200 py-24"
        >
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mb-14"
            >
              <span className="label-tag">Proceso</span>
              <h2
                className="mt-5"
                style={{
                  fontSize: "clamp(28px, 4vw, 46px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                }}
              >
                Así funciona cada paquete
              </h2>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-8 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Paquete 01 · Grabación y Actas
                  </span>
                </div>
                <div className="space-y-7">
                  <ProcessStep
                    num="01"
                    title="El especialista llega a tu asamblea"
                    desc="Un miembro del equipo asiste presencialmente, coordina con el administrador e instala el equipo de grabación antes de iniciar."
                  />
                  <ProcessStep
                    num="02"
                    title="Grabación profesional del audio"
                    desc="Durante toda la sesión garantizamos que cada intervención quede capturada con claridad, sin importar el tamaño del salón."
                  />
                  <ProcessStep
                    num="03"
                    title="La IA transcribe y estructura"
                    desc="El audio se procesa con nuestro modelo de IA. Identifica intervenciones, puntos del orden del día y decisiones tomadas."
                  />
                  <ProcessStep
                    num="04"
                    title="Validación y entrega del acta"
                    desc="Un revisor especializado verifica el contenido. En un máximo de 3 días hábiles recibes el acta oficial en PDF, lista para firmar."
                  />
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-8 flex items-center gap-2">
                  <Vote className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Paquete 02 · Votaciones Digitales
                  </span>
                </div>
                <div className="space-y-7">
                  <ProcessStep
                    num="01"
                    title="Configuración previa a la asamblea"
                    desc="Registramos el censo de copropietarios y cargamos el orden del día con los puntos a votar."
                  />
                  <ProcessStep
                    num="02"
                    title="Copropietarios se conectan al llegar"
                    desc="Cada asistente accede desde su celular con un código único para votar. Sin descarga de app, sin registro previo."
                  />
                  <ProcessStep
                    num="03"
                    title="El especialista activa cada votación"
                    desc="En cada punto de decisión, el especialista abre la votación en pantalla. Los resultados ponderados aparecen en segundos."
                  />
                  <ProcessStep
                    num="04"
                    title="Exportación automática de resultados"
                    desc="Todas las votaciones quedan registradas con fecha, hora y participantes, listas para incluirse en el acta oficial."
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection
          id="testimonios"
          className="overflow-hidden border-t border-slate-200 py-24"
        >
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
            >
              <span className="label-tag">Clientes</span>
              <h2
                className="mt-5"
                style={{
                  fontSize: "clamp(28px, 4vw, 46px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                }}
              >
                Lo que dicen{" "}
                <span className="text-slate-400">quienes ya lo vivieron.</span>
              </h2>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {testimonioFotos.map((foto) => (
                <div
                  key={foto.src}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={foto.src}
                      alt={foto.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
            <p
              className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-slate-500"
            >
              Asambleas reales: acompañamiento en sitio, proyección y participación
              de la comunidad.
            </p>
          </div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewOnce}
            className="mt-12"
          >
            <InfiniteCarousel />
          </motion.div>
        </AnimatedSection>

        <AnimatedSection
          id="precio"
          className="border-t border-slate-200 py-24"
        >
          <div className="mx-auto max-w-4xl px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mb-14 text-center"
            >
              <span className="label-tag">Precio</span>
              <h2
                className="mb-4 mt-5"
                style={{
                  fontSize: "clamp(28px, 4vw, 46px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                }}
              >
                Un precio. Todo incluido.
              </h2>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">
                Sin planes ni niveles. Un valor fijo por asamblea que incluye
                ambos paquetes y la presencia de nuestro especialista.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 shadow-sm md:p-14"
            >
              <div className="mb-10 text-center">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Valor del servicio
                </p>
                <div className="mb-2 flex items-start justify-center gap-1.5">
                  <span className="mt-4 text-lg font-semibold text-slate-500">
                    COP
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(56px, 10vw, 80px)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "#0f172a",
                    }}
                  >
                    1.950.000
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  sin importar el número de copropietarios ni de asistentes
                </p>
              </div>

              <div className="mb-8 border-t border-slate-100" />

              <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Qué incluye
              </p>
              <ul className="mb-10 space-y-3">
                {[
                  "Especialista presencial durante toda la asamblea",
                  "Grabación y gestión del audio completo",
                  "Transcripción con IA de toda la sesión",
                  "Validación y revisión",
                  "Incluye dos fechas, en caso de que la primera fecha no llegue a quórum",
                  "Acta oficial en PDF en 3 días hábiles",
                  "Sistema de votaciones digitales en tiempo real",
                  "Cálculo automático por votantes",
                  "Exportación de resultados para adjuntar al acta",
                  "Cumplimiento con Ley 675 de 2001",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[13px] text-slate-600"
                  >
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className="btn-primary w-full justify-center py-3.5 text-[13px]"
              >
                Agendar para mi próxima asamblea{" "}
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-4 text-center text-xs text-slate-400">
                Aplica en Barranquilla, Cartagena y Santa Marta · Otras ciudades
                consultar
              </p>
            </motion.div>
          </div>
        </AnimatedSection>

        <AnimatedSection id="faq" className="border-t border-slate-200 py-24">
          <div className="mx-auto max-w-2xl px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
              className="mb-12"
            >
              <span className="label-tag">FAQ</span>
              <h2
                className="mt-5"
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                }}
              >
                Preguntas frecuentes
              </h2>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewOnce}
            >
              {faqs.map((faq) => (
                <FAQItem key={faq.q} {...faq} />
              ))}
            </motion.div>
          </div>
        </AnimatedSection>

        <section className="border-t border-slate-200 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Empieza hoy
              </p>
              <h2
                className="mb-6"
                style={{
                  fontSize: "clamp(36px, 6vw, 64px)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  color: "#0f172a",
                  lineHeight: 1.08,
                }}
              >
                Tu próxima asamblea,
                <br />
                <span className="text-slate-400">sin estrés.</span>
              </h2>
              <p className="mx-auto mb-10 max-w-sm text-sm leading-relaxed text-slate-600">
                Escríbenos y te damos toda la información. Sin compromiso.
              </p>
              <div className="flex flex-col items-center justify-center sm:flex-row">
                <a href="#contacto" className="btn-primary px-8 py-3.5 text-[13px]">
                  Solicitar más info{" "}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <AnimatedSection
          id="contacto"
          className="border-t border-slate-200 py-24"
        >
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-2">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
              >
                <span className="label-tag">Contacto</span>
                <h2
                  className="mb-5 mt-5"
                  style={{
                    fontSize: "clamp(26px, 3.5vw, 38px)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: "#0f172a",
                  }}
                >
                  Hablemos sobre tu asamblea
                </h2>
                <p className="mb-10 text-sm leading-relaxed text-slate-600">
                  Cuéntanos el tamaño de tu copropiedad y la fecha estimada de tu
                  próxima asamblea. Te damos toda la información sin compromiso.
                </p>
                <div className="space-y-5">
                  {[
                    {
                      icon: Mail,
                      label: "Email",
                      value: CONTACT_LANDING_EMAIL,
                      href: `mailto:${CONTACT_LANDING_EMAIL}`,
                    },
                    {
                      icon: MapPin,
                      label: "Operamos en",
                      value: "Costa Caribe de Colombia",
                    },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <Icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                          {label}
                        </p>
                        {href ? (
                          <a
                            href={href}
                            className="text-sm font-medium text-slate-900 transition-colors hover:text-slate-600"
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-slate-900">
                            {value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewOnce}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <LandingContactForm />
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src={DROMI_LOGO_SRC}
                alt="Dromi"
                width={220}
                height={56}
                className="h-12 w-auto object-contain opacity-90 sm:h-14"
                decoding="async"
              />
            </div>
            <p className="text-xs text-slate-500">
              © 2026 Dromi · Tecnología para Propiedad Horizontal · Colombia
            </p>
            <div className="flex gap-6 text-xs text-slate-500">
              <a href="#" className="transition-colors hover:text-slate-900">
                Privacidad
              </a>
              <a href="#" className="transition-colors hover:text-slate-900">
                Términos
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
