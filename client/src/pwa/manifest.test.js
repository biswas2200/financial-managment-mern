import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const PUBLIC = path.resolve(__dirname, '../../public');
const manifest = JSON.parse(readFileSync(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

describe('web app manifest', () => {
  it('describes an installable standalone app', () => {
    expect(manifest.name).toBe('Kosha: personal finance');
    expect(manifest.short_name).toBe('Kosha');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('ships 192 px and 512 px icons, including a maskable one, that exist on disk', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) expect(existsSync(path.join(PUBLIC, icon.src))).toBe(true);
  });

  it('offers shortcuts for the two most common actions', () => {
    const urls = manifest.shortcuts.map((s) => s.url);
    expect(urls).toContain('/?add=expense');
    expect(urls).toContain('/?add=income');
  });

  it('is linked from index.html with an Apple touch icon', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(existsSync(path.join(PUBLIC, 'apple-touch-icon.png'))).toBe(true);
  });
});
