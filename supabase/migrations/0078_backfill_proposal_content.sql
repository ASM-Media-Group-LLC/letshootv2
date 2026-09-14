-- Backfill: las creadoras que aprobaron/rechazaron ítems ANTES de que existiera
-- el puente aprobado→cuenta (save_proposal_feedback escribiendo proposal_content)
-- quedaron sin nada en la cuenta/almacén. Rellenamos proposal_content replicando
-- la misma lógica del puente. Idempotente (on conflict). Aplicado el 2026-09-14.
insert into public.proposal_content (proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, note)
select pp.id, pp.recipient_user_id, pp.recipient_name,
       it->>'id',
       coalesce(ph.kind, au.kind),
       coalesce(ph.label, au.label),
       coalesce(ph.src, au.src),
       case when it->>'status'='liked' then 'approved' else 'rejected' end,
       coalesce(it->>'note','')
from public.photo_proposal_feedback f
join public.photo_proposals pp on pp.id = f.proposal_id
cross join lateral jsonb_array_elements(coalesce(f.items,'[]'::jsonb)) it
left join lateral (
   select 'photo'::text as kind, coalesce(l->>'caption','') as label, l->>'result' as src
   from jsonb_array_elements(coalesce(pp.looks,'[]'::jsonb)) l
   where l->>'id' = it->>'id' limit 1
) ph on true
left join lateral (
   select 'audio'::text as kind, coalesce(a->>'label','') as label, a->>'src' as src
   from jsonb_array_elements(coalesce(pp.audios,'[]'::jsonb)) a
   where a->>'id' = it->>'id' limit 1
) au on true
where f.reviewer_kind = 'creator'
  and (it->>'status') in ('liked','rejected')
  and (it->>'id') is not null
  and coalesce(ph.kind, au.kind) is not null
on conflict (proposal_id, item_id) do update
  set decision = excluded.decision, label = excluded.label, src = excluded.src,
      note = excluded.note, creator_user_id = excluded.creator_user_id, creator_name = excluded.creator_name;
