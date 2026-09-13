-- Bucket PÚBLICO para los AUDIOS que el equipo sube al armar una propuesta de
-- audio (la "bóveda de audio", equivalente a proposal-photos). Se guarda la URL.
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)
insert into storage.buckets (id, name, public)
values ('proposal-audios', 'proposal-audios', true)
on conflict (id) do update set public = true;

-- Subida/gestión: solo staff (is_staff). Lectura: pública (bucket público).
drop policy if exists "proposal-audios staff upload" on storage.objects;
create policy "proposal-audios staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proposal-audios' and public.is_staff());

drop policy if exists "proposal-audios staff update" on storage.objects;
create policy "proposal-audios staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'proposal-audios' and public.is_staff())
  with check (bucket_id = 'proposal-audios' and public.is_staff());

drop policy if exists "proposal-audios staff delete" on storage.objects;
create policy "proposal-audios staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proposal-audios' and public.is_staff());

drop policy if exists "proposal-audios public read" on storage.objects;
create policy "proposal-audios public read" on storage.objects
  for select using (bucket_id = 'proposal-audios');
