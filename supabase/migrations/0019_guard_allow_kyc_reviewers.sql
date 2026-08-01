-- ─────────────────────────────────────────────────────────────────────────
-- Let staff with the 'kyc' capability approve/reject IDs. The profiles guard
-- runs as the calling user (auth.uid()), so even the review_kyc SECURITY
-- DEFINER RPC was blocked for non-admin reviewers on the id_pending→id_approved
-- transition and on the reviewer fields. Allow both when has_cap('kyc').
-- ─────────────────────────────────────────────────────────────────────────
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
      -- KYC reviewers may approve/reject a submitted ID.
      or (public.has_cap('kyc')
          and old.onboarding_status in ('id_pending','id_approved','id_rejected')
          and new.onboarding_status in ('id_approved','id_rejected'))
    ) then
      raise exception 'Transición de registro no permitida.';
    end if;
  end if;

  -- Reviewer fields: admin (handled above) or a 'kyc' reviewer.
  if (new.id_reviewed_by is distinct from old.id_reviewed_by
      or new.id_reviewed_at is distinct from old.id_reviewed_at)
     and not public.has_cap('kyc') then
    raise exception 'Campos de revisión solo para revisores.';
  end if;

  return new;
end; $$;
