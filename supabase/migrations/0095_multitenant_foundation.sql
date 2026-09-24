-- ══════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT · FASE 1 — FUNDACIÓN
-- Convierte LetShoot (single-tenant) en multi-tenant: cada cliente = una
-- "organization" (tenant). El dueño de la plataforma ve TODO; cada admin ve
-- SOLO su organización. Cash Agency = primer tenant (todo lo actual queda ahí).
--
-- Enfoque de bajo riesgo: NO reescribe las ~60 políticas existentes. Agrega
-- `org_id` a cada tabla + UNA política RESTRICTIVA por tabla que se suma con AND
-- a todo lo que ya hay: acceso = (regla actual) AND (misma org OR dueño-plataforma).
-- Solo aplica al rol `authenticated` (las funciones security-definer y el
-- service_role de las edge functions no se tocan). Como hoy TODO es de Cash, el
-- relleno es trivial (todo → Cash) y no rompe nada.
--
-- Probado con dry-run contra el esquema+datos reales (transacción revertida):
-- 34 tablas con org_id, 34 políticas, 3 funciones, 40 perfiles y 498 assets
-- backfill a Cash, 0 errores. Ver [[multitenant-saas-direction]].
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Tenants
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  domain text unique,                          -- hostname → org (Fase 2)
  brand jsonb not null default '{}'::jsonb,     -- logo, colores, nombre visible
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Primer tenant: Cash Agency (id fijo para poder referenciarlo).
insert into public.organizations (id, name, slug, domain)
values ('00000000-0000-0000-0000-0000000000ca', 'Cash Agency', 'cash', 'letshoot.ai')
on conflict (id) do nothing;

-- 2) profiles: pertenencia a org + bandera de dueño de plataforma
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id),
  add column if not exists is_platform_owner boolean not null default false;
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000ca' where org_id is null;
alter table public.profiles alter column org_id set default '00000000-0000-0000-0000-0000000000ca';
alter table public.profiles alter column org_id set not null;
-- El dueño de la plataforma (ve TODAS las orgs).
update public.profiles set is_platform_owner = true where email = 'rusin24@gmail.com';

-- 3) Helpers (SECURITY DEFINER para no chocar con la propia RLS de profiles)
create or replace function public.current_user_org() returns uuid
  language sql stable security definer set search_path = public as $fn$
  select org_id from public.profiles where id = auth.uid() $fn$;
create or replace function public.is_platform_owner() returns boolean
  language sql stable security definer set search_path = public as $fn$
  select coalesce((select is_platform_owner from public.profiles where id = auth.uid()), false) $fn$;
-- ¿la fila (por su org_id) es de mi org, o soy dueño de plataforma?
create or replace function public.same_org(row_org uuid) returns boolean
  language sql stable as $fn$
  select public.is_platform_owner() or row_org = public.current_user_org() $fn$;
grant execute on function public.current_user_org() to anon, authenticated;
grant execute on function public.is_platform_owner() to anon, authenticated;
grant execute on function public.same_org(uuid) to anon, authenticated;

-- organizations: cada quien ve su org; el dueño de plataforma las ve todas.
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations for select to authenticated
  using (public.is_platform_owner() or id = public.current_user_org());
drop policy if exists organizations_owner_write on public.organizations;
create policy organizations_owner_write on public.organizations for all to authenticated
  using (public.is_platform_owner()) with check (public.is_platform_owner());

-- profiles: candado de org (restrictivo, se suma con AND a las políticas actuales)
drop policy if exists org_isolation on public.profiles;
create policy org_isolation on public.profiles as restrictive to authenticated
  using (public.same_org(org_id)) with check (public.same_org(org_id));

-- 4) org_id + candado en todas las demás tablas de datos (hoy todo → Cash)
do $$
declare t text; cash uuid := '00000000-0000-0000-0000-0000000000ca';
  tbls text[] := array[
    'chatter_assignments','folders','requests','assets','feedback','kyc_documents',
    'lora_photos','notifications','agency_creators','asset_notes','staff_invites','manual_sales',
    'request_messages','agency_sales','audit_log','email_log','subscription_events','agency_members',
    'agency_member_creators','agency_leave_requests','agency_weekly_sales','agency_leads',
    'creator_proposals','proposal_slides','agent_referrals','photo_proposals',
    'photo_proposal_registrations','photo_proposal_feedback','proposal_content','proposal_requests',
    'proposal_reminders','app_config','proposal_progress'];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I add column if not exists org_id uuid references public.organizations(id)', t);
    execute format('update public.%I set org_id = %L where org_id is null', t, cash);
    execute format('alter table public.%I alter column org_id set default %L', t, cash);
    execute format('alter table public.%I alter column org_id set not null', t);
    execute format('drop policy if exists org_isolation on public.%I', t);
    execute format('create policy org_isolation on public.%I as restrictive to authenticated using (public.same_org(org_id)) with check (public.same_org(org_id))', t);
  end loop;
end $$;
