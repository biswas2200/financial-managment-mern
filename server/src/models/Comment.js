import mongoose from 'mongoose';
import { COMMENT_TARGET_KINDS, COMMUNITY_LIMITS } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** What it is attached to: an article (target is its slug) or a post (target is its id). */
    kind: { type: String, enum: COMMENT_TARGET_KINDS, required: true },
    target: { type: String, required: true, maxlength: 80 },
    body: { type: String, required: true, maxlength: COMMUNITY_LIMITS.comment },
    likes: { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
);

commentSchema.index({ kind: 1, target: 1, createdAt: 1 });
commentSchema.index({ kind: 1, target: 1, score: -1, createdAt: -1 });
commentSchema.plugin(toJSONPlugin);

export const Comment = mongoose.models.Comment ?? mongoose.model('Comment', commentSchema);
