-- Managers de la creadora (para copia de propuestas): [{email, role}] con role
-- 'viewer' (solo mira) o 'decide'. Se autocompleta en el wizard al elegirla.
alter table public.profiles
  add column if not exists manager_emails jsonb not null default '[]'::jsonb;
