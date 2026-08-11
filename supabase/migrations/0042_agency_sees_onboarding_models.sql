-- La agencia debe VER sus modelos vinculadas aunque aún no hayan pagado
-- (para seguirlas por el onboarding hasta que activen). El CONTENIDO
-- (assets/folders) sigue bloqueado por is_active_creator, así que una modelo
-- inactiva aparece con su estado pero sin biblioteca. Antes, profiles agency
-- read exigía is_active_creator y las ocultaba por completo.
drop policy if exists "profiles agency read" on public.profiles;
create policy "profiles agency read" on public.profiles
  for select to authenticated
  using (manages_creator(id));
