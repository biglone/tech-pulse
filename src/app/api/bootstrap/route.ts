import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureDefaultSources } from '@/lib/default-sources';
import { ingestAllSources } from '@/lib/ingest';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const seedResult = await ensureDefaultSources(prisma);

  const sources = await prisma.source.findMany({
    where: { active: true },
    select: { id: true },
  });

  if (sources.length > 0) {
    const sourceIds = sources.map((source) => source.id);
    const existing = await prisma.userSource.findMany({
      where: {
        userId: user.id,
        sourceId: { in: sourceIds },
      },
      select: { sourceId: true },
    });
    const existingIds = new Set(existing.map((row) => row.sourceId));
    const newSubscriptions = sources
      .filter((source) => !existingIds.has(source.id))
      .map((source) => ({
        userId: user.id,
        sourceId: source.id,
      }));

    if (newSubscriptions.length > 0) {
      await prisma.userSource.createMany({
        data: newSubscriptions,
      });
    }
  }

  const ingestResult = await ingestAllSources();

  return NextResponse.json({
    seeded: seedResult.created,
    totalSources: seedResult.total,
    subscribed: sources.length,
    items: ingestResult.items,
  });
}
