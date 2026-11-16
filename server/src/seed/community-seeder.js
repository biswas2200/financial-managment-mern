import { randomBytes } from 'node:crypto';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { Reaction } from '../models/Reaction.js';
import { setReaction } from '../services/community.service.js';
import { COMMUNITY_MEMBERS, COMMUNITY_POSTS, ARTICLE_COMMENTS } from './community.js';

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * Puts the sample members and their discussions into the database.
 *
 * It only adds what is missing, so it is safe to run again: nothing is doubled and nothing a real member wrote
 * is touched. It returns how many members, posts, comments and reactions it had to add.
 */
export async function seedCommunity({ now = new Date() } = {}) {
  const added = { members: 0, posts: 0, comments: 0, reactions: 0 };

  // Nobody knows this password (it is not stored anywhere), so the sample members cannot be signed in as.
  const passwordHash = await User.hashPassword(randomBytes(32).toString('hex'));
  const users = new Map();
  for (const m of COMMUNITY_MEMBERS) {
    let user = await User.findOne({ email: m.email });
    if (!user) {
      user = await User.create({ name: m.name, email: m.email, passwordHash, avatar: { type: 'preset', ...m.avatar } });
      added.members += 1;
    }
    users.set(m.key, user);
  }
  const idOf = (key) => users.get(key)._id;

  async function react(kind, target, item) {
    const wanted = [...(item.likedBy ?? []).map((k) => [k, 'like']), ...(item.dislikedBy ?? []).map((k) => [k, 'dislike'])];
    for (const [key, value] of wanted) {
      const have = await Reaction.findOne({ user: idOf(key), kind, target });
      if (have?.value === value) continue;
      await setReaction(idOf(key), { kind, target, value });
      added.reactions += 1;
    }
  }

  async function ensureComment(item, kind, target, createdAt) {
    let comment = await Comment.findOne({ author: idOf(item.by), kind, target, body: item.body });
    if (!comment) {
      comment = await Comment.create({ author: idOf(item.by), kind, target, body: item.body, createdAt });
      added.comments += 1;
    }
    await react('comment', String(comment._id), item);
  }

  for (const [index, spec] of COMMUNITY_POSTS.entries()) {
    // A few hours apart from each other, so the feed does not look like one batch.
    const createdAt = new Date(now.getTime() - spec.daysAgo * DAY - ((index * 97) % 600) * MINUTE);
    let post = await Post.findOne({ author: idOf(spec.by), title: spec.title });
    if (!post) {
      post = await Post.create({ author: idOf(spec.by), space: spec.space, title: spec.title, body: spec.body, createdAt });
      added.posts += 1;
    }
    await react('post', String(post._id), spec);
    for (const reply of spec.comments) {
      await ensureComment(reply, 'post', String(post._id), new Date(post.createdAt.getTime() + reply.afterMinutes * MINUTE));
    }
  }

  for (const [index, c] of ARTICLE_COMMENTS.entries()) {
    const createdAt = new Date(now.getTime() - c.daysAgo * DAY - ((index * 131) % 700) * MINUTE);
    await ensureComment(c, 'article', c.article, createdAt);
  }

  return added;
}
