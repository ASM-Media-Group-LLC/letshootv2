-- ENTREGA AUTOMÁTICA: cuando la creadora aprueba una foto en la propuesta, cae
-- SOLA a su cuenta (public.assets, carpeta por propuesta) — sin paso manual. Antes
-- el "me gusta" solo llegaba a la cola interna proposal_content y NADIE la movía a
-- la biblioteca (/panel). Ahora save_proposal_feedback también materializa:
--   liked  -> asegura un asset (foto) en su carpeta de la propuesta.
--   rechaza-> quita ese asset si lo había (idempotente: puede cambiar de opinión).
-- Solo fotos con URL de storage (http). base64/audio no se materializan acá.

-- 1) Carpeta de entrega por propuesta (se crea perezosamente).
alter table public.photo_proposals
  add column if not exists delivery_folder_id uuid references public.folders(id);

-- 2) RPC: feedback + puente a proposal_content + materialización a la cuenta.
drop function if exists public.save_proposal_feedback(text, uuid, jsonb, text, text);
create or replace function public.save_proposal_feedback(
  p_link text, p_reg uuid, p_items jsonb, p_name text default null, p_kind text default 'creator'
) returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  prop_looks jsonb; prop_audios jsonb; prop_user uuid; prop_name text;
  prop_title text; prop_addedby text; fid uuid;
  it jsonb; iid text; ist text; inote text; ikind text; ilabel text; isrc text;
begin
  select id, looks, audios, recipient_user_id, recipient_name,
         coalesce(nullif(name,''),'Contenido para tus redes'), coalesce(nullif(created_by_name,''),'LetShoot'),
         delivery_folder_id
    into pid, prop_looks, prop_audios, prop_user, prop_name, prop_title, prop_addedby, fid
    from public.photo_proposals
    where link_id = p_link and status = 'published'
      and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;

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

    -- cola interna (proposal_content): aprobado/rechazado
    insert into public.proposal_content (proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, note)
      values (pid, prop_user, prop_name, iid, ikind, ilabel, isrc,
              case when ist='liked' then 'approved' else 'rejected' end, inote)
    on conflict (proposal_id, item_id) do update
      set decision = excluded.decision, label = excluded.label, src = excluded.src,
          note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;

    -- MATERIALIZAR a la cuenta: solo fotos con URL de storage y creadora con cuenta
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
        -- cambió de opinión: quitar la foto de su carpeta de esta propuesta
        delete from public.assets
         where creator_id = prop_user and folder_id = fid and storage_path = isrc;
      end if;
    end if;
  end loop;
end; $$;
grant execute on function public.save_proposal_feedback(text, uuid, jsonb, text, text) to anon, authenticated;
