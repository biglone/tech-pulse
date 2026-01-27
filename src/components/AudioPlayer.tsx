'use client';

import { useRef, useState } from 'react';

type AudioPlayerProps = {
  itemId: string;
};

type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';

export function AudioPlayer({ itemId }: AudioPlayerProps) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isLoading = status === 'loading';
  const label =
    status === 'loading' ? 'Generating...' : status === 'error' ? 'Retry' : audioSrc ? 'Play' : 'Listen';

  function handleClick() {
    if (isLoading) return;
    if (!audioSrc) {
      setStatus('loading');
      setAudioSrc(`/api/items/${itemId}/audio`);
      return;
    }
    audioRef.current?.play().catch(() => {
      setStatus('error');
      setAudioSrc(null);
    });
  }

  function handleCanPlay() {
    setStatus('ready');
  }

  function handleError() {
    setStatus('error');
    setAudioSrc(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-full border px-3 py-1 text-xs font-semibold text-[var(--ink-soft)] transition hover:border-black/30"
      >
        {label}
      </button>
      {audioSrc && (
        <audio
          ref={audioRef}
          controls
          preload="none"
          autoPlay
          src={audioSrc}
          onCanPlay={handleCanPlay}
          onError={handleError}
          className="h-8"
        />
      )}
      {status === 'error' && (
        <span className="text-xs text-[var(--accent)]">Audio unavailable.</span>
      )}
    </div>
  );
}
