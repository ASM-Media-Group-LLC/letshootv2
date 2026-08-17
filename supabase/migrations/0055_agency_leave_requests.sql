-- ─────────────────────────────────────────────────────────────────────────
-- Solicitud de salida de agencia.
-- La modelo pide salir → queda PENDIENTE (no sale aún) → la agencia se entera.
-- La agencia puede Aceptar (salida limpia) o Rechazar. La modelo SIEMPRE gana:
-- si la agencia rechaza o la ignora, la modelo pulsa «Salir de todos modos» y
-- sale (la agencia recibe la notificación). Nada de bloqueos.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.agency_leave_requests (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  agency_id   uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending',  -- pending | accepted | rejected | left | cancelled
  reason      text,
  agency_note text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists alr_agency_pending_idx on public.agency_leave_requests (agency_id) where status = 'pending';
create index if not exists alr_creator_idx on public.agency_leave_requests (creator_id);

alter table public.agency_leave_requests enable row level security;

-- Lectura: la modelo ve las suyas; la agencia las suyas; admin todo.
-- (Las escrituras van SIEMPRE por las RPC de abajo — sin políticas de write.)
drop policy if exists "alr read" on public.agency_leave_requests;
create policy "alr read" on public.agency_leave_requests for select
  using (creator_id = auth.uid() or agency_id = auth.uid() or public.is_admin());

-- Kinds de notificación nuevos.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'delivery','approved','rejected','feedback_resolved','generic','request','feedback','request_msg','agency_left',
    'agency_leave_requested','agency_leave_accepted','agency_leave_rejected','agency_leave_forced'
  ]));

-- ── La modelo pide salir ───────────────────────────────────────────────────
create or replace function public.request_leave_agency(p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_agency uuid; v_id uuid; v_name text;
begin
  if public.current_role() <> 'creator' then raise exception 'Solo una modelo puede pedir salir.'; end if;
  select agency_id into v_agency from public.agency_creators where creator_id = auth.uid() limit 1;
  if v_agency is null then raise exception 'No tienes agencia.'; end if;
  -- Si ya hay una pendiente, la reusamos (no duplicar).
  select id into v_id from public.agency_leave_requests
    where creator_id = auth.uid() and agency_id = v_agency and status = 'pending' limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.agency_leave_requests (creator_id, agency_id, reason)
    values (auth.uid(), v_agency, nullif(p_reason, '')) returning id into v_id;
  select coalesce(nullif(stage_name, ''), full_name) into v_name from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, kind, meta)
    values (v_agency, 'agency_leave_requested', jsonb_build_object('creator', coalesce(v_name, ''), 'request', v_id));
  return v_id;
end; $$;
revoke execute on function public.request_leave_agency(text) from anon, public;
grant execute on function public.request_leave_agency(text) to authenticated;

-- ── La agencia responde: aceptar (sale) o rechazar ─────────────────────────
create or replace function public.agency_respond_leave(p_request uuid, p_accept boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.agency_leave_requests where id = p_request;
  if not found then raise exception 'La solicitud no existe.'; end if;
  if r.agency_id <> auth.uid() and not public.is_admin() then raise exception 'No es tu solicitud.'; end if;
  if r.status <> 'pending' then raise exception 'La solicitud ya fue resuelta.'; end if;
  if p_accept then
    delete from public.agency_creators where creator_id = r.creator_id and agency_id = r.agency_id;
    update public.agency_leave_requests set status = 'accepted', agency_note = nullif(p_note, ''), resolved_at = now() where id = p_request;
    insert into public.notifications (user_id, kind, meta) values (r.creator_id, 'agency_leave_accepted', jsonb_build_object('request', p_request));
  else
    update public.agency_leave_requests set status = 'rejected', agency_note = nullif(p_note, ''), resolved_at = now() where id = p_request;
    insert into public.notifications (user_id, kind, meta) values (r.creator_id, 'agency_leave_rejected', jsonb_build_object('request', p_request));
  end if;
end; $$;
revoke execute on function public.agency_respond_leave(uuid, boolean, text) from anon, public;
grant execute on function public.agency_respond_leave(uuid, boolean, text) to authenticated;

-- ── La modelo sale de todos modos (rechazada o ignorada) ───────────────────
create or replace function public.creator_leave_anyway(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_name text;
begin
  select * into r from public.agency_leave_requests where id = p_request;
  if not found then raise exception 'La solicitud no existe.'; end if;
  if r.creator_id <> auth.uid() then raise exception 'No es tu solicitud.'; end if;
  if r.status not in ('pending', 'rejected') then raise exception 'Ya no aplica.'; end if;
  delete from public.agency_creators where creator_id = r.creator_id and agency_id = r.agency_id;
  update public.agency_leave_requests set status = 'left', resolved_at = now() where id = p_request;
  select coalesce(nullif(stage_name, ''), full_name) into v_name from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, kind, meta)
    values (r.agency_id, 'agency_leave_forced', jsonb_build_object('creator', coalesce(v_name, ''), 'request', p_request));
end; $$;
revoke execute on function public.creator_leave_anyway(uuid) from anon, public;
grant execute on function public.creator_leave_anyway(uuid) to authenticated;

-- ── La modelo cancela su solicitud (cambió de opinión) ─────────────────────
create or replace function public.cancel_leave_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.agency_leave_requests where id = p_request;
  if not found then return; end if;
  if r.creator_id <> auth.uid() then raise exception 'No es tu solicitud.'; end if;
  if r.status <> 'pending' then raise exception 'La solicitud ya fue resuelta.'; end if;
  update public.agency_leave_requests set status = 'cancelled', resolved_at = now() where id = p_request;
end; $$;
revoke execute on function public.cancel_leave_request(uuid) from anon, public;
grant execute on function public.cancel_leave_request(uuid) to authenticated;

-- ── Lista de solicitudes pendientes para la agencia (con datos de la modelo) ─
create or replace function public.agency_leave_requests()
returns table (id uuid, creator_id uuid, creator_name text, creator_handle text, avatar_url text, reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.creator_id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as creator_name,
         p.handle, p.avatar_url, r.reason, r.created_at
    from public.agency_leave_requests r
    join public.profiles p on p.id = r.creator_id
   where r.agency_id = auth.uid() and r.status = 'pending'
   order by r.created_at desc;
$$;
revoke execute on function public.agency_leave_requests() from anon;
grant execute on function public.agency_leave_requests() to authenticated;
