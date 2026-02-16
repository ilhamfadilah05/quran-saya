import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/fcm';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/admin-session';
import { validateFcmEnv, validateSupabaseEnv } from '@/lib/env';

const payloadSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  prayerName: z.string().min(1),
  city: z.string().min(1),
  timezone: z.string().min(1),
  data: z.record(z.string()).optional()
});

function isAdzanPrayerName(value: string) {
  const key = value.trim().toLowerCase();
  return ['subuh', 'fajr', 'dzuhur', 'dhuhr', 'zuhur', 'ashar', 'asr', 'maghrib', 'isya', 'isha'].includes(key);
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    validateSupabaseEnv();
    validateFcmEnv();
    const payload = payloadSchema.parse(await request.json());

    const supabase = getSupabaseServerClient();
    const { data: userRows, error: tokenError } = await supabase
      .from('users')
      .select('id, token_firebase')
      .not('token_firebase', 'is', null)
      .neq('token_firebase', '');

    if (tokenError) {
      return NextResponse.json({ ok: false, error: tokenError.message }, { status: 500 });
    }

    const recipients = (userRows ?? []) as Array<{ id: string; token_firebase: string }>;
    if (recipients.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          sent: 0,
          failed: 0,
          targeted: 0,
          warning: 'Tidak ada user dengan token_firebase aktif.'
        },
        { status: 200 }
      );
    }

    const tokenToUserId = new Map(recipients.map((recipient) => [recipient.token_firebase, recipient.id]));
    const useAdzanSound = isAdzanPrayerName(payload.prayerName);

    const sendResult = await sendPushNotification({
      tokens: recipients.map((recipient) => recipient.token_firebase),
      title: payload.title,
      body: payload.body,
      ...(useAdzanSound
        ? {
            androidChannelId: process.env.ADZAN_ANDROID_CHANNEL_ID ?? 'adzan_channel',
            androidSound: process.env.ADZAN_ANDROID_SOUND ?? 'adzan',
            apnsSound: process.env.ADZAN_APNS_SOUND ?? 'adzan.caf'
          }
        : {}),
      data: {
        type: 'manual',
        prayer_name: payload.prayerName,
        city: payload.city,
        timezone: payload.timezone,
        ...(payload.data ?? {})
      }
    });

    const logs = sendResult.results
      .map((result) => {
        const userId = tokenToUserId.get(result.token);
        if (!userId) return null;

        return {
          user_id: userId,
          source_type: 'manual',
          category: payload.prayerName.toLowerCase(),
          title: payload.title,
          body: payload.body,
          status: result.ok ? 'sent' : 'failed',
          error_message: result.ok ? null : result.error ?? 'Unknown error',
          scheduled_time: null,
          metadata: {
            city: payload.city,
            timezone: payload.timezone,
            trigger_by: session.email,
            custom_data: payload.data ?? {}
          },
          sent_at: result.ok ? new Date().toISOString() : null
        };
      })
      .filter(Boolean);

    if (logs.length > 0) {
      await supabase.from('notification_logs').insert(logs);
    }

    return NextResponse.json(
      {
        ok: true,
        sent: sendResult.sent,
        failed: sendResult.failed,
        targeted: recipients.length
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
