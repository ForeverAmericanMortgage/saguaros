"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import PlateHero from "@/components/PlateHero";
import FadeIn from "@/components/FadeIn";
import CharityPartners from "@/components/CharityPartners";
import PlateGallery from "@/components/PlateGallery";
import AnimatedCounter from "@/components/AnimatedCounter";
import StickyWaitlistBar from "@/components/StickyWaitlistBar";
import TrackedOutboundLink from "@/components/TrackedOutboundLink";
import MilestoneToast from "@/components/MilestoneToast";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <>
      <Nav />
      <StickyWaitlistBar />
      <MilestoneToast />

      {/* ─── HERO ─── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-start sm:justify-center text-center px-6 pt-24 sm:pt-20 pb-12 sm:pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#111_0%,#050505_70%)]" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div className="mb-5 sm:mb-8 px-4 py-1.5 border border-border-light rounded-full">
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-muted">
              {t("heroBadge")}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-pure-white leading-[0.95]">
            {t("heroTitle1")}
            <br />
            {t("heroTitle2")}
            <br />
            <span className="font-light text-gray">30K {t("heroTitle3")}</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-gray max-w-2xl leading-relaxed">
            {t("heroSubtitle")}
          </p>

          <div className="mt-6 flex items-center justify-center w-full">
            <TrackedOutboundLink
              href="https://azmvdnow.gov/plates"
              target="_blank"
              rel="noopener noreferrer"
              eventLabel="hero_order_azmvdnow"
              className="w-full sm:w-auto bg-pure-white text-black px-8 py-3.5 rounded text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              {t("orderPrimaryCta")}
            </TrackedOutboundLink>
          </div>
          <p className="mt-3 text-[10px] sm:text-xs tracking-[0.12em] uppercase text-muted">
            {t("heroOrderHint")}
          </p>

          <div className="mt-5 grid grid-cols-3 divide-x divide-border-light border border-border-light rounded-lg bg-card/70 w-full max-w-3xl">
            {[t("trustOfficial"), t("trustPrice"), t("trustTiming")].map((item) => (
              <div
                key={item}
                className="px-2 sm:px-4 py-3 text-[8px] sm:text-[10px] font-medium tracking-[0.08em] uppercase text-light leading-tight sm:whitespace-nowrap"
              >
                {item}
              </div>
            ))}
          </div>

          {/* Plate */}
          <div className="mt-6 sm:mt-8 mb-2 sm:mb-4 w-full">
            <PlateHero />
          </div>

        </div>
      </section>

      {/* ─── COMMUNITY MILESTONE ─── */}
      <section className="px-6 py-8 sm:py-10 border-y border-border bg-card/35">
        <FadeIn>
          <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-muted font-medium">
                {t("milestoneLabel")}
              </p>
              <h2 className="mt-2 font-display text-xl sm:text-3xl font-bold text-pure-white tracking-tight">
                {t("milestoneHeading")}
              </h2>
              <div className="mt-4 max-w-2xl">
                <div className="flex items-center justify-between gap-4 text-[10px] sm:text-xs uppercase tracking-[0.12em]">
                  <span className="font-semibold text-light">{t("milestoneCurrent")}</span>
                  <span className="text-muted">{t("milestoneRemaining")}</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-border-light"
                  role="progressbar"
                  aria-label={t("milestoneProgressLabel")}
                  aria-valuemin={0}
                  aria-valuemax={50000}
                  aria-valuenow={30000}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "60%" }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-pure-white"
                  />
                </div>
              </div>
            </div>
            <TrackedOutboundLink
              href="https://azmvdnow.gov/plates"
              target="_blank"
              rel="noopener noreferrer"
              eventLabel="milestone_25k_cta"
              className="w-full sm:w-auto text-center bg-pure-white text-black px-7 py-3 rounded text-xs font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              {t("milestoneCta")}
            </TrackedOutboundLink>
          </div>
        </FadeIn>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("aboutLabel")}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight max-w-2xl">
              {t("aboutHeading1")}
              <br />
              {t("aboutHeading2")}
              <br />
              <span className="text-gray">{t("aboutHeading3")}</span>
            </h2>
            <p className="mt-6 text-gray max-w-2xl text-sm sm:text-base leading-relaxed">
              {t("aboutDescription")}
            </p>
          </FadeIn>

          {/* Pricing cards with 3D hover */}
          <div className="mt-12 max-w-xl">
            {[
              {
                type: t("aboutStandardTitle"),
                price: t("aboutStandardPrice"),
                desc: t("aboutStandardDesc"),
              },
            ].map(({ type, price, desc }, i) => (
              <FadeIn key={type} delay={i * 0.1}>
                <div
                  className="group bg-card border border-border rounded-xl p-8 hover:border-border-light transition-all duration-300 cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(3deg)_rotateX(-2deg)]">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-3 font-medium">
                      {type}
                    </p>
                    <div className="font-display text-4xl sm:text-5xl font-bold text-pure-white">
                      {price}
                      <span className="text-lg font-normal text-muted">{t("aboutPerYear")}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHARITY PARTNERS ─── */}
      <CharityPartners />

      {/* ─── IMPACT ─── */}
      <section id="impact" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("impactLabel")}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight max-w-2xl">
              {t("impactHeading1")}
              <br />
              <span className="text-gray">{t("impactHeading2")}</span>
            </h2>
            <p className="mt-6 text-gray max-w-2xl text-sm sm:text-base leading-relaxed">
              {t("impactDescription")}
            </p>
          </FadeIn>

          {/* Impact stats — animated counters */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: "1987", label: t("impactYearFounded"), useGrouping: false },
              { value: "$30M", label: t("impactRecentGrants"), useGrouping: false },
              { value: "30+", label: t("impactCharitiesFunded"), useGrouping: true },
            ].map(({ value, label, useGrouping }, i) => (
              <FadeIn key={label} delay={i * 0.08}>
                <div
                  className="group bg-card border border-border rounded-xl p-6 sm:p-8 text-center hover:border-border-light transition-all duration-300 cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(3deg)_rotateX(-2deg)]">
                    <AnimatedCounter
                      value={value}
                      useGrouping={useGrouping}
                      className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-pure-white"
                    />
                    <div className="text-xs text-muted mt-2 tracking-wide">
                      {label}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <PlateGallery />

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("faqLabel")}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
              {t("faqHeading")}
            </h2>
            <p className="mt-4 text-gray text-sm sm:text-base leading-relaxed">
              {t("faqIntro")}
            </p>
          </FadeIn>

          <div className="mt-10 border-y border-border">
            {[
              { question: t("faqCostQuestion"), answer: t("faqCostAnswer") },
              { question: t("faqPersonalQuestion"), answer: t("faqPersonalAnswer") },
              { question: t("faqTimingQuestion"), answer: t("faqTimingAnswer") },
              { question: t("faqCurrentQuestion"), answer: t("faqCurrentAnswer") },
              { question: t("faqImpactQuestion"), answer: t("faqImpactAnswer") },
            ].map(({ question, answer }) => (
              <details key={question} className="group border-b border-border last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-sm sm:text-base font-semibold text-pure-white">
                  {question}
                  <span
                    className="shrink-0 text-xl font-light text-muted transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 pr-10 text-sm sm:text-base leading-relaxed text-gray">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 px-6 border-t border-border text-center">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
            {t("ctaHeading")}
          </h2>
          <p className="mt-4 text-gray max-w-lg mx-auto text-sm sm:text-base">
            {t("ctaDescription")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <TrackedOutboundLink
              href="https://azmvdnow.gov/plates"
              target="_blank"
              rel="noopener noreferrer"
              eventLabel="final_cta_order_plate"
              className="bg-pure-white text-black px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              {t("ctaOrderPlate")}
            </TrackedOutboundLink>
            <p className="text-[10px] sm:text-xs tracking-[0.12em] uppercase text-muted">
              {t("heroOrderHint")}
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/saguaros-logo.png"
              alt="Saguaros"
              width={24}
              height={24}
              className="opacity-50"
            />
            <p className="text-xs text-muted">
              {t("footerTagline")}{" "}
              <a
                href="https://www.saguaros.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray hover:text-pure-white transition-colors"
              >
                Saguaros
              </a>{" "}
              {t("footerInitiative")}
            </p>
          </div>
          <p className="text-xs text-muted">
            {t("footerProceeds")}
          </p>
        </div>
      </footer>
    </>
  );
}
