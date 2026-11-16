import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();
const api = '/api/v1/community';

const post = (title = 'How do I read a P/E ratio?', extra = {}) => ({
  space: 'stocks',
  title,
  body: 'I keep seeing P/E on every stock page. What is a sensible way to read it?',
  ...extra,
});

async function makePost(ctx, title, extra) {
  return (await ctx.agent.post(`${api}/posts`).send(post(title, extra)).expect(201)).body;
}

const react = (ctx, kind, target, value) => ctx.agent.put(`${api}/reactions`).send({ kind, target, value });

describe('Community: signed-in only', () => {
  useTestDatabase();

  it('rejects every endpoint without a session', async () => {
    const anon = request(app);
    const id = new mongoose.Types.ObjectId().toString();
    const calls = [
      anon.get(`${api}/posts`),
      anon.post(`${api}/posts`).send(post()),
      anon.get(`${api}/posts/${id}`),
      anon.delete(`${api}/posts/${id}`),
      anon.get(`${api}/comments?kind=post&target=${id}`),
      anon.post(`${api}/comments`).send({ kind: 'post', target: id, body: 'hi' }),
      anon.delete(`${api}/comments/${id}`),
      anon.put(`${api}/reactions`).send({ kind: 'post', target: id, value: 'like' }),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
  });
});

describe('Community posts', () => {
  useTestDatabase();

  it('creates a post that shows the author as first name and last initial, without leaking the email', async () => {
    const ctx = await signUp(app, { name: 'Aarav Mehta' });
    const created = await makePost(ctx);
    expect(created).toMatchObject({
      space: 'stocks',
      title: 'How do I read a P/E ratio?',
      author: { name: 'Aarav M.' },
      likes: 0,
      dislikes: 0,
      myReaction: null,
      commentCount: 0,
      mine: true,
    });
    expect(created.id).toMatch(/^[a-f\d]{24}$/);
    const text = JSON.stringify(created);
    expect(text).not.toContain(ctx.credentials.email);
    expect(created.author.id).toBeUndefined();
  });

  it('never sends a private photo to other members, only a preset icon', async () => {
    const ctx = await signUp(app);
    const photo = `data:image/png;base64,${'A'.repeat(200)}`;
    await ctx.agent.patch('/api/v1/auth/me').send({ name: 'Photo Person', avatar: { type: 'image', image: photo } }).expect(200);
    const created = await makePost(ctx);
    expect(created.author.avatar ?? null).toBeNull();
    expect(JSON.stringify(created)).not.toContain('base64');

    await ctx.agent.patch('/api/v1/auth/me').send({ name: 'Photo Person', avatar: { type: 'preset', preset: 'rocket', color: '#eb6834' } }).expect(200);
    const again = await makePost(ctx, 'A second post');
    expect(again.author.avatar).toEqual({ type: 'preset', preset: 'rocket', color: '#eb6834' });
  });

  it('validates the space, the title and the body', async () => {
    const ctx = await signUp(app);
    for (const bad of [{ space: 'nope' }, { title: 'Hi' }, { body: 'short' }, { title: 'x'.repeat(121) }, { body: 'x'.repeat(2001) }]) {
      const res = await ctx.agent.post(`${api}/posts`).send(post('How do I read a P/E ratio?', bad)).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('lists the newest first, with a total and page count', async () => {
    const ctx = await signUp(app);
    await makePost(ctx, 'First post here');
    await makePost(ctx, 'Second post here');
    await makePost(ctx, 'Third post here');
    const res = await ctx.agent.get(`${api}/posts?limit=2`).expect(200);
    expect(res.body.items.map((p) => p.title)).toEqual(['Third post here', 'Second post here']);
    expect(res.body).toMatchObject({ total: 3, page: 1, pages: 2, limit: 2 });
    const page2 = await ctx.agent.get(`${api}/posts?limit=2&page=2`).expect(200);
    expect(page2.body.items.map((p) => p.title)).toEqual(['First post here']);
  });

  it('filters by space', async () => {
    const ctx = await signUp(app);
    await makePost(ctx, 'About stocks', { space: 'stocks' });
    await makePost(ctx, 'About funds', { space: 'funds' });
    const res = await ctx.agent.get(`${api}/posts?space=funds`).expect(200);
    expect(res.body.items.map((p) => p.title)).toEqual(['About funds']);
    expect(res.body.total).toBe(1);
  });

  it('can order by the most liked, using likes minus dislikes only for the order', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const quiet = await makePost(a, 'A quiet post');
    const loved = await makePost(a, 'A loved post');
    const disliked = await makePost(a, 'A disliked post');
    await react(a, 'post', loved.id, 'like').expect(200);
    await react(b, 'post', loved.id, 'like').expect(200);
    await react(b, 'post', disliked.id, 'dislike').expect(200);

    const res = await a.agent.get(`${api}/posts?sort=top`).expect(200);
    expect(res.body.items.map((p) => p.title)).toEqual(['A loved post', 'A quiet post', 'A disliked post']);
    const shown = res.body.items.find((p) => p.id === disliked.id);
    expect(shown).toMatchObject({ likes: 0, dislikes: 1 }); // shown as a positive count, never as -1
    expect(quiet.id).toBeTruthy();
  });

  it('fetches one post, and answers 404 for an unknown or malformed id', async () => {
    const ctx = await signUp(app);
    const created = await makePost(ctx);
    const res = await ctx.agent.get(`${api}/posts/${created.id}`).expect(200);
    expect(res.body.title).toBe(created.title);
    await ctx.agent.get(`${api}/posts/${new mongoose.Types.ObjectId()}`).expect(404);
    await ctx.agent.get(`${api}/posts/not-an-id`).expect(400);
  });

  it('marks which posts are yours', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const mine = await makePost(a, 'Alpha writes this');
    const res = await b.agent.get(`${api}/posts`).expect(200);
    expect(res.body.items.find((p) => p.id === mine.id).mine).toBe(false);
  });

  it('lets only the author delete a post, and takes its comments and reactions with it', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const created = await makePost(a);
    const comment = (await b.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body: 'Good question' }).expect(201)).body;
    await react(b, 'post', created.id, 'like').expect(200);
    await react(a, 'comment', comment.id, 'like').expect(200);

    await b.agent.delete(`${api}/posts/${created.id}`).expect(403);
    await a.agent.delete(`${api}/posts/${created.id}`).expect(204);
    await a.agent.get(`${api}/posts/${created.id}`).expect(404);
    expect(await mongoose.connection.db.collection('comments').countDocuments()).toBe(0);
    expect(await mongoose.connection.db.collection('reactions').countDocuments()).toBe(0);
  });
});

describe('Community comments', () => {
  useTestDatabase();

  it('adds a comment to a post and counts it on the post', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const created = await makePost(a);
    const res = await a.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body: '  Look at the 5-year average too.  ' }).expect(201);
    expect(res.body).toMatchObject({ body: 'Look at the 5-year average too.', author: { name: 'Alpha O.' }, likes: 0, dislikes: 0, mine: true, myReaction: null });
    const fetched = await a.agent.get(`${api}/posts/${created.id}`).expect(200);
    expect(fetched.body.commentCount).toBe(1);
  });

  it('adds a comment to an article by its slug', async () => {
    const a = await signUp(app);
    const articles = (await a.agent.get('/api/v1/learn/articles').expect(200)).body;
    const slug = articles[0].slug;
    await a.agent.post(`${api}/comments`).send({ kind: 'article', target: slug, body: 'Very clear, thanks.' }).expect(201);
    const list = await a.agent.get(`${api}/comments?kind=article&target=${slug}`).expect(200);
    expect(list.body.items).toHaveLength(1);
    const detail = await a.agent.get(`/api/v1/learn/articles/${slug}`).expect(200);
    expect(detail.body.commentCount).toBe(1);
  });

  it('refuses a comment on something that does not exist', async () => {
    const a = await signUp(app);
    await a.agent.post(`${api}/comments`).send({ kind: 'article', target: 'no-such-article', body: 'Hello' }).expect(404);
    await a.agent.post(`${api}/comments`).send({ kind: 'post', target: new mongoose.Types.ObjectId().toString(), body: 'Hello' }).expect(404);
  });

  it('validates the comment text and the kind', async () => {
    const a = await signUp(app);
    const created = await makePost(a);
    for (const bad of [{ body: '   ' }, { body: 'x'.repeat(601) }, { kind: 'comment' }, { kind: 'bogus' }]) {
      await a.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body: 'ok', ...bad }).expect(400);
    }
  });

  it('shows the most liked comments first by default, and can sort by newest or oldest', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const created = await makePost(a);
    const add = async (body) => (await a.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body }).expect(201)).body;
    const first = await add('first');
    const second = await add('second');
    const third = await add('third');
    await react(b, 'comment', second.id, 'like').expect(200);
    await react(a, 'comment', second.id, 'like').expect(200);
    await react(b, 'comment', first.id, 'dislike').expect(200);

    const url = `${api}/comments?kind=post&target=${created.id}`;
    expect((await a.agent.get(url).expect(200)).body.items.map((c) => c.body)).toEqual(['second', 'third', 'first']);
    expect((await a.agent.get(`${url}&sort=new`).expect(200)).body.items.map((c) => c.body)).toEqual(['third', 'second', 'first']);
    expect((await a.agent.get(`${url}&sort=old`).expect(200)).body.items.map((c) => c.body)).toEqual(['first', 'second', 'third']);
    expect(third.id).toBeTruthy();
  });

  it('paginates comments', async () => {
    const a = await signUp(app);
    const created = await makePost(a);
    for (let i = 1; i <= 5; i += 1) await a.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body: `comment ${i}` }).expect(201);
    const res = await a.agent.get(`${api}/comments?kind=post&target=${created.id}&sort=old&limit=2&page=2`).expect(200);
    expect(res.body.items.map((c) => c.body)).toEqual(['comment 3', 'comment 4']);
    expect(res.body).toMatchObject({ total: 5, pages: 3, page: 2 });
  });

  it('lets only the author delete a comment, and removes its reactions', async () => {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const created = await makePost(a);
    const comment = (await b.agent.post(`${api}/comments`).send({ kind: 'post', target: created.id, body: 'Mine' }).expect(201)).body;
    await react(a, 'comment', comment.id, 'like').expect(200);
    await a.agent.delete(`${api}/comments/${comment.id}`).expect(403);
    await b.agent.delete(`${api}/comments/${comment.id}`).expect(204);
    expect((await a.agent.get(`${api}/comments?kind=post&target=${created.id}`).expect(200)).body.items).toHaveLength(0);
    expect(await mongoose.connection.db.collection('reactions').countDocuments()).toBe(0);
    await b.agent.delete(`${api}/comments/${comment.id}`).expect(404);
  });
});

describe('Community reactions: likes and dislikes are separate counts and never negative', () => {
  useTestDatabase();

  async function setup() {
    const a = await signUp(app, { name: 'Alpha One' });
    const b = await signUp(app, { name: 'Beta Two' });
    const created = await makePost(a);
    return { a, b, id: created.id };
  }

  it('counts a like and a dislike separately', async () => {
    const { a, b, id } = await setup();
    expect((await react(a, 'post', id, 'like').expect(200)).body).toEqual({ likes: 1, dislikes: 0, myReaction: 'like' });
    expect((await react(b, 'post', id, 'dislike').expect(200)).body).toEqual({ likes: 1, dislikes: 1, myReaction: 'dislike' });
  });

  it('switching from like to dislike moves the count and leaves no negative behind', async () => {
    const { a, id } = await setup();
    await react(a, 'post', id, 'like').expect(200);
    const res = await react(a, 'post', id, 'dislike').expect(200);
    expect(res.body).toEqual({ likes: 0, dislikes: 1, myReaction: 'dislike' });
  });

  it('is idempotent: sending the same reaction again changes nothing', async () => {
    const { a, id } = await setup();
    for (let i = 0; i < 4; i += 1) {
      expect((await react(a, 'post', id, 'like').expect(200)).body).toEqual({ likes: 1, dislikes: 0, myReaction: 'like' });
    }
  });

  it('takes a reaction back with null, and taking back when there is none stays at zero', async () => {
    const { a, id } = await setup();
    await react(a, 'post', id, 'dislike').expect(200);
    expect((await react(a, 'post', id, null).expect(200)).body).toEqual({ likes: 0, dislikes: 0, myReaction: null });
    expect((await react(a, 'post', id, null).expect(200)).body).toEqual({ likes: 0, dislikes: 0, myReaction: null });
  });

  it('holds exactly one reaction per person even when requests arrive at the same moment', async () => {
    const { a, id } = await setup();
    const results = await Promise.all(Array.from({ length: 12 }, () => react(a, 'post', id, 'like')));
    for (const res of results) expect(res.status).toBe(200);
    const fetched = await a.agent.get(`${api}/posts/${id}`).expect(200);
    expect(fetched.body).toMatchObject({ likes: 1, dislikes: 0, myReaction: 'like' });
    expect(await mongoose.connection.db.collection('reactions').countDocuments()).toBe(1);
  });

  it('keeps both counts as whole numbers of zero or more through any sequence of clicks', async () => {
    const { a, b, id } = await setup();
    const values = ['like', 'dislike', null, 'like', 'like', null, null, 'dislike', 'dislike', 'like', null, 'dislike'];
    for (const [i, value] of values.entries()) {
      const who = i % 2 === 0 ? a : b;
      const { body } = await react(who, 'post', id, value).expect(200);
      expect(Number.isInteger(body.likes) && body.likes >= 0, `likes after step ${i}`).toBe(true);
      expect(Number.isInteger(body.dislikes) && body.dislikes >= 0, `dislikes after step ${i}`).toBe(true);
    }
    const stored = await mongoose.connection.db.collection('posts').findOne({});
    expect(stored.likes).toBeGreaterThanOrEqual(0);
    expect(stored.dislikes).toBeGreaterThanOrEqual(0);
  });

  it('reports each viewer their own reaction', async () => {
    const { a, b, id } = await setup();
    await react(a, 'post', id, 'like').expect(200);
    expect((await a.agent.get(`${api}/posts/${id}`).expect(200)).body.myReaction).toBe('like');
    expect((await b.agent.get(`${api}/posts/${id}`).expect(200)).body.myReaction).toBeNull();
  });

  it('works on comments and on articles', async () => {
    const { a, b, id } = await setup();
    const comment = (await a.agent.post(`${api}/comments`).send({ kind: 'post', target: id, body: 'A comment' }).expect(201)).body;
    await react(b, 'comment', comment.id, 'dislike').expect(200);
    const list = await a.agent.get(`${api}/comments?kind=post&target=${id}`).expect(200);
    expect(list.body.items[0]).toMatchObject({ likes: 0, dislikes: 1, myReaction: null });

    const slug = (await a.agent.get('/api/v1/learn/articles').expect(200)).body[0].slug;
    expect((await react(a, 'article', slug, 'like').expect(200)).body).toEqual({ likes: 1, dislikes: 0, myReaction: 'like' });
    expect((await react(b, 'article', slug, 'dislike').expect(200)).body).toEqual({ likes: 1, dislikes: 1, myReaction: 'dislike' });
    const detail = await a.agent.get(`/api/v1/learn/articles/${slug}`).expect(200);
    expect(detail.body).toMatchObject({ likes: 1, dislikes: 1, myReaction: 'like' });
  });

  it('refuses reactions to things that do not exist, and values that are not like, dislike or null', async () => {
    const { a, id } = await setup();
    await react(a, 'article', 'no-such-article', 'like').expect(404);
    await react(a, 'post', new mongoose.Types.ObjectId().toString(), 'like').expect(404);
    await react(a, 'comment', new mongoose.Types.ObjectId().toString(), 'like').expect(404);
    for (const value of [-1, 1, 'unlike', 'LIKE', true, undefined]) {
      const res = await a.agent.put(`${api}/reactions`).send({ kind: 'post', target: id, value }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('never lets one person react twice by using a second request body shape', async () => {
    const { a, id } = await setup();
    await react(a, 'post', id, 'like').expect(200);
    await react(a, 'post', id, 'dislike').expect(200);
    await react(a, 'post', id, 'like').expect(200);
    expect(await mongoose.connection.db.collection('reactions').countDocuments({ target: id })).toBe(1);
  });
});

describe('Deleting an account removes what the person wrote in the community', () => {
  useTestDatabase();

  it('deletes their posts, comments and reactions, and keeps everyone else\'s', async () => {
    const leaver = await signUp(app, { name: 'Leaving Person' });
    const stayer = await signUp(app, { name: 'Staying Person' });
    const theirs = await makePost(leaver, 'Written by the person leaving');
    const kept = await makePost(stayer, 'Written by the person staying');
    await leaver.agent.post(`${api}/comments`).send({ kind: 'post', target: kept.id, body: 'A comment that goes' }).expect(201);
    await react(leaver, 'post', kept.id, 'like').expect(200);
    await stayer.agent.post(`${api}/comments`).send({ kind: 'post', target: theirs.id, body: 'Reply on a post that goes' }).expect(201);

    await leaver.agent.delete('/api/v1/auth/me').send({ password: leaver.credentials.password }).expect(204);

    const posts = (await stayer.agent.get(`${api}/posts`).expect(200)).body;
    expect(posts.items.map((p) => p.title)).toEqual(['Written by the person staying']);
    expect(posts.items[0]).toMatchObject({ likes: 0, dislikes: 0, commentCount: 0 });
    expect(await mongoose.connection.db.collection('comments').countDocuments()).toBe(0);
    expect(await mongoose.connection.db.collection('reactions').countDocuments()).toBe(0);
  });
});
