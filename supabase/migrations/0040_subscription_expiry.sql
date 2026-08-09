-- Fecha de vencimiento de la suscripción (cobro manual por ahora).
alter table public.profiles
  add column if not exists subscription_ends_at date;

-- team_creators() devuelve también la fecha para pintarla en /trabajo.
drop function if exists public.team_creators();
create function public.team_creators()
returns table(
  id uuid, full_name text, handle text, avatar_url text,
  onboarding_status text, lora_status text, plan text, payment_status text,
  subscription_ends_at date
)
language sql stable security definer set search_path to 'public'
as $function$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status, p.lora_status,
         p.plan, p.payment_status, p.subscription_ends_at
  from public.profiles p
  where p.role = 'creator'
    and public.current_role() in ('admin','supervisor','producer','chatter');
$function$;

-- Sembrar la fecha existente: a las cuentas ya activas dales +30 días de hoy
-- para que la lógica de vencimiento tenga con qué trabajar de una.
update public.profiles
set subscription_ends_at = (current_date + interval '30 days')::date
where role = 'creator'
  and payment_status = 'paid'
  and subscription_ends_at is null;
