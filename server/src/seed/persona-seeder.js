import { POLICY_VERSION } from '@kosha/shared';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { WatchlistItem } from '../models/WatchlistItem.js';
import { seedDefaultCategories } from '../services/category.service.js';
import { removeAccountData } from './accounts.js';
import { PERSONAS, PERSONA_PASSWORD } from './personas.js';
import { generatePersonaBudgets, generatePersonaTransactions } from './persona-generator.js';

/**
 * Creates the sample accounts, each with their own categories, a history of transactions, budgets and (for the
 * investors) a watchlist. An account that already exists is left alone, so it is safe to run again.
 * Pass `refresh: true` to rebuild just these accounts from scratch; nobody else's data is touched.
 * Returns how many accounts were created and how many were skipped.
 */
export async function seedPersonas({ now = new Date(), refresh = false } = {}) {
  const passwordHash = await User.hashPassword(PERSONA_PASSWORD);
  let created = 0;
  let skipped = 0;

  for (const persona of PERSONAS) {
    const existing = await User.findOne({ email: persona.email });
    if (existing && !refresh) {
      skipped += 1;
      continue;
    }
    if (existing) {
      await removeAccountData(existing._id);
      await existing.deleteOne();
    }

    const user = await User.create({
      name: persona.name,
      email: persona.email,
      passwordHash,
      dateOfBirth: persona.dateOfBirth,
      avatar: { type: 'preset', ...persona.avatar },
      openingBalance: persona.openingBalance * 100,
      consent: { termsVersion: POLICY_VERSION, acceptedAt: now },
    });

    const defaults = await seedDefaultCategories(user._id);
    const extras = await Category.insertMany((persona.extraCategories ?? []).map((c) => ({ ...c, user: user._id, isDefault: false })));
    const categories = [...defaults, ...extras].map((c) => ({ id: c._id, name: c.name, type: c.type }));

    await Transaction.insertMany(generatePersonaTransactions({ categories, now, persona }).map((t) => ({ ...t, user: user._id })));
    await Budget.insertMany(generatePersonaBudgets({ categories, now, persona }).map((b) => ({ ...b, user: user._id })));
    if (persona.watchlist?.length) await WatchlistItem.insertMany(persona.watchlist.map((w) => ({ ...w, user: user._id })));
    created += 1;
  }
  return { created, skipped };
}
