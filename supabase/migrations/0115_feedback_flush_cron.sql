-- Cron cada 5 min que dispara el resumen de reacciones (edge feedback-flush).
-- Autenticado con anon key (verify_jwt) + x-run-secret desde app_config (no embebido).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('feedback-flush-5min')
  where exists (select 1 from cron.job where jobname = 'feedback-flush-5min');

select cron.schedule(
  'feedback-flush-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://grbvkwolcjcqxfsiytox.supabase.co/functions/v1/feedback-flush',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYnZrd29sY2pjcXhmc2l5dG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODI0MDUsImV4cCI6MjA5OTU1ODQwNX0.qhXrG3xphBlusYy2_MFFAuzskgglUlxL_p9XTDBURKc',
      'x-run-secret', (select value from public.app_config where key = 'reminder_run_secret')
    ),
    body := jsonb_build_object('action', 'run')
  );
  $$
);
