import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { seedCommunity } from '../../src/seed/community-seeder.js';
import { removeTestAccounts, removeAccountData } from '../../src/seed/accounts.js';
import { User } from '../../src/models/User.js';
import { Post } from '../../src/models/Post.js';
import { Comment } from '../../src/models/Comment.js';
import { Reaction } from '../../src/models/Reaction.js';
import { Transaction } from '../../src/models/Transaction.js';
import { Budget } from '../../src/models/Budget.js';
import { Category } from '../../src/models/Category.js';
import { WatchlistItem } from '../../src/models/WatchlistItem.js';
import { AssistantMessage } from '../../src/models/AssistantMessage.js';

const app = createApp();
const api = '/api/v1';

async function activeAccount(email) {
  const { agent, user, categories } = await signUp(app, { email, name: 'Some Person' });
  await agent.post(`${api}/transactions`).send({ type: 'expense', amount: 25000, category: categories.Groceries.id, description: 'Weekly groceries', date: '2026-11-08' }).expect(201);
  const post = (await agent.post(`${api}/community/posts`).send({ space: 'general', title: `A question from ${email}`, body: 'A body long enough to be accepted by the form.' }).expect(201)).body;
  await agent.post(`${api}/community/comments`).send({ kind: 'post', target: post.id, body: 'And a comment on my own post.' }).expect(201);
  return { agent, user, post };
}

describe('removeTestAccounts', () => {
  useTestDatabase();

  it('removes accounts on the test domain together with everything they made, and nothing else', async () => {
    const tester = await activeAccount('e2e-111-abc@kosha.test');
    const prober = await activeAccount('probe-222@kosha.test');
    const keeper = await activeAccount('real.person@example.com');
    await seedCommunity({ now: new Date('2026-11-16T09:00:00+05:30') });
    // a test account reacts to a post that is staying, and comments on an article
    const staying = await Post.findOne({ title: /P\/E ratio/ });
    await tester.agent.put(`${api}/community/reactions`).send({ kind: 'post', target: String(staying._id), value: 'like' }).expect(200);
    await tester.agent.post(`${api}/community/comments`).send({ kind: 'article', target: 'emergency-fund', body: 'A test comment on an article.' }).expect(201);
    const likesBefore = (await Post.findById(staying._id)).likes;

    const summary = await removeTestAccounts();
    expect(summary).toMatchObject({ accounts: 2 });

    expect(await User.findOne({ email: 'e2e-111-abc@kosha.test' })).toBeNull();
    expect(await User.findOne({ email: 'probe-222@kosha.test' })).toBeNull();
    for (const gone of [tester, prober]) {
      expect(await Post.countDocuments({ author: gone.user.id })).toBe(0);
      expect(await Comment.countDocuments({ author: gone.user.id })).toBe(0);
      expect(await Transaction.countDocuments({ user: gone.user.id })).toBe(0);
      expect(await Category.countDocuments({ user: gone.user.id })).toBe(0);
      expect(await Reaction.countDocuments({ user: gone.user.id })).toBe(0);
    }
    // the like they gave to a staying post is taken back, and the count that is kept on it follows
    expect((await Post.findById(staying._id)).likes).toBe(likesBefore - 1);

    // a real person's account, and the sample members' discussions, are untouched
    expect(await User.findOne({ email: 'real.person@example.com' })).not.toBeNull();
    expect(await Post.findById(keeper.post.id)).not.toBeNull();
    expect(await Transaction.countDocuments({ user: keeper.user.id })).toBe(1);
    expect(await User.countDocuments({ email: /@kosha\.example$/ })).toBeGreaterThan(10);
    expect(await Post.countDocuments({ title: /P\/E ratio/ })).toBe(1);
  });

  it('only ever matches the exact test domain', async () => {
    await activeAccount('a@kosha.test.evil.com');
    await activeAccount('kosha.test@example.com');
    await activeAccount('someone@mykosha.test');
    await activeAccount('x@kosha.app');
    const summary = await removeTestAccounts();
    expect(summary.accounts).toBe(0);
    expect(await User.countDocuments()).toBe(4);
  });

  it('is safe to run when there is nothing to remove', async () => {
    expect(await removeTestAccounts()).toMatchObject({ accounts: 0 });
  });

  it('leaves the people it was told to leave', async () => {
    await activeAccount('e2e-999@kosha.test');
    await activeAccount('consent-999@kosha.test');
    const summary = await removeTestAccounts({ keep: ['consent-999@kosha.test'] });
    expect(summary.accounts).toBe(1);
    expect(await User.findOne({ email: 'consent-999@kosha.test' })).not.toBeNull();
  });
});

describe('removeAccountData', () => {
  useTestDatabase();

  it('removes what one person made: money, budgets, categories, Copilot messages, watchlist, posts, comments and likes', async () => {
    const { agent, user } = await activeAccount('someone@kosha.test');
    await WatchlistItem.create({ user: user.id, kind: 'stock', ref: 'TCS', label: 'Tata Consultancy Services' });
    await AssistantMessage.create({ user: user.id, role: 'user', content: 'hello' });
    await Budget.create({ user: user.id, category: (await Category.findOne({ user: user.id, name: 'Groceries' }))._id, month: '2026-11', limit: 500000 });
    await removeAccountData(user.id);
    for (const Model of [Transaction, Budget, Category, WatchlistItem, AssistantMessage, Post, Comment, Reaction]) expect(await Model.countDocuments({ [Model === Reaction ? 'user' : Model === Post || Model === Comment ? 'author' : 'user']: user.id })).toBe(0);
    expect(await User.findById(user.id)).not.toBeNull(); // the account itself stays: callers decide
    expect(agent).toBeTruthy();
  });
});
