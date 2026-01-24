import { prisma } from '../src/lib/prisma';
import { ensureDefaultSources } from '../src/lib/default-sources';

async function main() {
  const result = await ensureDefaultSources(prisma);
  if (result.created === 0) {
    console.log('Sources already seeded.');
    return;
  }
  console.log(`Seeded ${result.created} sources.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
