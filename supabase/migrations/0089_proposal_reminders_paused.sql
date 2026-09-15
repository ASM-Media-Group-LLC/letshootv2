-- Pausa manual de recordatorios + historial veraz.
-- · paused: el equipo puede PARAR los recordatorios de una propuesta a mano
--   (el cron los salta); se reanudan cuando quieran.
-- · El backlog que en 0087 se suprimió con count=3 pasa a count=0 + paused=true:
--   count ahora SIEMPRE significa "recordatorios realmente enviados" (historial),
--   y la supresión del backlog queda expresada como pausa (reversible a mano).
alter table public.proposal_reminders add column if not exists paused boolean not null default false;
update public.proposal_reminders set count = 0, paused = true, last_sent_at = null
  where count = 3 and paused = false;
