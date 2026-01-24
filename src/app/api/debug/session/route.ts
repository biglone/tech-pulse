import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { createHash } from 'crypto';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const cookieNames = request.cookies.getAll().map((item) => item.name);
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');

  if (!token) {
    return NextResponse.json({
      cookiePresent: false,
      cookieNames,
      host,
      origin,
    });
  }

  const session = await prisma.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  return NextResponse.json({
    cookiePresent: true,
    cookieNames,
    host,
    origin,
    sessionFound: Boolean(session),
    user: session?.user
      ? { id: session.user.id, email: session.user.email, name: session.user.name }
      : null,
  });
}
