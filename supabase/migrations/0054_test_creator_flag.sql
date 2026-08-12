-- Flag "modelo de prueba" (is_test).
-- Una creadora marcada como de prueba NO cuenta en los números de contabilidad
-- (ingreso estimado, desglose, activas). Solo el DUEÑO (admin) puede ponerlo o
-- quitarlo — el resto del equipo, aunque tenga la función de cobros, no puede.

alter table public.profiles add column if not exists is_test boolean not null default false;

-- team_billing ahora incluye is_test para que el panel de Cuentas excluya las
-- de prueba de todos los totales. (DROP porque cambia el tipo de retorno.)
drop function if exists public.team_billing();
create function public.team_billing()
returns table (
  id uuid, full_name text, handle text, avatar_url text,
  onboarding_status text, plan text, payment_status text,
  subscription_ends_at date, comp_until date, billing_note text, is_test boolean
)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status,
         p.plan, p.payment_status, p.subscription_ends_at, p.comp_until, p.billing_note,
         coalesce(p.is_test, false) as is_test
    from public.profiles p
   where p.role = 'creator'
     and (public.is_admin() or public.has_cap('billing'))
   order by p.created_at desc;
$$;
revoke execute on function public.team_billing() from anon;
grant execute on function public.team_billing() to authenticated;

-- Solo el DUEÑO (admin) marca/desmarca una creadora como de prueba.
-- No basta con la función 'billing' — es exclusivo del admin.
create or replace function public.admin_set_test_creator(p_creator uuid, p_is_test boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el dueno puede marcar modelos de prueba' using errcode = '42501';
  end if;
  update public.profiles
     set is_test = coalesce(p_is_test, false)
   where id = p_creator and role = 'creator';
  if not found then raise exception 'La cuenta no es una creadora'; end if;
end; $$;
revoke execute on function public.admin_set_test_creator(uuid, boolean) from anon;
grant execute on function public.admin_set_test_creator(uuid, boolean) to authenticated;
