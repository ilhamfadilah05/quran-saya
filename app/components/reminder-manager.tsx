'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { DataGrid } from '@/app/components/data-grid';

type Reminder = {
  id: string;
  title: string;
  body: string;
  schedule_time: string;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  initialReminders: Reminder[];
};

export function ReminderManager({ initialReminders }: Props) {
  const [reminders, setReminders] = useState(initialReminders);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduleTime, setScheduleTime] = useState('05:30');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  const rows = useMemo(
    () =>
      reminders.map((reminder) => ({
        id: reminder.id,
        schedule_time: reminder.schedule_time,
        title: reminder.title,
        body: reminder.body,
        status: reminder.is_active ? 'active' : 'inactive',
        raw: reminder
      })),
    [reminders]
  );

  async function refresh() {
    const response = await fetch('/api/custom-reminders');
    const json = (await response.json()) as { ok: boolean; data?: Reminder[]; error?: string };
    if (json.ok && json.data) {
      setReminders(json.data);
    } else {
      setMessage(`Gagal refresh: ${json.error ?? 'Unknown error'}`);
    }
  }

  function openCreateDialog() {
    setEditingReminderId(null);
    setTitle('');
    setBody('');
    setScheduleTime('05:30');
    setOpenDialog(true);
  }

  function openEditDialog(reminder: Reminder) {
    setEditingReminderId(reminder.id);
    setTitle(reminder.title);
    setBody(reminder.body);
    setScheduleTime(reminder.schedule_time);
    setOpenDialog(true);
  }

  async function submitReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const isEdit = Boolean(editingReminderId);
      const response = await fetch('/api/custom-reminders', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { id: editingReminderId, title, body, scheduleTime }
            : { title, body, scheduleTime, isActive: true }
        )
      });

      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(`Gagal ${isEdit ? 'mengubah' : 'menambah'} reminder: ${json.error ?? 'Unknown error'}`);
      } else {
        setEditingReminderId(null);
        setTitle('');
        setBody('');
        setScheduleTime('05:30');
        setOpenDialog(false);
        setMessage(`Reminder berhasil ${isEdit ? 'diubah' : 'ditambahkan'}.`);
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(reminder: Reminder) {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/custom-reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reminder.id, isActive: !reminder.is_active })
      });

      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(`Gagal update reminder: ${json.error ?? 'Unknown error'}`);
      } else {
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeReminder(id: string) {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/custom-reminders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage(`Gagal hapus reminder: ${json.error ?? 'Unknown error'}`);
      } else {
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid">
      {message && <section className="card"><p className="small">{message}</p></section>}

      <DataGrid
        title="Daftar Reminder"
        rowKey="id"
        rows={rows}
        columns={[
          { key: 'schedule_time', label: 'Jam' },
          { key: 'title', label: 'Judul' },
          { key: 'body', label: 'Isi' },
          { key: 'status', label: 'Status' },
          {
            key: 'actions',
            label: 'Aksi',
            searchable: false,
            render: (row) => {
              const reminder = row.raw as unknown as Reminder;
              return (
                <div className="action-cell">
                  <button type="button" onClick={() => openEditDialog(reminder)} disabled={saving}>
                    Edit
                  </button>
                  <button type="button" onClick={() => toggleReminder(reminder)} disabled={saving}>
                    {reminder.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button type="button" className="danger-btn" onClick={() => removeReminder(reminder.id)} disabled={saving}>
                    Hapus
                  </button>
                </div>
              );
            }
          }
        ]}
        emptyMessage="Belum ada custom reminder."
        headerActions={
          <button type="button" onClick={openCreateDialog} disabled={saving}>
            + Tambah Reminder
          </button>
        }
      />

      {openDialog && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={editingReminderId ? 'Edit reminder' : 'Tambah reminder'}>
          <div className="modal-card">
            <form className="grid" onSubmit={submitReminder}>
              <div className="header-row">
                <h2>{editingReminderId ? 'Edit Custom Reminder' : 'Tambah Custom Reminder'}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setOpenDialog(false);
                    setEditingReminderId(null);
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>
              </div>
              <div>
                <label htmlFor="reminder-title">Judul</label>
                <input id="reminder-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>
              <div>
                <label htmlFor="reminder-body">Isi</label>
                <textarea id="reminder-body" value={body} onChange={(event) => setBody(event.target.value)} required />
              </div>
              <div>
                <label htmlFor="reminder-time">Jam (HH:MM)</label>
                <input
                  id="reminder-time"
                  type="time"
                  step={60}
                  value={scheduleTime}
                  onChange={(event) => setScheduleTime(event.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : editingReminderId ? 'Simpan Perubahan' : 'Simpan Reminder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
