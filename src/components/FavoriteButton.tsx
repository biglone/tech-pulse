'use client';

import { useState } from 'react';

type FavoriteButtonProps = {
  itemId: string;
  initial: boolean;
};

export function FavoriteButton({ itemId, initial }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.status === 'added') setIsFavorite(true);
      if (payload.status === 'removed') setIsFavorite(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        isFavorite
          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : 'border-black/10 text-[var(--ink-soft)] hover:border-black/30'
      }`}
    >
      {isFavorite ? 'Saved' : 'Save'}
    </button>
  );
}
