-- ─────────────────────────────────────────────────────────────────────────
-- Granular access, owner: "yo quiero acceso a datos, con identificación o sin
-- identificación". Split into two capabilities the admin grants per puesto:
--   datos → ver el perfil y datos legales de la creadora (SIN documentos de ID)
--   kyc   → verificar identidad: ver los documentos de ID + aprobar/rechazar
-- So "datos con identificación" = datos + kyc; "datos sin identificación" = datos.
-- Full function set: datos · kyc · content · requests · feedback · metrics · team
-- The kyc storage read policy already restricts ID images to admin/has_cap('kyc').
-- ─────────────────────────────────────────────────────────────────────────

-- Allow 'datos' in the per-puesto function whitelist.
create or replace function public.set_staff_functions(target uuid, caps text[])
returns void language plpgsql security definer set search_path = public as $$
declare tr public.user_role;
begin
  if not (public.is_admin() or public.has_cap('team')) then
    raise exception 'No tienes permiso para gestionar el equipo.';
  end if;
  select role into tr from public.profiles where id = target;
  if tr is null then raise exception 'Usuario no encontrado.'; end if;
  if tr not in ('supervisor','producer','chatter') then
    raise exception 'Solo puestos del equipo interno.';
  end if;
  if exists (
    select 1 from unnest(caps) c
    where c not in ('datos','kyc','content','requests','feedback','metrics','team')
  ) then
    raise exception 'Función inválida.';
  end if;
  update public.profiles set capabilities = caps where id = target;
end; $$;

-- Secure profile detail for staff. Legal data only if admin or has_cap('datos');
-- ID documents are viewable only if admin or has_cap('kyc') (can_see_id flag +
-- storage RLS). Callable by admin or any staff that works with creators.
drop function if exists public.creator_profile(uuid);
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
    and (public.is_admin() or public.has_cap('datos') or public.has_cap('kyc') or public.has_cap('content'));
$$;
revoke execute on function public.creator_profile(uuid) from anon, public;
grant execute on function public.creator_profile(uuid) to authenticated;
