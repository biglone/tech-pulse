import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { SOURCE_TYPES } from '@/lib/source-types';

const sourceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(SOURCE_TYPES),
  url: z.string().url().optional(),
  handle: z.string().min(1).max(200).optional(),
  tags: z.string().max(200).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [sources, subscriptions] = await Promise.all([
    prisma.source.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.userSource.findMany({
      where: { userId: user.id },
      select: { sourceId: true },
    }),
  ]);

  const subscribedSet = new Set(subscriptions.map((sub) => sub.sourceId));

  return NextResponse.json({
    sources: sources.map((source) => ({
      ...source,
      isSubscribed: subscribedSet.has(source.id),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = sourceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid source data.' }, { status: 400 });
  }

  const { name, type, url, handle, tags } = parsed.data;

  if (['RSS', 'MEDIUM', 'SUBSTACK'].includes(type) && !url) {
    return NextResponse.json({ error: 'URL is required for RSS sources.' }, { status: 400 });
  }

  if (['REDDIT', 'X', 'YOUTUBE'].includes(type) && !handle) {
    return NextResponse.json({ error: 'Handle is required for this source.' }, { status: 400 });
  }

  const source = await prisma.source.create({
    data: {
      name,
      type,
      url,
      handle,
      tags,
      ownerId: user.id,
      requiresAuth: type === 'X' || type === 'YOUTUBE',
    },
  });

  await prisma.userSource.create({
    data: { userId: user.id, sourceId: source.id },
  });

  return NextResponse.json({ source });
}
