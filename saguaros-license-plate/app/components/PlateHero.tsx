"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function PlateHero() {
  return (
    <motion.div
      className="relative w-full max-w-[760px] mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      <div className="absolute inset-x-[10%] top-[12%] bottom-[8%] rounded-full bg-white/20 blur-[90px]" />
      <div className="absolute inset-x-[18%] bottom-[2%] h-[20%] rounded-full bg-black blur-3xl opacity-90" />

      <motion.div
        className="relative overflow-hidden rounded-[5%]"
        whileHover={{ scale: 1.015, rotateX: -1, rotateY: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        style={{ transformPerspective: 1000 }}
      >
        <Image
          src="/images/4AZKIDS_approved_aug4.png"
          alt="Arizona Blackout Plate by itself in a 3D studio render"
          width={1600}
          height={833}
          sizes="(max-width: 640px) 92vw, 760px"
          priority
          className="w-full h-auto brightness-110 contrast-110 drop-shadow-[0_26px_55px_rgba(0,0,0,0.7)]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
}
