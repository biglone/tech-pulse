'use client';

import { useState } from 'react';

export type SourceItem = {
  id: string;
  name: string;
  type: string;
  url?: string | null;
  handle?: string | null;
  tags?: string | null;
  requiresAuth: boolean;
  isSubscribed: boolean;
};

const SOURCE_TYPES = ['RSS', 'HN', 'REDDIT', 'MEDIUM', 'SUBSTACK', 'X', 'YOUTUBE'];

type SourcesManagerProps = {
  initialSources: SourceItem[];
};

export function SourcesManager({ initialSources }: SourcesManagerProps) {
  const [sources, setSources] = useState(initialSources);
  const [name, setName] = useState('');
  const [type, setType] = useState('RSS');
  const [url, setUrl] = useState('');
  const [handle, setHandle] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSource(sourceId: string) {
    const response = await fetch(`/api/sources/${sourceId}/toggle`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return;

    setSources((prev) =>
      prev.map((source) =>
        source.id === sourceId
          ? { ...source, isSubscribed: payload.status === 'subscribed' }
          : source
      )
    );
  }

  async function createSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          url: url || undefined,
          handle: handle || undefined,
          tags: tags || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create source.');
      }

      setSources((prev) => [
        { ...payload.source, isSubscribed: true },
        ...prev,
      ]);
      setName('');
      setUrl('');
      setHandle('');
      setTags('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const needsUrl = ['RSS', 'MEDIUM', 'SUBSTACK'].includes(type);
  const needsHandle = ['REDDIT', 'X', 'YOUTUBE'].includes(type);

  return (
    <div className="space-y-8">
      <form onSubmit={createSource} className="glass grid gap-4 rounded-3xl p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold">Add new source</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Bring your own RSS, community feeds, or platform searches.
          </p>
        </div>
        <label className="text-sm font-semibold">
          Name
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="text-sm font-semibold">
          Type
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {SOURCE_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {needsUrl && (
          <label className="text-sm font-semibold md:col-span-2">
            Feed URL
            <input
              type="url"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </label>
        )}
        {needsHandle && (
          <label className="text-sm font-semibold md:col-span-2">
            Handle / Query
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              required
            />
          </label>
        )}
        <label className="text-sm font-semibold md:col-span-2">
          Tags (comma separated)
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add source'}
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <div key={source.id} className="glass flex flex-col gap-3 rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">{source.name}</h3>
                <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                  {source.type}
                </p>
              </div>
              <button
                className={source.isSubscribed ? 'btn-primary' : 'btn-ghost'}
                type="button"
                onClick={() => toggleSource(source.id)}
              >
                {source.isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
            {source.url && (
              <p className="text-xs text-[var(--ink-soft)]">{source.url}</p>
            )}
            {source.handle && (
              <p className="text-xs text-[var(--ink-soft)]">{source.handle}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {source.tags
                ?.split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              {source.requiresAuth && (
                <span className="chip border-[var(--accent)] text-[var(--accent)]">
                  API key required
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
