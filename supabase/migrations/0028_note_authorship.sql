-- ─────────────────────────────────────────────────────────────────────────
-- Note authorship. Owner: a note must show WHO wrote it — the user (name + @
-- handle + email), not just the agency name. Everyone with an account has an @.
-- Denormalized onto the note so the creator can see it without RLS access to the
-- author's profile.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.asset_notes add column if not exists author_handle text;
alter table public.asset_notes add column if not exists author_email text;

-- Give every non-creator account an @handle.
update public.profiles set handle = 'elite'       where email = 'agencia@letshoot.ai' and handle is null;
update public.profiles set handle = 'equipo.diego' where email = 'manager@letshoot.ai' and handle is null;
update public.profiles set handle = 'marco.prod'  where email = 'fotos@letshoot.ai' and handle is null;
update public.profiles set handle = 'lucia.ver'   where email = 'ids@letshoot.ai' and handle is null;
update public.profiles set handle = 'camila.eq'   where email = 'chatter@letshoot.ai' and handle is null;
update public.profiles set handle = 'letshoot'    where email = 'admin@letshoot.ai' and handle is null;

-- Backfill existing notes from the author profile.
update public.asset_notes n set author_handle = p.handle, author_email = p.email
from public.profiles p where p.id = n.author_id and n.author_handle is null;
