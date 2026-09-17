-- Per-event committee assignments and QR card designs.
-- Run this migration in the Supabase SQL editor before using the new admin controls.

create table if not exists public.acara_panitia (
    acara_id uuid not null references public.acara (id) on delete cascade,
    generus_id uuid not null references public.generus (id) on delete cascade,
    jabatan text,
    assigned_at timestamptz not null default now(),
    primary key (acara_id, generus_id)
);

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

create index if not exists acara_panitia_generus_id_idx on public.acara_panitia (generus_id);

create index if not exists acara_design_acara_id_idx on public.acara_design (acara_id);

alter table public.acara_panitia enable row level security;

alter table public.acara_design enable row level security;

-- The application already authenticates admin pages. These policies allow signed-in users
-- to manage the event configuration while keeping anonymous access disabled.
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

insert into
    storage.buckets (id, name, public)
values (
        'acara-designs',
        'acara-designs',
        true
    ) on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload event designs" on storage.objects;

create policy "Authenticated users can upload event designs" on storage.objects for
insert
    to authenticated
with
    check (bucket_id = 'acara-designs');

drop policy if exists "Authenticated users can update event designs" on storage.objects;

create policy "Authenticated users can update event designs" on storage.objects for
update to authenticated using (bucket_id = 'acara-designs')
with
    check (bucket_id = 'acara-designs');

drop policy if exists "Authenticated users can delete event designs" on storage.objects;

create policy "Authenticated users can delete event designs" on storage.objects for delete to authenticated using (bucket_id = 'acara-designs');

drop policy if exists "Anyone can read event designs" on storage.objects;

create policy "Anyone can read event designs" on storage.objects for
select to public using (bucket_id = 'acara-designs');