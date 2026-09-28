-- Metadata rica de cada foto/video scrapeado: comentarios + score (para explicar "por qué es la mejor")
-- + meta jsonb con lo que trae el scraper (para la "i" en la tarjeta).
alter table public.creator_vault
  add column if not exists comments int,
  add column if not exists score numeric,
  add column if not exists meta jsonb;
