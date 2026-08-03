-- ─────────────────────────────────────────────────────────────────────────
-- Creator feedback must REACH the team. When a creator leaves feedback on a
-- delivered asset ("love it" / "request a change"), notify every admin + staff
-- with the 'feedback' capability — drives the /trabajo live pop-up + dashboard.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['delivery','approved','rejected','feedback_resolved','generic','request','feedback']));

create or replace function public.notify_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
declare a_title text; c_name text;
begin
  select coalesce(nullif(title, ''), 'una foto') into a_title from public.assets where id = NEW.asset_id;
  select coalesce(nullif(stage_name, ''), full_name) into c_name from public.profiles where id = NEW.creator_id;
  insert into public.notifications (user_id, kind, meta)
  select p.id, 'feedback', jsonb_build_object('feedback_kind', NEW.kind, 'asset', a_title, 'creator', c_name, 'message', NEW.message)
  from public.profiles p
  where p.role = 'admin'
     or (p.role in ('supervisor','producer','chatter') and 'feedback' = any(p.capabilities) and coalesce(p.staff_status,'approved') <> 'pending');
  return NEW;
end; $$;

drop trigger if exists trg_notify_feedback on public.feedback;
create trigger trg_notify_feedback after insert on public.feedback for each row execute function public.notify_feedback();
