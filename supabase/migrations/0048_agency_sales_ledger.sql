-- Libro de ventas por VENTA: cada +1 de la maquinita de la agencia deja una
-- fila auditable (fecha, pieza, precio en centavos, quién). El −1 borra la
-- última. Los contadores agregados (assets.sales_count/revenue) siguen igual
-- para las vistas rápidas; esta tabla es el REGISTRO.
create table if not exists public.agency_sales (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles (id) on delete cascade,
  agency_id    uuid not null references public.profiles (id) on delete cascade,
  asset_id     uuid references public.assets (id) on delete set null,
  amount_cents integer not null default 0,
  sold_by      uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index if not exists agency_sales_agency_idx  on public.agency_sales (agency_id, created_at desc);
create index if not exists agency_sales_creator_idx on public.agency_sales (creator_id, created_at desc);
create index if not exists agency_sales_asset_idx   on public.agency_sales (asset_id);

alter table public.agency_sales enable row level security;

drop policy if exists "agency_sales agency insert" on public.agency_sales;
create policy "agency_sales agency insert" on public.agency_sales
  for insert to authenticated
  with check (agency_id = auth.uid() and public.manages_creator(creator_id));

drop policy if exists "agency_sales agency delete" on public.agency_sales;
create policy "agency_sales agency delete" on public.agency_sales
  for delete to authenticated
  using (agency_id = auth.uid());

drop policy if exists "agency_sales read" on public.agency_sales;
create policy "agency_sales read" on public.agency_sales
  for select to authenticated
  using (
    agency_id = auth.uid()
    or creator_id = auth.uid()
    or public.is_admin()
    or "current_role"() = any (array['supervisor','producer','chatter']::user_role[])
  );
