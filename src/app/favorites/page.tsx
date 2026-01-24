import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TopNav } from '@/components/TopNav';
import { FeedList } from '@/components/FeedList';

export default async function FavoritesPage() {
  const user = await requireUser();

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: { item: { include: { source: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const items = favorites.map((favorite) => favorite.item);
  const favoriteIds = new Set(items.map((item) => item.id));

  return (
    <div className="min-h-screen">
      <TopNav user={user} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold">Favorites</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Your saved reads and watchlist across sources.
          </p>
        </section>
        <FeedList items={items} favoriteIds={favoriteIds} />
      </main>
    </div>
  );
}
