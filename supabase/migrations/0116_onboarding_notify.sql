-- Nuevo kind para avisos de onboarding (datos/ID/LoRA).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'delivery','approved','rejected','feedback_resolved','generic','request','feedback','request_msg','agency_left',
    'agency_leave_requested','agency_leave_accepted','agency_leave_rejected','agency_leave_forced','onboarding'
  ]));

-- Trigger: empuja aviso cuando la modelo avanza en el onboarding (antes todo era "pull").
-- signup_info (datos), kyc (sube ID), lora (sube fotos del clon) -> edge notify-event.
create extension if not exists pg_net;
create or replace function public.emit_onboarding_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare ev text;
begin
  if new.onboarding_status = 'info' and old.onboarding_status = 'registered' then ev := 'signup_info';
  elsif new.onboarding_status = 'id_pending' and old.onboarding_status is distinct from 'id_pending' then ev := 'kyc';
  elsif new.lora_status = 'pending' and old.lora_status is distinct from 'pending' then ev := 'lora';
  else return new;
  end if;
  perform net.http_post(
    url := 'https://grbvkwolcjcqxfsiytox.supabase.co/functions/v1/notify-event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYnZrd29sY2pjcXhmc2l5dG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODI0MDUsImV4cCI6MjA5OTU1ODQwNX0.qhXrG3xphBlusYy2_MFFAuzskgglUlxL_p9XTDBURKc',
      'x-run-secret', (select value from public.app_config where key = 'reminder_run_secret')
    ),
    body := jsonb_build_object('event', ev, 'creator_id', new.id)
  );
  return new;
end $$;

drop trigger if exists trg_emit_onboarding_notify on public.profiles;
create trigger trg_emit_onboarding_notify after update on public.profiles
  for each row execute function public.emit_onboarding_notify();
