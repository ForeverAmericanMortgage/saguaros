"use client";

import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="text-xs font-semibold tracking-[0.3em] uppercase text-pure-white">
          Blackout Plate
        </a>

        <div className="hidden sm:flex items-center gap-8">
          <a href="#about" className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors">
            The Plate
          </a>
          <a href="#impact" className="text-xs tracking-widest uppercase text-muted hover:text-pure-white transition-colors">
            Impact
          </a>
          <a
            href="#waitlist"
            className="text-xs tracking-widest uppercase bg-pure-white text-black px-5 py-2 rounded hover:bg-light transition-colors font-semibold"
          >
            Get Notified
          </a>
        </div>

        {/* Mobile CTA */}
        <a
          href="#waitlist"
          className="sm:hidden text-xs tracking-widest uppercase bg-pure-white text-black px-4 py-2 rounded hover:bg-light transition-colors font-semibold"
        >
          Get Notified
        </a>
      </div>
    </nav>
  );
}
