-- ============================================================
-- Migration: Add dapukan array column to pengurus table
-- ============================================================

alter table public.pengurus
add column if not exists dapukan text[] default '{}';
