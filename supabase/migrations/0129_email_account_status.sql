-- "Una sola puerta" para login/registro (las modelos se confundían entre Entrar y Crear cuenta — caso Danik).
-- El formulario pide primero el CORREO y esta RPC dice si ya tiene cuenta ('exists') o es nueva ('new'):
-- con cuenta → pide contraseña (entrar); nueva → crea la cuenta. No expone nada nuevo: el alta pública
-- (edge public-signup) ya respondía 'exists' para un correo registrado. Devuelve solo el estado, nunca datos.
create or replace function public.email_account_status(p_email text) returns text
language sql stable security definer set search_path to 'public', 'auth' as $$
  select case
    when nullif(trim(coalesce(p_email, '')), '') is null then 'new'
    when exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)) and u.deleted_at is null) then 'exists'
    else 'new'
  end;
$$;
revoke all on function public.email_account_status(text) from public;
grant execute on function public.email_account_status(text) to anon, authenticated;
