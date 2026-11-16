import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { DOMAINS } from '@kosha/shared';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';

const app = createApp();

describe('Learn: articles on saving and investing', () => {
  useTestDatabase();

  it('needs a session', async () => {
    await request(app).get('/api/v1/learn/articles').expect(401);
    await request(app).get('/api/v1/learn/articles/anything').expect(401);
  });

  it('lists articles as summaries without their full text', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get('/api/v1/learn/articles').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(10);
    for (const a of res.body) {
      expect(a).toMatchObject({
        slug: expect.stringMatching(/^[a-z0-9-]+$/),
        title: expect.any(String),
        summary: expect.any(String),
        domain: expect.any(String),
        readMinutes: expect.any(Number),
        likes: 0,
        dislikes: 0,
        commentCount: 0,
        myReaction: null,
      });
      expect(a.body).toBeUndefined();
    }
  });

  it('covers every domain with at least one article', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get('/api/v1/learn/articles').expect(200);
    const covered = new Set(res.body.map((a) => a.domain));
    for (const d of DOMAINS) expect(covered.has(d.id), `an article in "${d.label}"`).toBe(true);
  });

  it('filters by domain', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get('/api/v1/learn/articles?domain=saving').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((a) => a.domain === 'saving')).toBe(true);
    await agent.get('/api/v1/learn/articles?domain=nonsense').expect(400);
  });

  it('opens one article with its text, takeaways and sources', async () => {
    const { agent } = await signUp(app);
    const slug = (await agent.get('/api/v1/learn/articles').expect(200)).body[0].slug;
    const res = await agent.get(`/api/v1/learn/articles/${slug}`).expect(200);
    expect(res.body.slug).toBe(slug);
    expect(res.body.body.length).toBeGreaterThan(3);
    expect(res.body.takeaways.length).toBeGreaterThanOrEqual(2);
    expect(res.body.sources.length).toBeGreaterThanOrEqual(1);
    for (const s of res.body.sources) expect(s.url).toMatch(/^https:\/\//);
    expect(res.body.copilotPrompt).toEqual(expect.any(String));
  });

  it('says 404 for an article that does not exist', async () => {
    const { agent } = await signUp(app);
    const res = await agent.get('/api/v1/learn/articles/not-a-real-article').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('shows the viewer their own reaction and the shared counts', async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    const slug = (await a.agent.get('/api/v1/learn/articles').expect(200)).body[0].slug;
    await a.agent.put('/api/v1/community/reactions').send({ kind: 'article', target: slug, value: 'like' }).expect(200);
    await b.agent.put('/api/v1/community/reactions').send({ kind: 'article', target: slug, value: 'dislike' }).expect(200);
    const forA = (await a.agent.get('/api/v1/learn/articles').expect(200)).body.find((x) => x.slug === slug);
    const forB = (await b.agent.get('/api/v1/learn/articles').expect(200)).body.find((x) => x.slug === slug);
    expect(forA).toMatchObject({ likes: 1, dislikes: 1, myReaction: 'like' });
    expect(forB).toMatchObject({ likes: 1, dislikes: 1, myReaction: 'dislike' });
  });
});
