import mongoose from 'mongoose';
import { SPACE_IDS, COMMUNITY_LIMITS } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    space: { type: String, enum: SPACE_IDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: COMMUNITY_LIMITS.title },
    body: { type: String, required: true, maxlength: COMMUNITY_LIMITS.post },
    // Kept up to date from the reactions collection (see community.service). Two separate counts, never below zero.
    likes: { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
    // likes - dislikes. Only used to order the "top" list; it is never sent to the browser.
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
);

postSchema.index({ space: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
postSchema.plugin(toJSONPlugin);

export const Post = mongoose.models.Post ?? mongoose.model('Post', postSchema);
