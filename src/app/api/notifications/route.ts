import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const settingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().optional().or(z.literal('')),
  telegramChatId: z.string().optional().or(z.literal('')),
  digestSchedule: z.string().optional().or(z.literal('')),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.notificationSettings.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings.' }, { status: 400 });
  }

  const data = parsed.data;

  const settings = await prisma.notificationSettings.upsert({
    where: { userId: user.id },
    update: {
      emailEnabled: data.emailEnabled ?? undefined,
      emailAddress: data.emailAddress ?? undefined,
      telegramEnabled: data.telegramEnabled ?? undefined,
      telegramBotToken: data.telegramBotToken ?? undefined,
      telegramChatId: data.telegramChatId ?? undefined,
      digestSchedule: data.digestSchedule ?? undefined,
    },
    create: {
      userId: user.id,
      emailEnabled: data.emailEnabled ?? false,
      emailAddress: data.emailAddress ?? null,
      telegramEnabled: data.telegramEnabled ?? false,
      telegramBotToken: data.telegramBotToken ?? null,
      telegramChatId: data.telegramChatId ?? null,
      digestSchedule: data.digestSchedule ?? null,
    },
  });

  return NextResponse.json({ settings });
}
