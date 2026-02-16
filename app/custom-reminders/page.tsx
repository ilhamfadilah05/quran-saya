import { CmsShell } from '@/app/components/cms-shell';
import { ReminderManager } from '@/app/components/reminder-manager';
import { requireAdminPageSession } from '@/lib/cms-auth';
import { getSupabaseServerClient } from '@/lib/supabase';

type ReminderRow = {
  id: string;
  title: string;
  body: string;
  schedule_time: string;
  is_active: boolean;
  sort_order: number;
};

async function getReminders() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('custom_reminders')
    .select('id, title, body, schedule_time, is_active, sort_order')
    .order('schedule_time', { ascending: true })
    .order('sort_order', { ascending: true });

  return ((data ?? []) as ReminderRow[]);
}

export default async function CustomRemindersPage() {
  const session = await requireAdminPageSession();
  const reminders = await getReminders();

  return (
    <CmsShell title="Custom Reminder" subtitle="Kelola jadwal reminder otomatis." email={session.email}>
      <ReminderManager initialReminders={reminders} />
    </CmsShell>
  );
}
