"use client";

import Image from "next/image";
import Nav from "@/components/Nav";
import PlateHero from "@/components/PlateHero";
import Countdown from "@/components/Countdown";
import WaitlistForm from "@/components/WaitlistForm";
import FadeIn from "@/components/FadeIn";
import CharityPartners from "@/components/CharityPartners";
import PlateGallery from "@/components/PlateGallery";
import AnimatedCounter from "@/components/AnimatedCounter";
import StickyWaitlistBar from "@/components/StickyWaitlistBar";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <>
      <Nav />
      <StickyWaitlistBar />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden">
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
          <div className="mb-8 px-4 py-1.5 border border-border-light rounded-full">
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-muted">
              {t("heroBadge")}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-pure-white leading-[0.95]">
            {t("heroTitle1")}
            <br />
            {t("heroTitle2")}
            <br />
            <span className="font-light text-gray">{t("heroTitle3")}</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray max-w-xl leading-relaxed">
            {t("heroSubtitle")}
          </p>

          {/* Plate */}
          <div className="mt-10 mb-12 w-full">
            <PlateHero />
          </div>

          {/* Countdown */}
          <div className="mb-6">
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("heroLaunchLabel")}
            </p>
            <Countdown />
          </div>

          {/* Stats — animated counters */}
          <div className="mt-10 flex flex-wrap justify-center gap-10 sm:gap-16">
            {[
              { value: "30+", label: t("statCharities") },
              { value: "$17", label: t("statPerPlate") },
              { value: "13,000+", label: t("statShares") },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <AnimatedCounter
                  value={value}
                  className="font-display text-2xl sm:text-3xl font-bold text-pure-white"
                />
                <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-muted mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("waitlistLabel")}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
              {t("waitlistHeading")}
            </h2>
            <p className="mt-4 text-gray max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
              {t("waitlistDescription")}
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8">
              <WaitlistForm />
            </div>
          </FadeIn>
        </div>
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
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {[
              {
                type: t("aboutStandardTitle"),
                price: t("aboutStandardPrice"),
                desc: t("aboutStandardDesc"),
              },
              {
                type: t("aboutVanityTitle"),
                price: t("aboutVanityPrice"),
                desc: t("aboutVanityDesc"),
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

      {/* ─── GALLERY ─── */}
      <PlateGallery />

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 sm:py-28 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
              {t("howLabel")}
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
              {t("howHeading")}
            </h2>
          </FadeIn>

          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            {[
              {
                num: "01",
                title: t("howStep1Title"),
                desc: t("howStep1Desc"),
              },
              {
                num: "02",
                title: t("howStep2Title"),
                desc: t("howStep2Desc"),
              },
              {
                num: "03",
                title: t("howStep3Title"),
                desc: t("howStep3Desc"),
              },
            ].map(({ num, title, desc }, i) => (
              <FadeIn key={num} delay={i * 0.1}>
                <div
                  className="group bg-card border border-border rounded-xl p-8 text-center hover:border-border-light transition-all duration-300 h-full cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(4deg)_rotateX(-2deg)_translateZ(10px)]">
                    <div className="font-display text-4xl font-bold text-border-light mb-4 group-hover:text-muted transition-colors">
                      {num}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-pure-white mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray leading-relaxed">{desc}</p>
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
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: "1987", label: t("impactYearFounded") },
              { value: "$750,000+", label: t("impactRecentGrants") },
              { value: "30+", label: t("impactCharitiesFunded") },
              { value: "$17", label: t("impactPerPlateYear") },
            ].map(({ value, label }, i) => (
              <FadeIn key={label} delay={i * 0.08}>
                <div
                  className="group bg-card border border-border rounded-xl p-6 sm:p-8 text-center hover:border-border-light transition-all duration-300 cursor-default"
                  style={{ perspective: "600px" }}
                >
                  <div className="transition-transform duration-300 group-hover:[transform:rotateY(3deg)_rotateX(-2deg)]">
                    <AnimatedCounter
                      value={value}
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

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 px-6 border-t border-border text-center">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
            {t("ctaHeading")}
          </h2>
          <p className="mt-4 text-gray max-w-lg mx-auto text-sm sm:text-base">
            {t("ctaDescription")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#waitlist"
              className="bg-pure-white text-black px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              {t("ctaJoinWaitlist")}
            </a>
            <a
              href="https://azmvdnow.gov/plates"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border-light text-light px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:border-gray hover:text-pure-white transition-colors"
            >
              AZMVDNow.gov
            </a>
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
