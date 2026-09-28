-- Videos en el baúl: media_type distingue imagen/video; video_url guarda el video (en nuestro storage,
-- porque los links de Instagram vencen); duration opcional.
alter table public.creator_vault
  add column if not exists media_type text not null default 'image',
  add column if not exists video_url text,
  add column if not exists duration numeric;
create index if not exists creator_vault_media_idx on public.creator_vault (creator_id, media_type);
