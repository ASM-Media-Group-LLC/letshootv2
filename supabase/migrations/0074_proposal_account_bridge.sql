-- LOGÍSTICA DEL ALMACÉN — el corazón: lo que la creadora APRUEBA cae solo a su
-- cuenta ('por producir'); lo rechazado queda 'recrear'. Más: ciclo de vida del
-- link (entregado / matar link / primer visto).
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)

-- 1) Ciclo de vida de la propuesta.
alter table public.photo_proposals
  add column if not exists delivered_at    timestamptz,
  add column if not exists link_killed      boolean not null default false,
  add column if not exists first_opened_at timestamptz;

-- 2) El contenido que cae a la CUENTA de la creadora (lo que eligió en la propuesta).
create table if not exists public.proposal_content (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.photo_proposals(id) on delete cascade,
  creator_user_id uuid references public.profiles(id),
  creator_name    text,
  item_id         text not null,
  kind            text not null check (kind in ('photo','audio')),
  label           text,
  src             text,
  decision        text not null check (decision in ('approved','rejected')),
  prod_state      text not null default 'to_produce' check (prod_state in ('to_produce','delivered')),
  note            text,
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz,
  unique (proposal_id, item_id)
);
create index if not exists proposal_content_proposal_idx on public.proposal_content(proposal_id);
create index if not exists proposal_content_creator_idx  on public.proposal_content(creator_user_id);

alter table public.proposal_content enable row level security;
drop policy if exists "proposal_content staff all" on public.proposal_content;
create policy "proposal_content staff all" on public.proposal_content
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "proposal_content creator read own" on public.proposal_content;
create policy "proposal_content creator read own" on public.proposal_content
  for select to authenticated using (creator_user_id = auth.uid());

-- 3) EL PUENTE: al guardar el feedback de la CREADORA, sus aprobados/rechazados
--    generan filas en proposal_content (aprobado→cuenta 'por producir'; rechazado
--    →'recrear'). El src/label reales salen de looks/audios de la propuesta (no
--    se confía en el cliente). El feedback del EQUIPO (kind='internal') no llena
--    la cuenta.
drop function if exists public.save_proposal_feedback(text, uuid, jsonb, text, text);
create or replace function public.save_proposal_feedback(
  p_link text, p_reg uuid, p_items jsonb, p_name text default null, p_kind text default 'creator'
) returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  prop_looks jsonb; prop_audios jsonb; prop_user uuid; prop_name text;
  it jsonb; iid text; ist text; inote text; ikind text; ilabel text; isrc text;
begin
  select id, looks, audios, recipient_user_id, recipient_name
    into pid, prop_looks, prop_audios, prop_user, prop_name
    from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;

  -- guardar/actualizar el feedback (bucket creador vs equipo)
  select id into existing from public.photo_proposal_feedback
    where proposal_id = pid and registration_id is not distinct from p_reg
      and reviewer_kind = kind limit 1;
  if existing is null then
    insert into public.photo_proposal_feedback (proposal_id, registration_id, recipient_name, items, reviewer_kind)
      values (pid, p_reg, p_name, coalesce(p_items,'[]'::jsonb), kind);
  else
    update public.photo_proposal_feedback
      set items = coalesce(p_items,'[]'::jsonb), recipient_name = coalesce(p_name, recipient_name), updated_at = now()
      where id = existing;
  end if;

  -- PUENTE a la cuenta (solo feedback de la creadora)
  if kind = 'creator' then
    for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
      iid := it->>'id'; ist := it->>'status'; inote := coalesce(it->>'note','');
      ikind := null; ilabel := null; isrc := null;
      if iid is null or ist is null or ist not in ('liked','rejected') then continue; end if;
      select 'photo', coalesce(l->>'caption',''), l->>'result' into ikind, ilabel, isrc
        from jsonb_array_elements(coalesce(prop_looks,'[]'::jsonb)) l where l->>'id' = iid limit 1;
      if ikind is null then
        select 'audio', coalesce(a->>'label',''), a->>'src' into ikind, ilabel, isrc
          from jsonb_array_elements(coalesce(prop_audios,'[]'::jsonb)) a where a->>'id' = iid limit 1;
      end if;
      if ikind is null then continue; end if;
      insert into public.proposal_content (proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, note)
        values (pid, prop_user, prop_name, iid, ikind, ilabel, isrc,
                case when ist='liked' then 'approved' else 'rejected' end, inote)
      on conflict (proposal_id, item_id) do update
        set decision = excluded.decision, label = excluded.label, src = excluded.src,
            note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;
    end loop;
  end if;
end; $$;
grant execute on function public.save_proposal_feedback(text, uuid, jsonb, text, text) to anon, authenticated;

-- 4) get_proposal_by_link: respeta link_killed (link muerto = no abre) y sella el
--    primer visto (first_opened_at). Sigue devolviendo proposal_type + audios.
drop function if exists public.get_proposal_by_link(text);
create or replace function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, agency_logo_url text, logos jsonb, looks jsonb,
  proposal_type text, audios jsonb,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  expires_at timestamptz, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  update public.photo_proposals
     set first_opened_at = now()
   where photo_proposals.link_id = p_link and status = 'published'
     and coalesce(link_killed, false) = false and first_opened_at is null
     and (expires_at is null or expires_at > now());
  return query
    select p.link_id, p.name, p.subtitle, p.intro, p.lang, p.template, p.cover_url, p.closing_url,
           p.agency_logo_url, p.logos, p.looks, p.proposal_type, p.audios,
           p.model_name, p.model_agency, p.recipient_name, p.recipient_email, p.expires_at, p.created_at
    from public.photo_proposals p
    where p.link_id = p_link and p.status = 'published'
      and coalesce(p.link_killed, false) = false
      and (p.expires_at is null or p.expires_at > now())
    limit 1;
end; $$;
grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
