-- Permite a la creadora RE-SUBIR (overwrite/upsert) sus propios documentos de
-- identidad cuando fue rechazada. El bucket kyc tenía INSERT y SELECT del dueño
-- pero le faltaba UPDATE, así que el upsert (mismo path id_front.jpg, etc.) era
-- denegado por RLS y la dejaba atascada en id_rejected.
drop policy if exists "kyc obj owner update" on storage.objects;
create policy "kyc obj owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
