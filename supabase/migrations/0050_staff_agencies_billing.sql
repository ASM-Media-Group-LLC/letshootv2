-- Da al EQUIPO (no solo al dueño) las herramientas de dos accesos ya existentes:
--   · 'agencies'  → crear agencias (ya lo hace create-user) y vincular/mover modelos
--   · 'billing'   → activar planes, cortesías y fechas de vencimiento
-- Todo por RPC security-definer con guardas por capacidad, para no abrir
-- políticas UPDATE amplias sobre profiles / agency_creators.

-- ── Lista de agencias + qué modelos maneja cada una (para el selector) ──────
-- Guardada por 'agencies' o 'metrics' (o admin). Solo nombres/artístico, nunca
-- documentos de identidad.
create or replace function public.team_agencies()
returns table (
  id uuid, full_name text, email text, creator_ids uuid[]
)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.full_name, ''), p.email) as full_name,
         p.email,
         coalesce(array_agg(ac.creator_id) filter (where ac.creator_id is not null), '{}') as creator_ids
    from public.profiles p
    left join public.agency_creators ac on ac.agency_id = p.id
   where p.role = 'agency'
     and (public.is_admin() or public.has_cap('agencies') or public.has_cap('metrics'))
   group by p.id, p.full_name, p.email
   order by coalesce(nullif(p.full_name, ''), p.email);
$$;
revoke execute on function public.team_agencies() from anon;
grant execute on function public.team_agencies() to authenticated;

-- ── Vincular / mover / quitar una modelo de una agencia (una sola agencia) ──
-- p_agency null = quitarla de toda agencia. Atómico: borra lo anterior e inserta
-- lo nuevo. Guardado por 'agencies'.
create or replace function public.staff_set_creator_agency(p_creator uuid, p_agency uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.has_cap('agencies')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  -- La modelo debe ser una creadora real.
  if not exists (select 1 from public.profiles where id = p_creator and role = 'creator') then
    raise exception 'La cuenta no es una creadora';
  end if;
  -- Una creadora = una sola agencia: limpiamos cualquier vínculo previo.
  delete from public.agency_creators where creator_id = p_creator;
  if p_agency is not null then
    if not exists (select 1 from public.profiles where id = p_agency and role = 'agency') then
      raise exception 'La cuenta destino no es una agencia';
    end if;
    insert into public.agency_creators (agency_id, creator_id)
    values (p_agency, p_creator)
    on conflict do nothing;
  end if;
end; $$;
revoke execute on function public.staff_set_creator_agency(uuid, uuid) from anon;
grant execute on function public.staff_set_creator_agency(uuid, uuid) to authenticated;

-- ── Creadoras con su estado de suscripción completo (para el módulo de cobros) ─
-- Guardada por 'billing'. Solo datos de facturación, sin documentos.
create or replace function public.team_billing()
returns table (
  id uuid, full_name text, handle text, avatar_url text,
  onboarding_status text, plan text, payment_status text,
  subscription_ends_at date, comp_until date, billing_note text
)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status,
         p.plan, p.payment_status, p.subscription_ends_at, p.comp_until, p.billing_note
    from public.profiles p
   where p.role = 'creator'
     and (public.is_admin() or public.has_cap('billing'))
   order by p.created_at desc;
$$;
revoke execute on function public.team_billing() from anon;
grant execute on function public.team_billing() to authenticated;

-- ── Cambiar la suscripción de una creadora (plan / cortesía / vencimiento) ──
-- Espeja exactamente lo que hace el dueño en /admin. Guardado por 'billing'.
--   p_action:
--     'plan'       → fija plan (p_plan) y activa, vence en p_ends_at
--     'comp'       → cortesía gratis hasta p_comp_until (activa, plan core si falta)
--     'ends_at'    → cambia solo la fecha de vencimiento
--     'activate'   → marca pagada/activa con vencimiento p_ends_at
--     'deactivate' → marca inactiva (sin vencimiento)
--     'note'       → guarda solo la nota
create or replace function public.staff_set_subscription(
  p_creator uuid, p_action text,
  p_plan text default null, p_ends_at date default null,
  p_comp_until date default null, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  cur record;
begin
  if not (public.is_admin() or public.has_cap('billing')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select plan, subscription_ends_at, onboarding_status into cur
    from public.profiles where id = p_creator and role = 'creator';
  if not found then raise exception 'La cuenta no es una creadora'; end if;

  if p_action = 'plan' then
    update public.profiles
       set plan = coalesce(p_plan, plan), payment_status = 'paid',
           onboarding_status = 'active',
           subscription_ends_at = coalesce(p_ends_at, subscription_ends_at, (current_date + 30))
     where id = p_creator;
  elsif p_action = 'comp' then
    update public.profiles
       set comp_until = coalesce(p_comp_until, (current_date + 30)),
           payment_status = 'paid', onboarding_status = 'active',
           plan = coalesce(plan, 'core'),
           subscription_ends_at = coalesce(p_comp_until, (current_date + 30)),
           billing_note = coalesce(nullif(p_note, ''), billing_note, 'Cortesia (gratis)')
     where id = p_creator;
  elsif p_action = 'ends_at' then
    update public.profiles set subscription_ends_at = p_ends_at where id = p_creator;
  elsif p_action = 'activate' then
    update public.profiles
       set payment_status = 'paid', plan = coalesce(plan, 'core'),
           onboarding_status = 'active',
           subscription_ends_at = coalesce(p_ends_at, subscription_ends_at, (current_date + 30))
     where id = p_creator;
  elsif p_action = 'deactivate' then
    update public.profiles
       set payment_status = 'unpaid', subscription_ends_at = null,
           onboarding_status = case when onboarding_status in ('active','paid')
                                    then 'id_approved' else onboarding_status end
     where id = p_creator;
  elsif p_action = 'note' then
    update public.profiles set billing_note = nullif(p_note, '') where id = p_creator;
  else
    raise exception 'Accion invalida: %', p_action;
  end if;
end; $$;
revoke execute on function public.staff_set_subscription(uuid, text, text, date, date, text) from anon;
grant execute on function public.staff_set_subscription(uuid, text, text, date, date, text) to authenticated;
