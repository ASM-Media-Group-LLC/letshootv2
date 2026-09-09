-- Backend real de PROPUESTAS de fotos (el link que el equipo manda a un
-- prospecto/creadora). El receptor NO tiene sesión: lee, se registra y deja
-- feedback vía funciones RPC security-definer (patrón del proyecto: cliente
-- browser + anon key, sin service role ni route handlers). El equipo (staff)
-- crea y supervisa con su sesión y RLS.
-- (Aplicada en producción el 2026-09-08 vía MCP; se versiona acá para el repo.)

create table if not exists public.photo_proposals (
  id uuid primary key default gen_random_uuid(),
  link_id text not null unique,
  created_by uuid references public.profiles(id),
  created_by_name text,
  model_name text, model_agency text,
  name text, subtitle text, intro text,
  lang text not null default 'es',
  template text,
  cover_url text, closing_url text,
  looks jsonb not null default '[]'::jsonb,
  recipient_name text, recipient_email text, recipient_kind text,
  status text not null default 'published' check (status in ('published','archived')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists photo_proposals_link_idx on public.photo_proposals(link_id);
create index if not exists photo_proposals_created_by_idx on public.photo_proposals(created_by, created_at desc);

create table if not exists public.photo_proposal_registrations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  name text not null, email text not null, phone text,
  created_at timestamptz not null default now()
);
create index if not exists ppr_proposal_idx on public.photo_proposal_registrations(proposal_id, created_at desc);

create table if not exists public.photo_proposal_feedback (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  registration_id uuid references public.photo_proposal_registrations(id) on delete set null,
  recipient_name text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ppf_proposal_idx on public.photo_proposal_feedback(proposal_id, created_at desc);

alter table public.photo_proposals enable row level security;
alter table public.photo_proposal_registrations enable row level security;
alter table public.photo_proposal_feedback enable row level security;

create or replace function public.is_staff() returns boolean language sql stable as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'supervisor'
  );
$$;

drop policy if exists "photo_proposals staff all" on public.photo_proposals;
create policy "photo_proposals staff all" on public.photo_proposals
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "ppr staff read" on public.photo_proposal_registrations;
create policy "ppr staff read" on public.photo_proposal_registrations
  for select using (public.is_staff());

drop policy if exists "ppf staff read" on public.photo_proposal_feedback;
create policy "ppf staff read" on public.photo_proposal_feedback
  for select using (public.is_staff());

-- RPCs para el receptor SIN sesión (anon) — no exponen las tablas.
create or replace function public.get_proposal_by_link(p_link text)
returns table (
  link_id text, name text, subtitle text, intro text, lang text, template text,
  cover_url text, closing_url text, looks jsonb,
  model_name text, model_agency text, recipient_name text, recipient_email text,
  expires_at timestamptz, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select link_id, name, subtitle, intro, lang, template, cover_url, closing_url, looks,
         model_name, model_agency, recipient_name, recipient_email, expires_at, created_at
  from public.photo_proposals
  where link_id = p_link and status = 'published'
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.register_for_proposal(p_link text, p_name text, p_email text, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; rid uuid;
begin
  select id into pid from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_email),'') = '' then
    raise exception 'nombre y correo requeridos';
  end if;
  insert into public.photo_proposal_registrations (proposal_id, name, email, phone)
    values (pid, trim(p_name), trim(p_email), nullif(trim(p_phone),''))
    returning id into rid;
  return rid;
end; $$;

create or replace function public.save_proposal_feedback(p_link text, p_reg uuid, p_items jsonb, p_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; existing uuid;
begin
  select id into pid from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;
  select id into existing from public.photo_proposal_feedback
    where proposal_id = pid and registration_id is not distinct from p_reg limit 1;
  if existing is null then
    insert into public.photo_proposal_feedback (proposal_id, registration_id, recipient_name, items)
      values (pid, p_reg, p_name, coalesce(p_items,'[]'::jsonb));
  else
    update public.photo_proposal_feedback
      set items = coalesce(p_items,'[]'::jsonb), recipient_name = coalesce(p_name, recipient_name), updated_at = now()
      where id = existing;
  end if;
end; $$;

grant execute on function public.get_proposal_by_link(text) to anon, authenticated;
grant execute on function public.register_for_proposal(text, text, text, text) to anon, authenticated;
grant execute on function public.save_proposal_feedback(text, uuid, jsonb, text) to anon, authenticated;
