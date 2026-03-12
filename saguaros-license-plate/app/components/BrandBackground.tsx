"use client";

import { motion } from "framer-motion";

/**
 * Subtle Saguaros brand background — repeating logo pattern + gradient accent.
 *
 * Usage:
 *   <BrandBackground />              — full-page fixed background
 *   <BrandBackground section />      — section-scoped, relative
 */
export default function BrandBackground({ section = false }: { section?: boolean }) {
  return (
    <div
      className={`${
        section ? "absolute" : "fixed"
      } inset-0 pointer-events-none overflow-hidden`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ─── Repeating Saguaros logo pattern ─── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("/images/saguaros-logo.png")`,
          backgroundSize: "80px 80px",
          backgroundRepeat: "repeat",
          opacity: 0.02,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        }}
      />

      {/* ─── Large watermark logo — centered, very subtle ─── */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.025]"
        animate={{ rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: `url("/images/saguaros-logo.png")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      {/* ─── Radial gradient accent — subtle brand warmth ─── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
