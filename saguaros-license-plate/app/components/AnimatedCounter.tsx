"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

function zeroValue(value: string) {
  const numericMatch = value.match(/[\d,]+/);
  if (!numericMatch) return value;
  const prefix = value.slice(0, value.indexOf(numericMatch[0]));
  const suffix = value.slice(value.indexOf(numericMatch[0]) + numericMatch[0].length);
  return `${prefix}0${suffix}`;
}

/**
 * Animates a number from 0 to its target value when it scrolls into view.
 * Handles formatted strings like "$750K+", "13,000+", "$17", "1987".
 */
export default function AnimatedCounter({
  value,
  className = "",
  useGrouping = true,
  duration = 1500,
  animate: shouldAnimate = false,
}: {
  value: string;
  className?: string;
  useGrouping?: boolean;
  duration?: number;
  animate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(() => zeroValue(value));
  const displayValue = shouldAnimate ? animatedValue : value;

  useEffect(() => {
    if (!shouldAnimate || !isInView) return;
    if (prefersReducedMotion) {
      setAnimatedValue(value);
      return;
    }

    // Extract numeric part from the string
    const numericMatch = value.match(/[\d,]+/);
    if (!numericMatch) return;

    const rawNum = numericMatch[0].replace(/,/g, "");
    const target = parseInt(rawNum, 10);
    if (isNaN(target)) return;

    const prefix = value.slice(0, value.indexOf(numericMatch[0]));
    const suffix = value.slice(value.indexOf(numericMatch[0]) + numericMatch[0].length);

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      const formatted = current.toLocaleString(undefined, { useGrouping });
      setAnimatedValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [shouldAnimate, duration, isInView, value, prefersReducedMotion, useGrouping]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label={value}
    >
      <span aria-hidden="true">{displayValue}</span>
    </motion.div>
  );
}
