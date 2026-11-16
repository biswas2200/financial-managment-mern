/**
 * Discussions, comments and reactions, shared by Learn (articles) and the Discussions space.
 *
 * Reactions are stored one per person per thing, so a like count and a dislike count are plain counts of
 * documents. Neither can go negative, and a person's second click sets their reaction instead of adding one.
 * Posts and comments also keep their counts on the document, only so the "top" order can be a database sort.
 */
import mongoose from 'mongoose';
import { publicName } from '@kosha/shared';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { Reaction } from '../models/Reaction.js';
import { ApiError } from '../utils/ApiError.js';
import { findArticle } from '../content/articles.js';

const isId = (value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(String(value));

/** Other members see a name and, at most, a preset icon. Uploaded photos are never shared. */
function publicAuthor(author) {
  if (!author?.name) return { name: 'Former member', avatar: null };
  const a = author.avatar;
  return {
    name: publicName(author.name),
    avatar: a?.type === 'preset' ? { type: 'preset', preset: a.preset, color: a.color } : null,
  };
}

// ---------- Counts ----------

/** { likes, dislikes, myReaction } for each of the given targets, straight from the reactions collection. */
export async function engagementFor(kind, targets, viewerId) {
  const ids = [...new Set(targets.map(String))];
  const out = new Map(ids.map((id) => [id, { likes: 0, dislikes: 0, myReaction: null }]));
  if (!ids.length) return out;

  const [counts, mine] = await Promise.all([
    Reaction.aggregate([
      { $match: { kind, target: { $in: ids } } },
      { $group: { _id: { target: '$target', value: '$value' }, n: { $sum: 1 } } },
    ]),
    viewerId ? Reaction.find({ user: viewerId, kind, target: { $in: ids } }).lean() : [],
  ]);
  for (const c of counts) {
    const entry = out.get(c._id.target);
    if (entry) entry[c._id.value === 'like' ? 'likes' : 'dislikes'] = c.n;
  }
  for (const m of mine) out.get(m.target).myReaction = m.value;
  return out;
}

/** How many comments each article or post has. */
export async function commentCountsFor(kind, targets) {
  const ids = [...new Set(targets.map(String))];
  const out = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return out;
  const rows = await Comment.aggregate([{ $match: { kind, target: { $in: ids } } }, { $group: { _id: '$target', n: { $sum: 1 } } }]);
  for (const r of rows) out.set(r._id, r.n);
  return out;
}

/** Refresh the counts kept on a post or comment (articles have none) so "top" ordering stays right. */
async function syncStoredCounts(kind, target) {
  if (kind === 'article' || !isId(target)) return;
  const e = (await engagementFor(kind, [target], null)).get(String(target));
  const Model = kind === 'post' ? Post : Comment;
  await Model.updateOne({ _id: target }, { $set: { likes: e.likes, dislikes: e.dislikes, score: e.likes - e.dislikes } });
}

// ---------- Targets ----------

async function assertTarget(kind, target) {
  let found;
  if (kind === 'article') found = Boolean(findArticle(target));
  else if (!isId(target)) found = false;
  else found = Boolean(await (kind === 'post' ? Post : Comment).exists({ _id: target }));
  if (!found) throw ApiError.notFound(kind === 'article' ? 'Article not found' : `That ${kind} no longer exists`);
}

// ---------- Shaping ----------

function postJson(post, viewerId, engagement, commentCount) {
  return {
    id: String(post._id),
    space: post.space,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    author: publicAuthor(post.author),
    likes: engagement.likes,
    dislikes: engagement.dislikes,
    myReaction: engagement.myReaction,
    commentCount,
    mine: String(post.author?._id ?? post.author) === String(viewerId),
  };
}

function commentJson(comment, viewerId, engagement) {
  return {
    id: String(comment._id),
    kind: comment.kind,
    target: comment.target,
    body: comment.body,
    createdAt: comment.createdAt,
    author: publicAuthor(comment.author),
    likes: engagement.likes,
    dislikes: engagement.dislikes,
    myReaction: engagement.myReaction,
    mine: String(comment.author?._id ?? comment.author) === String(viewerId),
  };
}

async function shapePosts(posts, viewerId) {
  const ids = posts.map((p) => String(p._id));
  const [engagement, counts] = await Promise.all([engagementFor('post', ids, viewerId), commentCountsFor('post', ids)]);
  return posts.map((p) => postJson(p, viewerId, engagement.get(String(p._id)), counts.get(String(p._id)) ?? 0));
}

const authorFields = 'name avatar';

// ---------- Posts ----------

export async function createPost(userId, input) {
  const created = await Post.create({ author: userId, ...input });
  const post = await Post.findById(created._id).populate('author', authorFields);
  return (await shapePosts([post], userId))[0];
}

export async function listPosts(viewerId, { space, sort, page, limit }) {
  const filter = space ? { space } : {};
  const order = sort === 'top' ? { score: -1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', authorFields),
  ]);
  return { items: await shapePosts(posts, viewerId), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPost(viewerId, id) {
  const post = await Post.findById(id).populate('author', authorFields);
  if (!post) throw ApiError.notFound('That post no longer exists');
  return (await shapePosts([post], viewerId))[0];
}

async function removeComments(filter) {
  const ids = (await Comment.find(filter, '_id').lean()).map((c) => String(c._id));
  if (!ids.length) return;
  await Reaction.deleteMany({ kind: 'comment', target: { $in: ids } });
  await Comment.deleteMany({ _id: { $in: ids } });
}

export async function deletePost(userId, id) {
  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound('That post no longer exists');
  if (String(post.author) !== String(userId)) throw new ApiError(403, 'You can only delete your own posts', 'FORBIDDEN');
  await removeComments({ kind: 'post', target: String(post._id) });
  await Reaction.deleteMany({ kind: 'post', target: String(post._id) });
  await post.deleteOne();
}

// ---------- Comments ----------

export async function listComments(viewerId, { kind, target, sort, page, limit }) {
  await assertTarget(kind, target);
  const order = { top: { score: -1, createdAt: -1, _id: -1 }, new: { createdAt: -1, _id: -1 }, old: { createdAt: 1, _id: 1 } }[sort];
  const filter = { kind, target };
  const [total, comments] = await Promise.all([
    Comment.countDocuments(filter),
    Comment.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', authorFields),
  ]);
  const engagement = await engagementFor('comment', comments.map((c) => c._id), viewerId);
  return {
    items: comments.map((c) => commentJson(c, viewerId, engagement.get(String(c._id)))),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function addComment(userId, { kind, target, body }) {
  await assertTarget(kind, target);
  const created = await Comment.create({ author: userId, kind, target, body });
  const comment = await Comment.findById(created._id).populate('author', authorFields);
  return commentJson(comment, userId, { likes: 0, dislikes: 0, myReaction: null });
}

export async function deleteComment(userId, id) {
  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('That comment no longer exists');
  if (String(comment.author) !== String(userId)) throw new ApiError(403, 'You can only delete your own comments', 'FORBIDDEN');
  await Reaction.deleteMany({ kind: 'comment', target: String(comment._id) });
  await comment.deleteOne();
}

// ---------- Reactions ----------

/**
 * Sets what this person thinks of something: 'like', 'dislike', or null to take it back.
 * It is a "set", not a toggle, so repeating a request changes nothing.
 */
export async function setReaction(userId, { kind, target, value }) {
  await assertTarget(kind, target);
  const key = { user: userId, kind, target: String(target) };
  if (value === null) {
    await Reaction.deleteOne(key);
  } else {
    try {
      await Reaction.updateOne(key, { $set: { value } }, { upsert: true });
    } catch (err) {
      // Two requests from the same person at the same instant can both try to insert; the second just updates.
      if (err?.code !== 11000) throw err;
      await Reaction.updateOne(key, { $set: { value } });
    }
  }
  await syncStoredCounts(kind, target);
  const e = (await engagementFor(kind, [target], userId)).get(String(target));
  return { likes: e.likes, dislikes: e.dislikes, myReaction: e.myReaction };
}

// ---------- Leaving ----------

/** Removes everything a member wrote or reacted to, and refreshes the counts their reactions touched. */
export async function removeMemberContent(userId) {
  const posts = await Post.find({ author: userId }, '_id').lean();
  for (const p of posts) {
    await removeComments({ kind: 'post', target: String(p._id) });
    await Reaction.deleteMany({ kind: 'post', target: String(p._id) });
  }
  await Post.deleteMany({ author: userId });

  const mine = await Comment.find({ author: userId }, '_id').lean();
  await Reaction.deleteMany({ kind: 'comment', target: { $in: mine.map((c) => String(c._id)) } });
  await Comment.deleteMany({ author: userId });

  const given = await Reaction.find({ user: userId }, 'kind target').lean();
  await Reaction.deleteMany({ user: userId });
  const touched = new Map(given.map((r) => [`${r.kind}:${r.target}`, r]));
  for (const r of touched.values()) await syncStoredCounts(r.kind, r.target);
}
