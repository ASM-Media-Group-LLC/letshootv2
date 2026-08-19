-- Capturar interés de agencias desde el landing público /agency. La agencia
-- llena un formulario corto y admin aprueba/onboardea desde /admin. INSERT
-- público (RLS lo permite para anon), lectura solo admin.

create table if not exists public.agency_leads (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  contact_email text not null,
  website text,
  creators_count int,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.agency_leads enable row level security;

drop policy if exists "agency_leads insert public" on public.agency_leads;
create policy "agency_leads insert public" on public.agency_leads
  for insert
  with check (true);

drop policy if exists "agency_leads admin read" on public.agency_leads;
create policy "agency_leads admin read" on public.agency_leads
  for select
  using (public.is_admin());

drop policy if exists "agency_leads admin write" on public.agency_leads;
create policy "agency_leads admin write" on public.agency_leads
  for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists agency_leads_created_at_idx on public.agency_leads(created_at desc);
