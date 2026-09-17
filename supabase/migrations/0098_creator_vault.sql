-- Baúl POR CREADORA para armar propuestas. Cada creadora tiene su propio baúl,
-- con las fotos separadas por tipo:
--   'ref'  = inspiración (screenshots de Instagram, etc.). Se suben cada vez pero
--            quedan de historial bajo la creadora.
--   'ia'   = resultado IA / Higgsfield. Se suben cada vez, quedan de historial.
--   'real' = fotos REALES de la modelo. Predeterminadas a su cuenta, persistentes
--            (se suben una vez y quedan para todas sus propuestas).
-- Las URLs apuntan al bucket público 'proposal-photos'. Es herramienta interna:
-- solo el equipo (staff) lee/escribe. Ver [[proposal-invite-flow]] y
-- [[proposal-logistics]].
create table if not exists public.creator_vault (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('ref','ia','real')),
  url text not null,
  caption text,
  created_at timestamptz not null default now(),
  added_by uuid default auth.uid()
);

create index if not exists creator_vault_creator_kind_idx
  on public.creator_vault (creator_id, kind, created_at desc);

alter table public.creator_vault enable row level security;

-- Solo el equipo puede ver y administrar el baúl.
drop policy if exists creator_vault_staff_all on public.creator_vault;
create policy creator_vault_staff_all on public.creator_vault
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
