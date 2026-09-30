-- Propuestas INTERNAS: la respuesta de la MODELO se entrega a su cuenta (como en cualquier propuesta).
-- Antes (mig 0096) save_proposal_feedback forzaba TODA respuesta de una propuesta interna a reviewer_kind='internal' y
-- cortaba ahí → cuando la modelo respondía por su link, lo que aprobaba NUNCA llegaba a su cuenta (130 fotos de 8 modelos
-- al 2026-09-29). Ver [[proposals-internal-trap]] y [[roles-system]].
-- Regla nueva (estricta, para no entregar una revisión del equipo): en una propuesta interna cuenta como de la modelo SOLO
-- si el visor manda 'creator' Y es ELLA: su cuenta (auth.uid), su nombre, o el correo de su cuenta en el registro.
-- Un revisor del equipo (logueado → 'internal'; sin loguear → firma con SU nombre) sigue siendo revisión interna.

-- 1) La entrega (carpeta + proposal_content + assets) en UNA función reusable (idéntica a la de 0096).
create or replace function public._deliver_feedback_items(p_pid uuid, p_items jsonb) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  prop_looks jsonb; prop_audios jsonb; prop_user uuid; prop_name text; prop_title text; prop_addedby text; fid uuid;
  it jsonb; iid text; ist text; inote text; ikind text; ilabel text; isrc text; n integer := 0;
begin
  select looks, audios, recipient_user_id, recipient_name,
         coalesce(nullif(name,''),'Contenido para tus redes'), coalesce(nullif(created_by_name,''),'LetShoot'), delivery_folder_id
    into prop_looks, prop_audios, prop_user, prop_name, prop_title, prop_addedby, fid
    from public.photo_proposals where id = p_pid;
  if not found then return 0; end if;

  if prop_user is not null and fid is null then
    select f.id into fid from public.folders f
      where f.creator_id = prop_user and f.name = prop_title and f.kind = 'photo'
      order by f.created_at limit 1;
    if fid is null then
      insert into public.folders (creator_id, name, kind) values (prop_user, prop_title, 'photo') returning id into fid;
    end if;
    update public.photo_proposals set delivery_folder_id = fid where id = p_pid;
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
      values (p_pid, prop_user, prop_name, iid, ikind, ilabel, isrc, case when ist='liked' then 'approved' else 'rejected' end, inote)
    on conflict (proposal_id, item_id) do update
      set decision = excluded.decision, label = excluded.label, src = excluded.src,
          note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;

    if prop_user is not null and ikind = 'photo' and isrc is not null and isrc like 'http%' and fid is not null then
      if ist = 'liked' then
        if not exists (select 1 from public.assets a where a.creator_id = prop_user and a.storage_path = isrc) then
          insert into public.assets (creator_id, folder_id, type, storage_path, deliver_date, added_by)
            values (prop_user, fid, 'photo', isrc, current_date, prop_addedby);
          n := n + 1;
        end if;
        update public.proposal_content set prod_state = 'delivered', delivered_at = now()
          where proposal_id = p_pid and item_id = iid;
      else
        delete from public.assets where creator_id = prop_user and folder_id = fid and storage_path = isrc;
      end if;
    end if;
  end loop;
  return n;
end; $$;
revoke all on function public._deliver_feedback_items(uuid, jsonb) from public, anon, authenticated;

-- 2) save_proposal_feedback con la regla nueva para propuestas internas.
create or replace function public.save_proposal_feedback(p_link text, p_reg uuid, p_items jsonb, p_name text default null, p_kind text default 'creator')
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  prop_user uuid; prop_name text; prop_kind text; reg_email text; user_email text; is_her boolean := false;
begin
  select id, recipient_user_id, recipient_name, recipient_kind into pid, prop_user, prop_name, prop_kind
    from public.photo_proposals
    where link_id = p_link and status = 'published' and (expires_at is null or expires_at > now()) limit 1;
  if pid is null then raise exception 'propuesta no disponible'; end if;

  if prop_kind = 'internal' then
    if kind = 'creator' then
      if p_reg is not null then select lower(trim(email)) into reg_email from public.photo_proposal_registrations where id = p_reg; end if;
      if prop_user is not null then select lower(trim(email)) into user_email from public.profiles where id = prop_user; end if;
      is_her := (prop_user is not null and auth.uid() = prop_user)
             or (nullif(lower(trim(coalesce(p_name,''))),'') is not null and lower(trim(p_name)) = lower(trim(coalesce(prop_name,''))))
             or (reg_email is not null and user_email is not null and reg_email = user_email);
    end if;
    kind := case when is_her then 'creator' else 'internal' end;
  end if;

  select id into existing from public.photo_proposal_feedback
    where proposal_id = pid and registration_id is not distinct from p_reg and reviewer_kind = kind limit 1;
  if existing is null then
    insert into public.photo_proposal_feedback (proposal_id, registration_id, recipient_name, items, reviewer_kind)
      values (pid, p_reg, p_name, coalesce(p_items,'[]'::jsonb), kind);
  else
    update public.photo_proposal_feedback
      set items = coalesce(p_items,'[]'::jsonb), recipient_name = coalesce(p_name, recipient_name), updated_at = now()
      where id = existing;
  end if;

  if kind <> 'creator' then return; end if;
  perform public._deliver_feedback_items(pid, p_items);
end; $function$;

-- 3) Destrabe (una vez, en silencio: sin correos ni avisos): las respuestas de la MODELO en propuestas internas
--    (firmadas con su nombre) pasan a ser 'creator' y se entregan a su cuenta.
do $$
declare r record;
begin
  for r in
    select f.id as fbid, f.proposal_id, f.items
      from public.photo_proposal_feedback f
      join public.photo_proposals p on p.id = f.proposal_id
     where p.status = 'published' and p.recipient_kind = 'internal' and f.reviewer_kind = 'internal'
       and lower(trim(coalesce(f.recipient_name,''))) = lower(trim(coalesce(p.recipient_name,''))) and coalesce(p.recipient_name,'') <> ''
       and not exists (select 1 from public.photo_proposal_feedback f2
                        where f2.proposal_id = f.proposal_id and f2.reviewer_kind = 'creator'
                          and f2.registration_id is not distinct from f.registration_id)
  loop
    update public.photo_proposal_feedback set reviewer_kind = 'creator' where id = r.fbid;
    perform public._deliver_feedback_items(r.proposal_id, r.items);
  end loop;
end $$;
