/* eslint-disable no-console */
/**
 * Boots a throwaway in-memory MongoDB and prints its URI.
 *
 *   npm run dev:memory          # then, in another terminal:
 *   MONGODB_URI=<printed uri> npm run dev
 *
 * Handy when you don't have a local MongoDB or an Atlas cluster yet.
 * Data is lost when the process exits.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('shopnova');
  console.log('\n🧠 In-memory MongoDB started');
  console.log(`   MONGODB_URI=${uri}\n`);
  console.log('   Use it like this:');
  console.log(`   MONGODB_URI="${uri}" npm run dev`);
  console.log(`   MONGODB_URI="${uri}" npm run seed\n`);
  console.log('   Press Ctrl+C to stop and wipe the data.\n');

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

void main();
