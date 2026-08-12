-- Faltaba la política de storage: sin ella la creadora no podía borrar sus
-- propias fotos del bucket 'lora' (aunque sí borrara la fila en lora_photos,
-- el objeto quedaba huérfano). Owner o admin pueden borrar sus propios objetos.
drop policy if exists "lora obj owner delete" on storage.objects;
create policy "lora obj owner delete" on storage.objects for delete
  using (bucket_id = 'lora' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
