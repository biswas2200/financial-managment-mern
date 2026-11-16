/**
 * Adds sample discussions to the database: made-up members with real-looking names who ask and answer
 * questions in Discussions and comment on the articles in Learn.
 *
 *   npm run seed:community
 *
 * Safe to run again. It only adds what is missing and never touches what real members wrote. The sample members
 * cannot be signed in as. Run `npm run seed` first if the database is empty (it is not needed for this script).
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { seedCommunity } from '../src/seed/community-seeder.js';
import { communityTotals } from '../src/seed/community.js';

async function main() {
  await connectDatabase(env.mongoUri);
  console.log(`[seed:community] Connected to ${mongoose.connection.name}`);
  await mongoose.connection.syncIndexes();
  const added = await seedCommunity();
  const total = communityTotals();
  console.log(`[seed:community] Added ${added.members} members, ${added.posts} posts, ${added.comments} comments and ${added.reactions} likes or dislikes.`);
  console.log(`[seed:community] The full set is ${total.members} members, ${total.posts} posts and ${total.comments} comments.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed:community] Failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
