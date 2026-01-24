import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/auth';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect('/feed');
  }

  const errorParam = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const errorMessage =
    errorParam === 'EmailExists'
      ? 'Email already registered. Try signing in.'
      : errorParam === 'InvalidRegistration'
      ? 'Invalid registration data. Please check your inputs.'
      : errorParam === 'ServerError'
      ? 'Registration failed. Please try again.'
      : errorParam
      ? 'Registration failed. Please try again.'
      : null;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <span className="chip">New signal room</span>
          <h1 className="text-3xl font-semibold">Create your TechPulse account</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Start with curated sources and customize the global radar for your stack.
          </p>
          <Link href="/login" className="text-sm font-semibold text-[var(--accent)]">
            Already have an account? Sign in →
          </Link>
        </section>
        <section className="glass rounded-[32px] p-8">
          {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}
          <AuthForm mode="register" />
        </section>
      </div>
    </main>
  );
}
