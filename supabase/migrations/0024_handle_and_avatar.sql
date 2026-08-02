-- ─────────────────────────────────────────────────────────────────────────
-- Profile identity: @handle (arroba) + avatar photo.
-- Owner: "que se ponga el arroba y que pueda poner foto, y si pone foto que me
-- salga la pinche foto" — lists show the real photo (or initials fallback) + @.
-- Avatars live in a PUBLIC bucket (low-sensitivity headshot the user picks;
-- the sensitive KYC/delivery content stays private + signed). avatar_url stores
-- the full public URL so every consumer just renders <img src>.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists avatar_url text;

-- One @handle per person, case-insensitive.
create unique index if not exists profiles_handle_lower_uidx
  on public.profiles (lower(handle)) where handle is not null;

-- Public avatars bucket.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Anyone can read (public bucket); a user manages only their own folder {uid}/…
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- team_creators now carries handle + avatar_url + stage_name for rich lists.
drop function if exists public.team_creators();
create or replace function public.team_creators()
returns table (id uuid, full_name text, handle text, avatar_url text,
               onboarding_status text, lora_status text)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.stage_name, ''), p.full_name) as full_name,
         p.handle, p.avatar_url, p.onboarding_status, p.lora_status
  from public.profiles p
  where p.role = 'creator'
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_creators() from anon, public;
grant execute on function public.team_creators() to authenticated;

-- team_staff carries avatar_url too (equipo interno list shows faces).
drop function if exists public.team_staff();
create or replace function public.team_staff()
returns table (id uuid, full_name text, handle text, avatar_url text,
               role public.user_role, capabilities text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.handle, p.avatar_url, p.role, p.capabilities
  from public.profiles p
  where p.role in ('admin','supervisor','producer','chatter')
    and public.current_role() in ('admin','supervisor','producer','chatter');
$$;
revoke execute on function public.team_staff() from anon, public;
grant execute on function public.team_staff() to authenticated;

-- Seed demo handles (clean, dot style). Bianca is THE example with a real
-- photo; the rest use the initials fallback so the mix is visible in lists.
update public.profiles set handle = 'valentina.rios',  avatar_url = null                where email = 'clienta@letshoot.ai';
update public.profiles set handle = 'bianca.rios',     avatar_url = '/model-latina.jpg' where email = 'datos@letshoot.ai';
update public.profiles set handle = 'sofia.mendez',    avatar_url = null                where email = 'modelo2@letshoot.ai';
update public.profiles set handle = 'carla.gomez',     avatar_url = null                where email = 'revision@letshoot.ai';
update public.profiles set handle = 'daniela.cruz'   where email = 'rechazada@letshoot.ai';
update public.profiles set handle = 'elena.vargas'   where email = 'aprobada@letshoot.ai';
update public.profiles set handle = 'ana.torres'     where email = 'registrada@letshoot.ai';
update public.profiles set handle = 'creadora.prueba' where email = 'creadora@letshoot.ai';
