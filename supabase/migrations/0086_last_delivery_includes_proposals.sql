-- "Última entrega" para la cadencia ahora cuenta DOS señales (lo más reciente):
--   · subidas a su biblioteca (assets.created_at), y
--   · propuestas marcadas "entregado" en el Almacén (photo_proposals.delivered_at)
-- Así, cuando el equipo marca entregado, el reloj de cadencia avanza solo y la
-- "próxima entrega" en Peticiones salta a la fecha siguiente. Se excluyen las
-- propuestas internas (revisión de equipo).
CREATE OR REPLACE FUNCTION public.last_delivery_by_creator()
 RETURNS TABLE(creator_id uuid, last_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d.creator_id, max(d.last_at) as last_at
  from (
    select a.creator_id, a.created_at as last_at
      from public.assets a
      where a.creator_id is not null
    union all
    select p.recipient_user_id as creator_id, p.delivered_at as last_at
      from public.photo_proposals p
      where p.recipient_user_id is not null
        and p.delivered_at is not null
        and p.recipient_kind is distinct from 'internal'
  ) d
  where public.is_staff()
  group by d.creator_id;
$function$;
