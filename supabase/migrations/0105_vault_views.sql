-- Views (videos/reels) en el baúl + estilo por generación.
alter table creator_vault add column if not exists views bigint;
alter table generations add column if not exists style_id text;
