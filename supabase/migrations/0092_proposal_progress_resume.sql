-- Progreso PARCIAL (borrador) de la revisión: para RETOMAR donde quedó si cierra
-- a medias, y que el equipo vea "abrió · N/total". NO dispara el puente
-- aprobado→cuenta ni correos (eso es solo al TERMINAR, en save_proposal_feedback).
create table if not exists public.proposal_progress (
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  reviewer_kind text not null default 'creator',
  items jsonb not null default '[]'::jsonb,
  decided int not null default 0,
  liked int not null default 0,
  total int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (proposal_id, reviewer_kind)
);

alter table public.proposal_progress enable row level security;

drop policy if exists proposal_progress_staff_select on public.proposal_progress;
create policy proposal_progress_staff_select on public.proposal_progress
  for select using (public.is_staff());

-- Guardar/actualizar el borrador (lo llama el viewer con el link; sin sesión).
create or replace function public.save_proposal_progress(p_link text, p_items jsonb, p_kind text default 'creator')
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  pid uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  n_decided int; n_liked int; prop_total int;
begin
  select id into pid from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;

  select coalesce(jsonb_array_length(looks),0) + coalesce(jsonb_array_length(audios),0)
    into prop_total from public.photo_proposals where id = pid;

  select
    count(*) filter (where (it->>'status') in ('liked','rejected')),
    count(*) filter (where (it->>'status') = 'liked')
    into n_decided, n_liked
    from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) it;

  insert into public.proposal_progress (proposal_id, reviewer_kind, items, decided, liked, total, updated_at)
    values (pid, kind, coalesce(p_items,'[]'::jsonb), coalesce(n_decided,0), coalesce(n_liked,0), coalesce(prop_total,0), now())
  on conflict (proposal_id, reviewer_kind) do update
    set items = excluded.items, decided = excluded.decided, liked = excluded.liked,
        total = excluded.total, updated_at = now();
end; $function$;

grant execute on function public.save_proposal_progress(text, jsonb, text) to anon, authenticated;

-- Leer el borrador para RETOMAR (por el link; sin sesión).
create or replace function public.get_proposal_progress(p_link text, p_kind text default 'creator')
returns jsonb language sql security definer set search_path to 'public' as $function$
  select pp.items
  from public.photo_proposals p
  join public.proposal_progress pp
    on pp.proposal_id = p.id and pp.reviewer_kind = coalesce(nullif(p_kind,''),'creator')
  where p.link_id = p_link
  limit 1;
$function$;

grant execute on function public.get_proposal_progress(text, text) to anon, authenticated;
