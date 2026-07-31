-- ─────────────────────────────────────────────────────────────────────────
-- Agency / manager environment. An agency manages a set of creators:
--  · sees their delivered content (uploaded by staff)
--  · makes content requests for them
--  · records what each piece sold (attributed to the agency) — the platform
--    keeps the agency's books.
-- ─────────────────────────────────────────────────────────────────────────

-- Which agency manages which creator.
create table if not exists public.agency_creators (
  agency_id  uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (agency_id, creator_id)
);
create index if not exists agency_creators_creator_idx on public.agency_creators (creator_id);

alter table public.agency_creators enable row level security;

-- Does the current user (an agency) manage this creator?
create or replace function public.manages_creator(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agency_creators
    where agency_id = auth.uid() and creator_id = cid
  );
$$;
revoke execute on function public.manages_creator(uuid) from anon;
grant execute on function public.manages_creator(uuid) to authenticated;

-- Name of the agency that manages the current creator (for the creator panel).
create or replace function public.my_agency()
returns text language sql stable security definer set search_path = public as $$
  select p.full_name
  from public.agency_creators ac
  join public.profiles p on p.id = ac.agency_id
  where ac.creator_id = auth.uid()
  limit 1;
$$;
revoke execute on function public.my_agency() from anon;
grant execute on function public.my_agency() to authenticated;

-- Agency records sales/performance on its creators' assets (attributed to the
-- agency). Security definer so it can write without a broad UPDATE policy, and
-- it only ever touches the four performance columns.
create or replace function public.agency_set_stats(
  aid uuid, p_sales integer, p_revenue numeric, p_reach integer, p_interactions integer
) returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select creator_id into cid from public.assets where id = aid;
  if cid is null then raise exception 'Contenido no encontrado.'; end if;
  if not (public.is_admin() or public.manages_creator(cid)) then
    raise exception 'No gestionas a esta modelo.';
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

-- ── RLS ──────────────────────────────────────────────────────────────────
-- agency_creators: admin manages; agency sees its own rows; creator sees who manages her.
drop policy if exists "agency_creators admin" on public.agency_creators;
create policy "agency_creators admin" on public.agency_creators for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "agency_creators read" on public.agency_creators;
create policy "agency_creators read" on public.agency_creators for select
  using (agency_id = auth.uid() or creator_id = auth.uid() or public.is_admin());

-- Agency can read its creators' profiles / folders / assets / feedback (additive).
drop policy if exists "profiles agency read" on public.profiles;
create policy "profiles agency read" on public.profiles for select
  using (public.manages_creator(id));

drop policy if exists "folders agency read" on public.folders;
create policy "folders agency read" on public.folders for select
  using (public.manages_creator(creator_id));

drop policy if exists "assets agency read" on public.assets;
create policy "assets agency read" on public.assets for select
  using (public.manages_creator(creator_id));

drop policy if exists "feedback agency read" on public.feedback;
create policy "feedback agency read" on public.feedback for select
  using (public.manages_creator(creator_id));

-- Requests: agency reads its creators' requests and creates new ones for them.
drop policy if exists "requests agency read" on public.requests;
create policy "requests agency read" on public.requests for select
  using (public.manages_creator(creator_id));
drop policy if exists "requests agency insert" on public.requests;
create policy "requests agency insert" on public.requests for insert
  with check (public.current_role() = 'agency' and public.manages_creator(creator_id) and chatter_id = auth.uid());

-- Storage: let an agency read its creators' delivered objects too.
drop policy if exists "deliveries read" on storage.objects;
create policy "deliveries read" on storage.objects for select
  using (bucket_id = 'deliveries'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.current_role() in ('admin','producer','supervisor','chatter')
         or exists (
           select 1 from public.agency_creators ac
           where ac.agency_id = auth.uid()
             and (storage.foldername(name))[1] = ac.creator_id::text
         )));
