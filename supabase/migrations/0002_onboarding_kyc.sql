-- ─────────────────────────────────────────────────────────────────────────
-- LetShoot portal — creator onboarding + KYC (ID verification) + LoRA intake
-- Flow: register → fill info → upload ID → admin approves → pay (stub) → LoRA
-- ─────────────────────────────────────────────────────────────────────────

-- ── Onboarding + legal/KYC fields on profiles ──────────────────────────────
alter table public.profiles
  add column if not exists onboarding_status text not null default 'registered'
    check (onboarding_status in ('registered','info','id_pending','id_rejected','id_approved','paid','active')),
  add column if not exists legal_first_name  text,
  add column if not exists legal_last_name   text,
  add column if not exists date_of_birth     date,
  add column if not exists country           text,
  add column if not exists phone             text,
  add column if not exists stage_name        text,
  add column if not exists id_reviewed_by    uuid references public.profiles (id),
  add column if not exists id_reviewed_at    timestamptz,
  add column if not exists id_rejection_reason text,
  add column if not exists payment_status    text not null default 'unpaid'
    check (payment_status in ('unpaid','paid')),
  add column if not exists lora_status       text not null default 'none'
    check (lora_status in ('none','pending','training','ready'));

-- ── KYC documents (ID front / back / selfie holding ID) ────────────────────
do $$ begin
  create type public.kyc_doc_type as enum ('id_front','id_back','selfie_id');
exception when duplicate_object then null; end $$;

create table if not exists public.kyc_documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  doc_type     public.kyc_doc_type not null,
  storage_path text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, doc_type)
);
create index if not exists kyc_documents_user_idx on public.kyc_documents (user_id);

-- ── LoRA training photos (the clone set: face / body) ──────────────────────
create table if not exists public.lora_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  category     text not null default 'face' check (category in ('face','body','other')),
  created_at   timestamptz not null default now()
);
create index if not exists lora_photos_user_idx on public.lora_photos (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.kyc_documents enable row level security;
alter table public.lora_photos   enable row level security;

drop policy if exists "kyc owner or admin read"   on public.kyc_documents;
drop policy if exists "kyc owner insert"           on public.kyc_documents;
drop policy if exists "kyc owner update"           on public.kyc_documents;
drop policy if exists "kyc admin all"              on public.kyc_documents;
-- owner reads own; admin reads all
create policy "kyc owner or admin read" on public.kyc_documents for select
  using (user_id = auth.uid() or public.is_admin());
-- owner may (re)upload while not yet approved; admin always
create policy "kyc owner insert" on public.kyc_documents for insert
  with check (user_id = auth.uid() or public.is_admin());
create policy "kyc owner update" on public.kyc_documents for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "lora owner or staff read" on public.lora_photos;
drop policy if exists "lora owner insert"        on public.lora_photos;
drop policy if exists "lora owner delete"        on public.lora_photos;
create policy "lora owner or staff read" on public.lora_photos for select
  using (user_id = auth.uid() or public.current_role() in ('admin','producer'));
create policy "lora owner insert" on public.lora_photos for insert
  with check (user_id = auth.uid() or public.is_admin());
create policy "lora owner delete" on public.lora_photos for delete
  using (user_id = auth.uid() or public.is_admin());

-- ── Private storage bucket for KYC docs ────────────────────────────────────
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Object-level RLS: files live under "<user_id>/…". Owner reads/writes own; admin reads all.
drop policy if exists "kyc obj owner insert" on storage.objects;
drop policy if exists "kyc obj owner read"   on storage.objects;
drop policy if exists "lora obj owner insert" on storage.objects;
drop policy if exists "lora obj owner read"   on storage.objects;

create policy "kyc obj owner insert" on storage.objects for insert
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc obj owner read" on storage.objects for select
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "lora obj owner insert" on storage.objects for insert
  with check (bucket_id = 'lora' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lora obj owner read" on storage.objects for select
  using (bucket_id = 'lora' and ((storage.foldername(name))[1] = auth.uid()::text or public.current_role() in ('admin','producer')));
