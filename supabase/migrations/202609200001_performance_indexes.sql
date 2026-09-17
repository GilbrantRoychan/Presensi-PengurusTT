-- Performance indexes for tuning render speed
create index if not exists idx_presensi_acara_id on public.presensi (acara_id);
create index if not exists idx_presensi_pengurus_id on public.presensi (pengurus_id);
create index if not exists idx_pengurus_kelompok on public.pengurus (kelompok);
create index if not exists idx_acara_tanggal on public.acara (tanggal);