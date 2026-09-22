-- 0102: /kitchen sobre Soul 2.0 real (CLI). prompt+engine en generations; vibe en el baúl.
alter table generations add column if not exists prompt text;
alter table generations add column if not exists engine text default 'soul2';
alter table creator_vault add column if not exists vibe text;
-- Identidades: motor que usa cada una ('soul2' = soul real de la cuenta Higgsfield).
alter table creator_identity add column if not exists engine text default 'soul2';
notify pgrst, 'reload schema';
