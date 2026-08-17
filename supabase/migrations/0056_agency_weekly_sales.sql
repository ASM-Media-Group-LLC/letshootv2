-- ─────────────────────────────────────────────────────────────────────────
-- Ventas por SEMANA (totales), para el panel de momentum de la modelo.
-- La agencia mete el total de la semana de una modelo de un tirón (ventas +
-- ingresos), en vez de +1 foto por foto. La modelo ve que sube: esta semana
-- vs la pasada, con mini-gráfico. Honesto (lo llena la agencia) y rápido.
-- El contador por foto (assets.sales_count) se queda para las piezas estrella.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.agency_weekly_sales (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  agency_id   uuid not null references public.profiles (id) on delete cascade,
  week_start  date not null,          -- lunes de la semana
  sales       integer not null default 0,
  revenue     numeric not null default 0,
  note        text,
  updated_at  timestamptz not null default now(),
  unique (creator_id, week_start)
);
create index if not exists aws_creator_idx on public.agency_weekly_sales (creator_id, week_start desc);

alter table public.agency_weekly_sales enable row level security;

-- Lectura: la modelo ve las suyas; la agencia que la gestiona; admin todo.
drop policy if exists "aws read" on public.agency_weekly_sales;
create policy "aws read" on public.agency_weekly_sales for select
  using (creator_id = auth.uid() or public.manages_creator(creator_id) or public.is_admin());

-- Escritura solo por RPC (security definer). La agencia (o admin) fija el total
-- de una semana. Upsert por (creator, semana).
create or replace function public.agency_set_week(
  p_creator uuid, p_week_start date, p_sales integer, p_revenue numeric, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_agency uuid;
begin
  if not (public.is_admin() or public.manages_creator(p_creator)) then
    raise exception 'No gestionas a esta modelo.';
  end if;
  select agency_id into v_agency from public.agency_creators where creator_id = p_creator limit 1;
  insert into public.agency_weekly_sales (creator_id, agency_id, week_start, sales, revenue, note, updated_at)
    values (p_creator, coalesce(v_agency, auth.uid()), date_trunc('week', p_week_start)::date,
            greatest(0, coalesce(p_sales, 0)), greatest(0, coalesce(p_revenue, 0)), nullif(p_note, ''), now())
  on conflict (creator_id, week_start) do update
    set sales = greatest(0, coalesce(p_sales, 0)),
        revenue = greatest(0, coalesce(p_revenue, 0)),
        note = nullif(p_note, ''),
        updated_at = now();
end; $$;
revoke execute on function public.agency_set_week(uuid, date, integer, numeric, text) from anon, public;
grant execute on function public.agency_set_week(uuid, date, integer, numeric, text) to authenticated;
