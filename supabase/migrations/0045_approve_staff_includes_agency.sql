-- Ahora una agencia externa puede registrarse por link (queda pendiente) y el
-- admin la aprueba. approve_staff debe cubrir el rol 'agency' también.
create or replace function public.approve_staff(target uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (public.is_admin() or public.has_cap('team')) then
    raise exception 'No tienes permiso para aprobar personal.';
  end if;
  update public.profiles set staff_status = 'approved'
    where id = target and role in ('supervisor','producer','chatter','agency');
end; $function$;
