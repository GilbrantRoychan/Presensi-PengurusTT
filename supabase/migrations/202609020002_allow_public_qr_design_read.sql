-- QR generation is available on the public page, so event committee/design
-- metadata must be readable without granting anonymous write access.

drop policy if exists "Public can read event committees" on public.acara_panitia;

create policy "Public can read event committees" on public.acara_panitia for
select to anon, authenticated using (true);

drop policy if exists "Public can read event designs" on public.acara_design;

create policy "Public can read event designs" on public.acara_design for
select to anon, authenticated using (true);