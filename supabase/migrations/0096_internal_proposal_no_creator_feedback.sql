-- PROPUESTA INTERNA (equipo) = SOLO revisión del equipo. El link interno nunca
-- guarda "respuesta de creadora": si alguien lo abre y responde, su feedback cae
-- al bucket 'internal' (no 'creator') y NO llena la cuenta. Las respuestas reales
-- de la creadora cuentan cuando la propuesta se le ENVÍA a ella (kind activo/nueva).
-- Antes: un borrador interno podía recibir una "respuesta de creadora" y mandaba
-- el correo "respondió", mezclando el borrador con un envío real. Ver caso Julieta.
-- (El aviso proposal-notify también corta si la propuesta es interna — edge fn.)

create or replace function public.save_proposal_feedback(
  p_link text, p_reg uuid, p_items jsonb, p_name text default null, p_kind text default 'creator'
) returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  prop_looks jsonb; prop_audios jsonb; prop_user uuid; prop_name text;
  prop_title text; prop_addedby text; fid uuid; prop_kind text;
  it jsonb; iid text; ist text; inote text; ikind text; ilabel text; isrc text;
begin
  select id, looks, audios, recipient_user_id, recipient_name,
         coalesce(nullif(name,''),'Contenido para tus redes'), coalesce(nullif(created_by_name,''),'LetShoot'),
         delivery_folder_id, recipient_kind
    into pid, prop_looks, prop_audios, prop_user, prop_name, prop_title, prop_addedby, fid, prop_kind
    from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;

  -- Propuesta INTERNA (borrador de equipo): TODO feedback va al bucket 'internal'.
  -- Nunca guarda 'creator' ni llena la cuenta — el link es solo revisión del equipo.
  if prop_kind = 'internal' then kind := 'internal'; end if;

  -- guardar/actualizar el feedback (bucket creador vs equipo)
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

  -- solo el feedback de la CREADORA llena la cuenta
  if kind <> 'creator' then return; end if;

  -- asegurar la carpeta de entrega de esta propuesta (si tiene cuenta)
  if prop_user is not null and fid is null then
    select f.id into fid from public.folders f
      where f.creator_id = prop_user and f.name = prop_title and f.kind = 'photo'
      order by f.created_at limit 1;
    if fid is null then
      insert into public.folders (creator_id, name, kind)
        values (prop_user, prop_title, 'photo') returning id into fid;
    end if;
    update public.photo_proposals set delivery_folder_id = fid where id = pid;
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    iid := it->>'id'; ist := it->>'status'; inote := coalesce(it->>'note','');
    ikind := null; ilabel := null; isrc := null;
    if iid is null or ist is null or ist not in ('liked','rejected') then continue; end if;
    select 'photo', coalesce(l->>'caption',''), l->>'result' into ikind, ilabel, isrc
      from jsonb_array_elements(coalesce(prop_looks,'[]'::jsonb)) l where l->>'id' = iid limit 1;
    if ikind is null then
      select 'audio', coalesce(a->>'label',''), a->>'src' into ikind, ilabel, isrc
        from jsonb_array_elements(coalesce(prop_audios,'[]'::jsonb)) a where a->>'id' = iid limit 1;
    end if;
    if ikind is null then continue; end if;

    insert into public.proposal_content (proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, note)
      values (pid, prop_user, prop_name, iid, ikind, ilabel, isrc,
              case when ist='liked' then 'approved' else 'rejected' end, inote)
    on conflict (proposal_id, item_id) do update
      set decision = excluded.decision, label = excluded.label, src = excluded.src,
          note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;

    if prop_user is not null and ikind = 'photo' and isrc is not null and isrc like 'http%' and fid is not null then
      if ist = 'liked' then
        if not exists (select 1 from public.assets a
                       where a.creator_id = prop_user and a.storage_path = isrc) then
          insert into public.assets (creator_id, folder_id, type, storage_path, deliver_date, added_by)
            values (prop_user, fid, 'photo', isrc, current_date, prop_addedby);
        end if;
        update public.proposal_content
           set prod_state = 'delivered', delivered_at = now()
         where proposal_id = pid and item_id = iid;
      else
        delete from public.assets
         where creator_id = prop_user and folder_id = fid and storage_path = isrc;
      end if;
    end if;
  end loop;
end; $$;
grant execute on function public.save_proposal_feedback(text, uuid, jsonb, text, text) to anon, authenticated;
