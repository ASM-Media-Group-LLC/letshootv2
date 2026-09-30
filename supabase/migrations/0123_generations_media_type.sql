-- Video en /kitchen (Genjutsu): distinguir generaciones de VIDEO de las de foto.
-- Los jobs de video usan model='genjutsu' + media_type='video'; el resultado se entrega como
-- creator_vault kind='ia' media_type='video' (video re-hospedado en nuestro storage).
alter table public.generations
  add column if not exists media_type text not null default 'image';
