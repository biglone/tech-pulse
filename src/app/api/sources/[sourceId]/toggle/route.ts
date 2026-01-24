import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function POST(
  _request: Request,
  { params }: { params: { sourceId: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const source = await prisma.source.findUnique({ where: { id: params.sourceId } });
  if (!source) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }

  const existing = await prisma.userSource.findUnique({
    where: { userId_sourceId: { userId: user.id, sourceId: source.id } },
  });

  if (existing) {
    await prisma.userSource.delete({ where: { id: existing.id } });
    return NextResponse.json({ status: 'unsubscribed' });
  }

  await prisma.userSource.create({
    data: { userId: user.id, sourceId: source.id },
  });

  return NextResponse.json({ status: 'subscribed' });
}
