-- Config del servidor (llaves de integraciones) que el dueño setea DESDE la app,
-- sin tocar el panel de Supabase. Solo el service role la lee/escribe (RLS sin
-- políticas = deniega a todos; la edge function 'higgsfield' usa service role).
-- Nunca va al navegador. Ver [[julia-parker-soul]].
create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_config enable row level security;
-- (sin políticas a propósito.)
