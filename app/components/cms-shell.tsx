import { ReactNode } from 'react';
import { LogoutButton } from '@/app/components/logout-button';
import { CmsNav } from '@/app/components/cms-nav';
import { getSupabaseServerClient } from '@/lib/supabase';

type Props = {
  title: string;
  subtitle?: string;
  email: string;
  children: ReactNode;
};

type CronStatus = {
  adzan: { status: string; createdAt: string } | null;
  reminder: { status: string; createdAt: string } | null;
};

async function getCronStatus(): Promise<CronStatus> {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from('cron_job_runs')
      .select('job_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    const rows = data ?? [];
    const adzan = rows.find((row) => row.job_name === 'adzan') ?? null;
    const reminder = rows.find((row) => row.job_name === 'reminder') ?? null;

    return {
      adzan: adzan ? { status: adzan.status as string, createdAt: adzan.created_at as string } : null,
      reminder: reminder ? { status: reminder.status as string, createdAt: reminder.created_at as string } : null
    };
  } catch {
    return { adzan: null, reminder: null };
  }
}

function CronStatusLine({ label, data }: { label: string; data: { status: string; createdAt: string } | null }) {
  if (!data) {
    return (
      <p className="small">
        {label}: <span className="status-pill unknown">No data</span>
      </p>
    );
  }

  const statusClass =
    data.status === 'success' ? 'ok' : data.status === 'partial' ? 'warn' : data.status === 'failed' ? 'bad' : 'unknown';

  return (
    <p className="small">
      {label}: <span className={`status-pill ${statusClass}`}>{data.status}</span> {new Date(data.createdAt).toLocaleTimeString('id-ID')}
    </p>
  );
}

export async function CmsShell({ title, subtitle, email, children }: Props) {
  const cronStatus = await getCronStatus();

  return (
    <main className="cms-layout">
      <aside className="cms-sidebar card">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">
            QS
          </div>
          <div className="grid" style={{ gap: 2 }}>
            <h2>Quran Saya</h2>
            <p className="small">Admin Panel</p>
          </div>
        </div>
        <CmsNav />
        <section className="sidebar-meta">
          <p className="small sidebar-meta-title">Cron Status</p>
          <CronStatusLine label="Adzan" data={cronStatus.adzan} />
          <CronStatusLine label="Reminder" data={cronStatus.reminder} />
        </section>
        <div className="grid" style={{ gap: 10 }}>
          <p className="small">Login sebagai: {email}</p>
          <LogoutButton />
        </div>
      </aside>

      <section className="cms-content">
        <header className="card grid" style={{ gap: 8 }}>
          <h1>{title}</h1>
          {subtitle && <p className="small">{subtitle}</p>}
        </header>
        <div className="grid">{children}</div>
      </section>
    </main>
  );
}
