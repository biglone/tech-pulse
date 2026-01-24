import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TopNav } from '@/components/TopNav';
import { BootstrapButton } from '@/components/BootstrapButton';
import { FeedFilters } from '@/components/FeedFilters';
import { FeedList } from '@/components/FeedList';

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();

  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined;
  const tag = typeof searchParams?.tag === 'string' ? searchParams.tag : undefined;
  const sort = typeof searchParams?.sort === 'string' ? searchParams.sort : 'hot';

  const [totalSources, subscriptions] = await Promise.all([
    prisma.source.count(),
    prisma.userSource.findMany({
      where: { userId: user.id },
      select: { sourceId: true },
    }),
  ]);

  const sourceIds = subscriptions.map((sub) => sub.sourceId);
  const hasSubscriptions = sourceIds.length > 0;
  const where = hasSubscriptions
    ? {
        sourceId: { in: sourceIds },
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { summary: { contains: query } },
                { content: { contains: query } },
              ],
            }
          : {}),
        ...(tag ? { tags: { contains: tag } } : {}),
      }
    : { id: { equals: '__none__' } };

  const items = await prisma.item.findMany({
    where,
    include: { source: true },
    take: 50,
    orderBy:
      sort === 'latest'
        ? [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }]
        : [{ score: 'desc' }, { publishedAt: 'desc' }],
  });

  const favoriteRecords = await prisma.favorite.findMany({
    where: { userId: user.id, itemId: { in: items.map((item) => item.id) } },
    select: { itemId: true },
  });

  const favoriteIds = new Set(favoriteRecords.map((fav) => fav.itemId));
  const tags = Array.from(
    new Set(
      items
        .flatMap((item) => item.tags?.split(',') ?? [])
        .map((tagValue) => tagValue.trim())
        .filter(Boolean)
    )
  );

  return (
    <div className="min-h-screen">
      <TopNav user={user} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">Signal Feed</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Tracking {sourceIds.length} sources with hot ranking and deduplication.
          </p>
        </section>
        <FeedFilters tags={tags} />
        {items.length === 0 ? (
          <div className="glass space-y-4 rounded-3xl p-10 text-sm text-[var(--ink-soft)]">
            {totalSources === 0 ? (
              <>
                <p>No sources yet. Initialize the default global tech sources to start.</p>
                <BootstrapButton />
              </>
            ) : !hasSubscriptions ? (
              <p>No subscriptions yet. Visit Sources to pick feeds to follow.</p>
            ) : (
              <p>No signals yet. Try another tag or run a manual ingest.</p>
            )}
          </div>
        ) : (
          <FeedList items={items} favoriteIds={favoriteIds} />
        )}
      </main>
    </div>
  );
}
