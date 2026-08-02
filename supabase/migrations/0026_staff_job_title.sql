-- ─────────────────────────────────────────────────────────────────────────
-- Staff identity: separate NAME from PUESTO (job title). Owner: the single
-- "Nombre o puesto" field is too generic — a person has a name AND a puesto.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists job_title text;

-- Backfill demo staff: split "Name (Title)" → full_name = name, job_title = title.
update public.profiles set full_name = 'Equipo LetShoot', job_title = 'Dueño'                  where email = 'admin@letshoot.ai';
update public.profiles set full_name = 'Marco',           job_title = 'Producción'             where email = 'fotos@letshoot.ai';
update public.profiles set full_name = 'Camila',          job_title = 'Community & Pedidos', capabilities = '{content,requests}' where email = 'chatter@letshoot.ai';
update public.profiles set full_name = 'Lucía',           job_title = 'Verificación',       capabilities = '{kyc}'             where email = 'ids@letshoot.ai';
update public.profiles set full_name = 'Diego',           job_title = 'Supervisor'             where email = 'manager@letshoot.ai';
update public.profiles set full_name = 'Diego',           job_title = 'Producción'             where email = 'productor@letshoot.ai';

-- team_staff now carries job_title.
drop function if exists public.team_staff();
create or replace function public.team_staff()
returns table (id uuid, full_name text, job_title text, handle text, avatar_url text,
               role public.user_role, capabilities text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.job_title, p.handle, p.avatar_url, p.role, p.capabilities
  from public.profiles p
  where p.role in ('admin','supervisor','producer','chatter')
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_staff() from anon, public;
grant execute on function public.team_staff() to authenticated;
