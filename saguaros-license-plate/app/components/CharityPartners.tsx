"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import FadeIn from "./FadeIn";
import { useLanguage } from "@/lib/LanguageContext";
import type { TranslationKey } from "@/lib/translations";

const CHARITY_CATEGORY_KEYS: TranslationKey[] = [
  "charityCategoryFoster",
  "charityCategoryPediatric",
  "charityCategoryEducation",
  "charityCategoryHunger",
  "charityCategoryMental",
  "charityCategorySpecial",
  "charityCategoryAfterSchool",
  "charityCategoryHomeless",
  "charityCategoryAbuse",
  "charityCategoryMentorship",
  "charityCategoryEarly",
  "charityCategorySports",
];

export default function CharityPartners() {
  const { t } = useLanguage();

  const categories = CHARITY_CATEGORY_KEYS.map((key) => t(key));

  return (
    <section id="charities" className="py-20 sm:py-28 px-6 border-t border-border overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
            {t("charityLabel")}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight max-w-2xl">
            {t("charityHeading1")}
            <br />
            <span className="text-gray">{t("charityHeading2")}</span>
          </h2>
          <p className="mt-6 text-gray max-w-2xl text-sm sm:text-base leading-relaxed">
            {t("charityDescription")}
          </p>
        </FadeIn>

        {/* ─── Scrolling category marquee ─── */}
        <div className="mt-12 relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

          {/* Row 1 — scrolls left */}
          <div className="flex gap-3 mb-3 overflow-hidden">
            <motion.div
              className="flex gap-3 shrink-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              {[...categories, ...categories].map((cat, i) => (
                <div
                  key={`${cat}-${i}`}
                  className="shrink-0 px-5 py-2.5 bg-card border border-border rounded-full text-xs sm:text-sm text-light tracking-wide whitespace-nowrap hover:border-border-light hover:text-pure-white transition-colors"
                >
                  {cat}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Row 2 — scrolls right */}
          <div className="flex gap-3 overflow-hidden">
            <motion.div
              className="flex gap-3 shrink-0"
              animate={{ x: ["-50%", "0%"] }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            >
              {[...categories.slice().reverse(), ...categories.slice().reverse()].map((cat, i) => (
                <div
                  key={`${cat}-rev-${i}`}
                  className="shrink-0 px-5 py-2.5 bg-card border border-border rounded-full text-xs sm:text-sm text-light tracking-wide whitespace-nowrap hover:border-border-light hover:text-pure-white transition-colors"
                >
                  {cat}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ─── CTA to full charity list ─── */}
        <FadeIn delay={0.15}>
          <div className="mt-12 text-center">
            <a
              href="https://www.saguaros.com/charities"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 border border-border-light rounded-full px-8 py-4 hover:border-gray transition-all hover:bg-card"
            >
              <Image
                src="/images/saguaros-logo.png"
                alt="Saguaros"
                width={32}
                height={32}
                className="opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-sm sm:text-base text-light group-hover:text-pure-white transition-colors font-medium">
                {t("charityViewAll")}
              </span>
              <svg
                className="w-4 h-4 text-muted group-hover:text-pure-white group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <p className="mt-4 text-xs text-muted">
              {t("charityFooter")}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
