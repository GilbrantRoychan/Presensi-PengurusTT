# Presensi Generus

Aplikasi web presensi digital untuk komunitas Generus Tamantirto berbasis Next.js dan Supabase.

## Ringkasan

Proyek ini mencakup:

- Manajemen data generus
- Manajemen acara dan panitia
- Presensi QR Code
- Rekapitulasi kehadiran
- Pembuatan kartu QR / co-card dengan desain per acara

## Dokumentasi Lengkap

Dokumentasi detail proyek tersedia di [DOCUMENTASI_PROYEK.md](DOCUMENTASI_PROYEK.md).

## Fitur Utama

- Data generus: tambah, edit, hapus, import Excel/CSV, export Excel
- Data acara: tambah, edit, hapus, pengaturan panitia dan desain acara
- QR Code: generate kartu peserta/panitia, download PNG/JPG, eksport ZIP per kelompok
- Presensi: scan QR, presensi manual, status hadir/izin/alpa
- Rekap: lihat rekap publik dan export ke Excel

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
