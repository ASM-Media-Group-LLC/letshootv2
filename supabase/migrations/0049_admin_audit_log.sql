-- Bitácora: registro automático de acciones sensibles sobre cuentas
-- (suscripción activada/inactiva, plan, aprobación de ID, aprobación de acceso,
-- cambio de rol). Vía trigger para capturarlo venga de donde venga.
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id),
  action     text not null,
  target_id  uuid references public.profiles (id),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;

drop policy if exists "audit read admin team" on public.audit_log;
create policy "audit read admin team" on public.audit_log
  for select to authenticated using (public.is_admin() or public.has_cap('team'));

create or replace function public.log_profile_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare act text; m jsonb;
begin
  if new.payment_status is distinct from old.payment_status then
    act := case when new.payment_status = 'paid' then 'Suscripción activada' else 'Suscripción marcada inactiva' end;
    m := jsonb_build_object('field','payment_status','old',old.payment_status,'new',new.payment_status);
  elsif new.plan is distinct from old.plan then
    act := 'Plan cambiado'; m := jsonb_build_object('field','plan','old',old.plan,'new',new.plan);
  elsif new.staff_status is distinct from old.staff_status then
    act := case when new.staff_status = 'approved' then 'Acceso aprobado' else 'Acceso ' || coalesce(new.staff_status,'—') end;
    m := jsonb_build_object('field','staff_status','old',old.staff_status,'new',new.staff_status);
  elsif new.onboarding_status is distinct from old.onboarding_status
        and new.onboarding_status in ('id_approved','id_rejected') then
    act := case when new.onboarding_status = 'id_approved' then 'ID aprobado' else 'ID rechazado' end;
    m := jsonb_build_object('field','onboarding_status','old',old.onboarding_status,'new',new.onboarding_status);
  elsif new.role is distinct from old.role then
    act := 'Rol cambiado'; m := jsonb_build_object('field','role','old',old.role,'new',new.role);
  else
    return new;
  end if;
  insert into public.audit_log(actor_id, action, target_id, meta) values (auth.uid(), act, new.id, m);
  return new;
end; $$;

drop trigger if exists trg_log_profile_change on public.profiles;
create trigger trg_log_profile_change after update on public.profiles
  for each row execute function public.log_profile_change();
