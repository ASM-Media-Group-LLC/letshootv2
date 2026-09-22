-- Curación de la mesa de virales + estilo por modelo (para el filtro IA).
alter table creator_vault add column if not exists interest text check (interest in ('interesada','descartada') or interest is null);
alter table creator_vault add column if not exists ai_ok boolean;
alter table creator_vault add column if not exists ai_reason text;
alter table creator_search_profile add column if not exists style_desc text;
