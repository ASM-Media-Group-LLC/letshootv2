-- Última entrega (assets.created_at) por creadora, para el semáforo de cadencia
-- en la lista de Creadoras y la vista Entregas. Solo staff (is_staff); agregada
-- para no traer miles de filas. Aplicada en producción el 2026-09-14 vía MCP.
create or replace function public.last_delivery_by_creator()
returns table (creator_id uuid, last_at timestamptz)
language sql security definer set search_path = public as $$
  select a.creator_id, max(a.created_at) as last_at
  from public.assets a
  where a.creator_id is not null and public.is_staff()
  group by a.creator_id;
$$;
grant execute on function public.last_delivery_by_creator() to authenticated;
