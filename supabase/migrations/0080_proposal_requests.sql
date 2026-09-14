-- Peticiones: un pedido de contenido que, al APROBARSE, crea una propuesta
-- borrador. Lo hace cualquiera del equipo (RLS is_staff). El destino puede ser
-- una creadora YA en la plataforma (creator_user_id) o una NUEVA (nombre+correo).
-- (Aplicada en producción el 2026-09-14 vía MCP; se versiona acá para el repo.)
create table if not exists public.proposal_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  creator_user_id uuid references auth.users(id) on delete set null,
  creator_name text,
  creator_email text,
  creator_handle text,
  is_new_creator boolean not null default false,
  title text,
  brief text,
  proposal_type text not null default 'visual' check (proposal_type in ('visual','audio','both')),
  priority text not null default 'normal' check (priority in ('urgent','normal')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  proposal_id uuid references public.photo_proposals(id) on delete set null,
  proposal_link_id text,
  approved_by_name text,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
alter table public.proposal_requests enable row level security;
drop policy if exists "proposal_requests staff all" on public.proposal_requests;
create policy "proposal_requests staff all" on public.proposal_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create index if not exists proposal_requests_status_idx on public.proposal_requests (status, created_at desc);
