'use client';

import { useMemo, useState, type FormEvent } from 'react';

const prayerOptions = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

type SendResponse = {
  ok: boolean;
  sent: number;
  failed: number;
  targeted?: number;
  warning?: string;
  error?: string;
};

export function NotificationForm() {
  const [title, setTitle] = useState('Waktu Adzan');
  const [body, setBody] = useState('Saatnya menunaikan shalat berjamaah.');
  const [prayerName, setPrayerName] = useState<(typeof prayerOptions)[number]>('Fajr');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [city, setCity] = useState('Jakarta');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResponse | null>(null);

  const previewData = useMemo(
    () => ({ prayer_name: prayerName, city, timezone }),
    [prayerName, city, timezone]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          prayerName,
          city,
          timezone,
          data: previewData
        })
      });

      const json = (await response.json()) as SendResponse;
      setResult(json);
    } catch (error) {
      setResult({ ok: false, sent: 0, failed: 0, error: (error as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="card grid" onSubmit={handleSubmit}>
      <h2>Kirim Notifikasi Adzan</h2>
      <div>
        <label htmlFor="title">Judul notifikasi</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="body">Isi notifikasi</label>
        <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="prayer">Waktu shalat</label>
        <select id="prayer" value={prayerName} onChange={(e) => setPrayerName(e.target.value as (typeof prayerOptions)[number])}>
          {prayerOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="city">Kota</label>
        <input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="timezone">Timezone</label>
        <input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
      </div>
      <button type="submit" disabled={sending}>
        {sending ? 'Mengirim...' : 'Kirim Sekarang'}
      </button>
      {result?.ok && (
        <p className="success">
          Berhasil kirim. Target: {result.targeted ?? 0}, terkirim: {result.sent}, gagal: {result.failed}.
        </p>
      )}
      {result?.ok && result.warning && <p className="error">{result.warning}</p>}
      {result?.ok === false && <p className="error">Gagal mengirim: {result.error ?? 'Unknown error'}</p>}
    </form>
  );
}
