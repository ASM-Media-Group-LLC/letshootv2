-- Multi-cuenta de Higgsfield: un lugar ordenado (solo dueño) para las llaves de
-- cada cuenta, y a qué cuenta pertenece cada modelo. RLS sin políticas = solo
-- service_role (igual que app_config) → las llaves NUNCA se leen desde el cliente.
create table if not exists public.higgsfield_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_id text,
  key_secret text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);
alter table public.higgsfield_accounts enable row level security;
-- (sin políticas a propósito: solo el service_role del edge la toca)

-- A qué cuenta pertenece cada modelo (su soul vive en creator_identity).
alter table public.creator_identity
  add column if not exists account_id uuid references public.higgsfield_accounts(id) on delete set null;

-- Sembrar la CUENTA #1 con la llave que ya está en uso (app_config), como default.
insert into public.higgsfield_accounts (label, key_id, key_secret, is_default)
select 'Cuenta 1 (actual)',
       (select value from public.app_config where key = 'higgsfield_key_id'),
       (select value from public.app_config where key = 'higgsfield_key_secret'),
       true
where exists (select 1 from public.app_config where key = 'higgsfield_key_id' and coalesce(value,'') <> '');

-- Los modelos que ya tienen soul quedan en la cuenta default.
update public.creator_identity
set account_id = (select id from public.higgsfield_accounts where is_default order by created_at limit 1)
where account_id is null;
