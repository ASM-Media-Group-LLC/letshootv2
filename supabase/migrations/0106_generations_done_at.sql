-- Marca de cuándo una generación terminó de cocinarse (para ordenar Resultados por
-- "recién salida arriba", no por cuándo se mandó a la cola). Ver /kitchen.
alter table generations add column if not exists done_at timestamptz;
update generations set done_at = created_at where status = 'done' and done_at is null;

create or replace function set_generation_done_at() returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.done_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_generation_done_at on generations;
create trigger trg_generation_done_at before update on generations
  for each row execute function set_generation_done_at();
