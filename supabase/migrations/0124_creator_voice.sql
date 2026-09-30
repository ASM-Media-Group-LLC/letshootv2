-- Voz clonada (ElevenLabs) por modelo. Cada modelo = UNA voz fija (voice_id): siempre la misma voz,
-- mismos ajustes y mismo motor → la voz sale idéntica siempre. Se elige de las voces de la cuenta
-- de ElevenLabs o se clona desde un clip (edge function 'voice'). Ver [[letshoot-voice]].
create table if not exists public.creator_voice (
  creator_id   uuid primary key references public.profiles(id) on delete cascade,
  voice_id     text not null,
  voice_name   text,
  source       text not null default 'library' check (source in ('library', 'cloned')),
  preview_url  text,
  settings     jsonb,
  model_id     text,
  sample_paths jsonb,
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid()
);
alter table public.creator_voice enable row level security;
drop policy if exists creator_voice_staff on public.creator_voice;
create policy creator_voice_staff on public.creator_voice
  for all using (public.is_staff()) with check (public.is_staff());

-- Audio en la cocina: el guion va en generations.prompt; etiqueta/idioma/voz/caracteres en params.
alter table public.generations add column if not exists params jsonb;
-- 'note' ya existía en producción (agregada por fuera); se versiona acá.
alter table public.generations add column if not exists note text;

-- Clips de voz para clonar: PRIVADO (es la voz de una persona real). Solo el equipo sube/lee.
insert into storage.buckets (id, name, public)
values ('voice-samples', 'voice-samples', false)
on conflict (id) do nothing;

drop policy if exists "voice-samples staff read" on storage.objects;
create policy "voice-samples staff read" on storage.objects
  for select using (bucket_id = 'voice-samples' and public.is_staff());
drop policy if exists "voice-samples staff upload" on storage.objects;
create policy "voice-samples staff upload" on storage.objects
  for insert with check (bucket_id = 'voice-samples' and public.is_staff());
drop policy if exists "voice-samples staff delete" on storage.objects;
create policy "voice-samples staff delete" on storage.objects
  for delete using (bucket_id = 'voice-samples' and public.is_staff());
