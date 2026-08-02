-- ─────────────────────────────────────────────────────────────────────────
-- Role model correction (owner): there is NO "chatter / servicio al cliente".
-- Content REQUESTS come from the AGENCY/MANAGER (same thing) or from the
-- CREATOR herself. The internal team (admin + supervisor staff) RECEIVES and
-- fulfills them. Legacy chatter/producer accounts become supervisor staff.
-- Staff functions are granular; only the admin implicitly has all of them.
-- ─────────────────────────────────────────────────────────────────────────

-- Collapse legacy staff roles into the single internal staff role.
update public.profiles set role = 'supervisor' where role in ('producer', 'chatter');
-- 'support' capability no longer exists.
update public.profiles set capabilities = array_remove(capabilities, 'support');

-- Only the admin has every function implicitly; other staff get exactly what
-- was assigned to them (function by function).
create or replace function public.has_cap(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or cap = any(capabilities))
  );
$$;
revoke execute on function public.has_cap(text) from anon;
grant execute on function public.has_cap(text) to authenticated;

-- The creator can create her own content requests (besides her agency).
drop policy if exists "requests chatter insert" on public.requests;  -- SAC removed
drop policy if exists "requests creator insert" on public.requests;
create policy "requests creator insert" on public.requests for insert
  with check (public.current_role() = 'creator' and creator_id = auth.uid() and chatter_id = auth.uid());
