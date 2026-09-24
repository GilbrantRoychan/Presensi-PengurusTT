# Presensi Pengurus Tamantirto

Aplikasi web presensi digital untuk komunitas PENGURUS TAMANTIRTO berbasis Next.js dan Supabase.

## Ringkasan

Proyek ini mencakup:

- Manajemen data pengurus
- Manajemen acara dan panitia
- Presensi QR Code dan Scan Kamera
- Rekapitulasi kehadiran dengan Export Excel & Cetak PDF
- Pembuatan kartu QR / co-card dengan desain per acara
- Dukungan Dark Mode dan Session Timeout

## Dokumentasi Lengkap

Dokumentasi detail proyek tersedia di [DOCUMENTASI_PROYEK.md](DOCUMENTASI_PROYEK.md).

## Fitur Utama

- Data Pengurus: tambah, edit, hapus, import Excel/CSV, export Excel
- Data Acara: tambah, edit, hapus, pengaturan panitia dan desain acara
- QR Code: generate kartu peserta/panitia, download PNG/JPG, eksport ZIP per kelompok
- Presensi: scan QR kamera, scan RFID/Card ID, presensi manual, status hadir/izin/alpa
- Rekapitulasi: rekap publik, export ke Excel, dan cetak laporan PDF

## Setup Cepat

### Prasyarat

- Node.js 20+
- npm
- Supabase project
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Langkah

```bash
npm install
npm run dev
```

Buka:

```text
http://localhost:3000
```

## SQL / Database

File SQL utama yang tersedia:

- `supabase/init_tables.sql`
- `supabase/migrations/202609020001_acara_panitia_design.sql`
- `supabase/migrations/202609020002_allow_public_qr_design_read.sql`
- `supabase/migrations/202609030001_manual_panitia.sql`

## Catatan

- Dokumentasi detail lebih lengkap ada di [DOCUMENTASI_PROYEK.md](DOCUMENTASI_PROYEK.md)
- README ini berfungsi sebagai ringkasan cepat dan referensi singkat
