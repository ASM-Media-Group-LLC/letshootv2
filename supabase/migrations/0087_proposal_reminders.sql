-- Recordatorios de propuestas pendientes (escalado 24h · 72h · 7d, máx 3).
-- Cubre: aprobación pendiente (interna/externa) y respuesta de la creadora
-- pendiente. Un contador por (propuesta, tipo). El envío lo hace la edge
-- function proposal-reminders (automático por cron + botón manual).
create table if not exists public.proposal_reminders (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  kind text not null check (kind in ('approval','response')),
  count int not null default 0,           -- recordatorios ya enviados (0..3)
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (proposal_id, kind)
);
alter table public.proposal_reminders enable row level security;
drop policy if exists "staff reads reminders" on public.proposal_reminders;
create policy "staff reads reminders" on public.proposal_reminders
  for select using (public.is_staff());
-- (el servicio/edge escribe con service_role, que salta RLS)

-- Config interna (secreto para el disparo por cron; no se expone al cliente).
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;  -- sin policies: solo service_role
insert into public.app_config (key, value)
  values ('reminder_run_secret', encode(gen_random_bytes(24), 'hex'))
  on conflict (key) do nothing;

-- Supresión del BACKLOG: los pendientes que YA existen no se disparan de golpe.
-- Se marcan como count=3 (tope); los NUEVOS pendientes arrancan en 0.
insert into public.proposal_reminders (proposal_id, kind, count, last_sent_at)
  select id, 'approval', 3, now() from public.photo_proposals
  where status='published' and approval_required=true and approval_status='pending'
  on conflict (proposal_id, kind) do nothing;
insert into public.proposal_reminders (proposal_id, kind, count, last_sent_at)
  select id, 'response', 3, now() from public.photo_proposals
  where status='published' and recipient_kind is distinct from 'internal'
    and (approval_required is not true or approval_status='approved')
    and coalesce(recipient_email,'') <> ''
    and not exists (select 1 from public.photo_proposal_feedback f where f.proposal_id = photo_proposals.id and f.reviewer_kind='creator')
  on conflict (proposal_id, kind) do nothing;
