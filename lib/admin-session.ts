import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env';

export const ADMIN_SESSION_COOKIE = 'quran_saya_admin_session';

type AdminSessionPayload = {
  adminId: string;
  email: string;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', getServerEnv('ADMIN_SESSION_SECRET')).update(value).digest('base64url');
}

export function createAdminSessionToken(adminId: string, email: string, ttlSeconds = 60 * 60 * 24 * 7) {
  const payload: AdminSessionPayload = {
    adminId,
    email,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    if (!payload.adminId || !payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!rawToken) {
    return null;
  }

  return verifyAdminSessionToken(rawToken);
}
