import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';

type TopNavProps = {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

export function TopNav({ user }: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[rgba(247,241,233,0.75)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/feed" className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
            <span className="text-lg font-semibold tracking-tight">TechPulse</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium text-[var(--ink-soft)] md:flex">
            <Link href="/feed" className="transition hover:text-[var(--ink)]">
              Feed
            </Link>
            <Link href="/sources" className="transition hover:text-[var(--ink)]">
              Sources
            </Link>
            <Link href="/favorites" className="transition hover:text-[var(--ink)]">
              Favorites
            </Link>
            <Link href="/settings" className="transition hover:text-[var(--ink)]">
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-xs text-[var(--ink-soft)] sm:block">
            {user?.name ?? user?.email}
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
