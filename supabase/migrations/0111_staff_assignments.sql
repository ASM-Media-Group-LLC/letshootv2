-- Asignación de MODELOS a cada staff (sobre quién trabaja cada persona). Base del modelo "rol + modelos asignadas".
create table if not exists staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique (staff_id, creator_id)
);
create index if not exists staff_assignments_staff_idx on staff_assignments(staff_id);
create index if not exists staff_assignments_creator_idx on staff_assignments(creator_id);
alter table staff_assignments enable row level security;

drop policy if exists staff_assignments_admin_all on staff_assignments;
create policy staff_assignments_admin_all on staff_assignments
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists staff_assignments_self_read on staff_assignments;
create policy staff_assignments_self_read on staff_assignments
  for select using (staff_id = auth.uid());
