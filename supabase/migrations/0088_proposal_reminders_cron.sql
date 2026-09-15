-- Cron diario que dispara los recordatorios de propuestas (edge function
-- proposal-reminders, action 'run'). Autenticado con la anon key (verify_jwt) +
-- el x-run-secret que vive en app_config (no embebido). Corre 15:00 UTC.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprograma de forma idempotente.
select cron.unschedule('proposal-reminders-daily')
  where exists (select 1 from cron.job where jobname = 'proposal-reminders-daily');

select cron.schedule(
  'proposal-reminders-daily',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://grbvkwolcjcqxfsiytox.supabase.co/functions/v1/proposal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYnZrd29sY2pjcXhmc2l5dG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODI0MDUsImV4cCI6MjA5OTU1ODQwNX0.qhXrG3xphBlusYy2_MFFAuzskgglUlxL_p9XTDBURKc',
      'x-run-secret', (select value from public.app_config where key = 'reminder_run_secret')
    ),
    body := jsonb_build_object('action', 'run')
  );
  $$
);
