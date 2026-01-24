import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/feed');
  }

  return (
    <main className="px-6 pb-20 pt-16">
      <div className="mx-auto max-w-6xl space-y-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="chip">Global Tech Radar</span>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              TechPulse keeps your global tech signals in one place.
            </h1>
            <p className="text-base text-[var(--ink-soft)] md:text-lg">
              Track Hacker News, Reddit, RSS, Medium, Substack, and more. Filter by
              tags, deduplicate noise, and keep your personal watchlist always fresh.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary">
                Create account
              </Link>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
          <div className="glass rounded-[32px] p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                <span>Live pulse</span>
                <span>Now</span>
              </div>
              {['AI infrastructure shift in 2025', 'Rust tooling goes enterprise', 'Open-source search stack roundup'].map(
                (title) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-black/5 bg-white/70 p-4"
                  >
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      Scored, tagged, and ready for your briefing.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Signal capture',
              description: 'Pulls fresh content from global sources on a schedule you control.',
            },
            {
              title: 'Smart sorting',
              description: 'Ranks by freshness + engagement so the right stories bubble up.',
            },
            {
              title: 'Personal layer',
              description: 'Save, tag, and curate your own lens across teams and topics.',
            },
          ].map((card) => (
            <div key={card.title} className="glass rounded-3xl p-6">
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-[32px] border border-black/5 bg-white/70 p-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-semibold">Ready to wire your feed?</h2>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Start with our default sources, then add your own RSS, YouTube queries, or X
              searches when you have API keys.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link href="/register" className="btn-primary">
              Launch TechPulse
            </Link>
            <Link href="/login" className="btn-ghost">
              I already have an account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
