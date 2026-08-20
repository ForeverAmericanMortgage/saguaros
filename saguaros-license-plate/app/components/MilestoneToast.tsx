"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";

const SESSION_KEY = "blackplate-milestone-july-2026-seen";

export default function MilestoneToast() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    const showTimer = window.setTimeout(() => setVisible(true), 1400);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      window.sessionStorage.setItem(SESSION_KEY, "true");
    }, 9000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  function dismiss() {
    window.sessionStorage.setItem(SESSION_KEY, "true");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="fixed left-4 right-4 bottom-20 sm:left-6 sm:right-auto sm:bottom-6 z-50 sm:w-[360px] rounded-xl border border-border-light bg-black/95 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pure-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold tracking-[0.22em] uppercase text-muted">
                {t("toastLabel")}
              </p>
              <p className="mt-1 text-sm font-semibold text-pure-white">
                {t("toastText")}
              </p>
              <p className="mt-1 text-[10px] tracking-wide text-gray">
                {t("toastDate")}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("toastDismiss")}
              className="shrink-0 text-lg leading-none text-muted transition-colors hover:text-pure-white"
            >
              ×
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
