-- Flujo de APROBACIÓN de propuestas: el empleado marca "necesita aprobación" y
-- pone el correo de quien decide. La propuesta se manda al APROBADOR (link con
-- token), que la ve completa y Aprueba / Rechaza (con motivo). Si aprueba → se
-- invita automáticamente a la creadora y queda copia/estado en el admin; si
-- rechaza → vuelve al admin con el motivo (no le llega a la creadora).
-- (Aplicada en producción el 2026-09-10 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals
  add column if not exists approval_required boolean not null default false,
  add column if not exists approver_email    text,
  add column if not exists approval_status    text,           -- null | 'pending' | 'approved' | 'rejected'
  add column if not exists approval_reason    text,
  add column if not exists approval_token     uuid default gen_random_uuid(),
  add column if not exists approval_sent_at   timestamptz,
  add column if not exists approved_at         timestamptz;

create index if not exists photo_proposals_approval_token_idx
  on public.photo_proposals(approval_token);
