-- ─────────────────────────────────────────────────────────────────────────
-- BUG FIX: the private 'deliveries' bucket had NO storage.objects policies —
-- nobody could upload or read through the client API. Staff (admin/producer)
-- upload; the creator reads their own folder (path prefix = their user id);
-- staff read everything; staff may delete.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "deliveries staff insert" on storage.objects;
drop policy if exists "deliveries read" on storage.objects;
drop policy if exists "deliveries staff delete" on storage.objects;

create policy "deliveries staff insert" on storage.objects for insert
  with check (bucket_id = 'deliveries' and public.current_role() in ('admin','producer'));

create policy "deliveries read" on storage.objects for select
  using (bucket_id = 'deliveries'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.current_role() in ('admin','producer','chatter')));

create policy "deliveries staff delete" on storage.objects for delete
  using (bucket_id = 'deliveries' and public.current_role() in ('admin','producer'));
