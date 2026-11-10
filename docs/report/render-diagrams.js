/**
 * Renders the report diagrams (docs/report/diagrams/index.html) to PNG at 2x.
 *   node docs/report/render-diagrams.js
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'images');
const IDS = ['architecture', 'er', 'agent', 'request', 'tdd'];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(HERE, 'diagrams/index.html')).href);
await page.waitForSelector('body[data-ready="true"]');
for (const id of IDS) {
  await page.locator(`#${id}`).screenshot({ path: path.join(OUT, `diagram-${id}.png`) });
  console.log(`  ✓ images/diagram-${id}.png`);
}
await browser.close();
