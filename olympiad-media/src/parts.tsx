import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, sans } from './theme';

export function useLayout() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  // One design unit = 1px at 1920 wide (landscape) or 1080 wide (vertical).
  const u = vertical ? width / 1080 : width / 1920;
  return { vertical, u, width, height };
}

/** Fade and rise in on a spring, starting at frame `at` (relative to the sequence). */
export function Reveal({ at, children, y = 40, style }: { at: number; children: React.ReactNode; y?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 200, mass: 0.7 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
}

/** A hand-drawn chalk stroke that draws itself from frame `at` over `dur` frames. */
export function Chalk({ d, at, dur = 18, width = 6, color = C.chalk, viewBox, style }: { d: string; at: number; dur?: number; width?: number; color?: string; viewBox: string; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <svg viewBox={viewBox} style={{ overflow: 'visible', ...style }} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </svg>
  );
}

/** Rolls a number from 0 to `to` between frames `from` and `until`. */
export function useCount(to: number, from: number, until: number) {
  const frame = useCurrentFrame();
  return Math.round(interpolate(frame, [from, until], [0, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
}

export function Eyebrow({ children, color = C.green, size = 22 }: { children: React.ReactNode; color?: string; size?: number }) {
  const { u } = useLayout();
  return <div style={{ fontFamily: sans, fontWeight: 700, fontSize: size * u, letterSpacing: 0.22 * size * u, color, textTransform: 'uppercase' }}>{children}</div>;
}

/** Field-line wipe between scenes: a green panel with white yard lines sweeps across. */
export function FieldWipe({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame - at;
  if (t < -10 || t > 10) return null;
  const x = interpolate(t, [-10, 0, 10], [-1.15, 0, 1.15], { easing: Easing.inOut(Easing.cubic) }) * width;
  const lines = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${x}px) skewX(-8deg)`, background: C.green, width: '115%', left: '-7.5%' }}>
      {lines.map(i => <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${8 + i * 17}%`, width: 6, background: C.chalk, opacity: 0.85 }} />)}
    </div>
  );
}

// Simple line icons, drawn to match the site's arrow-and-outline style.
const icon = (paths: React.ReactNode) => ({ size, color = C.chalk }: { size: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);
export const CupIcon = icon(<><path d="M20 10h24v14a12 12 0 0 1-24 0z" /><path d="M20 15h-7a7 7 0 0 0 9 9M44 15h7a7 7 0 0 1-9 9" /><path d="M32 36v10M24 54h16M26 54l2-8h8l2 8" /></>);
export const MedalIcon = icon(<><path d="M22 6l10 18 10-18" /><path d="M16 6h12M36 6h12" /><circle cx="32" cy="40" r="14" /><path d="M32 33l2.6 5.2 5.7.8-4.1 4 1 5.7L32 46l-5.2 2.7 1-5.7-4.1-4 5.7-.8z" /></>);
export const ClipboardIcon = icon(<><rect x="14" y="10" width="36" height="46" rx="4" /><path d="M24 10v-2a8 8 0 0 1 16 0v2" /><path d="M23 34l6 6 12-13" /></>);
export const PeopleIcon = icon(<><circle cx="22" cy="22" r="7" /><circle cx="42" cy="22" r="7" /><path d="M8 50c2-9 8-13 14-13s12 4 14 13M28 50c2-9 8-13 14-13s12 4 14 13" /></>);
export const HeartIcon = icon(<><path d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z" /><path d="M32 24v14M27 29h10" /></>);
export const HoopIcon = icon(<><rect x="12" y="8" width="40" height="22" rx="2" /><path d="M22 30h20l-4 18H26z" /><path d="M24 36h16M25 42h14" /></>);
export const BoardIcon = icon(<><path d="M18 54L24 10h16l6 44z" /><circle cx="32" cy="22" r="5" /></>);
export const BallIcon = icon(<><circle cx="32" cy="32" r="20" /><path d="M12 32h40M32 12c-8 6-8 34 0 40M32 12c8 6 8 34 0 40" /></>);
