import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { sendEmail, sendTelegram } from '../src/lib/notifications';

const windowHours = Number(process.env.DIGEST_WINDOW_HOURS ?? 24);

async function main() {
  const users = await prisma.user.findMany({
    include: { notificationSettings: true, subscriptions: true },
  });

  const since = new Date(Date.now() - windowHours * 3600000);

  for (const user of users) {
    const settings = user.notificationSettings;
    if (!settings) continue;

    const hasEmail = settings.emailEnabled && settings.emailAddress;
    const hasTelegram =
      settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId;

    if (!hasEmail && !hasTelegram) continue;

    const sourceIds = user.subscriptions.map((sub) => sub.sourceId);
    if (sourceIds.length === 0) continue;

    const items = await prisma.item.findMany({
      where: {
        sourceId: { in: sourceIds },
        publishedAt: { gte: since },
      },
      include: { source: true },
      orderBy: [{ score: 'desc' }, { publishedAt: 'desc' }],
      take: 10,
    });

    if (items.length === 0) continue;

    const subject = `TechPulse Digest (${items.length} signals)`;
    const textLines = items.map(
      (item, index) => `${index + 1}. ${item.title} (${item.source.name})\n${item.url}`
    );
    const text = `TechPulse Digest\n\n${textLines.join('\n\n')}`;
    const htmlItems = items
      .map(
        (item) =>
          `<li><a href="${item.url}">${escapeHtml(item.title)}</a> <em>${escapeHtml(
            item.source.name
          )}</em></li>`
      )
      .join('');
    const html = `<h2>TechPulse Digest</h2><ol>${htmlItems}</ol>`;

    if (hasEmail) {
      await sendEmail({
        to: settings.emailAddress ?? user.email,
        subject,
        text,
        html,
      });
    }

    if (hasTelegram) {
      const telegramText = `*TechPulse Digest*\n\n${items
        .map((item, index) => `${index + 1}. ${item.title}\n${item.url}`)
        .join('\n\n')}`;
      await sendTelegram({
        token: settings.telegramBotToken ?? '',
        chatId: settings.telegramChatId ?? '',
        text: telegramText,
      });
    }

    await prisma.notificationSettings.update({
      where: { userId: user.id },
      data: { lastSentAt: new Date() },
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
