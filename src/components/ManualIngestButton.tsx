'use client';

import { useState } from 'react';

export function ManualIngestButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runIngest() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/ingest', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Failed to ingest.');
      setStatus(`Pulled ${payload.items} items from ${payload.sources} sources.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to ingest.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-6">
      <h2 className="text-lg font-semibold">Manual ingest</h2>
      <p className="text-sm text-[var(--ink-soft)]">
        Trigger a one-off sync when you add new sources.
      </p>
      <button className="btn-primary w-fit" type="button" onClick={runIngest} disabled={loading}>
        {loading ? 'Syncing...' : 'Run ingest'}
      </button>
      {status && <p className="text-sm text-[var(--ink-soft)]">{status}</p>}
    </div>
  );
}
