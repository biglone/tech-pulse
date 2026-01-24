'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'latest', label: 'Latest' },
];

type FeedFiltersProps = {
  tags: string[];
};

export function FeedFilters({ tags }: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialQuery = searchParams.get('q') ?? '';
  const initialTag = searchParams.get('tag') ?? '';
  const initialSort = searchParams.get('sort') ?? 'hot';

  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const [sort, setSort] = useState(initialSort);

  useEffect(() => {
    setQuery(initialQuery);
    setTag(initialTag);
    setSort(initialSort);
  }, [initialQuery, initialTag, initialSort]);

  const tagOptions = useMemo(() => {
    const unique = Array.from(new Set(tags));
    return unique.slice(0, 12);
  }, [tags]);

  function updateParams(next: { q?: string; tag?: string; sort?: string }) {
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

    startTransition(() => {
      router.push(`/feed?${params.toString()}`);
    });
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') updateParams({ q: query });
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
          className="btn-ghost"
          type="button"
          onClick={() => updateParams({ q: query, tag, sort })}
          disabled={isPending}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
