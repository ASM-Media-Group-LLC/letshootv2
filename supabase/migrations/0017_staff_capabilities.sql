-- ─────────────────────────────────────────────────────────────────────────
-- Dynamic staff roles: capabilities assigned function-by-function.
--   'kyc'      → recibir y aprobar/rechazar IDs
--   'content'  → subir fotos / entregas
--   'support'  → servicio al cliente / pedidos
--   'team'     → gestionar el equipo y sus funciones
-- Admin and supervisor (manager) implicitly have every capability.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists capabilities text[] not null default '{}';

-- Does the current user have a given capability?
create or replace function public.has_cap(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role in ('admin','supervisor') or cap = any(capabilities))
  );
$$;
revoke execute on function public.has_cap(text) from anon;
grant execute on function public.has_cap(text) to authenticated;

-- Approve / reject a creator's ID. Requires the 'kyc' capability (or admin).
-- Security definer so a non-admin reviewer can set the reviewer fields the
-- profiles guard otherwise blocks.
create or replace function public.review_kyc(target uuid, approve boolean, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_cap('kyc') then
    raise exception 'No tienes permiso para revisar identidades.';
  end if;
  if approve then
    update public.profiles set
      onboarding_status = 'id_approved',
      id_reviewed_by = auth.uid(), id_reviewed_at = now(), id_rejection_reason = null
    where id = target and onboarding_status in ('id_pending','id_rejected');
  else
    update public.profiles set
      onboarding_status = 'id_rejected',
      id_reviewed_by = auth.uid(), id_reviewed_at = now(), id_rejection_reason = reason
    where id = target and onboarding_status in ('id_pending','id_approved');
  end if;
end; $$;
revoke execute on function public.review_kyc(uuid, boolean, text) from anon, public;
grant execute on function public.review_kyc(uuid, boolean, text) to authenticated;

-- Staff with the 'kyc' capability can read KYC rows + objects (not only admin).
drop policy if exists "kyc owner or admin read" on public.kyc_documents;
create policy "kyc owner or admin read" on public.kyc_documents for select
  using (user_id = auth.uid() or public.is_admin() or public.has_cap('kyc'));

drop policy if exists "kyc obj owner read" on storage.objects;
create policy "kyc obj owner read" on storage.objects for select
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text
                                or public.is_admin() or public.has_cap('kyc')));

-- team_staff() also returns capabilities so the admin can see/toggle them.
drop function if exists public.team_staff();
create or replace function public.team_staff()
returns table (id uuid, full_name text, role public.user_role, capabilities text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role, p.capabilities
  from public.profiles p
  where p.role in ('admin','supervisor','producer','chatter')
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_staff() from anon;
grant execute on function public.team_staff() to authenticated;
