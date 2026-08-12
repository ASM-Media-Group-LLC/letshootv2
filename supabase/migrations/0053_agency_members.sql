-- Sub-equipo de la agencia: la agencia (dueño) invita empleados y les da funciones
-- divididas (content/sales/requests/metrics) y modelos asignados (alcance por modelo).
-- Los empleados son cuentas rol 'agency' vinculadas al dueño por agency_members; así
-- heredan las políticas de agencia, pero manages_creator los limita a SUS modelos.

create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.profiles(id) on delete cascade,   -- dueño de la agencia
  member_id uuid not null references public.profiles(id) on delete cascade,   -- empleado
  capabilities text[] not null default '{}',                                   -- content/sales/requests/metrics
  created_at timestamptz not null default now(),
  unique (member_id)
);

create table if not exists public.agency_member_creators (
  member_id  uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  primary key (member_id, creator_id)
);

alter table public.agency_members enable row level security;
alter table public.agency_member_creators enable row level security;

-- ── Helpers ────────────────────────────────────────────────────────────────
-- ¿uid es EMPLEADO de alguna agencia (no el dueño)?
create or replace function public.is_agency_member(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.agency_members where member_id = uid);
$$;

-- La agencia (dueño) para la que actúa uid: su propio id si es dueño; el agency_id
-- de su fila de miembro si es empleado.
create or replace function public.agency_owner_of(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select agency_id from public.agency_members where member_id = uid),
    uid
  );
$$;

-- ¿uid puede ACTUAR para la agencia `aid`? (es el dueño, o su empleado)
create or replace function public.acts_for_agency(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select aid = auth.uid()
      or exists (select 1 from public.agency_members where member_id = auth.uid() and agency_id = aid);
$$;

-- ¿uid tiene la función `cap` de agencia? El dueño (rol agency y NO empleado) tiene todas.
create or replace function public.agency_can(cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.agency_members where member_id = auth.uid())
      then exists (select 1 from public.agency_members where member_id = auth.uid() and cap = any(capabilities))
    else exists (select 1 from public.profiles where id = auth.uid() and role = 'agency')  -- dueño: todo
  end;
$$;
revoke execute on function public.agency_can(text) from anon;
grant execute on function public.agency_can(text) to authenticated;

-- manages_creator AHORA incluye a los empleados, pero SOLO sus modelos asignados.
create or replace function public.manages_creator(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agency_creators
    where agency_id = auth.uid() and creator_id = cid
  ) or exists (
    select 1 from public.agency_member_creators amc
    where amc.member_id = auth.uid() and amc.creator_id = cid
  );
$$;

-- Perfil de agencia del que cuelga uid + sus funciones + sus modelos (para el panel).
create or replace function public.my_agency_context()
returns table (agency_id uuid, agency_name text, is_owner boolean, capabilities text[])
language sql stable security definer set search_path = public as $$
  select
    public.agency_owner_of(auth.uid()) as agency_id,
    (select full_name from public.profiles where id = public.agency_owner_of(auth.uid())) as agency_name,
    not public.is_agency_member(auth.uid()) as is_owner,
    case when public.is_agency_member(auth.uid())
      then (select capabilities from public.agency_members where member_id = auth.uid())
      else array['content','sales','requests','metrics'] end as capabilities;
$$;
revoke execute on function public.my_agency_context() from anon;
grant execute on function public.my_agency_context() to authenticated;

-- Lista del sub-equipo (para el dueño): empleados + funciones + modelos asignados.
create or replace function public.agency_team()
returns table (member_id uuid, full_name text, email text, capabilities text[], creator_ids uuid[])
language sql stable security definer set search_path = public as $$
  select am.member_id,
         coalesce(nullif(p.full_name, ''), p.email) as full_name,
         p.email,
         am.capabilities,
         coalesce(array_agg(amc.creator_id) filter (where amc.creator_id is not null), '{}') as creator_ids
    from public.agency_members am
    join public.profiles p on p.id = am.member_id
    left join public.agency_member_creators amc on amc.member_id = am.member_id
   where am.agency_id = auth.uid()   -- solo el dueño ve su equipo
   group by am.member_id, p.full_name, p.email, am.capabilities;
$$;
revoke execute on function public.agency_team() from anon;
grant execute on function public.agency_team() to authenticated;

-- ── RLS: agency_members / agency_member_creators ────────────────────────────
-- El dueño gestiona su propio equipo; el empleado lee su propia fila.
drop policy if exists "agency_members owner" on public.agency_members;
create policy "agency_members owner" on public.agency_members for all
  using (agency_id = auth.uid() or public.is_admin())
  with check (agency_id = auth.uid() or public.is_admin());
drop policy if exists "agency_members self read" on public.agency_members;
create policy "agency_members self read" on public.agency_members for select
  using (member_id = auth.uid());

drop policy if exists "amc owner" on public.agency_member_creators;
create policy "amc owner" on public.agency_member_creators for all
  using (public.is_admin() or exists (select 1 from public.agency_members am where am.member_id = agency_member_creators.member_id and am.agency_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.agency_members am where am.member_id = agency_member_creators.member_id and am.agency_id = auth.uid()));
drop policy if exists "amc self read" on public.agency_member_creators;
create policy "amc self read" on public.agency_member_creators for select
  using (member_id = auth.uid());

-- ── RLS de escritura consciente de empleados ────────────────────────────────
-- agency_sales: el empleado con 'sales' inserta/borra bajo la agencia; agency_id es
-- SIEMPRE el dueño (no el empleado). Read: dueño o empleado que actúa para la agencia.
drop policy if exists "agency_sales agency insert" on public.agency_sales;
create policy "agency_sales agency insert" on public.agency_sales for insert to authenticated
  with check (public.acts_for_agency(agency_id) and public.manages_creator(creator_id) and public.agency_can('sales'));
drop policy if exists "agency_sales agency delete" on public.agency_sales;
create policy "agency_sales agency delete" on public.agency_sales for delete to authenticated
  using (public.acts_for_agency(agency_id) and public.agency_can('sales'));
drop policy if exists "agency_sales read" on public.agency_sales;
create policy "agency_sales read" on public.agency_sales for select to authenticated
  using (
    public.acts_for_agency(agency_id)
    or creator_id = auth.uid()
    or public.is_admin()
    or public."current_role"() = any (array['supervisor','producer','chatter']::user_role[])
  );

-- agency_set_stats: además de gestionar la modelo, exige la función 'sales' (el
-- dueño siempre la tiene). Un empleado sin 'sales' no puede tocar precios/ventas.
create or replace function public.agency_set_stats(
  aid uuid, p_sales integer, p_revenue numeric, p_reach integer, p_interactions integer
) returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select creator_id into cid from public.assets where id = aid;
  if cid is null then raise exception 'Contenido no encontrado.'; end if;
  if not (public.is_admin() or (public.manages_creator(cid) and public.agency_can('sales'))) then
    raise exception 'No autorizado para cambiar ventas de esta modelo.';
  end if;
  update public.assets set
    sales_count  = greatest(0, coalesce(p_sales, sales_count)),
    revenue      = greatest(0, coalesce(p_revenue, revenue)),
    reach        = greatest(0, coalesce(p_reach, reach)),
    interactions = greatest(0, coalesce(p_interactions, interactions))
  where id = aid;
end; $$;
revoke execute on function public.agency_set_stats(uuid, integer, numeric, integer, integer) from anon, public;
grant execute on function public.agency_set_stats(uuid, integer, numeric, integer, integer) to authenticated;

-- requests: el empleado con 'requests' crea pedidos (rol 'agency' ya cubre el resto).
-- Conserva el paywall: la modelo debe estar activa.
drop policy if exists "requests agency insert" on public.requests;
create policy "requests agency insert" on public.requests for insert
  with check (public."current_role"() = 'agency'::user_role and public.manages_creator(creator_id)
              and public.is_active_creator(creator_id) and chatter_id = auth.uid() and public.agency_can('requests'));
