-- Cadencia de entrega por creadora: cada cuánto se le debe entregar contenido.
-- daily | thrice_week | weekly | monthly | null (sin definir). Se setea desde la
-- ficha de la creadora en el admin; alimenta el aviso "debe entrega / atrasada".
-- (Aplicada en producción el 2026-09-14 vía MCP; se versiona acá para el repo.)
alter table public.profiles
  add column if not exists delivery_cadence text
  check (delivery_cadence in ('daily','thrice_week','weekly','monthly'));
