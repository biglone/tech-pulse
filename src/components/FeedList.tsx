import { Item, Source } from '@prisma/client';
import { FavoriteButton } from '@/components/FavoriteButton';
import { AudioPlayer } from '@/components/AudioPlayer';

export type FeedItem = Item & { source: Source };

type FeedListProps = {
  items: FeedItem[];
  favoriteIds: Set<string>;
};

export function FeedList({ items, favoriteIds }: FeedListProps) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-sm text-[var(--ink-soft)]">
        No signals yet. Try another tag or run a manual ingest.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="glass space-y-3 rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              <span>{item.source.name}</span>
              <span>•</span>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
            <FavoriteButton itemId={item.id} initial={favoriteIds.has(item.id)} />
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" className="group block">
            <h3 className="text-lg font-semibold group-hover:text-[var(--accent)]">
              {item.title}
            </h3>
            {item.summary && (
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.summary}</p>
            )}
            {item.summaryZh && item.summaryZh !== item.summary && (
              <p className="mt-2 text-sm text-[var(--accent-2)]">{item.summaryZh}</p>
            )}
          </a>
          <AudioPlayer itemId={item.id} />
          <div className="flex flex-wrap gap-2">
            {item.tags
              ?.split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
              .slice(0, 6)
              .map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            <span className="chip border-[var(--accent-2)] text-[var(--accent-2)]">
              Score {item.score.toFixed(1)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(date?: Date | null) {
  if (!date) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
