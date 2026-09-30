-- Comparativo de voz "real vs IA" en la propuesta. Ver [[letshoot-voice]].
-- creator_voice guarda la VOZ REAL de la modelo (un clip corto, tipo saludo) y un SALUDO con IA ya generado
-- con su voz fija; la propuesta guarda una FOTO de ese par (voice_compare) para que lo que se mandó no cambie.
alter table public.creator_voice add column if not exists real_url text;
alter table public.creator_voice add column if not exists real_source text check (real_source in ('upload', 'voice'));
alter table public.creator_voice add column if not exists real_text text;
alter table public.creator_voice add column if not exists greeting_url text;
alter table public.creator_voice add column if not exists greeting_text text;
alter table public.creator_voice add column if not exists greeting_lang text;

-- { real: { src, label }, ia: { src, label, text } } — null = sin comparativo.
alter table public.photo_proposals add column if not exists voice_compare jsonb;

-- El link público devuelve también el comparativo (columna nueva AL FINAL: el front viejo la ignora).
drop function if exists public.get_proposal_by_link(text);
create function public.get_proposal_by_link(p_link text)
returns table(link_id text, name text, subtitle text, intro text, lang text, template text, cover_url text, closing_url text,
  agency_logo_url text, logos jsonb, looks jsonb, proposal_type text, audios jsonb, approval_required boolean,
  approval_status text, approval_reviewer_name text, model_name text, model_agency text, recipient_name text,
  recipient_email text, expires_at timestamp with time zone, created_at timestamp with time zone, voice_compare jsonb)
language sql
security definer
set search_path to 'public'
as $function$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, agency_logo_url, logos, looks,
         proposal_type, audios,
         approval_required, approval_status, approval_reviewer_name,
         model_name, model_agency, recipient_name, recipient_email, expires_at, created_at, voice_compare
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and coalesce(link_killed, false) = false
    and (expires_at is null or expires_at > now())
  limit 1;
$function$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated, service_role;
