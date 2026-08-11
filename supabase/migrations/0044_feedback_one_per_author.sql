-- Evita reacciones duplicadas del mismo autor sobre la misma pieza (la modelo
-- que cambia de opinión, o la agencia que da "me encantó" dos veces inflaban el
-- contador). Una reacción por (pieza, autor); modelo y agencia pueden tener cada
-- una la suya. NULLs de author_id quedan distintos (no bloquean).
delete from public.feedback f using public.feedback g
 where f.asset_id = g.asset_id and f.author_id = g.author_id and f.author_id is not null
   and f.created_at < g.created_at;
create unique index if not exists feedback_one_per_author
  on public.feedback (asset_id, author_id);
