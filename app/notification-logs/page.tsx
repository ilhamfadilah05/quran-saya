import { CmsShell } from '@/app/components/cms-shell';
import { DataGrid } from '@/app/components/data-grid';
import { requireAdminPageSession } from '@/lib/cms-auth';
import { getSupabaseServerClient } from '@/lib/supabase';

type LogRow = {
  id: number;
  created_at: string;
  source_type: string;
  category: string | null;
  title: string;
  body: string;
  status: string;
  error_message: string | null;
  scheduled_time: string | null;
  user_id: string | null;
};

async function getLogs() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, created_at, source_type, category, title, body, status, error_message, scheduled_time, user_id')
    .order('created_at', { ascending: false })
    .limit(2000);

  return { rows: ((data ?? []) as LogRow[]), error: error?.message ?? null };
}

export default async function NotificationLogsPage() {
  const session = await requireAdminPageSession();
  const { rows, error } = await getLogs();
  const displayRows = rows.map((row) => ({
    id: row.id,
    created_at: new Date(row.created_at).toLocaleString('id-ID'),
    source_type: row.source_type,
    category: row.category ?? '-',
    title: row.title,
    status: row.status,
    scheduled_time: row.scheduled_time ?? '-',
    user_id: row.user_id ?? '-',
    error_message: row.error_message ?? '-'
  }));

  return (
    <CmsShell title="Log Notification" subtitle="Riwayat pengiriman adzan/reminder/manual." email={session.email}>
      {error && <section className="card"><p className="error">{error}</p></section>}
      {!error && (
        <DataGrid
          title="Riwayat Log"
          rowKey="id"
          rows={displayRows}
          columns={[
            { key: 'created_at', label: 'Waktu' },
            { key: 'source_type', label: 'Sumber' },
            { key: 'category', label: 'Kategori' },
            { key: 'title', label: 'Judul' },
            { key: 'status', label: 'Status' },
            { key: 'scheduled_time', label: 'Jadwal' },
            { key: 'user_id', label: 'User ID' },
            { key: 'error_message', label: 'Error' }
          ]}
          emptyMessage="Belum ada log."
        />
      )}
    </CmsShell>
  );
}
