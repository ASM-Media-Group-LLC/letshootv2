-- Propuesta personalizada para cada creadora — reemplaza al PDF de venta.
-- Vive dentro de su cuenta y aparece a pantalla completa cuando entra sin
-- haber pagado. El equipo (uploader/admin) arma tríptico por tríptico
-- (Inspiración + Foto real + Resultado IA) y publica cuando está lista.

create table if not exists public.creator_proposals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  intro text,
  created_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_slides (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.creator_proposals(id) on delete cascade,
  position int not null default 0,
  inspiration_url text,
  real_url text,
  ai_url text,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists proposal_slides_proposal_id_idx on public.proposal_slides(proposal_id, position);

alter table public.creator_proposals enable row level security;
alter table public.proposal_slides enable row level security;

-- La creadora ve SOLO su propuesta y SOLO si está publicada.
drop policy if exists "creator_proposals self read" on public.creator_proposals;
create policy "creator_proposals self read" on public.creator_proposals
  for select using (creator_id = auth.uid() and status = 'published');

-- Staff con capability 'content' lee/escribe todas (draft y publicada).
-- Admin y supervisor con 'content' entran.
drop policy if exists "creator_proposals staff all" on public.creator_proposals;
create policy "creator_proposals staff all" on public.creator_proposals
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'content' = any(p.capabilities)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'content' = any(p.capabilities)
    )
  );

-- Slides: la CC ve slides de su propuesta si está publicada.
drop policy if exists "proposal_slides self read" on public.proposal_slides;
create policy "proposal_slides self read" on public.proposal_slides
  for select using (
    exists (
      select 1 from public.creator_proposals cp
      where cp.id = proposal_slides.proposal_id
        and cp.creator_id = auth.uid()
        and cp.status = 'published'
    )
  );

drop policy if exists "proposal_slides staff all" on public.proposal_slides;
create policy "proposal_slides staff all" on public.proposal_slides
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'content' = any(p.capabilities)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'content' = any(p.capabilities)
    )
  );

-- Bucket de storage para imágenes de la propuesta. Público de lectura (URLs
-- directas) para no firmar en cada render. El upload es privado (solo staff).
insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', true)
on conflict (id) do nothing;

drop policy if exists "proposals storage staff write" on storage.objects;
create policy "proposals storage staff write" on storage.objects
  for all
  using (
    bucket_id = 'proposals'
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'supervisor'
          and 'content' = any(p.capabilities)
      )
    )
  )
  with check (
    bucket_id = 'proposals'
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'supervisor'
          and 'content' = any(p.capabilities)
      )
    )
  );

drop policy if exists "proposals storage public read" on storage.objects;
create policy "proposals storage public read" on storage.objects
  for select using (bucket_id = 'proposals');
