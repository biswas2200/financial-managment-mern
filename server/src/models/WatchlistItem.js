import mongoose from 'mongoose';
import { WATCH_KINDS } from '@kosha/shared';
import { toJSONPlugin } from './plugins/toJSON.js';

const watchlistItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: WATCH_KINDS, required: true },
    /** A stock symbol, an index name or a mutual fund scheme code. */
    ref: { type: String, required: true, trim: true, maxlength: 80 },
    /** Kept so the list can still be shown when the market data source is down. */
    label: { type: String, required: true, trim: true, maxlength: 160 },
  },
  { timestamps: true },
);

watchlistItemSchema.index({ user: 1, kind: 1, ref: 1 }, { unique: true });
watchlistItemSchema.plugin(toJSONPlugin);

export const WatchlistItem = mongoose.models.WatchlistItem ?? mongoose.model('WatchlistItem', watchlistItemSchema);
