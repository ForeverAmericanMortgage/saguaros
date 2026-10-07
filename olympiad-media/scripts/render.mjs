// Renders the explainer in both shapes, plus poster stills.
// Usage: npm run render            (all)
//        npm run render -- stills  (poster stills only)
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'out');
fs.mkdirSync(out, { recursive: true });
// Remotion downloads its own headless browser by default. Set REMOTION_BROWSER to reuse a local
// chrome-headless-shell instead (cloud sessions ship Playwright's under /opt/pw-browsers).
const localShell = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browserExecutable = process.env.REMOTION_BROWSER || (fs.existsSync(localShell) ? localShell : null);
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
const stillsOnly = process.argv.includes('stills');
const frames = (process.env.FRAMES || '60,200,300,470,540,690,800,960').split(',').map(Number);

for (const id of ['Explainer-16x9', 'Explainer-9x16']) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const frame of frames) {
    await renderStill({ composition, serveUrl, frame, output: path.join(out, `${id}-f${frame}.png`), browserExecutable });
  }
  if (!stillsOnly) {
    await renderMedia({
      composition, serveUrl, codec: 'h264', crf: 18, audioBitrate: '192k', pixelFormat: 'yuv420p',
      outputLocation: path.join(out, `olympiad-explainer-${id.split('-')[1]}.mp4`), browserExecutable,
      onProgress: ({ progress }) => process.stdout.write(`\r${id} ${Math.round(progress * 100)}%`),
    });
    process.stdout.write('\n');
  }
}
console.log('done ->', out);
