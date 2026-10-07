import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Fonts are bundled in public/fonts (SIL Open Font License) so renders never depend on the network.
export const sans = 'Poppins';
export const serif = 'Cormorant Garamond';
for (const weight of ['400', '500', '600', '700', '800']) {
  loadFont({ family: sans, url: staticFile(`fonts/poppins-${weight}.woff2`), weight, style: 'normal' });
}
for (const weight of ['500', '600']) {
  loadFont({ family: serif, url: staticFile('fonts/cormorant-italic.woff2'), weight, style: 'italic' });
}

// Same palette as scottsdaleolympiad.com (olympiad.module.css).
export const C = {
  navy: '#1e2b46',
  ink: '#14201c',
  green: '#286747',
  deep: '#173f35',
  gold: '#f4c24d',
  cream: '#f5f3ed',
  mint: '#66aa81',
  chalk: '#f7f5ed',
  grey: '#4f5b53',
};

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

// Scene boundaries, in seconds, matched to the voiceover word timings.
export const SCENES = {
  open: [0, 5.0],
  what: [5.0, 11.1],
  impact: [11.1, 18.5],
  how: [18.5, 24.5],
  close: [24.5, 33.0],
} as const;
export const TOTAL = 33.0;
