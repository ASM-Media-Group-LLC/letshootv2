-- Puente aprobado→cuenta: SOLO lo que le gustó a la creadora cae a
-- proposal_content (su cuenta). Lo rechazado NO se produce — queda únicamente
-- como feedback en photo_proposal_feedback ("cuánto no le gustó"). Si un ítem
-- que antes le gustó ahora lo rechaza, se retira de la cuenta.
CREATE OR REPLACE FUNCTION public.save_proposal_feedback(p_link text, p_reg uuid, p_items jsonb, p_name text DEFAULT NULL::text, p_kind text DEFAULT 'creator'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pid uuid; existing uuid; kind text := coalesce(nullif(p_kind,''),'creator');
  prop_looks jsonb; prop_audios jsonb; prop_user uuid; prop_name text;
  it jsonb; iid text; ist text; inote text; ikind text; ilabel text; isrc text;
begin
  select id, looks, audios, recipient_user_id, recipient_name
    into pid, prop_looks, prop_audios, prop_user, prop_name
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

  -- PUENTE a la cuenta (solo feedback de la creadora): SOLO lo que le gustó.
  if kind = 'creator' then
    for it in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
      iid := it->>'id'; ist := it->>'status'; inote := coalesce(it->>'note','');
      if iid is null or ist is null or ist not in ('liked','rejected') then continue; end if;
      -- lo rechazado NO cae a la cuenta; si antes le había gustado, se retira
      if ist = 'rejected' then
        delete from public.proposal_content where proposal_id = pid and item_id = iid;
        continue;
      end if;
      -- liked → a la cuenta (por producir)
      ikind := null; ilabel := null; isrc := null;
      select 'photo', coalesce(l->>'caption',''), l->>'result' into ikind, ilabel, isrc
        from jsonb_array_elements(coalesce(prop_looks,'[]'::jsonb)) l where l->>'id' = iid limit 1;
      if ikind is null then
        select 'audio', coalesce(a->>'label',''), a->>'src' into ikind, ilabel, isrc
          from jsonb_array_elements(coalesce(prop_audios,'[]'::jsonb)) a where a->>'id' = iid limit 1;
      end if;
      if ikind is null then continue; end if;
      insert into public.proposal_content (proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, note)
        values (pid, prop_user, prop_name, iid, ikind, ilabel, isrc, 'approved', inote)
      on conflict (proposal_id, item_id) do update
        set decision = 'approved', label = excluded.label, src = excluded.src,
            note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;
    end loop;
  end if;
end; $function$;
