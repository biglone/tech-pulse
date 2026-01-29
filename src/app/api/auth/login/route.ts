import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginPayload = z.infer<typeof loginSchema>;

async function readLoginPayload(request: Request): Promise<{
  payload: LoginPayload | null;
  wantsRedirect: boolean;
}> {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsRedirect =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    return { payload: parsed.success ? parsed.data : null, wantsRedirect };
  }

  if (wantsRedirect) {
    const form = await request.formData();
    const raw = Object.fromEntries(form.entries());
    const parsed = loginSchema.safeParse(raw);
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
  const { payload, wantsRedirect } = await readLoginPayload(request);
  if (!payload) {
    if (wantsRedirect) {
      return NextResponse.redirect(resolveRedirect(request, '/login?error=InvalidLogin'), 303);
    }
    return NextResponse.json({ error: 'Invalid login data.' }, { status: 400 });
  }

  const emailRaw = payload.email.trim();
  const email = emailRaw.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailRaw }, { email }] },
  });

  if (!user) {
    if (wantsRedirect) {
      return NextResponse.redirect(resolveRedirect(request, '/login?error=InvalidCredentials'), 303);
    }
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const isValid = await verifyPassword(payload.password, user.passwordHash);
  if (!isValid) {
    if (wantsRedirect) {
      return NextResponse.redirect(resolveRedirect(request, '/login?error=InvalidCredentials'), 303);
    }
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
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
