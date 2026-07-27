-- Record the chosen plan; allow onboarding tasks in parallel (identity can be
-- submitted from 'registered' too, so nothing is hard-locked / stuck pending).
alter table public.profiles add column if not exists plan text;

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if public.is_admin() then return new; end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes cambiar tu rol.';
  end if;

  if new.onboarding_status is distinct from old.onboarding_status then
    if not (
      new.onboarding_status = 'registered'
      or (old.onboarding_status = 'registered' and new.onboarding_status = 'info')
      or (old.onboarding_status in ('registered','info','id_rejected') and new.onboarding_status = 'id_pending')
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
