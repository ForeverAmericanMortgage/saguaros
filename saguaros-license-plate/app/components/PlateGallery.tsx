"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import FadeIn from "./FadeIn";
import { useLanguage } from "@/lib/LanguageContext";

const GALLERY_IMAGES = [
  {
    src: "/images/real-plate-truck.png",
    alt: "Blackout Plate mounted on a black Ford truck",
    captionKey: "galleryCaption1" as const,
  },
  {
    src: "/images/real-plate-black-ferrari.png",
    alt: "Blackout Plate mounted on a matte black Ferrari",
    captionKey: "galleryCaption2" as const,
  },
  {
    src: "/images/real-plate-white-mercedes.png",
    alt: "Blackout Plate mounted on a white Mercedes convertible",
    captionKey: "galleryCaption3" as const,
  },
  {
    src: "/images/real-plate-porsche.png",
    alt: "Blackout Plate mounted on a gray Porsche 911",
    captionKey: "galleryCaption4" as const,
  },
  {
    src: "/images/real-plate-handheld-red-car.png",
    alt: "Blackout Plate held beside a red sports car",
    captionKey: "galleryCaption5" as const,
  },
];

export default function PlateGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const { t } = useLanguage();

  // Parallax: gallery slides slightly left as you scroll
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  return (
    <section className="py-20 sm:py-28 border-t border-border overflow-hidden" ref={containerRef}>
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <FadeIn>
          <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted mb-4 font-medium">
            {t("galleryLabel")}
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-pure-white tracking-tight">
            {t("galleryHeading")}
          </h2>
        </FadeIn>
      </div>

      {/* ─── Horizontal scroll gallery with parallax ─── */}
      <motion.div className="flex gap-4 px-6" style={{ x }}>
        {GALLERY_IMAGES.map((img, i) => (
          <FadeIn key={img.src} delay={i * 0.1}>
            <div className="group relative shrink-0 w-[260px] sm:w-[320px] lg:w-[360px]">
              <div
                className="relative h-[360px] sm:h-[460px] overflow-hidden rounded-xl border border-border group-hover:border-border-light transition-colors"
                style={{
                  perspective: "800px",
                }}
              >
                <motion.div
                  whileHover={{
                    rotateY: 5,
                    rotateX: -3,
                    scale: 1.02,
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 640px) 260px, (max-width: 1024px) 320px, 360px"
                    className="object-cover"
                  />
                </motion.div>

                {/* Hover shine sweep */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                </div>
              </div>

              <p className="mt-3 text-xs tracking-[0.2em] uppercase text-muted text-center group-hover:text-gray transition-colors">
                {t(img.captionKey)}
              </p>
            </div>
          </FadeIn>
        ))}
      </motion.div>
    </section>
  );
}
