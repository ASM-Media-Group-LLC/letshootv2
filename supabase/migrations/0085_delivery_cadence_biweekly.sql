-- Agrega 'biweekly' (quincenal, cada 2 semanas) a las cadencias permitidas.
alter table public.profiles drop constraint if exists profiles_delivery_cadence_check;
alter table public.profiles add constraint profiles_delivery_cadence_check
  check (delivery_cadence = any (array['daily'::text, 'thrice_week'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text]));
