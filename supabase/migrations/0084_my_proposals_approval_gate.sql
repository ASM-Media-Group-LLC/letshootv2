-- Gate de aprobación en my_proposals: una propuesta que "necesita aprobación"
-- NO le aparece a la creadora hasta que esté APROBADA. Antes, una propuesta
-- published + recipient_user_id (creadora activa) se veía en su panel aunque el
-- approval_status siguiera 'pending' (o incluso 'rejected'). Además, las
-- propuestas INTERNAS (revisión del equipo) nunca deben verse en el panel de la
-- creadora — solo cuando el equipo las "envía a la creadora" (se reconvierten a
-- active/new con ?tocreator=1).
CREATE OR REPLACE FUNCTION public.my_proposals()
 RETURNS TABLE(link_id text, name text, subtitle text, lang text, model_name text, cover_url text, status text, expires_at timestamp with time zone, created_at timestamp with time zone, registered_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select id as uid, lower(email) as email from public.profiles where id = auth.uid())
  select distinct on (p.id)
    p.link_id, p.name, p.subtitle, p.lang, p.model_name, p.cover_url, p.status,
    p.expires_at, p.created_at, coalesce(r.created_at, p.created_at) as registered_at
  from public.photo_proposals p
  left join public.photo_proposal_registrations r
    on r.proposal_id = p.id and lower(r.email) = (select email from me)
  where p.status = 'published'
    and p.recipient_kind is distinct from 'internal'
    and (p.approval_required is not true or p.approval_status = 'approved')
    and (p.expires_at is null or p.expires_at > now())
    and (
      p.recipient_user_id = (select uid from me)
      or lower(coalesce(p.recipient_email,'')) = (select email from me)
      or r.id is not null
    )
  order by p.id, r.created_at desc nulls last;
$function$;
