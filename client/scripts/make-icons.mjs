/**
 * Redraws the app icons from the same drawing as the logo (public/favicon.svg), using the system Chrome:
 *   npm run icons -w client
 * "any" icons have rounded corners on a transparent background; the maskable icon and the Apple touch icon are full
 * bleed (the phone cuts the shape) with the mark kept inside the safe area.
 */
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const svg = readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8');
const tile = /<rect width="64" height="64"[^>]*fill="([^"]+)"/.exec(svg)[1];
const mark = svg.replace(/<rect width="64" height="64"[^>]*\/>/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '');

const page = (size, { rounded, inset }) => `<!doctype html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" ${rounded ? 'rx="15"' : ''} fill="${tile}"/>
  <g transform="translate(${32 - 32 * inset} ${32 - 32 * inset}) scale(${inset})">${mark}</g>
</svg></body>`;

const jobs = [
  { file: 'icons/icon-192.png', size: 192, rounded: true, inset: 1 },
  { file: 'icons/icon-512.png', size: 512, rounded: true, inset: 1 },
  { file: 'icons/icon-maskable-512.png', size: 512, rounded: false, inset: 0.72 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, inset: 0.8 },
];

mkdirSync(path.join(PUBLIC, 'icons'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const { file, size, rounded, inset } of jobs) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(page(size, { rounded, inset }));
  await p.screenshot({ path: path.join(PUBLIC, file), omitBackground: true });
  await p.close();
  console.log(`  ✓ public/${file}`);
}
await browser.close();
