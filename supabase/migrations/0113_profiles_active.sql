-- Interruptor reversible para "sacar del equipo" sin borrar la fila (preserva ventas/registros).
alter table public.profiles add column if not exists active boolean not null default true;
comment on column public.profiles.active is 'false = archivado (sacado del equipo, reversible). No borra la fila.';
