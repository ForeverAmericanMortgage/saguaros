"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const LAUNCH_DATE = new Date("2026-03-26T00:00:00-07:00"); // Phoenix time

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(): TimeLeft {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="bg-card border border-border-light rounded-lg px-4 py-3 sm:px-6 sm:py-4 min-w-[64px] sm:min-w-[88px] text-center">
          <span className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-pure-white tabular-nums tracking-tight">
            {String(value).padStart(2, "0")}
          </span>
        </div>
        {/* Horizontal split line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-border-light pointer-events-none" />
      </div>
      <span className="mt-2 text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-muted">
        {label}
      </span>
    </div>
  );
}

export default function Countdown() {
  const [time, setTime] = useState<TimeLeft | null>(null);
  const [launched, setLaunched] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const tl = calcTimeLeft();
    if (tl.days === 0 && tl.hours === 0 && tl.minutes === 0 && tl.seconds === 0) {
      setLaunched(true);
    }
    setTime(tl);

    const interval = setInterval(() => {
      const updated = calcTimeLeft();
      setTime(updated);
      if (updated.days === 0 && updated.hours === 0 && updated.minutes === 0 && updated.seconds === 0) {
        setLaunched(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (launched) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl sm:text-4xl font-bold text-pure-white">
          {t("countdownAvailable")}
        </p>
        <a
          href="https://azmvdnow.gov/plates"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block bg-pure-white text-black px-8 py-3 rounded text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors"
        >
          {t("countdownGetPlate")}
        </a>
      </div>
    );
  }

  const labels = [t("countdownDays"), t("countdownHours"), t("countdownMin"), t("countdownSec")];

  if (!time) {
    // SSR / initial render — prevent hydration mismatch
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        {labels.map((label) => (
          <Digit key={label} value={0} label={label} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Digit value={time.days} label={labels[0]} />
      <span className="text-border-light text-2xl sm:text-4xl font-light mt-[-20px]">:</span>
      <Digit value={time.hours} label={labels[1]} />
      <span className="text-border-light text-2xl sm:text-4xl font-light mt-[-20px]">:</span>
      <Digit value={time.minutes} label={labels[2]} />
      <span className="text-border-light text-2xl sm:text-4xl font-light mt-[-20px]">:</span>
      <Digit value={time.seconds} label={labels[3]} />
    </div>
  );
}
