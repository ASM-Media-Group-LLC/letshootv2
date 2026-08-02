-- ─────────────────────────────────────────────────────────────────────────
-- "Quién agregó esta foto" — the creator wants to see who added each piece
-- (the team member / manager). Denormalized name so the creator can read it
-- without access to staff profiles (profiles read is self/admin/agency only).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.assets add column if not exists added_by text;
