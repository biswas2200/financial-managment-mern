import { describe, it, expect } from 'vitest';
import { COMMUNITY_LIMITS, SPACE_IDS, publicName } from '@kosha/shared';
import { COMMUNITY_MEMBERS, COMMUNITY_POSTS, ARTICLE_COMMENTS, communityTotals } from '../../src/seed/community.js';
import { findArticle } from '../../src/content/articles.js';

const keys = new Set(COMMUNITY_MEMBERS.map((m) => m.key));
const allComments = [...COMMUNITY_POSTS.flatMap((p) => p.comments.map((c) => ({ ...c, on: p }))), ...ARTICLE_COMMENTS.map((c) => ({ ...c, on: c }))];
const allItems = [...COMMUNITY_POSTS, ...allComments];

describe('Sample members', () => {
  it('have real-looking first and last names, written the way people write them', () => {
    expect(COMMUNITY_MEMBERS.length).toBeGreaterThanOrEqual(12);
    for (const m of COMMUNITY_MEMBERS) {
      expect(m.name, m.key).toMatch(/^\p{Lu}\p{L}+( \p{Lu}\p{L}+)+$/u);
      expect(m.name.length).toBeLessThanOrEqual(60);
    }
  });

  it('are different people: unique names, unique keys, unique emails that cannot be a real inbox', () => {
    for (const field of ['key', 'name', 'email']) expect(new Set(COMMUNITY_MEMBERS.map((m) => m[field])).size).toBe(COMMUNITY_MEMBERS.length);
    for (const m of COMMUNITY_MEMBERS) expect(m.email).toMatch(/^[a-z0-9.]+@kosha\.example$/);
  });

  it('show to other members as a first name and an initial', () => {
    expect(publicName('Priya Subramanian')).toBe('Priya S.');
    for (const m of COMMUNITY_MEMBERS) expect(publicName(m.name)).toMatch(/^\p{Lu}\p{L}+ \p{Lu}\.$/u);
  });

  it('use one of the preset profile icons, so nobody has an uploaded photo', () => {
    for (const m of COMMUNITY_MEMBERS) {
      expect(m.avatar.preset).toBeTruthy();
      expect(m.avatar.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('Sample discussions', () => {
  it('cover most of the discussion spaces, with plenty to read', () => {
    expect(COMMUNITY_POSTS.length).toBeGreaterThanOrEqual(14);
    const spaces = new Set(COMMUNITY_POSTS.map((p) => p.space));
    for (const s of spaces) expect(SPACE_IDS).toContain(s);
    expect(spaces.size).toBeGreaterThanOrEqual(8);
  });

  it('stay within the same limits a member has when posting', () => {
    for (const p of COMMUNITY_POSTS) {
      expect(p.title.length, p.title).toBeLessThanOrEqual(COMMUNITY_LIMITS.title);
      expect(p.body.length, p.title).toBeLessThanOrEqual(COMMUNITY_LIMITS.post);
      expect(p.title.trim().length).toBeGreaterThan(8);
      expect(p.body.trim().length).toBeGreaterThan(40);
    }
    for (const c of allComments) expect(c.body.length, c.body).toBeLessThanOrEqual(COMMUNITY_LIMITS.comment);
  });

  it('have no repeated titles, so running the seed twice can tell them apart', () => {
    expect(new Set(COMMUNITY_POSTS.map((p) => p.title)).size).toBe(COMMUNITY_POSTS.length);
  });

  it('are written and reacted to only by known members, and never reacted to by their own author', () => {
    for (const item of allItems) {
      expect(keys.has(item.by), `author ${item.by}`).toBe(true);
      for (const who of [...(item.likedBy ?? []), ...(item.dislikedBy ?? [])]) {
        expect(keys.has(who), `reactor ${who}`).toBe(true);
        expect(who, `${item.title ?? item.body.slice(0, 30)} is reacted to by its own author`).not.toBe(item.by);
      }
      const both = (item.likedBy ?? []).filter((w) => (item.dislikedBy ?? []).includes(w));
      expect(both, 'one person cannot like and dislike the same thing').toEqual([]);
      expect(new Set(item.likedBy ?? []).size).toBe((item.likedBy ?? []).length);
    }
  });

  it('comment on real articles', () => {
    expect(ARTICLE_COMMENTS.length).toBeGreaterThanOrEqual(12);
    for (const c of ARTICLE_COMMENTS) expect(findArticle(c.article), c.article).toBeTruthy();
    expect(new Set(ARTICLE_COMMENTS.map((c) => c.article)).size).toBeGreaterThanOrEqual(6);
  });

  it('happened in the past, and a reply comes after the post it answers', () => {
    for (const p of COMMUNITY_POSTS) {
      expect(p.daysAgo).toBeGreaterThanOrEqual(0);
      let last = 0;
      for (const c of p.comments) {
        expect(c.afterMinutes).toBeGreaterThan(0);
        expect(c.afterMinutes).toBeGreaterThanOrEqual(last);
        last = c.afterMinutes;
      }
    }
  });

  it('feel like a real community: most things are liked, a few are disliked, and nobody is told what to buy', () => {
    const likes = allItems.reduce((n, i) => n + (i.likedBy?.length ?? 0), 0);
    const dislikes = allItems.reduce((n, i) => n + (i.dislikedBy?.length ?? 0), 0);
    expect(likes).toBeGreaterThan(60);
    expect(dislikes).toBeGreaterThanOrEqual(3);
    expect(dislikes).toBeLessThan(likes / 5);
    const advice = /\b(you should (buy|sell)|buy (it )?now|sell (it )?now|sure.?shot|multibagger|hot tip|can'?t lose)\b/i;
    for (const t of [...COMMUNITY_POSTS.flatMap((p) => [p.title, p.body]), ...allComments.map((c) => c.body)]) expect(t).not.toMatch(advice);
  });

  it('keep a care for people: no phone numbers, emails or links of the kind a scammer would use', () => {
    for (const t of [...COMMUNITY_POSTS.flatMap((p) => [p.title, p.body]), ...allComments.map((c) => c.body)]) {
      expect(t).not.toMatch(/@\w+\.\w+/);
      expect(t).not.toMatch(/https?:\/\//i);
      expect(t).not.toMatch(/\b[6-9]\d{9}\b/);
    }
  });

  it('report their own totals', () => {
    const totals = communityTotals();
    expect(totals.members).toBe(COMMUNITY_MEMBERS.length);
    expect(totals.posts).toBe(COMMUNITY_POSTS.length);
    expect(totals.comments).toBe(allComments.length);
  });
});
