import { CmsShell } from '@/app/components/cms-shell';
import { DataGrid } from '@/app/components/data-grid';
import { requireAdminPageSession } from '@/lib/cms-auth';
import { getSupabaseServerClient } from '@/lib/supabase';

type UserRow = {
  id: string;
  created_at: string;
  is_reminder: boolean | null;
  device_id: string | null;
  device_name: string | null;
  version: string | null;
};

async function getUsers() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, created_at, is_reminder, device_id, device_name, version')
    .order('created_at', { ascending: false })
    .limit(1000);

  return { rows: ((data ?? []) as UserRow[]), error: error?.message ?? null };
}

export default async function UsersPage() {
  const session = await requireAdminPageSession();
  const { rows, error } = await getUsers();
  const displayRows = rows.map((row) => ({
    id: row.id,
    created_at: new Date(row.created_at).toLocaleString('id-ID'),
    is_reminder: row.is_reminder ? 'Aktif' : 'Nonaktif',
    device_id: row.device_id ?? '-',
    device_name: row.device_name ?? '-',
    version: row.version ?? '-'
  }));

  return (
    <CmsShell title="Users" subtitle="Monitoring user dan status reminder." email={session.email}>
      {error && <section className="card"><p className="error">{error}</p></section>}
      {!error && (
        <DataGrid
          title="Daftar Users"
          rowKey="id"
          rows={displayRows}
          columns={[
            { key: 'created_at', label: 'Created' },
            { key: 'id', label: 'User ID' },
            { key: 'is_reminder', label: 'Reminder Status' },
            { key: 'device_id', label: 'Device ID' },
            { key: 'device_name', label: 'Device Name' },
            { key: 'version', label: 'Version' }
          ]}
          emptyMessage="Belum ada user."
        />
      )}
    </CmsShell>
  );
}
