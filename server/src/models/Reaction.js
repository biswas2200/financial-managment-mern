import mongoose from 'mongoose';
import { REACTION_KINDS, REACTION_VALUES } from '@kosha/shared';

/**
 * One person's like or dislike of one thing. The unique index means a person can hold at most one
 * reaction per thing, so counts are plain counts of documents and can never go negative.
 */
const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: REACTION_KINDS, required: true },
    target: { type: String, required: true, maxlength: 80 },
    value: { type: String, enum: REACTION_VALUES, required: true },
  },
  { timestamps: true },
);

reactionSchema.index({ user: 1, kind: 1, target: 1 }, { unique: true });
reactionSchema.index({ kind: 1, target: 1, value: 1 });

export const Reaction = mongoose.models.Reaction ?? mongoose.model('Reaction', reactionSchema);
