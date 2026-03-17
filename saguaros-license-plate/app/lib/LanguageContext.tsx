"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, type Locale, type TranslationKey } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "en" || saved === "es") {
      setLocale(saved);
    }
  }, []);

  // Persist + update html lang attribute
  useEffect(() => {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/**
 * Compact EN/ES toggle for the nav bar.
 * Styled to match the existing nav aesthetic.
 */
export function LanguageToggle() {
  const { locale, toggleLocale } = useLanguage();

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase font-medium border border-border-light rounded-full px-3 py-1.5 hover:border-gray transition-colors"
      aria-label={locale === "en" ? "Cambiar a español" : "Switch to English"}
    >
      <span className={locale === "en" ? "text-pure-white" : "text-muted"}>
        EN
      </span>
      <span className="text-border-light">/</span>
      <span className={locale === "es" ? "text-pure-white" : "text-muted"}>
        ES
      </span>
    </button>
  );
}
