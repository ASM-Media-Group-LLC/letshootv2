-- Ligar la propuesta a la CUENTA de la creadora (no solo por nombre): al publicar
-- para una "creadora activa" se sella su id, y "Mis propuestas" la muestra apenas
-- se publica (sin que ella abra el link). También backfill de las ya publicadas.
-- (Aplicada en producción el 2026-09-09 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals
  add column if not exists recipient_user_id uuid references public.profiles(id);
create index if not exists photo_proposals_recipient_user_idx
  on public.photo_proposals(recipient_user_id);

create or replace function public.my_proposals()
returns table (
  link_id text, name text, subtitle text, lang text,
  model_name text, cover_url text, status text,
  expires_at timestamptz, created_at timestamptz, registered_at timestamptz
)
language sql security definer set search_path = public as $$
  with me as (select id as uid, lower(email) as email from public.profiles where id = auth.uid())
  select distinct on (p.id)
    p.link_id, p.name, p.subtitle, p.lang, p.model_name, p.cover_url, p.status,
    p.expires_at, p.created_at, coalesce(r.created_at, p.created_at) as registered_at
  from public.photo_proposals p
  left join public.photo_proposal_registrations r
    on r.proposal_id = p.id and lower(r.email) = (select email from me)
  where p.status = 'published'
    and (p.expires_at is null or p.expires_at > now())
    and (
      p.recipient_user_id = (select uid from me)
      or lower(coalesce(p.recipient_email,'')) = (select email from me)
      or r.id is not null
    )
  order by p.id, r.created_at desc nulls last;
$$;
grant execute on function public.my_proposals() to authenticated;

-- Backfill: liga propuestas ya publicadas a la creadora cuyo nombre coincide (si único).
update public.photo_proposals p
set recipient_user_id = c.id
from public.profiles c
where p.recipient_user_id is null
  and c.role = 'creator'
  and lower(coalesce(nullif(c.stage_name,''), c.full_name)) = lower(trim(p.recipient_name))
  and (select count(*) from public.profiles c2
       where c2.role='creator'
         and lower(coalesce(nullif(c2.stage_name,''), c2.full_name)) = lower(trim(p.recipient_name))) = 1;
