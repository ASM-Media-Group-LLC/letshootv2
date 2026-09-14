-- Permitir status 'draft' en photo_proposals (propuesta borrador creada desde un
-- pedido aprobado, aún sin contenido; NO es pública — get_proposal_by_link sólo
-- devuelve 'published'). Aplicada en producción el 2026-09-14 vía MCP.
alter table public.photo_proposals drop constraint if exists photo_proposals_status_check;
alter table public.photo_proposals add constraint photo_proposals_status_check
  check (status = any (array['draft','published','archived']));
