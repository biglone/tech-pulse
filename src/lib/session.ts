import { getCurrentUser } from '@/lib/auth';

export async function getSessionUser() {
  const user = await getCurrentUser();
  return user ?? null;
}
