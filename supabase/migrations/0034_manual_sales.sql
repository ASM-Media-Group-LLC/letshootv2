-- Manual sales ledger: the team enters each sale by hand (until a payment
-- processor is wired). One row per sale — model, IG, when sold, amount, which
-- month it covers, pieces/concept, and when to re-bill. Team-only (metrics cap).
create table if not exists public.manual_sales (
  id uuid primary key default gen_random_uuid(),
  creator_id  uuid references public.profiles(id) on delete set null, -- optional link to a model in the system
  model_name  text not null,
  instagram   text,
  sold_on     date not null default (now())::date,   -- qué fecha se le vendió
  amount      numeric(12,2) not null default 0,       -- cuánto se le vendió
  period_month text,                                  -- de qué mes cubre ('YYYY-MM')
  pieces      integer not null default 0,             -- cuántas piezas de contenido
  concept     text,                                   -- el concepto (ej. "Pack PPV agosto")
  rebill_on   date,                                   -- cuándo se le tiene que volver a cobrar
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.manual_sales enable row level security;

drop policy if exists "manual_sales read"   on public.manual_sales;
drop policy if exists "manual_sales insert" on public.manual_sales;
drop policy if exists "manual_sales update" on public.manual_sales;
drop policy if exists "manual_sales delete" on public.manual_sales;

create policy "manual_sales read" on public.manual_sales for select
  using (public.is_admin() or public.has_cap('metrics'));
create policy "manual_sales insert" on public.manual_sales for insert
  with check (public.is_admin() or public.has_cap('metrics'));
create policy "manual_sales update" on public.manual_sales for update
  using (public.is_admin() or public.has_cap('metrics'))
  with check (public.is_admin() or public.has_cap('metrics'));
create policy "manual_sales delete" on public.manual_sales for delete
  using (public.is_admin() or public.has_cap('metrics'));

create index if not exists manual_sales_period_idx on public.manual_sales (period_month);
create index if not exists manual_sales_sold_idx   on public.manual_sales (sold_on);
