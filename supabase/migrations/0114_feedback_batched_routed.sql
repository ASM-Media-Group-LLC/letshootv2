-- Avisos de reacciones de la modelo: batched (resumen a los 5 min) y enrutados
-- por modelo (Editor/Manager/PR asignados via staff_assignments) + admin.
alter table public.feedback add column if not exists team_notified_at timestamptz;
alter table public.feedback add column if not exists updated_at timestamptz not null default now();

-- updated_at fresco en cada reaccion (insert o cambio de opinion por upsert) -> base del debounce por inactividad.
create or replace function public.touch_feedback_updated() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_touch_feedback_updated on public.feedback;
create trigger trg_touch_feedback_updated before insert or update on public.feedback
  for each row execute function public.touch_feedback_updated();

-- La edge feedback-flush pasa a ser duena de los avisos al equipo (resumen a los 5 min,
-- enrutado al Editor/Manager/PR de esa modelo + admin). Quitamos el broadcast instantaneo.
drop trigger if exists trg_notify_feedback on public.feedback;

-- Busqueda rapida de reacciones pendientes de avisar.
create index if not exists feedback_pending_notify_idx on public.feedback (creator_id) where team_notified_at is null;

-- No re-avisar el historial: marcamos todo lo viejo como ya notificado.
update public.feedback set team_notified_at = now() where team_notified_at is null;
