import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { seedCommunity } from '../../src/seed/community-seeder.js';
import { COMMUNITY_MEMBERS, COMMUNITY_POSTS, ARTICLE_COMMENTS, communityTotals } from '../../src/seed/community.js';
import { User } from '../../src/models/User.js';
import { Post } from '../../src/models/Post.js';
import { Comment } from '../../src/models/Comment.js';
import { Reaction } from '../../src/models/Reaction.js';

const app = createApp();
const api = '/api/v1/community';
const NOW = new Date('2026-11-16T09:00:00.000Z');

describe('seedCommunity', () => {
  useTestDatabase();
  let result;
  beforeEach(async () => {
    result = await seedCommunity({ now: NOW });
  });

  it('creates the sample members, posts and comments, and says how many', async () => {
    const totals = communityTotals();
    expect(result).toMatchObject({ members: totals.members, posts: totals.posts, comments: totals.comments });
    expect(await User.countDocuments()).toBe(COMMUNITY_MEMBERS.length);
    expect(await Post.countDocuments()).toBe(COMMUNITY_POSTS.length);
    expect(await Comment.countDocuments()).toBe(totals.comments);
    expect(await Reaction.countDocuments()).toBeGreaterThan(60);
  });

  it('is safe to run again: nothing is doubled, and what other people wrote is left alone', async () => {
    const { agent } = await signUp(app, { name: 'Real Person' });
    const mine = (await agent.post(`${api}/posts`).send({ space: 'general', title: 'My own question about budgets', body: 'Something I wrote myself.' }).expect(201)).body;
    const onSeeded = (await Post.findOne({ title: COMMUNITY_POSTS[0].title }))._id.toString();
    await agent.post(`${api}/comments`).send({ kind: 'post', target: onSeeded, body: 'A reply from someone real.' }).expect(201);

    const again = await seedCommunity({ now: NOW });
    expect(again).toMatchObject({ members: 0, posts: 0, comments: 0 }); // nothing new was needed
    expect(await Post.countDocuments()).toBe(COMMUNITY_POSTS.length + 1);
    expect(await Comment.countDocuments()).toBe(communityTotals().comments + 1);
    expect(await Reaction.countDocuments()).toBeGreaterThan(60);
    expect((await agent.get(`${api}/posts/${mine.id}`).expect(200)).body.title).toBe('My own question about budgets');
    expect((await agent.get(`${api}/comments?kind=post&target=${onSeeded}`).expect(200)).body.items.some((c) => c.body === 'A reply from someone real.')).toBe(true);
  });

  it('fills a missing piece when run again, without touching the rest', async () => {
    const victim = COMMUNITY_POSTS[2];
    const post = await Post.findOne({ title: victim.title });
    await Comment.deleteMany({ kind: 'post', target: String(post._id) });
    const before = await Comment.countDocuments();
    const again = await seedCommunity({ now: NOW });
    expect(again.comments).toBe(victim.comments.length);
    expect(await Comment.countDocuments()).toBe(before + victim.comments.length);
  });

  it('shows members to each other by first name and last initial, never an email', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get(`${api}/posts?limit=50`).expect(200);
    expect(res.body.total).toBe(COMMUNITY_POSTS.length);
    const names = new Set(res.body.items.map((p) => p.author.name));
    expect(names.size).toBeGreaterThanOrEqual(10);
    for (const name of names) expect(name).toMatch(/^\p{Lu}\p{L}+ \p{Lu}\.$/u);
    expect(JSON.stringify(res.body)).not.toMatch(/kosha\.example/);
  });

  it('gives every post a spread of likes, a few dislikes, and counts that never go below zero', async () => {
    const { agent } = await signUp(app);
    const { items } = (await agent.get(`${api}/posts?limit=50`).expect(200)).body;
    expect(items.some((p) => p.likes >= 3)).toBe(true);
    expect(items.some((p) => p.dislikes >= 1)).toBe(true);
    for (const p of items) {
      expect(p.likes).toBeGreaterThanOrEqual(0);
      expect(p.dislikes).toBeGreaterThanOrEqual(0);
      expect(p.myReaction).toBeNull();
    }
  });

  it('keeps the numbers kept on a post equal to the reactions that exist', async () => {
    for (const post of await Post.find()) {
      const likes = await Reaction.countDocuments({ kind: 'post', target: String(post._id), value: 'like' });
      const dislikes = await Reaction.countDocuments({ kind: 'post', target: String(post._id), value: 'dislike' });
      expect([post.likes, post.dislikes], post.title).toEqual([likes, dislikes]);
    }
  });

  it('lists the comments under each post, oldest first, with their authors', async () => {
    const { agent } = await signUp(app);
    const spec = COMMUNITY_POSTS.find((p) => p.comments.length >= 3);
    const post = await Post.findOne({ title: spec.title });
    const res = await agent.get(`${api}/comments?kind=post&target=${post._id}&sort=old`).expect(200);
    expect(res.body.total).toBe(spec.comments.length);
    expect(res.body.items.map((c) => c.body)).toEqual(spec.comments.map((c) => c.body));
    const dates = res.body.items.map((c) => new Date(c.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it('puts comments under the real articles in Learn', async () => {
    const { agent } = await signUp(app);
    const slug = ARTICLE_COMMENTS[0].article;
    const res = await agent.get(`${api}/comments?kind=article&target=${slug}`).expect(200);
    expect(res.body.total).toBe(ARTICLE_COMMENTS.filter((c) => c.article === slug).length);
  });

  it('dates everything in the past, spread over a few weeks, newest first in the feed', async () => {
    const { agent } = await signUp(app);
    const { items } = (await agent.get(`${api}/posts?limit=50&sort=new`).expect(200)).body;
    const times = items.map((p) => new Date(p.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(Math.max(...times)).toBeLessThan(NOW.getTime());
    expect(NOW.getTime() - Math.min(...times)).toBeGreaterThan(14 * 86_400_000);
    expect(NOW.getTime() - Math.min(...times)).toBeLessThan(60 * 86_400_000);
  });

  it('makes members nobody can sign in as', async () => {
    const [member] = COMMUNITY_MEMBERS;
    for (const password of ['Demo@1234', 'testpass123', 'password', member.name]) {
      const res = await request(app).post('/api/v1/auth/login').send({ email: member.email, password });
      expect(res.status).toBe(401);
    }
    const user = await User.findOne({ email: member.email });
    expect(user.avatar.type).toBe('preset');
  });
});
