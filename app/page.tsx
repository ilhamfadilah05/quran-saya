import { CmsShell } from '@/app/components/cms-shell';
import { CronControls } from '@/app/components/cron-controls';
import { requireAdminPageSession } from '@/lib/cms-auth';
import { getSupabaseServerClient } from '@/lib/supabase';

type LogItem = {
  id: number;
  created_at: string;
  source_type: string;
  status: string;
  category: string | null;
  title: string;
  user_id: string | null;
};

type CronRun = {
  id: number;
  created_at: string;
  job_name: string;
  status: string;
  processed_count: number;
  sent_count: number;
  failed_count: number;
};

async function getDashboardData() {
  const supabase = getSupabaseServerClient();

  const [userCountRes, reminderUserRes, logCountRes, logFailedRes, latestLogsRes, latestRunsRes] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_reminder', true),
    supabase.from('notification_logs').select('*', { count: 'exact', head: true }),
    supabase.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase
      .from('notification_logs')
      .select('id, created_at, source_type, status, category, title, user_id')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('cron_job_runs')
      .select('id, created_at, job_name, status, processed_count, sent_count, failed_count')
      .order('created_at', { ascending: false })
      .limit(6)
  ]);

  return {
    userCount: userCountRes.count ?? 0,
    reminderUsers: reminderUserRes.count ?? 0,
    totalLogs: logCountRes.count ?? 0,
    failedLogs: logFailedRes.count ?? 0,
    latestLogs: ((latestLogsRes.data as LogItem[] | null) ?? []),
    latestRuns: ((latestRunsRes.data as CronRun[] | null) ?? [])
  };
}

export default async function DashboardPage() {
  const session = await requireAdminPageSession();
  const data = await getDashboardData();

  return (
    <CmsShell
      title="Quran Saya CMS"
      subtitle="Monitoring notifikasi adzan dan reminder otomatis."
      email={session.email}
    >
      <section className="metrics-grid">
        <article className="card metric-card">
          <h3>Total Users</h3>
          <p className="metric-value">{data.userCount}</p>
        </article>
        <article className="card metric-card">
          <h3>Users Reminder Aktif</h3>
          <p className="metric-value">{data.reminderUsers}</p>
        </article>
        <article className="card metric-card">
          <h3>Total Log</h3>
          <p className="metric-value">{data.totalLogs}</p>
        </article>
        <article className="card metric-card">
          <h3>Log Failed</h3>
          <p className="metric-value">{data.failedLogs}</p>
        </article>
      </section>

      <section className="grid grid-two" style={{ alignItems: 'start' }}>
        <CronControls />

        <article className="card grid" style={{ gap: 10 }}>
          <h2>Ringkasan Cron Terakhir</h2>
          {data.latestRuns.length === 0 && <p className="small">Belum ada riwayat cron.</p>}
          {data.latestRuns.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latestRuns.map((run) => (
                    <tr key={run.id}>
                      <td>{new Date(run.created_at).toLocaleString('id-ID')}</td>
                      <td>{run.job_name}</td>
                      <td>{run.status}</td>
                      <td>{run.sent_count}</td>
                      <td>{run.failed_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <h2>Log Notifikasi Terbaru</h2>
        {data.latestLogs.length === 0 && <p className="small">Belum ada data log.</p>}
        {data.latestLogs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Sumber</th>
                  <th>Kategori</th>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>User ID</th>
                </tr>
              </thead>
              <tbody>
                {data.latestLogs.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString('id-ID')}</td>
                    <td>{row.source_type}</td>
                    <td>{row.category ?? '-'}</td>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.user_id ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </CmsShell>
  );
}
