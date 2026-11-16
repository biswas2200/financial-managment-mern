/**
 * Adds eight sample accounts for different ways of living with money (a student, a homemaker, a freelancer,
 * a shop owner, a retiree, a couple saving for a home, an early investor and a resident doctor), each with
 * their own history, categories and budgets.
 *
 *   npm run seed:personas              # adds the ones that are missing
 *   npm run seed:personas -- --refresh # rebuilds just these accounts
 *
 * Local demos only. They all sign in with Demo@1234:
 *   kabir@, nandini@, karthik@, vikas@, mohan@, jasleen@, rohit@, farah@kosha.app
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { seedPersonas } from '../src/seed/persona-seeder.js';
import { PERSONAS, PERSONA_PASSWORD } from '../src/seed/personas.js';

async function main() {
  await connectDatabase(env.mongoUri);
  console.log(`[seed:personas] Connected to ${mongoose.connection.name}`);
  await mongoose.connection.syncIndexes();
  const { created, skipped } = await seedPersonas({ refresh: process.argv.includes('--refresh') });
  console.log(`[seed:personas] Created ${created}, left ${skipped} that already existed.`);
  for (const p of PERSONAS) console.log(`  ${p.email.padEnd(20)} ${p.name} (${p.city}): ${p.story}`);
  console.log(`[seed:personas] Sign in with any of them and ${PERSONA_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed:personas] Failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
