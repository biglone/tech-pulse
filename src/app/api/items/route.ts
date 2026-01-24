import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const tag = searchParams.get('tag')?.trim();
  const sort = searchParams.get('sort') ?? 'hot';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);

  const subscriptions = await prisma.userSource.findMany({
    where: { userId: user.id },
    select: { sourceId: true },
  });

  const sourceIds = subscriptions.map((sub) => sub.sourceId);
  if (sourceIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const where: Prisma.ItemWhereInput = {
    sourceId: { in: sourceIds },
  };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { summary: { contains: query } },
      { content: { contains: query } },
    ];
  }

  if (tag) {
    where.tags = { contains: tag };
  }

  const items = await prisma.item.findMany({
    where,
    include: { source: true },
    take: limit,
    orderBy:
      sort === 'latest'
        ? [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }]
        : [{ score: 'desc' }, { publishedAt: 'desc' }],
  });

  return NextResponse.json({ items });
}
