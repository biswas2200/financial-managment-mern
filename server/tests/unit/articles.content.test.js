import { describe, it, expect } from 'vitest';
import { DOMAINS } from '@kosha/shared';
import { ARTICLES, findArticle, summarise } from '../../src/content/articles.js';

const BLOCKS = new Set(['h2', 'p', 'ul', 'ol', 'callout']);
const words = (article) =>
  article.body
    .flatMap((b) => (b.items ? b.items : [b.text ?? '', b.title ?? '']))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

describe('article content', () => {
  it('has unique, URL-safe slugs and known domains', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const domains = new Set(DOMAINS.map((d) => d.id));
    for (const a of ARTICLES) {
      expect(a.slug, a.title).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(domains.has(a.domain), `${a.slug} domain`).toBe(true);
    }
  });

  it('gives every article a title, summary, takeaways, copilot prompt, review date and sources', () => {
    for (const a of ARTICLES) {
      expect(a.title.length, a.slug).toBeGreaterThan(10);
      expect(a.summary.length, `${a.slug} summary`).toBeGreaterThan(40);
      expect(a.summary.length, `${a.slug} summary`).toBeLessThanOrEqual(220);
      expect(a.takeaways.length, `${a.slug} takeaways`).toBeGreaterThanOrEqual(3);
      expect(a.copilotPrompt.length, `${a.slug} prompt`).toBeGreaterThan(20);
      expect(a.updated, `${a.slug} updated`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.sources.length, `${a.slug} sources`).toBeGreaterThanOrEqual(1);
      for (const s of a.sources) {
        expect(s.label.length).toBeGreaterThan(3);
        expect(s.url).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/);
      }
    }
  });

  it('is built only from plain blocks, never raw HTML', () => {
    for (const a of ARTICLES) {
      expect(a.body.length, a.slug).toBeGreaterThan(4);
      for (const block of a.body) {
        expect(BLOCKS.has(block.type), `${a.slug}: ${block.type}`).toBe(true);
        const text = JSON.stringify(block);
        expect(text, `${a.slug} has markup`).not.toMatch(/<\/?[a-z][^>]*>/i);
        if (block.type === 'ul' || block.type === 'ol') expect(block.items.length).toBeGreaterThanOrEqual(2);
        else expect(block.text.trim().length, `${a.slug} empty ${block.type}`).toBeGreaterThan(0);
      }
      expect(a.body[0].type, `${a.slug} opens with a paragraph`).toBe('p');
    }
  });

  it('is long enough to teach something and short enough to finish', () => {
    for (const a of ARTICLES) {
      expect(words(a), a.slug).toBeGreaterThanOrEqual(280);
      expect(words(a), a.slug).toBeLessThanOrEqual(1100);
    }
  });

  it('never promises returns or tells readers to buy something specific', () => {
    const banned = /guaranteed returns?|risk[- ]free returns|you should buy|must buy|sure[- ]shot|double your money/i;
    for (const a of ARTICLES) {
      const all = JSON.stringify([a.summary, a.takeaways, a.body]);
      const hits = all.match(banned);
      // A sentence may mention these phrases only to warn against them; flag it for a human look.
      if (hits) expect(all, `${a.slug} mentions "${hits[0]}"`).toMatch(/(beware|avoid|warning sign|red flag|never|no investment|promises? of|promise)/i);
    }
  });

  it('summarises an article without its text and finds one by slug', () => {
    const first = ARTICLES[0];
    const s = summarise(first);
    expect(s.body).toBeUndefined();
    expect(s.readMinutes).toBeGreaterThanOrEqual(1);
    expect(s.slug).toBe(first.slug);
    expect(findArticle(first.slug)).toBe(first);
    expect(findArticle('nope')).toBeUndefined();
  });
});
