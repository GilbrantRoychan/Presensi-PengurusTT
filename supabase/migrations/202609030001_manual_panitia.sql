-- Allow event committees to contain people who are not registered as generus.

alter table public.acara_panitia
add column if not exists id uuid default gen_random_uuid (),
add column if not exists nama_manual text;

update public.acara_panitia
set
    jabatan = 'Panitia'
where
    jabatan is null
    or btrim (jabatan) = '';

update public.acara_panitia
set
    id = gen_random_uuid ()
where
    id is null;

alter table public.acara_panitia
alter column id
set
    not null,
alter column generus_id
drop not null,
alter column jabatan
set
    not null,
drop constraint if exists acara_panitia_pkey,
add constraint acara_panitia_pkey primary key (id),
drop constraint if exists acara_panitia_member_check,
add constraint acara_panitia_member_check check (
    (
        generus_id is not null
        and nullif(btrim (nama_manual), '') is null
    )
    or (
        generus_id is null
        and nullif(btrim (nama_manual), '') is not null
    )
);

create unique index if not exists acara_panitia_acara_generus_key on public.acara_panitia (acara_id, generus_id)
where
    generus_id is not null;

drop index if exists public.acara_panitia_acara_jabatan_key;

alter table public.acara_panitia
drop constraint if exists acara_panitia_acara_generus_unique;

alter table public.acara_panitia
add constraint acara_panitia_acara_generus_unique unique (acara_id, generus_id);

create unique index if not exists acara_panitia_acara_nama_manual_key on public.acara_panitia (
    acara_id,
    lower(btrim (nama_manual))
)
where
    generus_id is null
    and nama_manual is not null;