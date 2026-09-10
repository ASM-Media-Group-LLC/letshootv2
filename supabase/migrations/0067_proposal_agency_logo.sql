-- Logo de la AGENCIA en la propuesta: se muestra junto a LetShoot (en la portada,
-- el gate de registro y el cierre) para que la creadora sienta que se la da su
-- agencia. Se sube al bucket público 'proposal-photos/logos' y acá guardamos la URL.
-- (Aplicada en producción el 2026-09-09 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals
  add column if not exists agency_logo_url text;

-- La RPC pública devuelve una tabla con firma fija → hay que recrearla para incluir
-- la nueva columna (Postgres no permite cambiar el tipo de retorno con replace).
drop function if exists public.get_proposal_by_link(text);
create or replace function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, agency_logo_url text, looks jsonb,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  expires_at timestamptz, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, agency_logo_url, looks,
         model_name, model_agency, recipient_name, recipient_email, expires_at, created_at
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
