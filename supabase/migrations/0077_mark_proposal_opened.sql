-- Marca la primera vez que se abre una propuesta (para el "abierto" del almacén).
-- Pública (anon) porque la llama el viewer sin sesión; solo toca first_opened_at
-- y sólo si está publicada y viva. No expone datos ni permite otra escritura.
-- (Aplicada en producción el 2026-09-14 vía MCP; se versiona acá para el repo.)
create or replace function public.mark_proposal_opened(p_link text)
returns void
language sql security definer set search_path = public as $$
  update public.photo_proposals
  set first_opened_at = coalesce(first_opened_at, now())
  where link_id = p_link and status = 'published'
    and coalesce(link_killed, false) = false;
$$;
grant execute on function public.mark_proposal_opened(text) to anon, authenticated;
