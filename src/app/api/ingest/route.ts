import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { ingestAllSources } from '@/lib/ingest';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ingestAllSources();
  return NextResponse.json(result);
}
