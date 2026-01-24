'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BootstrapButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleBootstrap() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/bootstrap', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to initialize sources.');
      }
      setStatus(`Seeded ${payload.seeded} sources and pulled ${payload.items} items.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to initialize sources.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="btn-primary"
        type="button"
        onClick={handleBootstrap}
        disabled={loading}
      >
        {loading ? 'Initializing...' : 'Initialize default sources'}
      </button>
      {status && <p className="text-xs text-[var(--ink-soft)]">{status}</p>}
    </div>
  );
}
