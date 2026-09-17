-- ============================================================
-- Migration: Refactor generus to pengurus (Tamantirto)
-- 1. Rename table generus -> pengurus
-- 2. Rename column nama -> nama_pengurus
-- 3. Drop column kelas
-- 4. Rename foreign keys generus_id -> pengurus_id pada presensi & acara_panitia
-- 5. Update index & RLS policies
-- ============================================================

-- 1. Rename tabel
alter table if exists public.generus rename to pengurus;

-- 2. Rename kolom nama -> nama_pengurus
alter table public.pengurus rename column nama to nama_pengurus;

-- 3. Hapus kolom kelas
alter table public.pengurus drop column if exists kelas;

-- 4. Rename kolom relasi di tabel presensi
alter table public.presensi rename column generus_id to pengurus_id;

-- 5. Rename kolom relasi di tabel acara_panitia
alter table public.acara_panitia rename column generus_id to pengurus_id;

-- 6. Perbarui Index & Constraint yang merujuk nama lama
-- Index qr_code_id pada pengurus
alter index if exists generus_qr_code_id_key rename to pengurus_qr_code_id_key;

-- Index presensi
alter index if exists presensi_generus_id_idx rename to presensi_pengurus_id_idx;

-- Index acara_panitia
alter index if exists acara_panitia_generus_id_idx rename to acara_panitia_pengurus_id_idx;
alter index if exists acara_panitia_acara_generus_key rename to acara_panitia_acara_pengurus_key;

-- Update constraint nama pada acara_panitia jika ada
alter table public.acara_panitia drop constraint if exists acara_panitia_acara_generus_unique;
alter table public.acara_panitia add constraint acara_panitia_acara_pengurus_unique unique (acara_id, pengurus_id);

alter table public.acara_panitia drop constraint if exists acara_panitia_member_check;
alter table public.acara_panitia add constraint acara_panitia_member_check check (
    (
        pengurus_id is not null
        and nullif(btrim(nama_manual), '') is null
    )
    or (
        pengurus_id is null
        and nullif(btrim(nama_manual), '') is not null
    )
);

-- 7. Update RLS policies untuk tabel pengurus
drop policy if exists "Authenticated users can read generus" on public.pengurus;
create policy "Authenticated users can read pengurus" on public.pengurus for
select to authenticated using (true);

drop policy if exists "Authenticated users can manage generus" on public.pengurus;
create policy "Authenticated users can manage pengurus" on public.pengurus for all to authenticated using (true)
with check (true);

drop policy if exists "Public can read generus" on public.pengurus;
create policy "Public can read pengurus" on public.pengurus for
select to public using (true);

-- ============================================================
-- END OF MIGRATION
-- ============================================================