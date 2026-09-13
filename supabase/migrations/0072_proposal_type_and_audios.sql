-- Tipo de propuesta (visual / audio / ambas) + la bóveda de AUDIOS que el
-- equipo arma (mp3 de ElevenLabs). Cada audio: { id, label, src }.
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals
  add column if not exists proposal_type text not null default 'visual',
  add column if not exists audios jsonb not null default '[]'::jsonb;

alter table public.photo_proposals
  drop constraint if exists photo_proposals_proposal_type_check;
alter table public.photo_proposals
  add constraint photo_proposals_proposal_type_check
  check (proposal_type in ('visual','audio','both'));

-- La RPC pública tiene firma fija → recrearla para devolver proposal_type + audios.
drop function if exists public.get_proposal_by_link(text);
create or replace function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, agency_logo_url text, logos jsonb, looks jsonb,
  proposal_type text, audios jsonb,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  expires_at timestamptz, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, agency_logo_url, logos, looks,
         proposal_type, audios,
         model_name, model_agency, recipient_name, recipient_email, expires_at, created_at
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
