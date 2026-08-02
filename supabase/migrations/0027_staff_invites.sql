-- ─────────────────────────────────────────────────────────────────────────
-- Team invitations. Owner: create a special invite link → the person registers
-- themselves → admin APPROVES they work here → admin assigns puesto + accesos.
-- The invited person only SEES those reflected (never edits them).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text,                       -- optional: suggested email
  job_title text,                   -- optional: puesto pre-set by admin
  note text,
  status text not null default 'pending',   -- pending | accepted | revoked
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid references public.profiles(id)
);

alter table public.staff_invites enable row level security;

-- Only admin or a team-cap staffer can manage invites. The public join page
-- redeems via a SECURITY DEFINER edge function (service role) — never direct.
drop policy if exists "staff_invites manage" on public.staff_invites;
create policy "staff_invites manage" on public.staff_invites for all
  using (public.is_admin() or public.has_cap('team'))
  with check (public.is_admin() or public.has_cap('team'));

-- Approval state for internal team members.
alter table public.profiles add column if not exists staff_status text;
update public.profiles set staff_status = 'approved'
  where role in ('admin','supervisor','producer','chatter') and staff_status is null;

-- Approve a pending team member (admin or team-cap).
create or replace function public.approve_staff(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.has_cap('team')) then
    raise exception 'No tienes permiso para aprobar personal.';
  end if;
  update public.profiles set staff_status = 'approved'
    where id = target and role in ('supervisor','producer','chatter');
end; $$;
revoke execute on function public.approve_staff(uuid) from anon, public;
grant execute on function public.approve_staff(uuid) to authenticated;
