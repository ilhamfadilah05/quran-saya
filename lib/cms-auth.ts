import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';

export async function requireAdminPageSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function canAccessCronRoute(request: Request) {
  const session = await getAdminSession();
  if (session) {
    return true;
  }

  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const provided =
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(request.url).searchParams.get('secret');

  return provided === expectedSecret;
}
