-- Propuesta interna: VARIOS revisores del equipo. Cada uno deja su opinión
-- (feedback interno, combinado), pero NO aprueban — la aprobación para mandarla a
-- la creadora la da el dueño/admin. [{id, name}]. Se mantiene internal_reviewer_id
-- / internal_reviewer_name (= el primero) por compatibilidad. Ver [[proposal-invite-flow]].
alter table public.photo_proposals
  add column if not exists internal_reviewers jsonb not null default '[]'::jsonb;
