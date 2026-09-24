# Design Direction — Presensi Pengurus Tamantirto

## 1. Identitas & Karakter Produk
- **Produk**: Sistem Presensi & Pengelolaan Data Pengurus Generus Desa Tamantirto
- **Karakter**: Resmi, bermartabat, rapi, fungsional, dan ramah pengguna (Civic & Community Portal)
- **Audiens**: Pengurus, petugas presensi lapangan, dan warga/generus umum

## 2. Palet Warna (Core Palette)
- **Primary**: Emerald Green `#128243` (warna identitas resmi Tamantirto)
- **Primary Hover**: `#0e6835`
- **Primary Soft / Accent**: `#f0f7f4` (light) / `#0d3a22` (dark)
- **Netral Terang (Light Mode Base)**:
  - Background Halaman: `#f8fafc` (slate-50)
  - Card & Surface: `#ffffff`
  - Border: `#e2e8f0` (slate-200)
  - Teks Utama: `#0f172a` (slate-900)
  - Teks Sekunder: `#475569` (slate-600)
  - Teks Muted: `#64748b` (slate-500)
- **Netral Gelap (Dark Mode Base)**:
  - Background Halaman: `#090d16` (deep slate-950)
  - Card & Surface: `#111827` (slate-900)
  - Border: `#1e293b` (slate-800)
  - Teks Utama: `#f8fafc` (slate-50)
  - Teks Sekunder: `#cbd5e1` (slate-300)
  - Teks Muted: `#94a3b8` (slate-400)
- **Status Semantic**:
  - Success / Hadir: `#16a34a` (green-600) / `#22c55e` (green-500)
  - Warning / Izin: `#d97706` (amber-600) / `#f59e0b` (amber-500)
  - Danger / Alpa: `#dc2626` (red-600) / `#ef4444` (red-500)

## 3. Tipografi
- **Font Sans**: Inter (`var(--font-inter)` / `next/font/google`)
- **Font Mono**: Monospace untuk Card ID / RFID
- **Skala Ukuran & Bobot**:
  - H1: 24px - 32px, font-bold / font-extrabold
  - H2: 18px - 20px, font-bold
  - Body: 14px (desktop) / 13px (mobile), font-normal
  - Small / Badge: 11px - 12px, font-semibold

## 4. Spacing, Radius & Elevasi
- **Border Radius**:
  - Small / Badge / Input: `8px` (`rounded-lg`)
  - Card / Menu Utama: `12px` (`rounded-xl`)
  - Modal Dialog: `16px` (`rounded-2xl`)
- **Shadow**: Elevasi rendah (`shadow-xs` / `shadow-sm`), hindari `shadow-2xl` melayang tanpa alasan.
- **Batas Sentuh Mobile**: Minimal `44px` untuk semua tombol navigasi dan form control.

## 5. Dials Liveliness (Antislop)
- **ENERGY**: 2 (Balanced — percaya diri, rapi, ramah)
- **RHYTHM**: 2 (Consistent with clear hierarchy)
- **MOTION**: 1 (Calm — transisi halus pada hover dan modal, tanpa animasi loop berulang)
