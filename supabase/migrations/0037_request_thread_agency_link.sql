-- ── Transparencia del pedido ────────────────────────────────────────────────
-- 1) Hilo de mensajes por pedido: el equipo pregunta, la modelo Y su agencia
--    siempre se enteran (copia a ambas); ellas pueden responder.
-- 2) Feedback con autor (modelo o agencia) para likes/notas al completar.
-- 3) La modelo puede salirse de su agencia (ella decide).

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  author_role text not null default 'team',   -- team | creator | agency
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.request_messages enable row level security;

create or replace function public.can_see_request(rid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from requests r
    left join agency_creators ac on ac.creator_id = r.creator_id
    where r.id = rid
      and (
        public.is_admin() or public.has_cap('requests')
        or r.creator_id = auth.uid()
        or ac.agency_id = auth.uid()
        or r.chatter_id = auth.uid()
      )
  );
$$;

drop policy if exists "request_messages read" on public.request_messages;
create policy "request_messages read" on public.request_messages for select
  using (public.can_see_request(request_id));

create or replace function public.post_request_message(rid uuid, body_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  req record;
  me_profile record;
  my_role text;
  agency uuid;
  msg record;
begin
  if body_text is null or length(trim(body_text)) = 0 then raise exception 'mensaje vacío'; end if;
  select * into req from requests where id = rid;
  if req is null then raise exception 'pedido no existe'; end if;
  select id, full_name, role into me_profile from profiles where id = auth.uid();
  select ac.agency_id into agency from agency_creators ac where ac.creator_id = req.creator_id limit 1;

  if me_profile.role = 'admin' or public.has_cap('requests') then my_role := 'team';
  elsif me_profile.id = req.creator_id then my_role := 'creator';
  elsif me_profile.id = agency or me_profile.id = req.chatter_id then my_role := 'agency';
  else raise exception 'no autorizado';
  end if;

  insert into request_messages (request_id, author_id, author_name, author_role, body)
  values (rid, me_profile.id, me_profile.full_name, my_role, trim(body_text))
  returning * into msg;

  if my_role <> 'creator' then
    insert into notifications (user_id, kind, meta)
    values (req.creator_id, 'request_msg', jsonb_build_object('request_id', rid, 'title', req.title, 'from', my_role, 'body', left(trim(body_text), 140)));
  end if;
  if agency is not null and my_role <> 'agency' then
    insert into notifications (user_id, kind, meta)
    values (agency, 'request_msg', jsonb_build_object('request_id', rid, 'title', req.title, 'from', my_role, 'body', left(trim(body_text), 140)));
  end if;
  if my_role <> 'team' then
    insert into notifications (user_id, kind, meta)
    select p.id, 'request_msg', jsonb_build_object('request_id', rid, 'title', req.title, 'from', my_role, 'body', left(trim(body_text), 140))
    from profiles p where p.role = 'admin' or (p.role in ('supervisor','producer','chatter') and p.capabilities @> array['requests']);
  end if;

  return to_jsonb(msg);
end $$;
grant execute on function public.post_request_message(uuid, text) to authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['delivery','approved','rejected','feedback_resolved','generic','request','feedback','request_msg','agency_left']));

alter table public.feedback add column if not exists author_id uuid references public.profiles(id) on delete set null;
alter table public.feedback add column if not exists author_role text not null default 'creator';

drop policy if exists "feedback agency insert" on public.feedback;
create policy "feedback agency insert" on public.feedback for insert
  with check (
    exists (select 1 from agency_creators ac where ac.agency_id = auth.uid() and ac.creator_id = feedback.creator_id)
    and author_id = auth.uid()
  );

drop policy if exists "agency_creators creator leave" on public.agency_creators;
create policy "agency_creators creator leave" on public.agency_creators for delete
  using (creator_id = auth.uid());
