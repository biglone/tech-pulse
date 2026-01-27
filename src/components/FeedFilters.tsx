'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'latest', label: 'Latest' },
];

type FeedFiltersProps = {
  tags: string[];
  sources: { id: string; name: string }[];
  sourceCounts: Record<string, number>;
  totalCount: number;
};

export function FeedFilters({ tags, sources, sourceCounts, totalCount }: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialQuery = searchParams.get('q') ?? '';
  const initialTag = searchParams.get('tag') ?? '';
  const initialSort = searchParams.get('sort') ?? 'hot';
  const initialSource = searchParams.get('source') ?? '';
  const initialFavorites = searchParams.get('favorites') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const [sort, setSort] = useState(initialSort);
  const sourceIdSet = useMemo(() => new Set(sources.map((sourceItem) => sourceItem.id)), [sources]);
  const initialSourceIds = useMemo(() => {
    if (!initialSource.trim()) return [];
    return Array.from(
      new Set(
        initialSource
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .filter((value) => sourceIdSet.has(value))
      )
    );
  }, [initialSource, sourceIdSet]);
  const initialFavoritesOnly = initialFavorites === '1' || initialFavorites === 'true';

  const [sourceIds, setSourceIds] = useState<string[]>(initialSourceIds);
  const [favoritesOnly, setFavoritesOnly] = useState(initialFavoritesOnly);

  useEffect(() => {
    setQuery(initialQuery);
    setTag(initialTag);
    setSort(initialSort);
    setSourceIds(initialSourceIds);
    setFavoritesOnly(initialFavoritesOnly);
  }, [initialQuery, initialTag, initialSort, initialSourceIds, initialFavoritesOnly]);

  const tagOptions = useMemo(() => {
    const unique = Array.from(new Set(tags));
    return unique.slice(0, 12);
  }, [tags]);

  const sourceOptions = useMemo(
    () => [...sources].sort((a, b) => a.name.localeCompare(b.name)),
    [sources]
  );

  function updateParams(next: {
    q?: string;
    tag?: string;
    sort?: string;
    sources?: string[];
    favorites?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set('q', next.q.trim());
      else params.delete('q');
    }
    if (next.tag !== undefined) {
      if (next.tag.trim()) params.set('tag', next.tag.trim());
      else params.delete('tag');
    }
    if (next.sort !== undefined) {
      if (next.sort.trim()) params.set('sort', next.sort.trim());
      else params.delete('sort');
    }
    if (next.sources !== undefined) {
      if (next.sources.length > 0) params.set('source', next.sources.join(','));
      else params.delete('source');
    }
    if (next.favorites !== undefined) {
      if (next.favorites) params.set('favorites', '1');
      else params.delete('favorites');
    }

    startTransition(() => {
      router.push(`/feed?${params.toString()}`);
    });
  }

  function toggleSource(sourceId: string) {
    setSourceIds((prev) => {
      const next = prev.includes(sourceId)
        ? prev.filter((value) => value !== sourceId)
        : [...prev, sourceId];
      updateParams({ sources: next });
      return next;
    });
  }

  function clearSources() {
    setSourceIds([]);
    updateParams({ sources: [] });
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                updateParams({ q: query, sources: sourceIds, favorites: favoritesOnly });
              }
            }}
            placeholder="Search signals, stacks, labs..."
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              updateParams({ sort: event.target.value });
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
            value={tag}
            onChange={(event) => {
              setTag(event.target.value);
              updateParams({ tag: event.target.value });
            }}
          >
            <option value="">All tags</option>
            {tagOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={
              favoritesOnly
                ? 'chip border-[var(--accent-2)] text-[var(--accent-2)]'
                : 'chip'
            }
            onClick={() => {
              const next = !favoritesOnly;
              setFavoritesOnly(next);
              updateParams({ favorites: next });
            }}
          >
            Favorites only
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={() =>
              updateParams({ q: query, tag, sort, sources: sourceIds, favorites: favoritesOnly })
            }
            disabled={isPending}
          >
            Apply
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          Sources
        </span>
        <button
          type="button"
          className={
            sourceIds.length === 0
              ? 'chip border-[var(--accent)] text-[var(--accent)]'
              : 'chip'
          }
          onClick={clearSources}
        >
          All sources ({totalCount})
        </button>
        {sourceOptions.map((option) => {
          const isSelected = sourceIds.includes(option.id);
          const count = sourceCounts[option.id] ?? 0;
          return (
            <button
              key={option.id}
              type="button"
              className={
                isSelected ? 'chip border-[var(--accent)] text-[var(--accent)]' : 'chip'
              }
              onClick={() => toggleSource(option.id)}
            >
              {option.name} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
