/**
 * Rules for Learn (articles) and Discussions: the money domains, text limits, how counts are shown,
 * and the zod schemas the API and the React forms both use.
 *
 * Likes and dislikes are two separate counts. Neither can go below zero, and a screen never shows a
 * net score: both are shown as plain positive numbers.
 */
import { z } from 'zod';

/** The money domains. Articles belong to one; discussion spaces reuse them. */
export const DOMAINS = [
  { id: 'saving', label: 'Saving' },
  { id: 'investing', label: 'Investing' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'funds', label: 'Mutual funds' },
  { id: 'tax', label: 'Tax' },
  { id: 'protection', label: 'Insurance' },
  { id: 'credit', label: 'Credit & debt' },
  { id: 'safety', label: 'Scams & safety' },
];

/** Discussion spaces: every domain plus a general one. */
export const SPACES = [...DOMAINS, { id: 'general', label: 'General' }];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);
export const SPACE_IDS = SPACES.map((s) => s.id);

export const REACTION_VALUES = ['like', 'dislike'];
export const REACTION_KINDS = ['article', 'post', 'comment'];
export const COMMENT_TARGET_KINDS = ['article', 'post'];

export const COMMUNITY_LIMITS = Object.freeze({ title: 120, post: 2000, comment: 600 });

/** A count for display: a whole number of zero or more, shortened above a thousand. Never negative. */
export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '0';
  const whole = Math.floor(n);
  const short = (v, unit) => `${(Math.floor(v * 10) / 10).toString().replace(/\.0$/, '')}${unit}`;
  if (whole >= 1_000_000) return short(whole / 1_000_000, 'M');
  if (whole >= 1_000) return short(whole / 1_000, 'k');
  return String(whole);
}

/** Likes minus dislikes. Used only to order a list, never displayed. */
export const netScore = ({ likes = 0, dislikes = 0 } = {}) => likes - dislikes;

/** How a member is named to other members: first name and the initial of the last one. */
export function publicName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Kosha member';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// Control characters never belong in a post; tabs and line breaks do.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (value) => value.replace(CONTROL, '').replace(/\n{3,}/g, '\n\n').trim();

const text = (label, min, max) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(min, min === 1 ? `${label} can't be empty` : `${label} is too short (at least ${min} characters)`)
        .max(max, `${label} is too long (at most ${max} characters)`),
    );

const target = z.string().trim().min(1, 'Missing target').max(80, 'Invalid target');

export const postSchema = z.object({
  space: z.enum(SPACE_IDS, { errorMap: () => ({ message: 'Choose a space for your post' }) }),
  title: text('Title', 3, COMMUNITY_LIMITS.title),
  body: text('Post', 10, COMMUNITY_LIMITS.post),
});

export const commentSchema = z.object({
  kind: z.enum(COMMENT_TARGET_KINDS, { errorMap: () => ({ message: 'Comments go on an article or a post' }) }),
  target,
  body: text('Comment', 1, COMMUNITY_LIMITS.comment),
});

export const reactionSchema = z.object({
  kind: z.enum(REACTION_KINDS),
  target,
  // null takes the reaction back. Nothing else is accepted, so a count can only ever be a count.
  value: z.enum(REACTION_VALUES).nullable(),
});

const blankIsAbsent = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());
const pageNumber = z.coerce.number().int().min(1).default(1);
const pageSize = (fallback, max) => z.coerce.number().int().min(1).max(max).default(fallback);

export const postListQuery = z.object({
  space: blankIsAbsent(z.enum(SPACE_IDS)),
  sort: z.enum(['new', 'top']).default('new'),
  page: pageNumber,
  limit: pageSize(10, 50),
});

export const commentListQuery = z.object({
  kind: z.enum(COMMENT_TARGET_KINDS),
  target,
  sort: z.enum(['top', 'new', 'old']).default('top'),
  page: pageNumber,
  limit: pageSize(20, 50),
});

export const articleListQuery = z.object({ domain: blankIsAbsent(z.enum(DOMAIN_IDS)) });
