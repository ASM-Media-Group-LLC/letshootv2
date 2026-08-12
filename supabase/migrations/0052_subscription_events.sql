-- Registro de cambios de suscripción de la creadora: cambio de plan, cancelación
-- (con motivo y nota) y reactivación. La creadora escribe los suyos; el equipo
-- (metrics/billing) y el admin los leen para entender la baja y mejorar.
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('plan_change','cancel','resume')),
  from_plan text,
  to_plan text,
  reason text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.subscription_events enable row level security;

drop policy if exists "subev owner insert" on public.subscription_events;
create policy "subev owner insert" on public.subscription_events for insert
  with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "subev read" on public.subscription_events;
create policy "subev read" on public.subscription_events for select
  using (creator_id = auth.uid() or public.is_admin() or public.has_cap('metrics') or public.has_cap('billing'));

create index if not exists subscription_events_creator_idx on public.subscription_events (creator_id, created_at desc);
