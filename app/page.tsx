import { CmsShell } from '@/app/components/cms-shell';
import { UserCreationChart } from '@/app/components/user-creation-chart';
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

type UserCreationRow = {
  created_at: string;
};

type UserCreationPoint = {
  key: string;
  label: string;
  total: number;
};

function getStatusClass(status: string) {
  if (status === 'success' || status === 'sent') return 'ok';
  if (status === 'partial' || status === 'queued') return 'warn';
  if (status === 'failed') return 'bad';
  return 'unknown';
}

function buildUserCreationPoints(rows: UserCreationRow[]): UserCreationPoint[] {
  const days: UserCreationPoint[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      total: 0
    });
  }

  const bucket = new Map(days.map((d) => [d.key, d]));
  for (const row of rows) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    const target = bucket.get(key);
    if (!target) continue;
    target.total += 1;
  }

  return days;
}

async function getDashboardData() {
  const supabase = getSupabaseServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 6);

  const [userCountRes, reminderUserRes, logCountRes, logFailedRes, latestLogsRes, userCreationRes] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_reminder', true),
    supabase.from('notification_logs').select('*', { count: 'exact', head: true }),
    supabase.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase
      .from('notification_logs')
      .select('id, created_at, source_type, status, category, title, user_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('users').select('created_at').gte('created_at', since.toISOString())
  ]);

  return {
    userCount: userCountRes.count ?? 0,
    reminderUsers: reminderUserRes.count ?? 0,
    totalLogs: logCountRes.count ?? 0,
    failedLogs: logFailedRes.count ?? 0,
    latestLogs: ((latestLogsRes.data as LogItem[] | null) ?? []),
    userCreationPoints: buildUserCreationPoints(((userCreationRes.data as UserCreationRow[] | null) ?? []))
  };
}

export default async function DashboardPage() {
  const session = await requireAdminPageSession();
  const data = await getDashboardData();
  const successfulLogs = Math.max(0, data.totalLogs - data.failedLogs);
  const deliveryRate = data.totalLogs > 0 ? Math.round((successfulLogs / data.totalLogs) * 100) : 100;

  return (
    <CmsShell title="Quran Saya CMS" subtitle="Ringkasan performa notifikasi aplikasi." email={session.email}>
      <section className="dashboard-flow">
        <section className="dashboard-hero modern-hero">
          <div className="grid" style={{ gap: 10 }}>
            <p className="small">Dashboard Operasional</p>
            <h2>Performa notifikasi yang lebih jelas dan enak dibaca</h2>
            <p className="small">Pantau pengguna, tingkat delivery, dan tren pengiriman harian dari satu tempat.</p>
          </div>
          <div className="hero-rate">
            <p className="small">Delivery Rate</p>
            <p className="hero-rate-value">{deliveryRate}%</p>
            <p className="small">
              Sent: {successfulLogs} | Failed: {data.failedLogs}
            </p>
          </div>
        </section>

        <section className="metrics-strip">
          <article className="kpi-pill">
            <p className="small">Total Users</p>
            <p className="metric-value">{data.userCount}</p>
          </article>
          <article className="kpi-pill">
            <p className="small">Reminder Aktif</p>
            <p className="metric-value">{data.reminderUsers}</p>
          </article>
          <article className="kpi-pill">
            <p className="small">Total Notifikasi</p>
            <p className="metric-value">{data.totalLogs}</p>
          </article>
          <article className="kpi-pill danger">
            <p className="small">Gagal Kirim</p>
            <p className="metric-value">{data.failedLogs}</p>
          </article>
        </section>

        <section className="dashboard-grid">
          <section className="chart-card modern-panel">
            <div className="chart-head">
              <h2>Grafik Pembuatan User (7 Hari)</h2>
            </div>
            <UserCreationChart points={data.userCreationPoints.map((point) => ({ label: point.label, total: point.total }))} />
          </section>

          <section className="modern-panel log-panel">
            <h2>Log Notifikasi Terbaru</h2>
            {data.latestLogs.length === 0 && <p className="small">Belum ada data log.</p>}
            {data.latestLogs.length > 0 && (
              <div className="table-wrap">
                <table className="grid-table">
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
                        <td>
                          <span className="log-type-badge">{row.source_type}</span>
                        </td>
                        <td>{row.category ?? '-'}</td>
                        <td>{row.title}</td>
                        <td>
                          <span className={`status-pill ${getStatusClass(row.status)}`}>{row.status}</span>
                        </td>
                        <td>{row.user_id ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </section>
    </CmsShell>
  );
}
