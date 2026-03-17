"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Subtle Saguaros brand background — barely-there logo pattern + gradient accent.
 */
export default function BrandBackground({ section = false }: { section?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div
      className={`${
        section ? "absolute" : "fixed"
      } inset-0 pointer-events-none overflow-hidden`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ─── Repeating Saguaros logo pattern — very faint ─── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("/images/saguaros-logo.png")`,
          backgroundSize: "120px 120px",
          backgroundRepeat: "repeat",
          opacity: 0.008,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />

      {/* ─── Large watermark logo — centered, ghost-level subtle ─── */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.012]"
        animate={shouldReduceMotion ? {} : { rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: `url("/images/saguaros-logo.png")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      {/* ─── Radial gradient accent ─── */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
