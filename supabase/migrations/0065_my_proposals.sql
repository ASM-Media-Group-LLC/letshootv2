-- "Mis propuestas": la creadora ve en su cuenta las propuestas que le mandaron.
-- El vínculo es su registro (photo_proposal_registrations) por email = su email.
-- (Aplicada en producción el 2026-09-09 vía MCP; se versiona acá para el repo.)
create or replace function public.my_proposals()
returns table (
  link_id text, name text, subtitle text, lang text,
  model_name text, cover_url text, status text,
  expires_at timestamptz, created_at timestamptz, registered_at timestamptz
)
language sql security definer set search_path = public as $$
  with me as (select lower(email) as email from public.profiles where id = auth.uid())
  select distinct on (p.id)
    p.link_id, p.name, p.subtitle, p.lang, p.model_name, p.cover_url, p.status,
    p.expires_at, p.created_at, r.created_at as registered_at
  from public.photo_proposal_registrations r
  join public.photo_proposals p on p.id = r.proposal_id
  where lower(r.email) = (select email from me)
    and p.status = 'published'
    and (p.expires_at is null or p.expires_at > now())
  order by p.id, r.created_at desc;
$$;
grant execute on function public.my_proposals() to authenticated;
