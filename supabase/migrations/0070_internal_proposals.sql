-- Propuestas INTERNAS: un empleado arma una propuesta y se la manda a otro
-- interno (ej. el dueño) para revisión/aprobación. El revisor va logueado
-- (sabemos quién es). Una vez aprobada internamente, desde /admin sale a la
-- creadora. El feedback queda en DOS buckets separados (equipo vs creadora)
-- para que no se mezclen.
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)

-- Revisor interno asignado + quién decidió realmente (logueado).
alter table public.photo_proposals
  add column if not exists internal_reviewer_id   uuid references public.profiles(id),
  add column if not exists internal_reviewer_name text,
  add column if not exists approval_reviewer_name text;

-- Feedback: separar interno (equipo) del de la creadora.
alter table public.photo_proposal_feedback
  add column if not exists reviewer_kind text not null default 'creator'; -- 'creator' | 'internal'

-- save_proposal_feedback acepta el bucket (p_kind) y NO pisa entre buckets:
-- la clave de upsert ahora incluye reviewer_kind, así el feedback del equipo y
-- el de la creadora conviven en filas distintas.
drop function if exists public.save_proposal_feedback(text, uuid, jsonb, text);
create or replace function public.save_proposal_feedback(
  p_link text, p_reg uuid, p_items jsonb, p_name text default null, p_kind text default 'creator'
) returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
begin
  select id into pid from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;
  select id into existing from public.photo_proposal_feedback
    where proposal_id = pid and registration_id is not distinct from p_reg
      and reviewer_kind = kind limit 1;
  if existing is null then
    insert into public.photo_proposal_feedback (proposal_id, registration_id, recipient_name, items, reviewer_kind)
      values (pid, p_reg, p_name, coalesce(p_items,'[]'::jsonb), kind);
  else
    update public.photo_proposal_feedback
      set items = coalesce(p_items,'[]'::jsonb), recipient_name = coalesce(p_name, recipient_name), updated_at = now()
      where id = existing;
  end if;
end; $$;
grant execute on function public.save_proposal_feedback(text, uuid, jsonb, text, text) to anon, authenticated;
