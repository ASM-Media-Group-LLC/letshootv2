-- ─────────────────────────────────────────────────────────────────────────
-- Pedidos upgrade. Owner: a request must actually REACH the team member who
-- fulfills orders (email + in-app pop-up), the form should be better prepared,
-- and the requester can optionally attach example reference photos.
-- ─────────────────────────────────────────────────────────────────────────

-- Optional reference images (storage paths) attached to a request.
alter table public.requests add column if not exists ref_images text[];

-- Private bucket for request reference photos.
insert into storage.buckets (id, name, public) values ('request-refs', 'request-refs', false)
on conflict (id) do nothing;

drop policy if exists "reqrefs owner insert" on storage.objects;
create policy "reqrefs owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'request-refs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Read: the uploader, any staff who attends requests, or the admin.
drop policy if exists "reqrefs read" on storage.objects;
create policy "reqrefs read" on storage.objects for select to authenticated
  using (bucket_id = 'request-refs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin() or public.has_cap('requests') or public.has_cap('content')
  ));

-- Allow the 'request' notification kind (the worker's new-order pop-up).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['delivery','approved','rejected','feedback_resolved','generic','request']));

-- Real-time so the worker gets a live pop-up when a request notification lands.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null; end $$;
