import 'dotenv/config';
import cron from 'node-cron';
import { ingestAllSources } from '../src/lib/ingest';

const schedule = process.env.INGEST_CRON ?? '*/10 * * * *';

async function run() {
  const result = await ingestAllSources();
  console.log(`[${new Date().toISOString()}] Sources: ${result.sources}, Items: ${result.items}`);
}

console.log(`Worker started with schedule: ${schedule}`);
run();
cron.schedule(schedule, () => {
  run().catch((error) => console.error('Scheduled ingest failed', error));
});
