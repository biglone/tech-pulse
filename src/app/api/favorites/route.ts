import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const favoriteSchema = z.object({
  itemId: z.string().min(1),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { item: { include: { source: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    items: favorites.map((favorite) => favorite.item),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = favoriteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const { itemId } = parsed.data;
  const existing = await prisma.favorite.findUnique({
    where: { userId_itemId: { userId: user.id, itemId } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ status: 'removed' });
  }

  await prisma.favorite.create({
    data: { userId: user.id, itemId },
  });

  return NextResponse.json({ status: 'added' });
}
