import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect('/feed');
  }

  const errorParam = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const registered = searchParams?.registered === '1';
  const errorMessage =
    errorParam === 'CredentialsSignin' || errorParam === 'InvalidCredentials'
      ? 'Email or password is incorrect.'
      : errorParam === 'EmailExists'
      ? 'Account already exists. Please sign in.'
      : errorParam === 'InvalidLogin'
      ? 'Invalid login data. Please check your inputs.'
      : errorParam === 'ServerError'
      ? 'Login failed. Please try again.'
      : errorParam
      ? 'Login failed. Please try again.'
      : null;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <span className="chip">Welcome back</span>
          <h1 className="text-3xl font-semibold">Sign in to TechPulse</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Your global feed, hot-ranked and ready for action.
          </p>
          <Link href="/register" className="text-sm font-semibold text-[var(--accent)]">
            Need an account? Create one →
          </Link>
        </section>
        <section className="glass rounded-[32px] p-8">
          {registered && !errorMessage && (
            <p className="mb-4 text-sm text-emerald-700">
              Account created. Please sign in.
            </p>
          )}
          {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}
