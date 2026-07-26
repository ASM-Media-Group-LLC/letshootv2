-- ─────────────────────────────────────────────────────────────────────────
-- Role restructure (owner): chatter = servicio al cliente (solo pide) ·
-- supervisor = manager (opera contenido) · admin = dueño (todo).
-- 'producer' queda como legacy en el enum; la cuenta productor pasa a supervisor.
-- PRIVACIDAD: el staff NO lee datos legales de las creadoras — profiles queda
-- self-or-admin y el staff usa RPCs seguras con nombre artístico + estado.
-- NOTE: `alter type public.user_role add value if not exists 'supervisor';`
-- was run separately (ALTER TYPE ADD VALUE cannot run inside a transaction).
-- ─────────────────────────────────────────────────────────────────────────

update public.profiles set role = 'supervisor' where role = 'producer';

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create or replace function public.team_creators()
returns table (id uuid, full_name text, onboarding_status text, lora_status text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.onboarding_status, p.lora_status
  from public.profiles p
  where p.role = 'creator'
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_creators() from anon;

create or replace function public.team_staff()
returns table (id uuid, full_name text, role public.user_role)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  where p.role in ('admin','supervisor','producer','chatter')
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_staff() from anon;

-- Every 'producer' policy now also covers 'supervisor' (folders, requests,
-- assets, feedback, lora_photos, storage deliveries/lora). See live schema —
-- policies recreated with the extended role lists.
