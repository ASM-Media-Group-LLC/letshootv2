-- ─────────────────────────────────────────────────────────────────────────
-- In-app notifications + creator-managed folders (owner's requirements:
-- the creator sees what was uploaded when she logs in, organizes her photos
-- in her own folders, moves them around, downloads everything).
-- ─────────────────────────────────────────────────────────────────────────

-- Notifications — rendered client-side from kind+meta so they're bilingual.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('delivery','approved','rejected','feedback_resolved','generic')),
  meta       jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "notif own read" on public.notifications;
create policy "notif own read" on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notif staff insert" on public.notifications;
create policy "notif staff insert" on public.notifications for insert
  with check (public.current_role() in ('admin','supervisor','producer','chatter'));
drop policy if exists "notif own update" on public.notifications;
create policy "notif own update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Creators manage their OWN folders.
drop policy if exists "folders creator insert" on public.folders;
create policy "folders creator insert" on public.folders for insert
  with check (creator_id = auth.uid());
drop policy if exists "folders creator update" on public.folders;
create policy "folders creator update" on public.folders for update
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- Delete own folder only when empty.
create or replace function public.delete_own_folder(fid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.folders where id = fid and creator_id = auth.uid()) then
    raise exception 'No es tu carpeta.';
  end if;
  if exists (select 1 from public.assets where folder_id = fid) then
    raise exception 'La carpeta no está vacía.';
  end if;
  delete from public.folders where id = fid;
end; $$;
revoke execute on function public.delete_own_folder(uuid) from anon;

-- Move own asset between own folders (never touches storage_path).
create or replace function public.move_own_asset(aid uuid, fid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assets where id = aid and creator_id = auth.uid()) then
    raise exception 'No es tu contenido.';
  end if;
  if fid is not null and not exists (select 1 from public.folders where id = fid and creator_id = auth.uid()) then
    raise exception 'No es tu carpeta.';
  end if;
  update public.assets set folder_id = fid where id = aid;
end; $$;
revoke execute on function public.move_own_asset(uuid, uuid) from anon;
