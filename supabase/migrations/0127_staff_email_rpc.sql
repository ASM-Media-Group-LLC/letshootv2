-- "Copia al equipo" en el armador de propuestas: la PR necesita el CORREO del compañero que elige, pero profiles
-- (filas del equipo) sigue siendo privado a propósito (mig 0007: self-or-admin). En vez de abrirle la tabla, esta RPC
-- devuelve SOLO el correo de UN integrante del equipo (nunca de creadoras/agencias) y solo a admin o PR.
-- Ver [[roles-system]].
create or replace function public.staff_email(sid uuid) returns text
language sql stable security definer set search_path to 'public' as $$
  select p.email from public.profiles p
  where p.id = sid
    and p.role not in ('creator', 'agency', 'agent')
    and public."current_role"() in ('admin', 'supervisor');
$$;
revoke all on function public.staff_email(uuid) from public, anon;
grant execute on function public.staff_email(uuid) to authenticated;
