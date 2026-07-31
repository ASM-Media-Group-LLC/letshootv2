-- ─────────────────────────────────────────────────────────────────────────
-- DEMO SEED — agency/manager account (run manually, idempotent).
-- agencia@letshoot.ai / LetShoot!agencia — "Élite Management", role agency.
-- Manages two models so /owner shows the full agency environment:
--   · Valentina (clienta@letshoot.ai) — active + paid, content delivered
--   · Sofía   (modelo2@letshoot.ai)  — still onboarding, no content yet
--     (shows "cómo entran las modelos")
-- The reset-able onboarding test account (creadora@) is intentionally NOT
-- linked so its data is left untouched.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  aid uuid; clienta uuid; sofia uuid; creadora uuid;
begin
  -- Agency account.
  select id into aid from auth.users where email = 'agencia@letshoot.ai';
  if aid is null then
    aid := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change)
    values ('00000000-0000-0000-0000-000000000000',aid,'authenticated','authenticated','agencia@letshoot.ai',
      extensions.crypt('LetShoot!agencia', extensions.gen_salt('bf')), now(),now(),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Élite Management"}'::jsonb,'','','','');
    insert into auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at,last_sign_in_at)
    values (gen_random_uuid(),aid,aid::text,jsonb_build_object('sub',aid::text,'email','agencia@letshoot.ai','email_verified',true),'email',now(),now(),now());
  end if;
  update public.profiles set full_name='Élite Management', role='agency', onboarding_status='active' where id=aid;

  -- Second model, still onboarding (no delivered content).
  select id into sofia from auth.users where email='modelo2@letshoot.ai';
  if sofia is null then
    sofia := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change)
    values ('00000000-0000-0000-0000-000000000000',sofia,'authenticated','authenticated','modelo2@letshoot.ai',
      extensions.crypt('LetShoot!modelo2', extensions.gen_salt('bf')), now(),now(),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Sofía Mendez"}'::jsonb,'','','','');
    insert into auth.identities (id,user_id,provider_id,identity_data,provider,created_at,updated_at,last_sign_in_at)
    values (gen_random_uuid(),sofia,sofia::text,jsonb_build_object('sub',sofia::text,'email','modelo2@letshoot.ai','email_verified',true),'email',now(),now(),now());
  end if;
  update public.profiles set full_name='Sofía Mendez', stage_name='Sofía', role='creator',
    onboarding_status='id_pending', payment_status='unpaid', lora_status='pending' where id=sofia;

  select id into clienta from public.profiles where email='clienta@letshoot.ai';
  select id into creadora from public.profiles where email='creadora@letshoot.ai';

  -- Mapping: agency manages Valentina + Sofía (never the reset-able creadora).
  delete from public.agency_creators where agency_id=aid;
  if clienta is not null then insert into public.agency_creators (agency_id,creator_id) values (aid,clienta) on conflict do nothing; end if;
  insert into public.agency_creators (agency_id,creator_id) values (aid,sofia) on conflict do nothing;
  if creadora is not null then delete from public.agency_creators where agency_id=aid and creator_id=creadora; end if;

  -- Demo content requests made by the agency for its paid model.
  if clienta is not null then
    delete from public.requests where chatter_id=aid;
    insert into public.requests (creator_id, chatter_id, title, description, status, due_date) values
      (clienta, aid, 'Set de lencería para PPV de agosto', 'Necesitamos 6 fotos estilo boudoir para el PPV de bienvenida del mes.', 'pending', current_date + 6),
      (clienta, aid, 'Custom para ballena VIP', 'Pedido personalizado: bata de seda, ambiente hotel. Cliente top.', 'in_progress', current_date + 2),
      (clienta, aid, 'Campaña de cumpleaños', 'Bundle de cumpleaños entregado y vendiendo muy bien.', 'delivered', current_date - 3);
  end if;
end $$;
