-- Cuentas guía (creadoras de referencia de Instagram) por modelo, para scrapear sus posts.
alter table creator_search_profile add column if not exists seed_accounts text[] not null default '{}';
