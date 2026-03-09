"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Características" },
  { href: "#how-it-works", label: "Cómo Funciona" },
  { href: "#download", label: "Descargar" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/70 shadow-md backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 sm:py-2.5 lg:px-8">
        <a href="#" className="flex items-center" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <Image
            src="/iamge/logo-isotipo-transparent.png"
            alt="Dromi - Rastreo de buses en tiempo real"
            width={80}
            height={80}
            className="h-8 w-auto origin-left scale-125 object-contain sm:scale-150 md:scale-[1.75]"
            priority
          />
        </a>

        <div className="hidden md:flex md:items-center md:gap-6">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm text-[#6B7280] transition-colors hover:text-[#0D1B2A]"
            >
              {link.label}
            </button>
          ))}
          <a
            href="#download"
            onClick={(e) => { e.preventDefault(); scrollTo("#download"); }}
            className="rounded-full bg-[#20B486] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Próximamente
          </a>
        </div>

        <button
          className="md:hidden p-1"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden md:hidden ${isScrolled ? "bg-white/90 backdrop-blur-md" : "bg-white/95 backdrop-blur-sm"}`}
          >
            <div className="flex flex-col gap-3 border-t border-gray-200/50 px-4 py-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left text-[#6B7280] hover:text-[#0D1B2A]"
                >
                  {link.label}
                </button>
              ))}
              <a
                href="#download"
                onClick={(e) => { e.preventDefault(); scrollTo("#download"); }}
                className="rounded-full bg-[#20B486] py-2.5 text-center text-sm font-medium text-white"
              >
                Próximamente
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
