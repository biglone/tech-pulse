import 'dotenv/config';
import { ingestAllSources } from '../src/lib/ingest';

async function main() {
  const result = await ingestAllSources();
  console.log(`Ingested from ${result.sources} sources, processed ${result.items} items.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
