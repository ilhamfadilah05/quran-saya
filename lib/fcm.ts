import { GoogleAuth } from 'google-auth-library';
import { getServerEnv } from '@/lib/env';

export type SendPushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  androidChannelId?: string;
  androidSound?: string;
  apnsSound?: string;
};

type SendPushResult = {
  sent: number;
  failed: number;
  errors: Array<{ token: string; message: string }>;
  results: Array<{ token: string; ok: boolean; error?: string }>;
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: getServerEnv('FCM_CLIENT_EMAIL'),
      private_key: getServerEnv('FCM_PRIVATE_KEY')
    },
    scopes: [FCM_SCOPE]
  });

  const token = await auth.getAccessToken();
  if (!token) {
    throw new Error('Failed to get FCM access token');
  }

  return token;
}

async function sendToToken(token: string, payload: Omit<SendPushPayload, 'tokens'>, accessToken: string) {
  const projectId = getServerEnv('FCM_PROJECT_ID');
  const androidNotification =
    payload.androidChannelId || payload.androidSound
      ? {
          ...(payload.androidChannelId ? { channel_id: payload.androidChannelId } : {}),
          ...(payload.androidSound ? { sound: payload.androidSound } : {})
        }
      : undefined;

  const apnsPayload = payload.apnsSound
    ? {
        aps: {
          sound: payload.apnsSound
        }
      }
    : undefined;

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data,
        ...(androidNotification ? { android: { notification: androidNotification } } : {}),
        ...(apnsPayload ? { apns: { payload: apnsPayload } } : {})
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false as const, error: text };
  }

  return { ok: true as const };
}

export async function sendPushNotification(payload: SendPushPayload): Promise<SendPushResult> {
  const uniqueTokens = [...new Set(payload.tokens.filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, errors: [], results: [] };
  }

  const accessToken = await getAccessToken();
  let sent = 0;
  let failed = 0;
  const errors: Array<{ token: string; message: string }> = [];
  const results: Array<{ token: string; ok: boolean; error?: string }> = [];

  for (const token of uniqueTokens) {
    const result = await sendToToken(token, payload, accessToken);
    if (result.ok) {
      sent += 1;
      results.push({ token, ok: true });
    } else {
      failed += 1;
      errors.push({ token, message: result.error });
      results.push({ token, ok: false, error: result.error });
    }
  }

  return { sent, failed, errors, results };
}
