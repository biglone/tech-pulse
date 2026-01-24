type AuthFormProps = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === 'register';
  const action = isRegister ? '/api/auth/register' : '/api/auth/login';

  return (
    <form action={action} method="POST" className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {isRegister && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            Name
          </label>
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <button className="btn-primary w-full" type="submit">
        {isRegister ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
