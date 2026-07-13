-- ─────────────────────────────────────────────────────────────────────────
-- LetShoot portal — initial schema
-- Roles: admin · chatter (requests) · producer (creates/uploads) · creator (views + feedback)
-- ─────────────────────────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'chatter', 'producer', 'creator');
create type public.request_status as enum ('pending', 'in_progress', 'delivered');
create type public.asset_type as enum ('photo', 'video', 'lora');
create type public.feedback_kind as enum ('love', 'change');

-- ── Profiles (1:1 with auth.users) ─────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'creator',
  created_at  timestamptz not null default now()
);

-- Which chatters may request for which creators
create table public.chatter_assignments (
  chatter_id  uuid not null references public.profiles (id) on delete cascade,
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (chatter_id, creator_id)
);

-- Folders that group a creator's delivered content
create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  kind        public.asset_type not null default 'photo',
  created_at  timestamptz not null default now()
);

-- Content requests (chatter -> producer -> creator)
create table public.requests (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles (id) on delete cascade,
  chatter_id   uuid not null references public.profiles (id),
  producer_id  uuid references public.profiles (id),
  title        text not null,
  description  text,
  status       public.request_status not null default 'pending',
  due_date     date,
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);

-- Delivered assets (photos / videos / lora training images)
create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles (id) on delete cascade,
  folder_id    uuid references public.folders (id) on delete set null,
  request_id   uuid references public.requests (id) on delete set null,
  type         public.asset_type not null default 'photo',
  storage_path text not null,
  uploaded_by  uuid references public.profiles (id),
  deliver_date date not null default current_date,
  created_at   timestamptz not null default now()
);

-- Creator feedback on delivered assets (goes to producer + admin)
create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid references public.assets (id) on delete cascade,
  request_id  uuid references public.requests (id) on delete cascade,
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  kind        public.feedback_kind not null default 'love',
  message     text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on public.chatter_assignments (creator_id);
create index on public.folders (creator_id);
create index on public.requests (creator_id);
create index on public.requests (producer_id);
create index on public.requests (status);
create index on public.assets (creator_id);
create index on public.assets (deliver_date);
create index on public.feedback (asset_id);

-- ── Helper: role of the current user ───────────────────────────────────────
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'creator')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.chatter_assignments enable row level security;
alter table public.folders             enable row level security;
alter table public.requests            enable row level security;
alter table public.assets              enable row level security;
alter table public.feedback            enable row level security;

-- profiles: everyone can read own; admin reads/writes all; staff can read profiles
create policy "profiles self read"  on public.profiles for select using (id = auth.uid() or public.is_admin() or public.current_role() in ('chatter','producer'));
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "profiles admin write" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- assignments: admin manages; chatter sees own; creator sees own
create policy "assign admin"   on public.chatter_assignments for all using (public.is_admin()) with check (public.is_admin());
create policy "assign read"    on public.chatter_assignments for select using (chatter_id = auth.uid() or creator_id = auth.uid() or public.is_admin());

-- folders: creator sees own; staff/admin see all; staff/admin write
create policy "folders read"  on public.folders for select using (creator_id = auth.uid() or public.current_role() in ('admin','chatter','producer'));
create policy "folders write" on public.folders for all using (public.current_role() in ('admin','producer')) with check (public.current_role() in ('admin','producer'));

-- requests: creator sees own; chatter sees created/assigned creators; producer sees assigned+pending; admin all
create policy "requests read" on public.requests for select using (
  creator_id = auth.uid() or chatter_id = auth.uid() or producer_id = auth.uid() or public.is_admin() or public.current_role() = 'producer'
);
create policy "requests chatter insert" on public.requests for insert with check (
  public.is_admin() or (public.current_role() = 'chatter' and chatter_id = auth.uid()
    and exists (select 1 from public.chatter_assignments a where a.chatter_id = auth.uid() and a.creator_id = requests.creator_id))
);
create policy "requests staff update" on public.requests for update using (
  public.is_admin() or public.current_role() in ('producer','chatter')
);

-- assets: creator sees own; staff/admin see all; producer/admin write
create policy "assets read"  on public.assets for select using (creator_id = auth.uid() or public.current_role() in ('admin','chatter','producer'));
create policy "assets write" on public.assets for all using (public.current_role() in ('admin','producer')) with check (public.current_role() in ('admin','producer'));

-- feedback: creator writes own; producer+admin read; creator reads own
create policy "feedback creator insert" on public.feedback for insert with check (creator_id = auth.uid());
create policy "feedback read" on public.feedback for select using (creator_id = auth.uid() or public.current_role() in ('admin','producer'));
create policy "feedback staff update" on public.feedback for update using (public.current_role() in ('admin','producer'));

-- ── Storage buckets (private) ──────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('deliveries', 'deliveries', false),
  ('lora', 'lora', false)
on conflict (id) do nothing;
