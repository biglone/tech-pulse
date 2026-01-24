import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TopNav } from '@/components/TopNav';
import { SourcesManager } from '@/components/SourcesManager';

export default async function SourcesPage() {
  const user = await requireUser();

  const [sources, subscriptions] = await Promise.all([
    prisma.source.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.userSource.findMany({
      where: { userId: user.id },
      select: { sourceId: true },
    }),
  ]);

  const subscribedSet = new Set(subscriptions.map((sub) => sub.sourceId));

  const mapped = sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    handle: source.handle,
    tags: source.tags,
    requiresAuth: source.requiresAuth,
    isSubscribed: subscribedSet.has(source.id),
  }));

  return (
    <div className="min-h-screen">
      <TopNav user={user} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">Sources</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Manage subscriptions, add RSS feeds, and enable social platforms when you have keys.
          </p>
        </section>
        <SourcesManager initialSources={mapped} />
      </main>
    </div>
  );
}
