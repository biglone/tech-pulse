import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { ensureDefaultSources } from '@/lib/default-sources';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(60).optional(),
});

type RegisterPayload = z.infer<typeof registerSchema>;

async function readRegisterPayload(request: Request): Promise<{
  payload: RegisterPayload | null;
  wantsRedirect: boolean;
}> {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsRedirect =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    return { payload: parsed.success ? parsed.data : null, wantsRedirect };
  }

  if (wantsRedirect) {
    const form = await request.formData();
    const raw = Object.fromEntries(form.entries());
    const parsed = registerSchema.safeParse(raw);
    return { payload: parsed.success ? parsed.data : null, wantsRedirect };
  }

  return { payload: null, wantsRedirect };
}

function resolveRedirect(request: Request, path: string) {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL;
  if (baseUrl) {
    return new URL(path, baseUrl);
  }
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedProto && forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }
  return new URL(path, new URL(request.url).origin);
}

export async function POST(request: Request) {
  const { payload, wantsRedirect } = await readRegisterPayload(request);

  if (!payload) {
    if (wantsRedirect) {
      return NextResponse.redirect(resolveRedirect(request, '/register?error=InvalidRegistration'), 303);
    }
    return NextResponse.json({ error: 'Invalid registration data.' }, { status: 400 });
  }

  await ensureDefaultSources(prisma);

  const emailRaw = payload.email.trim();
  const email = emailRaw.toLowerCase();
  const { password, name } = payload;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: emailRaw }, { email }] },
  });

  if (existing) {
    if (wantsRedirect) {
      return NextResponse.redirect(resolveRedirect(request, '/register?error=EmailExists'), 303);
    }
    return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name: name?.trim() || null,
      passwordHash,
      notificationSettings: {
        create: {},
      },
    },
  });

  const sources = await prisma.source.findMany({
    where: { active: true },
    select: { id: true },
  });

  if (sources.length > 0) {
    await prisma.userSource.createMany({
      data: sources.map((source) => ({
        userId: user.id,
        sourceId: source.id,
      })),
    });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = wantsRedirect
    ? NextResponse.redirect(resolveRedirect(request, '/feed'), 303)
    : NextResponse.json({ ok: true, redirect: '/feed' });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false,
    expires: expiresAt,
  });
  return response;
}
