import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins/toJSON.js';

const pendingActionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['create_transaction', 'set_budget'], required: true },
    /** Validated API payload that will be written on confirmation. */
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Display-friendly version for the confirmation card. */
    preview: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'confirming', 'confirmed', 'cancelled'], default: 'pending' },
    resultId: { type: String },
    resolvedAt: { type: Date },
  },
  { _id: false },
);

const assistantMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    /** Which engine produced an assistant reply: "gemini" or "offline". */
    provider: { type: String },
    toolCalls: { type: [String], default: undefined },
    /** Chart/table payload rendered next to the reply. */
    data: { type: mongoose.Schema.Types.Mixed },
    pendingAction: { type: pendingActionSchema, default: undefined },
  },
  { timestamps: true },
);

assistantMessageSchema.index({ user: 1, createdAt: -1 });
assistantMessageSchema.plugin(toJSONPlugin);

export const AssistantMessage =
  mongoose.models.AssistantMessage ?? mongoose.model('AssistantMessage', assistantMessageSchema);
