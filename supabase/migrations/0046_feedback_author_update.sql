-- El autor puede ACTUALIZAR su propia reacción (upsert al cambiar de opinión:
-- de ❤ a "pide cambio" o viceversa). Sin esto, el ON CONFLICT DO UPDATE del
-- upsert lo negaba RLS (solo staff tenía UPDATE) y cambiar de opinión fallaba.
drop policy if exists "feedback author update" on public.feedback;
create policy "feedback author update" on public.feedback
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
