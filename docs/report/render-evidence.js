/**
 * Turns the captured test output in docs/report/evidence/*.txt into terminal-style
 * PNGs for the report (the text is the real output, unedited apart from trimming).
 *   node docs/report/render-evidence.js
 */
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => readFile(path.join(HERE, 'evidence', f), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (s) =>
  s
    .split('\n')
    .filter((l) => !/^npm notice/.test(l))
    .join('\n')
    .trim();

function colour(line) {
  const e = esc(line);
  if (/✓|passed/.test(line)) return `<span class="ok">${e}</span>`;
  if (/×|failed/.test(line)) return `<span class="bad">${e}</span>`;
  if (/^(Statements|Branches|Functions|Lines)/.test(line)) return `<span class="cov">${e}</span>`;
  if (/^\s*(RUN|Running)/.test(line)) return `<span class="dim">${e}</span>`;
  return e;
}

function page(title, cmd, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font-family:'JetBrains Mono','DejaVu Sans Mono',monospace}
    .win{width:1180px;margin:10px;border-radius:12px;overflow:hidden;background:#0f1424;box-shadow:0 10px 30px rgba(0,0,0,.25)}
    .bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#1b2238;color:#aeb5cc;font:13px system-ui}
    .dot{width:12px;height:12px;border-radius:50%}
    pre{margin:0;padding:16px 20px;color:#e9ecf6;font-size:13.5px;line-height:1.5;white-space:pre-wrap}
    .ok{color:#37c891}.bad{color:#f07a7a}.cov{color:#f2b84b}.dim{color:#848ca8}.cmd{color:#8e9bff}
  </style></head><body><div class="win"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span style="margin-left:10px">${title}</span></div><pre><span class="cmd">$ ${esc(cmd)}</span>\n${body}</pre></div></body></html>`;
}

const server = clean(await read('server-tests.txt'));
const serverSummary = server
  .split('\n')
  .filter((l) => /✓ tests|Test Files|^\s+Tests|Start at|Duration|Statements|Branches|Functions|Lines\s+:|Coverage summary/.test(l))
  .map(colour)
  .join('\n');

const shared = clean(await read('shared-tests.txt'))
  .split('\n')
  .filter((l) => /✓|Test Files|^\s+Tests|Duration/.test(l))
  .map(colour)
  .join('\n');

const client = clean(await read('client-tests.txt'))
  .split('\n')
  .filter((l) => /✓|Test Files|^\s+Tests|Duration/.test(l))
  .map(colour)
  .join('\n');

const e2e = clean(await read('e2e-tests.txt'))
  .split('\n')
  .filter((l) => /✓|✘|passed|failed|Running/.test(l))
  .map(colour)
  .join('\n');

const shots = [
  ['tests-server', page('kosha/server: Vitest + Supertest against MongoDB', 'npm run test:coverage -w server', serverSummary)],
  [
    'tests-unit-client',
    page('kosha/shared + kosha/client: Vitest, React Testing Library', 'npm test -w shared && npm test -w client', `${shared}\n\n${client}`),
  ],
  ['tests-e2e', page('kosha/e2e: Playwright in Google Chrome', 'npm run e2e', e2e)],
];

const browser = await chromium.launch({ channel: 'chrome' });
const p = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
for (const [name, html] of shots) {
  await p.setContent(html);
  await p.locator('.win').screenshot({ path: path.join(HERE, 'images', `${name}.png`) });
  console.log(`  ✓ images/${name}.png`);
}
await browser.close();
