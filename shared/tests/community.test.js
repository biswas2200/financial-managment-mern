import { describe, it, expect } from 'vitest';
import {
  DOMAINS,
  SPACES,
  REACTION_VALUES,
  formatCount,
  publicName,
  netScore,
  postSchema,
  commentSchema,
  reactionSchema,
  postListQuery,
  commentListQuery,
  COMMUNITY_LIMITS,
} from '../src/community.js';

describe('domains and spaces', () => {
  it('names the eight money domains, each with an id and a label', () => {
    expect(DOMAINS.map((d) => d.id)).toEqual(['saving', 'investing', 'stocks', 'funds', 'tax', 'protection', 'credit', 'safety']);
    for (const d of DOMAINS) expect(d.label.length).toBeGreaterThan(2);
  });

  it('adds a general space for discussions only', () => {
    expect(SPACES.map((s) => s.id)).toEqual([...DOMAINS.map((d) => d.id), 'general']);
  });

  it('has two separate reaction values', () => {
    expect(REACTION_VALUES).toEqual(['like', 'dislike']);
  });
});

describe('formatCount', () => {
  it('never shows a negative number', () => {
    expect(formatCount(-1)).toBe('0');
    expect(formatCount(-250)).toBe('0');
    expect(formatCount(-0.5)).toBe('0');
  });

  it('treats bad input as zero', () => {
    for (const bad of [undefined, null, NaN, 'abc', Infinity, {}]) expect(formatCount(bad), String(bad)).toBe('0');
  });

  it('shows small numbers as they are and rounds down fractions', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(12.9)).toBe('12');
  });

  it('shortens thousands and millions', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1250)).toBe('1.2k');
    expect(formatCount(15400)).toBe('15.4k');
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(2_340_000)).toBe('2.3M');
  });
});

describe('netScore', () => {
  it('is likes minus dislikes, used only for ordering', () => {
    expect(netScore({ likes: 5, dislikes: 2 })).toBe(3);
    expect(netScore({ likes: 1, dislikes: 4 })).toBe(-3);
    expect(netScore({})).toBe(0);
  });
});

describe('publicName', () => {
  it('shows the first name and the initial of the last name', () => {
    expect(publicName('Aarav Mehta')).toBe('Aarav M.');
    expect(publicName('  Neha  Kulkarni Rao ')).toBe('Neha R.');
  });

  it('shows a single name as it is, and has a fallback', () => {
    expect(publicName('Meera')).toBe('Meera');
    expect(publicName('')).toBe('Kosha member');
    expect(publicName(undefined)).toBe('Kosha member');
  });
});

describe('postSchema', () => {
  const ok = { space: 'stocks', title: 'How do I read a P/E ratio?', body: 'I keep seeing P/E on every stock page. What is a sensible way to read it?' };

  it('accepts a good post and trims it', () => {
    expect(postSchema.parse({ ...ok, title: '  How do I read a P/E ratio?  ' }).title).toBe('How do I read a P/E ratio?');
  });

  it('rejects unknown spaces, short titles and short or long bodies', () => {
    expect(postSchema.safeParse({ ...ok, space: 'crypto-pumps' }).success).toBe(false);
    expect(postSchema.safeParse({ ...ok, title: 'Hi' }).success).toBe(false);
    expect(postSchema.safeParse({ ...ok, title: 'x'.repeat(COMMUNITY_LIMITS.title + 1) }).success).toBe(false);
    expect(postSchema.safeParse({ ...ok, body: 'short' }).success).toBe(false);
    expect(postSchema.safeParse({ ...ok, body: 'x'.repeat(COMMUNITY_LIMITS.post + 1) }).success).toBe(false);
  });

  it('strips control characters', () => {
    expect(postSchema.parse({ ...ok, body: `${ok.body}\u0000\u0007` }).body).toBe(ok.body);
  });
});

describe('commentSchema', () => {
  it('needs a kind, a target and some text', () => {
    expect(commentSchema.safeParse({ kind: 'post', target: 'abc', body: 'Nice' }).success).toBe(true);
    expect(commentSchema.safeParse({ kind: 'article', target: 'emergency-fund', body: 'Useful' }).success).toBe(true);
    expect(commentSchema.safeParse({ kind: 'comment', target: 'abc', body: 'Nested' }).success).toBe(false);
    expect(commentSchema.safeParse({ kind: 'post', target: 'abc', body: '   ' }).success).toBe(false);
    expect(commentSchema.safeParse({ kind: 'post', target: 'abc', body: 'x'.repeat(COMMUNITY_LIMITS.comment + 1) }).success).toBe(false);
  });
});

describe('reactionSchema', () => {
  it('accepts like, dislike or null (to take a reaction back)', () => {
    for (const value of ['like', 'dislike', null]) {
      expect(reactionSchema.safeParse({ kind: 'post', target: 'abc', value }).success, String(value)).toBe(true);
    }
  });

  it('rejects anything else, so a score can never be pushed below zero by a made-up value', () => {
    for (const value of ['-1', -1, 1, 'unlike', undefined, true]) {
      expect(reactionSchema.safeParse({ kind: 'post', target: 'abc', value }).success, String(value)).toBe(false);
    }
  });
});

describe('list queries', () => {
  it('give sensible defaults', () => {
    expect(postListQuery.parse({})).toMatchObject({ sort: 'new', page: 1, limit: 10 });
    expect(commentListQuery.parse({ kind: 'post', target: 'abc' })).toMatchObject({ sort: 'top', page: 1, limit: 20 });
  });

  it('read numbers from the query string and cap the page size', () => {
    expect(postListQuery.parse({ page: '3', limit: '25' })).toMatchObject({ page: 3, limit: 25 });
    expect(postListQuery.safeParse({ limit: '500' }).success).toBe(false);
    expect(postListQuery.safeParse({ page: '0' }).success).toBe(false);
    expect(postListQuery.safeParse({ space: 'nope' }).success).toBe(false);
  });

  it('treats an empty space filter as "all"', () => {
    expect(postListQuery.parse({ space: '' }).space).toBeUndefined();
  });
});

describe('targets: posts and comments are named by a 24-character id, written one way only', () => {
  const ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';

  it('lower-cases an id so the same post can never be reached under two spellings', () => {
    for (const schema of [reactionSchema, commentSchema]) {
      const body = schema === reactionSchema ? { kind: 'post', target: ID.toUpperCase(), value: 'like' } : { kind: 'post', target: ID.toUpperCase(), body: 'Hello' };
      expect(schema.parse(body).target, schema === reactionSchema ? 'reaction' : 'comment').toBe(ID);
    }
    expect(commentListQuery.parse({ kind: 'post', target: ID.toUpperCase() }).target).toBe(ID);
    expect(reactionSchema.parse({ kind: 'comment', target: ID.toUpperCase(), value: null }).target).toBe(ID);
  });

  it('rejects a post or comment target that is not an id', () => {
    for (const target of ['abc', 'g1b2c3d4e5f6a1b2c3d4e5f6', `${ID}0`, ID.slice(1), '../etc/passwd']) {
      expect(reactionSchema.safeParse({ kind: 'post', target, value: 'like' }).success, target).toBe(false);
      expect(commentSchema.safeParse({ kind: 'post', target, body: 'Hi' }).success, target).toBe(false);
    }
  });

  it('leaves an article slug exactly as it is', () => {
    expect(reactionSchema.parse({ kind: 'article', target: 'emergency-fund', value: 'like' }).target).toBe('emergency-fund');
    expect(commentSchema.parse({ kind: 'article', target: 'emergency-fund', body: 'Hi' }).target).toBe('emergency-fund');
  });
});

describe('invisible characters', () => {
  it('are removed from posts, so a title cannot be made of nothing', () => {
    const ok = { space: 'general', body: 'A body that is long enough to pass.' };
    expect(postSchema.safeParse({ ...ok, title: '\u200B\u200B\u200B' }).success).toBe(false);
    expect(postSchema.parse({ ...ok, title: 'Hel\u200Blo there' }).title).toBe('Hello there');
    expect(postSchema.parse({ ...ok, title: '\u202Ereversed\u202C title' }).title).toBe('reversed title');
  });

  it('are removed from comments too', () => {
    expect(commentSchema.safeParse({ kind: 'article', target: 'emergency-fund', body: '\u200B \u200B' }).success).toBe(false);
  });
});
