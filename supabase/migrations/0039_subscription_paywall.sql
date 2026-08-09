-- ── Paywall por suscripción ────────────────────────────────────────────
-- Regla: el EQUIPO interno (admin/supervisor/producer/chatter) ve y prepara
-- TODO. La MODELO y la AGENCIA solo ven una cuenta cuando su suscripción está
-- ACTIVA (pagó). Si no ha pagado, no la ve nadie fuera del equipo.

create or replace function public.is_active_creator(cid uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = cid
      and (p.onboarding_status in ('active','paid') or p.payment_status = 'paid')
  );
$$;

-- ── Agencia: solo ve sus modelos ACTIVAS ────────────────────────────────
drop policy if exists "profiles agency read" on public.profiles;
create policy "profiles agency read" on public.profiles for select
  using (manages_creator(id) and is_active_creator(id));

drop policy if exists "assets agency read" on public.assets;
create policy "assets agency read" on public.assets for select
  using (manages_creator(creator_id) and is_active_creator(creator_id));

drop policy if exists "folders agency read" on public.folders;
create policy "folders agency read" on public.folders for select
  using (manages_creator(creator_id) and is_active_creator(creator_id));

drop policy if exists "feedback agency read" on public.feedback;
create policy "feedback agency read" on public.feedback for select
  using (manages_creator(creator_id) and is_active_creator(creator_id));

drop policy if exists "requests agency read" on public.requests;
create policy "requests agency read" on public.requests for select
  using (manages_creator(creator_id) and is_active_creator(creator_id));

-- Agencia tampoco inserta pedidos/feedback en cuentas inactivas.
drop policy if exists "requests agency insert" on public.requests;
create policy "requests agency insert" on public.requests for insert
  with check (public."current_role"() = 'agency'::user_role and manages_creator(creator_id)
              and is_active_creator(creator_id) and chatter_id = auth.uid());

drop policy if exists "feedback agency insert" on public.feedback;
create policy "feedback agency insert" on public.feedback for insert
  with check (exists (select 1 from agency_creators ac
                      where ac.agency_id = auth.uid() and ac.creator_id = feedback.creator_id)
              and is_active_creator(feedback.creator_id) and author_id = auth.uid());

-- ── Modelo: solo ve SU contenido si su cuenta está activa ───────────────
drop policy if exists "assets read" on public.assets;
create policy "assets read" on public.assets for select
  using (
    (creator_id = auth.uid() and is_active_creator(auth.uid()))
    or (public."current_role"() = any (array['admin','supervisor','producer','chatter']::user_role[]))
  );

drop policy if exists "folders read" on public.folders;
create policy "folders read" on public.folders for select
  using (
    (creator_id = auth.uid() and is_active_creator(auth.uid()))
    or (public."current_role"() = any (array['admin','supervisor','producer','chatter']::user_role[]))
  );

-- Hilo de pedidos: la agencia solo lo ve si la creadora está activa.
create or replace function public.can_see_request(rid uuid)
returns boolean language sql security definer set search_path to 'public'
as $$
  select exists (
    select 1 from requests r
    left join agency_creators ac on ac.creator_id = r.creator_id
    where r.id = rid
      and (
        public.is_admin() or public.has_cap('requests')
        or r.creator_id = auth.uid()
        or (ac.agency_id = auth.uid() and public.is_active_creator(r.creator_id))
        or r.chatter_id = auth.uid()
      )
  );
$$;
