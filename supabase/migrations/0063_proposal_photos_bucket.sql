-- Bucket PÚBLICO para las fotos que el equipo sube al armar una PROPUESTA.
-- Antes se incrustaban como base64 dentro de la fila (filas de 6+ MB, lentísimas
-- en el teléfono). Ahora se suben acá y en la propuesta se guarda solo la URL.
-- (Aplicada en producción el 2026-09-09 vía MCP; se versiona acá para el repo.)
insert into storage.buckets (id, name, public)
values ('proposal-photos', 'proposal-photos', true)
on conflict (id) do update set public = true;

-- Subida/gestión: solo staff (is_staff de 0062). Lectura: pública (bucket público).
drop policy if exists "proposal-photos staff upload" on storage.objects;
create policy "proposal-photos staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proposal-photos' and public.is_staff());

drop policy if exists "proposal-photos staff update" on storage.objects;
create policy "proposal-photos staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'proposal-photos' and public.is_staff())
  with check (bucket_id = 'proposal-photos' and public.is_staff());

drop policy if exists "proposal-photos staff delete" on storage.objects;
create policy "proposal-photos staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proposal-photos' and public.is_staff());

drop policy if exists "proposal-photos public read" on storage.objects;
create policy "proposal-photos public read" on storage.objects
  for select using (bucket_id = 'proposal-photos');
