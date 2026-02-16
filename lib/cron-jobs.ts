import { getSupabaseServerClient } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/fcm';

export type CronJobResult = {
  ok: boolean;
  job: 'adzan' | 'reminder';
  processed: number;
  sent: number;
  failed: number;
  time: string;
  timeZone: string;
  message?: string;
};

type AdzanRow = {
  user_id: string | null;
  city_name: string | null;
  is_subuh: boolean | null;
  is_dzuhur: boolean | null;
  is_ashar: boolean | null;
  is_maghrib: boolean | null;
  is_isya: boolean | null;
  subuh_time: string | null;
  dzuhur_time: string | null;
  ashar_time: string | null;
  maghrib_time: string | null;
  isya_time: string | null;
};

type ReminderRow = {
  id: string;
  title: string;
  body: string;
};

function getNowParts(timeZone: string) {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA', { timeZone });
  const hhmm = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  });

  return { date, hhmm };
}

function pickPrayer(row: AdzanRow, hhmm: string) {
  if (row.is_subuh && row.subuh_time === hhmm) return { key: 'subuh', label: 'Subuh' };
  if (row.is_dzuhur && row.dzuhur_time === hhmm) return { key: 'dzuhur', label: 'Dzuhur' };
  if (row.is_ashar && row.ashar_time === hhmm) return { key: 'ashar', label: 'Ashar' };
  if (row.is_maghrib && row.maghrib_time === hhmm) return { key: 'maghrib', label: 'Maghrib' };
  if (row.is_isya && row.isya_time === hhmm) return { key: 'isya', label: 'Isya' };
  return null;
}

export async function runAdzanCron(): Promise<CronJobResult> {
  const supabase = getSupabaseServerClient();
  const timeZone = process.env.APP_TIMEZONE ?? 'Asia/Jakarta';
  const adzanChannelId = process.env.ADZAN_ANDROID_CHANNEL_ID ?? 'adzan_channel';
  const adzanAndroidSound = process.env.ADZAN_ANDROID_SOUND ?? 'adzan';
  const adzanApnsSound = process.env.ADZAN_APNS_SOUND ?? 'adzan.caf';
  const { date, hhmm } = getNowParts(timeZone);

  const orClause = [
    `and(is_subuh.eq.true,subuh_time.eq.${hhmm})`,
    `and(is_dzuhur.eq.true,dzuhur_time.eq.${hhmm})`,
    `and(is_ashar.eq.true,ashar_time.eq.${hhmm})`,
    `and(is_maghrib.eq.true,maghrib_time.eq.${hhmm})`,
    `and(is_isya.eq.true,isya_time.eq.${hhmm})`
  ].join(',');

  const { data: adzanRows, error: adzanError } = await supabase
    .from('adzan_notification')
    .select(
      'user_id, city_name, is_subuh, is_dzuhur, is_ashar, is_maghrib, is_isya, subuh_time, dzuhur_time, ashar_time, maghrib_time, isya_time'
    )
    .or(orClause);

  if (adzanError) {
    throw new Error(adzanError.message);
  }

  const rows = (adzanRows ?? []) as AdzanRow[];
  if (rows.length === 0) {
    await supabase.from('cron_job_runs').insert({
      job_name: 'adzan',
      status: 'success',
      note: `No schedule for ${hhmm}`
    });

    return { ok: true, job: 'adzan', processed: 0, sent: 0, failed: 0, time: hhmm, timeZone, message: 'No schedule' };
  }

  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, token_firebase')
    .in('id', userIds)
    .not('token_firebase', 'is', null)
    .neq('token_firebase', '');

  if (userError) {
    throw new Error(userError.message);
  }

  const userTokenMap = new Map((users ?? []).map((user) => [user.id as string, user.token_firebase as string]));

  const prepared = rows
    .map((row) => {
      if (!row.user_id) return null;
      const token = userTokenMap.get(row.user_id);
      if (!token) return null;

      const prayer = pickPrayer(row, hhmm);
      if (!prayer) return null;

      const city = row.city_name ?? 'kota Anda';
      const title = `Waktu Adzan ${prayer.label}`;
      const body = `Sudah masuk waktu ${prayer.label} di ${city}. Yuk tunaikan sholat.`;
      const dedupeKey = `adzan:${date}:${hhmm}:${row.user_id}:${prayer.key}`;

      return {
        dedupeKey,
        userId: row.user_id,
        token,
        title,
        body,
        prayerKey: prayer.key,
        city
      };
    })
    .filter(Boolean) as Array<{
    dedupeKey: string;
    userId: string;
    token: string;
    title: string;
    body: string;
    prayerKey: string;
    city: string;
  }>;

  if (prepared.length === 0) {
    await supabase.from('cron_job_runs').insert({
      job_name: 'adzan',
      status: 'success',
      processed_count: rows.length,
      note: `No eligible tokens for ${hhmm}`
    });

    return { ok: true, job: 'adzan', processed: rows.length, sent: 0, failed: 0, time: hhmm, timeZone, message: 'No eligible users' };
  }

  const insertRows = prepared.map((item) => ({
    user_id: item.userId,
    source_type: 'adzan',
    category: item.prayerKey,
    title: item.title,
    body: item.body,
    status: 'queued',
    scheduled_time: hhmm,
    dedupe_key: item.dedupeKey,
    metadata: {
      prayer_key: item.prayerKey,
      city: item.city,
      date,
      time: hhmm
    }
  }));

  const { data: queuedRows, error: queueError } = await supabase
    .from('notification_logs')
    .upsert(insertRows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('id, dedupe_key');

  if (queueError) {
    throw new Error(queueError.message);
  }

  const queued = queuedRows ?? [];
  let sent = 0;
  let failed = 0;

  for (const row of queued) {
    const payload = prepared.find((item) => item.dedupeKey === (row.dedupe_key as string));
    if (!payload) continue;

    const result = await sendPushNotification({
      tokens: [payload.token],
      title: payload.title,
      body: payload.body,
      androidChannelId: adzanChannelId,
      androidSound: adzanAndroidSound,
      apnsSound: adzanApnsSound,
      data: {
        type: 'adzan',
        prayer_key: payload.prayerKey,
        city: payload.city,
        scheduled_time: hhmm
      }
    });

    const first = result.results[0];
    if (first?.ok) {
      sent += 1;
      await supabase
        .from('notification_logs')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
        .eq('id', row.id);
    } else {
      failed += 1;
      await supabase
        .from('notification_logs')
        .update({ status: 'failed', error_message: first?.error ?? 'Unknown error' })
        .eq('id', row.id);
    }
  }

  await supabase.from('cron_job_runs').insert({
    job_name: 'adzan',
    status: failed > 0 ? 'partial' : 'success',
    processed_count: queued.length,
    sent_count: sent,
    failed_count: failed,
    note: `${hhmm} ${timeZone}`
  });

  return { ok: true, job: 'adzan', processed: queued.length, sent, failed, time: hhmm, timeZone };
}

export async function runReminderCron(): Promise<CronJobResult> {
  const supabase = getSupabaseServerClient();
  const timeZone = process.env.APP_TIMEZONE ?? 'Asia/Jakarta';
  const { date, hhmm } = getNowParts(timeZone);

  const { data: reminderRows, error: reminderError } = await supabase
    .from('custom_reminders')
    .select('id, title, body')
    .eq('is_active', true)
    .eq('schedule_time', hhmm)
    .order('sort_order', { ascending: true });

  if (reminderError) {
    throw new Error(reminderError.message);
  }

  const reminders = (reminderRows ?? []) as ReminderRow[];
  if (reminders.length === 0) {
    await supabase.from('cron_job_runs').insert({
      job_name: 'reminder',
      status: 'success',
      note: `No active reminder at ${hhmm}`
    });

    return { ok: true, job: 'reminder', processed: 0, sent: 0, failed: 0, time: hhmm, timeZone, message: 'No reminder' };
  }

  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, token_firebase')
    .eq('is_reminder', true)
    .not('token_firebase', 'is', null)
    .neq('token_firebase', '');

  if (userError) {
    throw new Error(userError.message);
  }

  const recipients = (users ?? []) as Array<{ id: string; token_firebase: string }>;
  if (recipients.length === 0) {
    await supabase.from('cron_job_runs').insert({
      job_name: 'reminder',
      status: 'success',
      processed_count: reminders.length,
      note: 'No users with active reminder token'
    });

    return {
      ok: true,
      job: 'reminder',
      processed: reminders.length,
      sent: 0,
      failed: 0,
      time: hhmm,
      timeZone,
      message: 'No reminder recipients'
    };
  }

  const prepared = reminders.flatMap((reminder) =>
    recipients.map((user) => ({
      dedupeKey: `reminder:${date}:${hhmm}:${reminder.id}:${user.id}`,
      reminderId: reminder.id,
      userId: user.id,
      token: user.token_firebase,
      title: reminder.title,
      body: reminder.body
    }))
  );

  const insertRows = prepared.map((item) => ({
    user_id: item.userId,
    source_type: 'reminder',
    category: 'custom_reminder',
    title: item.title,
    body: item.body,
    status: 'queued',
    scheduled_time: hhmm,
    dedupe_key: item.dedupeKey,
    metadata: {
      reminder_id: item.reminderId,
      date,
      time: hhmm
    }
  }));

  const { data: queuedRows, error: queueError } = await supabase
    .from('notification_logs')
    .upsert(insertRows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('id, dedupe_key');

  if (queueError) {
    throw new Error(queueError.message);
  }

  const queued = queuedRows ?? [];
  let sent = 0;
  let failed = 0;

  for (const row of queued) {
    const payload = prepared.find((item) => item.dedupeKey === (row.dedupe_key as string));
    if (!payload) continue;

    const result = await sendPushNotification({
      tokens: [payload.token],
      title: payload.title,
      body: payload.body,
      data: {
        type: 'reminder',
        reminder_id: payload.reminderId,
        scheduled_time: hhmm
      }
    });

    const first = result.results[0];
    if (first?.ok) {
      sent += 1;
      await supabase
        .from('notification_logs')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
        .eq('id', row.id);
    } else {
      failed += 1;
      await supabase
        .from('notification_logs')
        .update({ status: 'failed', error_message: first?.error ?? 'Unknown error' })
        .eq('id', row.id);
    }
  }

  await supabase.from('cron_job_runs').insert({
    job_name: 'reminder',
    status: failed > 0 ? 'partial' : 'success',
    processed_count: queued.length,
    sent_count: sent,
    failed_count: failed,
    note: `${hhmm} ${timeZone}`
  });

  return { ok: true, job: 'reminder', processed: queued.length, sent, failed, time: hhmm, timeZone };
}
