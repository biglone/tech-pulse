import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TopNav } from '@/components/TopNav';
import { NotificationSettingsForm } from '@/components/NotificationSettingsForm';
import { ManualIngestButton } from '@/components/ManualIngestButton';

export default async function SettingsPage() {
  const user = await requireUser();

  const settings = await prisma.notificationSettings.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="min-h-screen">
      <TopNav user={user} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Configure notifications, API keys, and sync routines.
          </p>
        </section>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <NotificationSettingsForm initial={settings} />
          <div className="space-y-6">
            <ManualIngestButton />
            <div className="glass space-y-3 rounded-3xl p-6">
              <h2 className="text-lg font-semibold">API keys</h2>
              <p className="text-sm text-[var(--ink-soft)]">
                Add credentials in your <code>.env</code> to enable X and YouTube ingestion.
              </p>
              <ul className="text-xs text-[var(--ink-soft)]">
                <li>• X_BEARER_TOKEN</li>
                <li>• YOUTUBE_API_KEY</li>
                <li>• REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
