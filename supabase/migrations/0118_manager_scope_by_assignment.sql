-- ── Rol Manager (chatter): "ve solo SUS modelos" ────────────────────────────
-- Helper de visibilidad por rol:
--   admin / supervisor (PR) / producer (Editor)  → ven TODAS las creadoras (hoy).
--   chatter (Manager)                            → SOLO las que tiene asignadas
--                                                  en staff_assignments.
-- Se usa para acotar team_creators() y (en la etapa 2) las propuestas.
create or replace function public.can_see_creator(cid uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select case
    when public.is_admin() then true
    when (select p.role from public.profiles p where p.id = auth.uid()) in ('supervisor','producer') then true
    when (select p.role from public.profiles p where p.id = auth.uid()) = 'chatter'
      then exists (
        select 1 from public.staff_assignments sa
        where sa.staff_id = auth.uid() and sa.creator_id = cid
      )
    else false
  end;
$function$;
grant execute on function public.can_see_creator(uuid) to authenticated;

-- team_creators(): el Manager ahora solo recibe sus modelos asignadas. Para
-- admin/PR/Editor no cambia nada (can_see_creator = true para ellos).
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
    and public.current_role() in ('admin','supervisor','producer','chatter')
    and public.can_see_creator(p.id);
$function$;
grant execute on function public.team_creators() to authenticated;
