-- Agentes vendedores + referrals.
-- Un agente es una cuenta rol 'agent'. Solo puede REFERIR modelos (pone
-- el correo, a la modelo le llega la invitación). El agente ve sus
-- referidos; admin ve todos.
--
-- El valor 'agent' se agrega al enum user_role via execute_sql aparte
-- (los ALTER TYPE no corren dentro de un migration block).

create table if not exists public.agent_referrals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null,
  invited_name text,
  creator_id uuid references public.profiles(id) on delete set null,
  status text not null default 'invited' check (status in ('invited','registered','paid','expired')),
  notes text,
  invited_at timestamptz not null default now(),
  registered_at timestamptz,
  paid_at timestamptz
);

create index if not exists agent_referrals_agent_id_idx on public.agent_referrals(agent_id);
create index if not exists agent_referrals_email_idx on public.agent_referrals(lower(invited_email));

alter table public.agent_referrals enable row level security;

drop policy if exists "agent_referrals self read" on public.agent_referrals;
create policy "agent_referrals self read" on public.agent_referrals for select
  using (agent_id = auth.uid() or public.is_admin());

drop policy if exists "agent_referrals self insert" on public.agent_referrals;
create policy "agent_referrals self insert" on public.agent_referrals for insert
  with check (agent_id = auth.uid() or public.is_admin());

drop policy if exists "agent_referrals admin write" on public.agent_referrals;
create policy "agent_referrals admin write" on public.agent_referrals for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "agent_referrals admin delete" on public.agent_referrals;
create policy "agent_referrals admin delete" on public.agent_referrals for delete
  using (public.is_admin());

-- Trigger: cuando una CC nueva se registra (INSERT o UPDATE de rol='creator'),
-- si su correo coincide con un referral 'invited', márcalo 'registered' y
-- vincula creator_id. Cuando pasa a pagada (payment_status='paid'), 'paid'.
create or replace function public.sync_agent_referral()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'creator' and new.email is not null then
    update public.agent_referrals
       set status = 'registered', creator_id = new.id,
           registered_at = coalesce(registered_at, now())
     where status = 'invited' and creator_id is null
       and lower(invited_email) = lower(new.email);
  end if;
  if new.role = 'creator' and new.payment_status = 'paid' then
    update public.agent_referrals
       set status = 'paid', creator_id = new.id,
           paid_at = coalesce(paid_at, now())
     where lower(invited_email) = lower(coalesce(new.email, ''))
       and status in ('invited','registered');
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_agent_referral on public.profiles;
create trigger trg_sync_agent_referral after insert or update on public.profiles
  for each row execute function public.sync_agent_referral();
