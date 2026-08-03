-- ─────────────────────────────────────────────────────────────────────────
-- Agencies can add a model to their roster by INVITE LINK. The model registers
-- herself and does her own onboarding (ID + consent are personal). The invite
-- carries the agency so she is auto-linked on redemption.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.staff_invites add column if not exists agency_id uuid references public.profiles(id);
alter table public.staff_invites add column if not exists target_role text not null default 'supervisor';

-- An agency manages its own model-invites (creator invites tied to it).
drop policy if exists "staff_invites agency creator" on public.staff_invites;
create policy "staff_invites agency creator" on public.staff_invites for all
  using (public.current_role() = 'agency' and agency_id = auth.uid() and target_role = 'creator')
  with check (public.current_role() = 'agency' and agency_id = auth.uid() and target_role = 'creator');

-- redeem-invite (edge fn v2) reads target_role: 'creator' → makes a creator in
-- onboarding and links her to agency_id; 'supervisor' → the internal-team flow.
