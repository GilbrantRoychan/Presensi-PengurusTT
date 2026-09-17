-- ============================================================
-- Presensi Generus - Initial Database Schema
-- ============================================================
-- Catatan:
-- 1. Jalankan file ini di SQL editor Supabase untuk membuat schema utama.
-- 2. File ini menggabungkan tabel utama, index, policy RLS, dan konfigurasi storage bucket.
-- 3. Pastikan extension pgcrypto sudah aktif pada database Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tabel utama: generus
-- ------------------------------------------------------------
create table if not exists public.generus (
    id uuid primary key default gen_random_uuid (),
    nama text not null,
    kelompok text not null,
    jenis_kelamin text not null default 'Laki-laki',
    kelas text,
    qr_code_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists generus_qr_code_id_key on public.generus (qr_code_id)
where
    qr_code_id is not null;

-- ------------------------------------------------------------
-- Tabel utama: acara
-- ------------------------------------------------------------
create table if not exists public.acara (
    id uuid primary key default gen_random_uuid (),
    nama_acara text not null,
    tanggal date not null,
    lokasi text not null,
    koor text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabel utama: presensi
-- ------------------------------------------------------------
create table if not exists public.presensi (
    id uuid primary key default gen_random_uuid (),
    acara_id uuid not null references public.acara (id) on delete cascade,
    generus_id uuid not null references public.generus (id) on delete cascade,
    status text not null check (
        status in (
            'Hadir',
            'Izin',
            'Alpa / Belum Presensi'
        )
    ),
    alasan text,
    metode text not null default 'QR Scan',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (acara_id, generus_id)
);

create index if not exists presensi_acara_id_idx on public.presensi (acara_id);

create index if not exists presensi_generus_id_idx on public.presensi (generus_id);

-- ------------------------------------------------------------
-- Tabel tambahan: panitia per acara
-- ------------------------------------------------------------
create table if not exists public.acara_panitia (
    id uuid primary key default gen_random_uuid (),
    acara_id uuid not null references public.acara (id) on delete cascade,
    generus_id uuid references public.generus (id) on delete cascade,
    nama_manual text,
    jabatan text not null,
    assigned_at timestamptz not null default now(),
    constraint acara_panitia_member_check check (
        (
            generus_id is not null
            and nullif(btrim (nama_manual), '') is null
        )
        or (
            generus_id is null
            and nullif(btrim (nama_manual), '') is not null
        )
    )
);

create unique index if not exists acara_panitia_acara_generus_key on public.acara_panitia (acara_id, generus_id)
where
    generus_id is not null;

create unique index if not exists acara_panitia_acara_nama_manual_key on public.acara_panitia (
    acara_id,
    lower(btrim (nama_manual))
)
where
    generus_id is null
    and nama_manual is not null;

create index if not exists acara_panitia_generus_id_idx on public.acara_panitia (generus_id);

-- ------------------------------------------------------------
-- Tabel tambahan: desain acara
-- ------------------------------------------------------------
create table if not exists public.acara_design (
    id uuid primary key default gen_random_uuid (),
    acara_id uuid not null references public.acara (id) on delete cascade,
    role text not null check (
        role in ('participant', 'panitia')
    ),
    storage_path text not null,
    mime_type text not null,
    file_size integer not null check (file_size > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (acara_id, role)
);

create index if not exists acara_design_acara_id_idx on public.acara_design (acara_id);

-- ------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------
alter table public.generus enable row level security;

alter table public.acara enable row level security;

alter table public.presensi enable row level security;

alter table public.acara_panitia enable row level security;

alter table public.acara_design enable row level security;

-- ------------------------------------------------------------
-- Policies untuk tabel publik / admin
-- ------------------------------------------------------------
-- Jika aplikasi sudah login sebagai admin, grant akses penuh.
drop policy if exists "Authenticated users can read generus" on public.generus;

create policy "Authenticated users can read generus" on public.generus for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage generus" on public.generus;

create policy "Authenticated users can manage generus" on public.generus for all to authenticated using (true)
with
    check (true);

drop policy if exists "Authenticated users can read acara" on public.acara;

create policy "Authenticated users can read acara" on public.acara for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage acara" on public.acara;

create policy "Authenticated users can manage acara" on public.acara for all to authenticated using (true)
with
    check (true);

drop policy if exists "Authenticated users can read presensi" on public.presensi;

create policy "Authenticated users can read presensi" on public.presensi for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage presensi" on public.presensi;

create policy "Authenticated users can manage presensi" on public.presensi for all to authenticated using (true)
with
    check (true);

drop policy if exists "Authenticated users can read event committees" on public.acara_panitia;

create policy "Authenticated users can read event committees" on public.acara_panitia for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage event committees" on public.acara_panitia;

create policy "Authenticated users can manage event committees" on public.acara_panitia for all to authenticated using (true)
with
    check (true);

drop policy if exists "Authenticated users can read event designs" on public.acara_design;

create policy "Authenticated users can read event designs" on public.acara_design for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage event designs" on public.acara_design;

create policy "Authenticated users can manage event designs" on public.acara_design for all to authenticated using (true)
with
    check (true);

-- ------------------------------------------------------------
-- Public read access untuk halaman rekap dan QR
-- ------------------------------------------------------------
create policy "Public can read generus" on public.generus for
select to public using (true);

create policy "Public can read acara" on public.acara for
select to public using (true);

create policy "Public can read presensi" on public.presensi for
select to public using (true);

create policy "Public can read event committees" on public.acara_panitia for
select to public using (true);

create policy "Public can read event designs" on public.acara_design for
select to public using (true);

-- ------------------------------------------------------------
-- Storage bucket untuk desain acara
-- ------------------------------------------------------------
insert into
    storage.buckets (id, name, public)
values (
        'acara-designs',
        'acara-designs',
        true
    ) on conflict (id) do nothing;

-- Policies storage objects
-- Upload / update / delete hanya untuk authenticated
create policy "Authenticated users can upload event designs" on storage.objects for
insert
    to authenticated
with
    check (bucket_id = 'acara-designs');

create policy "Authenticated users can update event designs" on storage.objects for
update to authenticated using (bucket_id = 'acara-designs')
with
    check (bucket_id = 'acara-designs');

create policy "Authenticated users can delete event designs" on storage.objects for delete to authenticated using (bucket_id = 'acara-designs');

create policy "Anyone can read event designs" on storage.objects for
select to public using (bucket_id = 'acara-designs');

-- ============================================================
-- END OF FILE
-- ============================================================