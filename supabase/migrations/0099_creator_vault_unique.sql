-- Evitar fotos repetidas en el baúl de una creadora (misma URL + mismo tipo).
-- Permite backfill desde propuestas pasadas y re-subidas sin duplicar. Ver
-- [[proposal-vault]].
create unique index if not exists creator_vault_unique_photo
  on public.creator_vault (creator_id, kind, url);
