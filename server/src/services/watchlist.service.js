import { MAX_WATCHLIST } from '@kosha/shared';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { ApiError } from '../utils/ApiError.js';

const brief = (item) => ({ id: String(item._id), kind: item.kind, ref: item.ref, label: item.label });

/** The saved entries with the latest end-of-day figures; an entry whose figures cannot be fetched is still listed. */
export async function listWatchlist(userId, markets) {
  const items = await WatchlistItem.find({ user: userId }).sort({ createdAt: 1, _id: 1 });
  const described = await Promise.allSettled(items.map((i) => markets.describe(i.kind, i.ref)));
  return {
    items: items.map((item, n) => {
      const d = described[n];
      const live = d.status === 'fulfilled' ? d.value : null;
      return { ...brief(item), label: live?.label ?? item.label, price: live?.price ?? null, changePct: live?.changePct ?? null, asOf: live?.asOf ?? null };
    }),
  };
}

/** Adds something to watch. Returns { item, created }; adding it again just returns the existing entry. */
export async function addToWatchlist(userId, { kind, ref }, markets) {
  const found = await markets.describe(kind, ref); // 404 if it does not exist
  const key = { user: userId, kind, ref: found.ref };
  const existing = await WatchlistItem.findOne(key);
  if (existing) return { item: brief(existing), created: false };
  if ((await WatchlistItem.countDocuments({ user: userId })) >= MAX_WATCHLIST) {
    throw ApiError.conflict(`Your watchlist is full (${MAX_WATCHLIST} entries). Remove one to add another.`);
  }
  try {
    const item = await WatchlistItem.create({ ...key, label: found.label });
    return { item: brief(item), created: true };
  } catch (err) {
    if (err?.code !== 11000) throw err; // the same entry was added at the same moment
    return { item: brief(await WatchlistItem.findOne(key)), created: false };
  }
}

export async function removeFromWatchlist(userId, id) {
  const { deletedCount } = await WatchlistItem.deleteOne({ _id: id, user: userId });
  if (!deletedCount) throw ApiError.notFound('That entry is not on your watchlist');
}
