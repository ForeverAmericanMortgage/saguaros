"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";

// R3F Canvas must be client-only — dynamic import with ssr: false
const PlateScene = dynamic(() => import("./PlateScene"), {
  ssr: false,
  loading: () => (
    <Image
      src="/images/4AZKIDS_white.png"
      alt="Arizona Blackout Plate — 4AZKIDS"
      width={700}
      height={358}
      sizes="(max-width: 768px) 100vw, 700px"
      priority
      className="w-full h-auto opacity-50"
    />
  ),
});

export default function PlateHero() {
  return (
    <motion.div
      className="relative w-full max-w-[700px] mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      {/* Glow effect behind the plate */}
      <div className="absolute inset-0 blur-[100px] opacity-15 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-full scale-125" />

      {/* 3D Scene — scroll-reactive with fog */}
      <div className="relative aspect-[7/4] w-full">
        <PlateScene />
      </div>
    </motion.div>
  );
}
