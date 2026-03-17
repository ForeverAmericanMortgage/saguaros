"use client";

import { useEffect, useState } from "react";
import { useLanguage, LanguageToggle } from "@/lib/LanguageContext";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="text-xs font-semibold tracking-[0.3em] uppercase text-pure-white">
          {t("navLogo")}
        </a>

        <div className="hidden sm:flex items-center gap-8">
          <a href="#about" className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors">
            {t("navPlate")}
          </a>
          <a href="#impact" className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors">
            {t("navImpact")}
          </a>
          <LanguageToggle />
          <a
            href="#waitlist"
            className="text-xs tracking-widest uppercase bg-pure-white text-black px-5 py-2 rounded hover:bg-light transition-colors font-semibold"
          >
            {t("navGetNotified")}
          </a>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="sm:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span
            className={`block w-5 h-[2px] bg-pure-white transition-all duration-300 ${
              menuOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-pure-white transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-pure-white transition-all duration-300 ${
              menuOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-300 ${
          menuOpen
            ? "max-h-60 opacity-100 bg-black/95 backdrop-blur-xl border-b border-border"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <a
            href="#about"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors"
          >
            {t("navPlate")}
          </a>
          <a
            href="#impact"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors"
          >
            {t("navImpact")}
          </a>
          <LanguageToggle />
          <a
            href="#waitlist"
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-widest uppercase bg-pure-white text-black px-5 py-2 rounded hover:bg-light transition-colors font-semibold"
          >
            {t("navGetNotified")}
          </a>
        </div>
      </div>
    </nav>
  );
}
