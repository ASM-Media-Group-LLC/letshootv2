-- La creadora avisa a su agencia cuando la deja. Antes el insert lo bloqueaba
-- RLS (solo staff podía insertar notificaciones), así que el aviso se perdía.
-- Restringido a kind='agency_left' para no abrir el buzón a otros usos.
drop policy if exists "notif creator agency_left" on public.notifications;
create policy "notif creator agency_left" on public.notifications
  for insert to authenticated
  with check (kind = 'agency_left' and "current_role"() = 'creator'::user_role);
