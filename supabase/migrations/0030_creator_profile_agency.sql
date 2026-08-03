-- ─────────────────────────────────────────────────────────────────────────
-- The managing agency also needs to see what a model still needs to complete
-- (like staff/admin/owner). Extend creator_profile() so the agency that manages
-- the model can call it — but it still only sees STATUS (can_see_datos and
-- can_see_id stay false for agencies, so no legal data and no ID documents).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.creator_profile(target uuid)
returns table (
  id uuid, full_name text, stage_name text, handle text, avatar_url text, email text,
  onboarding_status text, payment_status text, plan text, lora_status text, created_at timestamptz,
  legal_first_name text, legal_last_name text, date_of_birth date, country text, phone text, consent_at timestamptz,
  has_id_docs boolean, id_reviewed_at timestamptz, id_rejection_reason text,
  lora_count bigint, can_see_datos boolean, can_see_id boolean
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
    p.stage_name, p.handle, p.avatar_url, p.email,
    p.onboarding_status, p.payment_status, p.plan, p.lora_status, p.created_at,
    case when public.is_admin() or public.has_cap('datos') then p.legal_first_name end,
    case when public.is_admin() or public.has_cap('datos') then p.legal_last_name end,
    case when public.is_admin() or public.has_cap('datos') then p.date_of_birth end,
    case when public.is_admin() or public.has_cap('datos') then p.country end,
    case when public.is_admin() or public.has_cap('datos') then p.phone end,
    case when public.is_admin() or public.has_cap('datos') then p.consent_at end,
    exists (select 1 from public.kyc_documents k where k.user_id = p.id) as has_id_docs,
    p.id_reviewed_at, p.id_rejection_reason,
    (select count(*) from public.lora_photos l where l.user_id = p.id) as lora_count,
    (public.is_admin() or public.has_cap('datos')) as can_see_datos,
    (public.is_admin() or public.has_cap('kyc')) as can_see_id
  from public.profiles p
  where p.id = target
    and p.role = 'creator'
    and (
      public.is_admin() or public.has_cap('datos') or public.has_cap('kyc') or public.has_cap('content')
      or exists (select 1 from public.agency_creators ac where ac.agency_id = auth.uid() and ac.creator_id = target)
    );
$$;
revoke execute on function public.creator_profile(uuid) from anon, public;
grant execute on function public.creator_profile(uuid) to authenticated;
