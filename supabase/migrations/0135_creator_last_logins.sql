-- Último login de cada usuario (desde auth.users) para el panel /admin.
-- Solo lo ve quien es admin o tiene el cap de equipo/kyc; para los demás devuelve vacío.
create or replace function public.creator_last_logins()
returns table (user_id uuid, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.last_sign_in_at
  from auth.users u
  where public.is_admin() or public.has_cap('kyc') or public.has_cap('creators');
$$;
revoke all on function public.creator_last_logins() from public, anon;
grant execute on function public.creator_last_logins() to authenticated;
