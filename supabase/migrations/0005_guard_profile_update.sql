-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY: the RLS policy "profiles self update" (0001) lets a user update
-- any column of their own row — including role (→ self-promote to admin) and
-- onboarding_status (→ skip admin approval / payment). This trigger closes
-- that hole: non-admins may only move forward through allowed funnel
-- transitions, never change role, never touch reviewer fields.
-- ─────────────────────────────────────────────────────────────────────────

-- NOTE: inside SECURITY DEFINER, current_user = function owner — never use it
-- for exemptions here. auth.uid() is null for service-role/direct-SQL access
-- (safe to exempt: RLS already blocks anon writes).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / direct SQL
  if public.is_admin() then return new; end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes cambiar tu rol.';
  end if;

  if new.onboarding_status is distinct from old.onboarding_status then
    if not (
      new.onboarding_status = 'registered'  -- self reset (loses progress, harmless)
      or (old.onboarding_status = 'registered' and new.onboarding_status = 'info')
      or (old.onboarding_status in ('info','id_rejected') and new.onboarding_status = 'id_pending')
      or (old.onboarding_status in ('id_approved','authorized','paid') and new.onboarding_status = 'active')
    ) then
      raise exception 'Transición de registro no permitida.';
    end if;
  end if;

  if new.id_reviewed_by is distinct from old.id_reviewed_by
     or new.id_reviewed_at is distinct from old.id_reviewed_at then
    raise exception 'Campos de revisión solo para admin.';
  end if;

  return new;
end; $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();
