-- El viewer necesita saber si la propuesta YA fue aprobada/rechazada al cargar
-- (para no ofrecer aprobar dos veces). Se agregan a la RPC pública: estado de
-- aprobación, si requiere aprobación, y quién decidió. Sin datos sensibles.
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)
drop function if exists public.get_proposal_by_link(text);
create or replace function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, agency_logo_url text, logos jsonb, looks jsonb,
  proposal_type text, audios jsonb,
  approval_required boolean, approval_status text, approval_reviewer_name text,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  expires_at timestamptz, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, agency_logo_url, logos, looks,
         proposal_type, audios,
         approval_required, approval_status, approval_reviewer_name,
         model_name, model_agency, recipient_name, recipient_email, expires_at, created_at
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and coalesce(link_killed, false) = false
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
