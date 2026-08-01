-- ─────────────────────────────────────────────────────────────────────────
-- KYC review queue for staff with the 'kyc' capability. profiles read is
-- self-or-admin, so a non-admin reviewer can't list pending creators directly;
-- this SECURITY DEFINER function returns the pending queue (only the fields a
-- reviewer needs) when the caller has the 'kyc' capability.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.kyc_queue()
returns table (
  id uuid, full_name text, legal_first_name text, legal_last_name text,
  date_of_birth date, country text, stage_name text, consent_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.legal_first_name, p.legal_last_name,
         p.date_of_birth, p.country, p.stage_name, p.consent_at
  from public.profiles p
  where p.onboarding_status = 'id_pending' and public.has_cap('kyc')
  order by p.created_at;
$$;
revoke execute on function public.kyc_queue() from anon, public;
grant execute on function public.kyc_queue() to authenticated;
