-- 0012 — Hardening from the security audit:
-- (a) profiles.email was mutable by any signed-in user (guard didn't cover it),
--     letting a creator desync the email the admin sees from auth.users.email.
-- (b) The SECURITY DEFINER helpers kept the implicit PUBLIC execute grant, so
--     `revoke ... from anon` in 0007/0008 was ineffective — anon could still
--     invoke them via /rest/v1/rpc (not exploitable today, but needless surface).
-- is_admin() / current_role() keep their grants: RLS policies evaluate them in
-- the caller's context, so every querying role needs EXECUTE on them.

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / direct SQL
  if public.is_admin() then return new; end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes cambiar tu rol.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'El correo no se puede cambiar desde aquí.';
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

-- Strip implicit PUBLIC execute from the definer helpers.
revoke execute on function public.team_creators() from public, anon;
revoke execute on function public.team_staff() from public, anon;
revoke execute on function public.delete_own_folder(uuid) from public, anon;
revoke execute on function public.move_own_asset(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;

grant execute on function public.team_creators() to authenticated;
grant execute on function public.team_staff() to authenticated;
grant execute on function public.delete_own_folder(uuid) to authenticated;
grant execute on function public.move_own_asset(uuid, uuid) to authenticated;
