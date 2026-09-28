-- team_creators() ahora incluye delivery_cadence para pintar el semáforo de
-- ENTREGABLES en /trabajo (el editor ve qué toca entregar por modelo). Mantiene
-- todo lo de 0040 (privacidad: stage name; solo staff) y suma la cadencia.
drop function if exists public.team_creators();
create function public.team_creators()
returns table(
  id uuid, full_name text, handle text, avatar_url text,
  onboarding_status text, lora_status text, plan text, payment_status text,
  subscription_ends_at date, delivery_cadence text
)
language sql stable security definer set search_path to 'public'
as $function$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status, p.lora_status,
         p.plan, p.payment_status, p.subscription_ends_at, p.delivery_cadence
  from public.profiles p
  where p.role = 'creator'
    and public.current_role() in ('admin','supervisor','producer','chatter');
$function$;
grant execute on function public.team_creators() to authenticated;
