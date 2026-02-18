'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { DataGrid } from '@/app/components/data-grid';
import { Button } from '@/app/components/ui/button';

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

type Props = {
  initialRows: AdzanNotificationRow[];
};

function formatPrayer(enabled: boolean | null, time: string | null) {
  if (!enabled) return '-';
  return time ?? '-';
}

function getAdzanStatus(row: AdzanNotificationRow) {
  const isActive = Boolean(row.is_subuh || row.is_dzuhur || row.is_ashar || row.is_maghrib || row.is_isya);
  return isActive ? 'Aktif' : 'Nonaktif';
}

export function AdzanNotificationManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cityName, setCityName] = useState('');
  const [isSubuh, setIsSubuh] = useState(false);
  const [isDzuhur, setIsDzuhur] = useState(false);
  const [isAshar, setIsAshar] = useState(false);
  const [isMaghrib, setIsMaghrib] = useState(false);
  const [isIsya, setIsIsya] = useState(false);
  const [subuhTime, setSubuhTime] = useState('04:30');
  const [dzuhurTime, setDzuhurTime] = useState('12:00');
  const [asharTime, setAsharTime] = useState('15:30');
  const [maghribTime, setMaghribTime] = useState('18:00');
  const [isyaTime, setIsyaTime] = useState('19:00');

  const displayRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        created_at: new Date(row.created_at).toLocaleString('id-ID'),
        user_id: row.user_id ?? '-',
        city_name: row.city_name ?? '-',
        adzan_status: getAdzanStatus(row),
        subuh: formatPrayer(row.is_subuh, row.subuh_time),
        dzuhur: formatPrayer(row.is_dzuhur, row.dzuhur_time),
        ashar: formatPrayer(row.is_ashar, row.ashar_time),
        maghrib: formatPrayer(row.is_maghrib, row.maghrib_time),
        isya: formatPrayer(row.is_isya, row.isya_time),
        raw: row
      })),
    [rows]
  );

  async function refresh() {
    const response = await fetch('/api/adzan-notifications');
    const json = (await response.json()) as { ok: boolean; data?: AdzanNotificationRow[]; error?: string };
    if (json.ok && json.data) {
      setRows(json.data);
    } else {
      setMessage(`Gagal refresh: ${json.error ?? 'Unknown error'}`);
    }
  }

  function openEditDialog(row: AdzanNotificationRow) {
    setEditingId(row.id);
    setCityName(row.city_name ?? '');
    setIsSubuh(Boolean(row.is_subuh));
    setIsDzuhur(Boolean(row.is_dzuhur));
    setIsAshar(Boolean(row.is_ashar));
    setIsMaghrib(Boolean(row.is_maghrib));
    setIsIsya(Boolean(row.is_isya));
    setSubuhTime(row.subuh_time ?? '04:30');
    setDzuhurTime(row.dzuhur_time ?? '12:00');
    setAsharTime(row.ashar_time ?? '15:30');
    setMaghribTime(row.maghrib_time ?? '18:00');
    setIsyaTime(row.isya_time ?? '19:00');
    setOpenDialog(true);
    setMessage('');
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/adzan-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          cityName,
          isSubuh,
          isDzuhur,
          isAshar,
          isMaghrib,
          isIsya,
          subuhTime: isSubuh ? subuhTime : null,
          dzuhurTime: isDzuhur ? dzuhurTime : null,
          asharTime: isAshar ? asharTime : null,
          maghribTime: isMaghrib ? maghribTime : null,
          isyaTime: isIsya ? isyaTime : null
        })
      });

      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(`Gagal menyimpan: ${json.error ?? 'Unknown error'}`);
        return;
      }

      setOpenDialog(false);
      setEditingId(null);
      setMessage('Data notifikasi adzan berhasil diupdate.');
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      {message && (
        <section className="ui-card">
          <p className="small">{message}</p>
        </section>
      )}

      <DataGrid
        title="Daftar Notifikasi Adzan"
        rowKey="id"
        rows={displayRows}
        columns={[
          { key: 'created_at', label: 'Created' },
          { key: 'id', label: 'ID' },
          { key: 'user_id', label: 'User ID' },
          { key: 'city_name', label: 'Kota' },
          { key: 'adzan_status', label: 'Status Notif Adzan' },
          { key: 'subuh', label: 'Subuh' },
          { key: 'dzuhur', label: 'Dzuhur' },
          { key: 'ashar', label: 'Ashar' },
          { key: 'maghrib', label: 'Maghrib' },
          { key: 'isya', label: 'Isya' },
          {
            key: 'actions',
            label: 'Aksi',
            searchable: false,
            sortable: false,
            render: (row) => {
              const raw = row.raw as unknown as AdzanNotificationRow;
              return (
                <Button type="button" variant="ghost" size="icon" className="action-icon-btn" title="Edit jadwal" onClick={() => openEditDialog(raw)} disabled={saving}>
                  <Pencil size={15} />
                </Button>
              );
            }
          }
        ]}
        emptyMessage="Belum ada data notifikasi adzan."
        defaultSort={{ key: 'adzan_status', direction: 'asc' }}
      />

      {openDialog && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit notifikasi adzan">
          <div className="modal-card">
            <form className="grid" onSubmit={submitEdit}>
              <div className="header-row">
                <h2>Edit Notifikasi Adzan</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenDialog(false)} disabled={saving}>
                  Tutup
                </Button>
              </div>

              <div>
                <label htmlFor="city-name">Kota</label>
                <input id="city-name" value={cityName} onChange={(event) => setCityName(event.target.value)} />
              </div>

              <div className="adzan-edit-grid">
                <label><input type="checkbox" checked={isSubuh} onChange={(event) => setIsSubuh(event.target.checked)} /> Subuh</label>
                <input type="time" value={subuhTime} onChange={(event) => setSubuhTime(event.target.value)} disabled={!isSubuh} />
                <label><input type="checkbox" checked={isDzuhur} onChange={(event) => setIsDzuhur(event.target.checked)} /> Dzuhur</label>
                <input type="time" value={dzuhurTime} onChange={(event) => setDzuhurTime(event.target.value)} disabled={!isDzuhur} />
                <label><input type="checkbox" checked={isAshar} onChange={(event) => setIsAshar(event.target.checked)} /> Ashar</label>
                <input type="time" value={asharTime} onChange={(event) => setAsharTime(event.target.value)} disabled={!isAshar} />
                <label><input type="checkbox" checked={isMaghrib} onChange={(event) => setIsMaghrib(event.target.checked)} /> Maghrib</label>
                <input type="time" value={maghribTime} onChange={(event) => setMaghribTime(event.target.value)} disabled={!isMaghrib} />
                <label><input type="checkbox" checked={isIsya} onChange={(event) => setIsIsya(event.target.checked)} /> Isya</label>
                <input type="time" value={isyaTime} onChange={(event) => setIsyaTime(event.target.value)} disabled={!isIsya} />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
