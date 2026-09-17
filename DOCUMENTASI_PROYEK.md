# Dokumentasi Proyek Presensi Generus

## 1. Deskripsi Web

Proyek ini adalah aplikasi web presensi digital untuk komunitas Generus Tamantirto. Aplikasi ini dibuat dengan Next.js dan Supabase untuk membantu proses:

- Manajemen data generus
- Pembuatan acara atau kegiatan
- Presensi peserta melalui QR Code
- Rekapitulasi kehadiran secara publik maupun admin
- Pembuatan kartu QR / co-card dengan desain khusus per acara

Web ini memiliki dua sisi utama:

1. Sisi Admin / Petugas

   - Mengelola data generus
   - Membuat dan mengedit acara
   - Mengatur panitia per acara
   - Mengunggah desain twibbon / kartu peserta dan panitia
   - Melakukan scan QR Code dan mengelola presensi
   - Mengedit rekapitulasi kehadiran

2. Sisi Publik
   - Melihat rekap kehadiran acara
   - Menampilkan kartu QR Code untuk cetak
   - Mengunduh QR Code per kelompok atau seluruh data

---

## 2. Fitur Utama

### A. Manajemen Data Generus

- Menambah, mengedit, dan menghapus data generus
- Import data generus melalui file Excel/CSV
- Download template import
- Export data generus ke Excel
- Pengelompokan berdasarkan kelompok, kelas, dan jenis kelamin

### B. Manajemen Acara

- Membuat acara baru
- Mengedit data acara seperti nama, tanggal, lokasi, dan koordinator
- Menghapus acara beserta data terkait

### C. Panitia dan Desain Acara

- Menambahkan panitia dari data generus atau nama manual
- Menentukan jabatan panitia per acara
- Mengunggah desain `participant` dan `panitia`
- Menggunakan desain khusus saat membuat kartu QR untuk acara tertentu

### D. QR Code dan Cetak Kartu

- Membuat kartu QR untuk setiap generus
- Menampilkan data hasil filter berdasarkan kelompok dan pencarian
- Download kartu QR individual maupun seluruh kelompok dalam format ZIP
- Mendukung format PNG dan JPG

### E. Presensi

- Scan QR Code menggunakan kamera browser
- Presensi manual melalui admin dashboard
- Menandai peserta dengan status `Hadir`, `Izin`, atau `Alpa / Belum Presensi`
- Menyimpan alasan izin bila diperlukan

### F. Rekapitulasi

- Rekap presensi per acara
- Export data rekap ke file Excel
- Tampilan status presensi per generus secara real-time

### G. Autentikasi dan Keamanan

- Page admin dibatasi melalui login Supabase Auth
- RLS (Row Level Security) diterapkan pada tabel utama dan storage bucket

---

## 3. Struktur Halaman Utama

- `/` → halaman depan
- `/login` → login admin / petugas
- `/admin/generus` → pengelolaan data generus
- `/admin/acara` → pengelolaan acara dan setting desain/panitia
- `/admin/scan` → scan QR dan presensi
- `/admin/rekap-edit` → edit rekap presensi
- `/rekap` → halaman rekap publik
- `/qrcode` → halaman pembuatan dan unduhan QR Code

---

## 4. Persiapan Awal

### Prasyarat

- Node.js 20+
- npm atau pnpm
- Akun Supabase
- Environment variable `NEXT_PUBLIC_SUPABASE_URL`
- Environment variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Langkah Setup

1. Clone repository.
2. Jalankan instalasi dependensi:

```bash
npm install
```

3. Siapkan file environment jika belum ada.
4. Jalankan SQL schema pada Supabase.
5. Jalankan aplikasi:

```bash
npm run dev
```

Akses aplikasi melalui:

```text
http://localhost:3000
```

---

## 5. Cara Penggunaan

### A. Mengelola Data Generus

1. Masuk ke halaman admin.
2. Buka menu `Manajemen Generus`.
3. Tambahkan data generus secara manual atau impor file Excel.
4. Gunakan fitur export untuk mengambil file Excel hasil data.

### B. Membuat Acara

1. Buka halaman `Manajemen Acara`.
2. Klik `Buat Acara Baru`.
3. Isi informasi acara seperti nama, tanggal, lokasi, dan koordinator.
4. Simpan acara.

### C. Menambahkan Panitia dan Desain

1. Buka acara yang ingin diatur.
2. Tambahkan panitia dari daftar generus atau buat panitia manual.
3. Pilih jabatan panitia.
4. Upload desain `participant` dan `panitia` jika diperlukan.

### D. Membuat Kartu QR

1. Buka halaman `Portal Kartu QR Code`.
2. Pilih acara yang akan dipakai.
3. Gunakan filter kelompok atau search untuk mencari data.
4. Download kartu per individu atau ZIP per kelompok.

### E. Presensi

1. Buka halaman `Scan Presensi`.
2. Pilih acara aktif.
3. Scan QR Code dari kartu peserta atau panitia.
4. Sistem akan mencocokkan kode QR dengan data generus.

### F. Rekap

1. Buka halaman `Rekap Kehadiran`.
2. Pilih acara yang ingin dilihat.
3. Gunakan filter untuk melihat status presensi per kelompok atau kelas.
4. Export ke Excel bila diperlukan.

---

## 6. Catatan Penting

- File desain acara disimpan di Supabase Storage bucket `acara-designs`.
- Jika acara belum memiliki desain khusus, aplikasi akan otomatis menggunakan fallback desain global.
- Untuk acara tertentu, QR generator akan membedakan desain peserta dan panitia.
- Schema SQL yang tersedia di folder `supabase/` dapat dijalankan ulang pada database baru dan dapat dipakai sebagai starting point project.

---

## 7. File SQL yang Direkomendasikan

Untuk membuat struktur database dari awal, gunakan file:

- `supabase/init_tables.sql`

File tersebut berisi pembuatan tabel utama, index, RLS, dan konfigurasi storage bucket.
