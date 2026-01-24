'use client';

export function SignOutButton() {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.assign('/');
  }

  return (
    <button className="btn-ghost" onClick={handleSignOut} type="button">
      Sign out
    </button>
  );
}
