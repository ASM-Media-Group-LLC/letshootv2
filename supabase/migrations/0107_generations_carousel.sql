-- Carrusel de /kitchen: la réplica de una viral (foto raíz) + sus variaciones
-- (mismo lugar y outfit, otras poses). Las variaciones apuntan a la raíz con carousel_of.
alter table generations
  add column if not exists carousel_of uuid references generations(id) on delete set null;
create index if not exists idx_generations_carousel_of on generations(carousel_of);
