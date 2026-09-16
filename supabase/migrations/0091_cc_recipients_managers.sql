-- Copias para managers en una propuesta: [{email, role}] con role 'viewer'
-- (solo mira, link ?preview=1) o 'decide' (recibe link ?approve=<token> y su
-- decisión queda registrada — SIN retener el envío a la creadora).
alter table public.photo_proposals
  add column if not exists cc_recipients jsonb not null default '[]'::jsonb;
