-- Encabezado de dedicatoria editable en la portada ("Preparada para" →
-- "Con dedicación a", etc.). null = usar el default del idioma en el viewer.
-- (Aplicada en producción el 2026-09-09 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals add column if not exists dedication text;

-- get_proposal_by_link ahora también devuelve dedication. Cambia la firma de
-- RETURNS TABLE, así que hay que DROP + CREATE (no basta CREATE OR REPLACE).
drop function if exists public.get_proposal_by_link(text);
create function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, looks jsonb,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  dedication text,
  expires_at timestamptz, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, looks,
         model_name, model_agency, recipient_name, recipient_email, dedication, expires_at, created_at
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
