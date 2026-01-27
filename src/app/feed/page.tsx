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
  const sourceParam =
    typeof searchParams?.source === 'string'
      ? searchParams.source
      : Array.isArray(searchParams?.source)
      ? searchParams?.source.join(',')
      : undefined;
  const favoritesParam =
    typeof searchParams?.favorites === 'string'
      ? searchParams.favorites
      : Array.isArray(searchParams?.favorites)
      ? searchParams?.favorites.join(',')
      : undefined;
  const favoritesOnly = favoritesParam === '1' || favoritesParam === 'true';

  const [totalSources, subscriptions] = await Promise.all([
    prisma.source.count(),
    prisma.userSource.findMany({
      where: { userId: user.id },
      select: { sourceId: true, source: { select: { id: true, name: true } } },
    }),
  ]);

  const sourceIds = subscriptions.map((sub) => sub.sourceId);
  const hasSubscriptions = sourceIds.length > 0;
  const subscribedSet = new Set(sourceIds);
  const selectedSourceIds = sourceParam
    ? sourceParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((sourceId) => subscribedSet.has(sourceId))
    : [];
  const activeSourceIds = selectedSourceIds.length > 0 ? selectedSourceIds : sourceIds;
  const subscriptionSources = Array.from(
    new Map(subscriptions.map((sub) => [sub.source.id, sub.source])).values()
  );
  const filterConditions = {
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
    ...(favoritesOnly ? { favorites: { some: { userId: user.id } } } : {}),
  };
  const itemsWhere = hasSubscriptions
    ? {
        sourceId: { in: activeSourceIds },
        ...filterConditions,
      }
    : { id: { equals: '__none__' } };
  const countWhere = hasSubscriptions
    ? {
        sourceId: { in: sourceIds },
        ...filterConditions,
      }
    : { id: { equals: '__none__' } };

  const items = await prisma.item.findMany({
    where: itemsWhere,
    include: { source: true },
    take: 50,
    orderBy:
      sort === 'latest'
        ? [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }]
        : [{ score: 'desc' }, { publishedAt: 'desc' }],
  });
  const sourceCountRows = hasSubscriptions
    ? await prisma.item.groupBy({
        by: ['sourceId'],
        where: countWhere,
        _count: { _all: true },
      })
    : [];
  const sourceCounts: Record<string, number> = Object.fromEntries(
    sourceCountRows.map((row) => [row.sourceId, row._count._all])
  );
  const totalCount = sourceCountRows.reduce((sum, row) => sum + row._count._all, 0);

  let favoriteIds = new Set<string>();
  if (items.length > 0) {
    if (favoritesOnly) {
      favoriteIds = new Set(items.map((item) => item.id));
    } else {
      const favoriteRecords = await prisma.favorite.findMany({
        where: { userId: user.id, itemId: { in: items.map((item) => item.id) } },
        select: { itemId: true },
      });
      favoriteIds = new Set(favoriteRecords.map((fav) => fav.itemId));
    }
  }
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
        <FeedFilters
          tags={tags}
          sources={subscriptionSources}
          sourceCounts={sourceCounts}
          totalCount={totalCount}
        />
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
