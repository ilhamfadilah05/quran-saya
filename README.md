# Quran Saya CMS (Next.js + Supabase)

CMS untuk memonitor dan mengelola notifikasi adzan + reminder otomatis.

## Fitur
- Login admin (tabel `admin` + session cookie).
- Dashboard monitoring: statistik users, log notifikasi, dan riwayat cron.
- Menu `Users` untuk pantau user + status reminder + token.
- Menu `Log Notification` untuk audit status kirim per user.
- Menu `Custom Reminder` untuk kelola reminder jam tertentu.
- Cron endpoint otomatis:
  - `POST /api/cron/adzan`
  - `POST /api/cron/reminders`

## Setup
1. Install dependency:
   ```bash
   npm install
   ```
2. Isi `.env` (lihat `.env.example`).
3. Jalankan SQL `supabase/schema.sql` di Supabase SQL Editor.
4. Buat admin awal:
   ```sql
   insert into public.admin (email, password_hash, full_name)
   values (
     'admin@quransaya.com',
     extensions.crypt('ganti-password-anda', extensions.gen_salt('bf')),
     'Admin Quran Saya'
   );
   ```
5. Jalankan:
   ```bash
   npm run dev
   ```

## Login CMS
- Buka `/login`
- Login pakai akun admin yang dibuat di tabel `admin`

## Integrasi Mobile
Aplikasi mobile kirim token ke:
- `POST /api/devices`

Contoh body:
```json
{
  "userId": "optional-uuid",
  "token": "fcm-device-token",
  "deviceId": "android-device-id",
  "deviceName": "Samsung A55",
  "isReminder": true
}
```

## Endpoint Cron
Gunakan salah satu autentikasi:
- Admin login session (manual trigger dari CMS)
- Header `x-cron-secret: <CRON_SECRET>`

### Endpoint utama (disarankan)
`POST /api/cron/run`
- Sekali hit akan menjalankan:
  - cek adzan (`adzan_notification`)
  - cek reminder (`custom_reminders`)
- Cocok dipanggil scheduler setiap 1 menit.

### Adzan cron
`POST /api/cron/adzan`
- Cek tabel `adzan_notification`
- Jika jam sekarang cocok (mis. `subuh_time = 04:45` dan `is_subuh=true`) maka kirim notifikasi
- Payload push menyertakan sound adzan (`ADZAN_ANDROID_CHANNEL_ID`, `ADZAN_ANDROID_SOUND`, `ADZAN_APNS_SOUND`)
- Simpan detail ke `notification_logs` dan `cron_job_runs`

### Reminder cron
`POST /api/cron/reminders`
- Cek `custom_reminders` aktif dengan `schedule_time` sesuai jam sekarang
- Kirim ke user dengan `users.is_reminder=true`
- Simpan detail ke `notification_logs` dan `cron_job_runs`

## Endpoint manual broadcast
`POST /api/notifications`
- Digunakan dari CMS form manual
- Hasil kirim tersimpan ke `notification_logs`

## Contoh scheduler (setiap menit)
Gunakan scheduler eksternal (GitHub Actions / server cron / Vercel cron):
```bash
curl -X POST https://your-domain.com/api/cron/run -H "x-cron-secret: YOUR_CRON_SECRET"
```

## Cron Worker Lokal (opsional)
Jika ingin worker berjalan di server Anda sendiri (bukan scheduler eksternal):

1. Pastikan env:
   - `CRON_SECRET`
   - `CRON_BASE_URL` (contoh `http://localhost:3000`)
   - `CRON_INTERVAL_SECONDS=60` (tiap 1 menit)
2. Jalankan Next.js app.
3. Jalankan worker:
   ```bash
   npm run cron:worker
   ```
