"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Sticky bottom bar on mobile — appears after scrolling past the hero.
 * Compact CTA to drive waitlist signups without scrolling back up.
 */
export default function StickyWaitlistBar() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past ~80% of viewport height
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
        >
          <div className="bg-black/95 backdrop-blur-xl border-t border-border-light px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted truncate">
                {t("stickyLaunch")}
              </p>
            </div>
            <a
              href="#waitlist"
              className="shrink-0 bg-pure-white text-black px-5 py-2.5 rounded text-xs font-semibold tracking-wide uppercase hover:bg-light transition-colors"
            >
              {t("stickyJoin")}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
