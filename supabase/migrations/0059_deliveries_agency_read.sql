-- La agencia (y sus empleados) deben poder leer las fotos/videos de las
-- modelos que gestionan — hasta ahora la RLS del bucket 'deliveries' solo
-- dejaba a admin/producer/chatter y a la propia creadora, por eso las fotos
-- salían en negro en /agencia.

drop policy if exists "deliveries agency read" on storage.objects;
create policy "deliveries agency read" on storage.objects for select
  using (
    bucket_id = 'deliveries'
    and exists (
      select 1 from public.agency_creators ac
      where ac.agency_id = auth.uid()
        and ac.creator_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "deliveries agency member read" on storage.objects;
create policy "deliveries agency member read" on storage.objects for select
  using (
    bucket_id = 'deliveries'
    and exists (
      select 1 from public.agency_member_creators amc
      where amc.member_id = auth.uid()
        and amc.creator_id::text = (storage.foldername(name))[1]
    )
  );
