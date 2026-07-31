-- ─────────────────────────────────────────────────────────────────────────
-- DEMO SEED (run manually, e.g. via Supabase SQL editor / MCP execute_sql).
-- Not a migration — this inserts DATA, and is idempotent (safe to re-run).
--
-- Creates clienta@letshoot.ai (password LetShoot!clienta): a fully PAID +
-- CONTENT-DELIVERED creator so the owner can experience the post-payment
-- account from /owner. Delivered content uses bundled /public + /lib images
-- (storage_path starting with '/' renders directly — no signed URL needed),
-- with per-photo purpose (set by "the team") and sales/reach/interactions so
-- the delivery + performance-tracking experience is visible.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  uid uuid;
  admin_id uuid := '23ddbb4e-5244-4f26-922a-c55ad7240439'; -- admin@letshoot.ai (uploaded_by)
  f_julio uuid; f_ppv uuid; f_cumple uuid; f_videos uuid;
begin
  select id into uid from auth.users where email = 'clienta@letshoot.ai';
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'clienta@letshoot.ai', extensions.crypt('LetShoot!clienta', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Valentina Ríos"}'::jsonb,
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'clienta@letshoot.ai', 'email_verified', true),
      'email', now(), now(), now());
  end if;

  update public.profiles set
    full_name='Valentina Ríos', stage_name='Valentina', role='creator',
    onboarding_status='active', payment_status='paid', lora_status='ready',
    country='US', plan='pro'
  where id=uid;

  delete from public.assets where creator_id=uid;
  delete from public.folders where creator_id=uid;
  delete from public.notifications where user_id=uid;

  insert into public.folders (creator_id,name,kind) values (uid,'Entrega — Julio','photo') returning id into f_julio;
  insert into public.folders (creator_id,name,kind) values (uid,'PPV & Pedidos','photo') returning id into f_ppv;
  insert into public.folders (creator_id,name,kind) values (uid,'Cumpleaños VIP','photo') returning id into f_cumple;
  insert into public.folders (creator_id,name,kind) values (uid,'Videos','video') returning id into f_videos;

  insert into public.assets (creator_id,folder_id,type,storage_path,uploaded_by,deliver_date,title,purpose,sales_count,revenue,reach,interactions) values
    (uid,f_julio,'photo','/lib/julia-frontal-1.jpg',admin_id,'2026-07-05','Bienvenida','Foto de bienvenida para el mensaje fijado del perfil — engancha a nuevos suscriptores.',0,0,8400,540),
    (uid,f_julio,'photo','/lib/julia-risa-1.jpg',admin_id,'2026-07-05','Feed cálido','Post de feed para mostrar cercanía y subir interacción antes del PPV del fin de semana.',0,0,6100,470),
    (uid,f_julio,'photo','/lib/julia-medio-1.jpg',admin_id,'2026-07-12','Teaser PPV','Teaser para el chat: adelanto del set premium, invita a comprar el pack completo.',31,620.00,3900,280),
    (uid,f_julio,'photo','/lib/lujo-champana.jpg',admin_id,'2026-07-12','Lifestyle lujo','Contenido lifestyle premium — posiciona la marca alto y justifica precios de PPV.',18,540.00,4200,210),
    (uid,f_julio,'photo','/lib/lujo-hotel.jpg',admin_id,'2026-07-19','Suite hotel','Set de suite para pedido personalizado de una ballena; base para más customs.',12,720.00,1500,95),
    (uid,f_julio,'photo','/lib/resort-cabana.jpg',admin_id,'2026-07-19','Resort','Serie de resort para campaña de verano — buen gancho para reactivar caducados.',24,480.00,5300,360);

  insert into public.assets (creator_id,folder_id,type,storage_path,uploaded_by,deliver_date,title,purpose,sales_count,revenue,reach,interactions) values
    (uid,f_ppv,'photo','/lib/julia-bikini-7.jpg',admin_id,'2026-07-08','PPV Bikini 1','Pack PPV principal del mes — enviar en masa a la lista con precio escalonado.',42,890.00,5200,310),
    (uid,f_ppv,'photo','/lib/julia-bikini-8.jpg',admin_id,'2026-07-08','PPV Bikini 2','Segunda foto del pack PPV; sube el valor percibido del set.',38,760.00,4800,265),
    (uid,f_ppv,'photo','/lib/julia-bikini-3.jpg',admin_id,'2026-07-22','Pedido custom','Pedido personalizado para suscriptor VIP — cobrar como custom premium.',9,540.00,900,120),
    (uid,f_ppv,'photo','/lib/bar-vino.jpg',admin_id,'2026-07-22','Cita nocturna','Ambiente de cita para storytelling en el chat; convierte muy bien en DM.',27,405.00,3100,240);

  insert into public.assets (creator_id,folder_id,type,storage_path,uploaded_by,deliver_date,title,purpose,sales_count,revenue,reach,interactions) values
    (uid,f_cumple,'photo','/lib/julia-bikini-9.jpg',admin_id,'2026-07-26','Campaña cumple 1','Campaña de cumpleaños — foto principal del bundle especial para ballenas.',55,1650.00,6900,520),
    (uid,f_cumple,'photo','/lib/lujo-joyas.jpg',admin_id,'2026-07-26','Campaña cumple 2','Detalle premium del bundle de cumpleaños; refuerza el ticket alto.',33,990.00,2600,180),
    (uid,f_cumple,'photo','/lib/resort-atardecer.jpg',admin_id,'2026-07-28','Cierre de mes','Foto de cierre de mes para reactivar caducados con oferta relámpago.',21,420.00,4100,300);

  insert into public.assets (creator_id,folder_id,type,storage_path,uploaded_by,deliver_date,title,purpose,sales_count,revenue,reach,interactions) values
    (uid,f_videos,'video','/hero-miami.mp4',admin_id,'2026-07-15','Video teaser','Video vertical para reels/teaser en el muro — trae tráfico nuevo al perfil.',0,0,12500,860);

  insert into public.notifications (user_id,kind,meta,read,created_at) values
    (uid,'approved','{}'::jsonb,true, now() - interval '24 days'),
    (uid,'delivery','{"folder":"Entrega — Julio"}'::jsonb,false, now() - interval '5 days'),
    (uid,'delivery','{"folder":"Cumpleaños VIP"}'::jsonb,false, now() - interval '2 days'),
    (uid,'feedback_resolved','{}'::jsonb,true, now() - interval '3 days');
end $$;
