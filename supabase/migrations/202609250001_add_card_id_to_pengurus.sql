--- ============================================================
-- Migration: Add card_id column for RFID/NFC Card Reader
-- ============================================================

-- 1. Tambahkan kolom card_id ke tabel pengurus jika belum ada
alter table public.pengurus add column if not exists card_id text;

-- 2. Buat unique index untuk card_id (abaikan null)
create unique index if not exists pengurus_card_id_key on public.pengurus (card_id)
where
    card_id is not null;