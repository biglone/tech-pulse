'use client';

import { useState } from 'react';

type NotificationSettings = {
  emailEnabled: boolean;
  emailAddress: string | null;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  digestSchedule: string | null;
};

type NotificationSettingsFormProps = {
  initial: NotificationSettings | null;
};

export function NotificationSettingsForm({ initial }: NotificationSettingsFormProps) {
  const [emailEnabled, setEmailEnabled] = useState(initial?.emailEnabled ?? false);
  const [emailAddress, setEmailAddress] = useState(initial?.emailAddress ?? '');
  const [telegramEnabled, setTelegramEnabled] = useState(initial?.telegramEnabled ?? false);
  const [telegramBotToken, setTelegramBotToken] = useState(initial?.telegramBotToken ?? '');
  const [telegramChatId, setTelegramChatId] = useState(initial?.telegramChatId ?? '');
  const [digestSchedule, setDigestSchedule] = useState(initial?.digestSchedule ?? '');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailEnabled,
        emailAddress,
        telegramEnabled,
        telegramBotToken,
        telegramChatId,
        digestSchedule,
      }),
    });

    setStatus(response.ok ? 'Saved.' : 'Failed to save settings.');
  }

  return (
    <form onSubmit={handleSubmit} className="glass space-y-4 rounded-3xl p-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Enable scheduled digests and push to your email or Telegram.
        </p>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(event) => setEmailEnabled(event.target.checked)}
        />
        Email digest
      </label>
      <input
        className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
        placeholder="Email address"
        value={emailAddress}
        onChange={(event) => setEmailAddress(event.target.value)}
      />
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={telegramEnabled}
          onChange={(event) => setTelegramEnabled(event.target.checked)}
        />
        Telegram push
      </label>
      <input
        className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
        placeholder="Telegram bot token"
        value={telegramBotToken}
        onChange={(event) => setTelegramBotToken(event.target.value)}
      />
      <input
        className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
        placeholder="Telegram chat ID"
        value={telegramChatId}
        onChange={(event) => setTelegramChatId(event.target.value)}
      />
      <input
        className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
        placeholder="Digest schedule (cron)"
        value={digestSchedule}
        onChange={(event) => setDigestSchedule(event.target.value)}
      />
      {status && <p className="text-sm text-[var(--ink-soft)]">{status}</p>}
      <button className="btn-primary" type="submit">
        Save settings
      </button>
    </form>
  );
}
