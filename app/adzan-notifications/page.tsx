import { CmsShell } from '@/app/components/cms-shell';
import { AdzanNotificationManager } from '@/app/components/adzan-notification-manager';
import { requireAdminPageSession } from '@/lib/cms-auth';
import { getSupabaseServerClient } from '@/lib/supabase';

type AdzanNotificationRow = {
  id: number;
  created_at: string;
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

async function getAdzanNotifications() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('adzan_notification')
    .select(
      'id, created_at, user_id, city_name, is_subuh, is_dzuhur, is_ashar, is_maghrib, is_isya, subuh_time, dzuhur_time, ashar_time, maghrib_time, isya_time'
    )
    .order('created_at', { ascending: false })
    .limit(2000);

  return { rows: ((data ?? []) as AdzanNotificationRow[]), error: error?.message ?? null };
}

export default async function AdzanNotificationsPage() {
  const session = await requireAdminPageSession();
  const { rows, error } = await getAdzanNotifications();

  return (
    <CmsShell title="Notifikasi adzan" subtitle="Data jadwal adzan per user dari tabel adzan_notification." email={session.email}>
      {error && <section className="card"><p className="error">{error}</p></section>}
      {!error && <AdzanNotificationManager initialRows={rows} />}
    </CmsShell>
  );
}
