-- team_creators ahora también devuelve plan + payment_status para que los
-- uploaders vean si la creadora tiene suscripción activa. Cambiar el RETURNS
-- TABLE obliga a DROP + CREATE.
drop function if exists public.team_creators();

create function public.team_creators()
returns table(
  id uuid, full_name text, handle text, avatar_url text,
  onboarding_status text, lora_status text, plan text, payment_status text
)
language sql stable security definer set search_path to 'public'
as $function$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status, p.lora_status,
         p.plan, p.payment_status
  from public.profiles p
  where p.role = 'creator'
    and public.current_role() in ('admin','supervisor','producer','chatter');
$function$;
