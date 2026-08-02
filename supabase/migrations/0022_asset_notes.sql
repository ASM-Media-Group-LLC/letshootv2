-- ─────────────────────────────────────────────────────────────────────────
-- Per-photo notes journal (bitácora). The agency/manager keeps a MANUAL,
-- day-by-day log on each piece — what it earned, observations — and the
-- system stamps each note with its day. The creator sees them read-only
-- (a mirror). Sales stay a manual running total on the asset.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.asset_notes (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references public.assets (id) on delete cascade,
  author_id   uuid references public.profiles (id),
  author_name text,
  note        text not null,
  note_date   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists asset_notes_asset_idx on public.asset_notes (asset_id, created_at desc);

-- Creator of an asset (security definer → usable inside policies without RLS recursion).
create or replace function public.asset_creator(aid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select creator_id from public.assets where id = aid;
$$;
revoke execute on function public.asset_creator(uuid) from anon;
grant execute on function public.asset_creator(uuid) to authenticated;

alter table public.asset_notes enable row level security;

-- Read: the creator (owner), the managing agency, or internal staff/admin.
drop policy if exists "asset_notes read" on public.asset_notes;
create policy "asset_notes read" on public.asset_notes for select using (
  public.asset_creator(asset_id) = auth.uid()
  or public.manages_creator(public.asset_creator(asset_id))
  or public.current_role() in ('admin','supervisor','producer','chatter')
);

-- Write: the managing agency (or admin / content staff). Never the creator.
drop policy if exists "asset_notes insert" on public.asset_notes;
create policy "asset_notes insert" on public.asset_notes for insert with check (
  author_id = auth.uid() and (
    public.is_admin() or public.manages_creator(public.asset_creator(asset_id)) or public.has_cap('content')
  )
);
drop policy if exists "asset_notes delete" on public.asset_notes;
create policy "asset_notes delete" on public.asset_notes for delete using (
  author_id = auth.uid() or public.is_admin()
);
