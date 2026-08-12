-- Re-crea las 4 cuentas DEMO que usa /owner para previsualizar cada experiencia.
-- Se borraron en la limpieza de "data de mentira"; esto las restaura con las mismas
-- contraseñas que están hardcodeadas en app/owner/page.jsx.
-- Córrelo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotente: si una cuenta ya existe, la salta. Puedes correrlo varias veces sin miedo.

do $$
declare
  demo record;
  uid uuid;
begin
  for demo in
    select * from (values
      ('creadora@letshoot.ai', 'LetShoot!creadora', 'Creadora Demo',  'creator',    null::jsonb),
      ('clienta@letshoot.ai',  'LetShoot!clienta',  'Clienta Demo',   'creator',    null::jsonb),
      ('agencia@letshoot.ai',  'LetShoot!agencia',  'Agencia Demo',   'agency',     null::jsonb),
      ('equipo@letshoot.ai',   'LetShoot!equipo',   'Equipo Demo',    'supervisor', '["datos","kyc","add_creators","content","requests","feedback","metrics","billing","agencies","team"]'::jsonb)
    ) as t(email, pw, full_name, role, caps)
  loop
    if not exists (select 1 from auth.users where email = demo.email) then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        demo.email, crypt(demo.pw, gen_salt('bf')), now(),
        now(), now(), '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', demo.full_name),
        '', '', '', ''
      );
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (demo.email, uid,
        jsonb_build_object('sub', uid::text, 'email', demo.email, 'email_verified', true),
        'email', now(), now(), now());
      -- El trigger handle_new_user ya creó el profile (role 'creator'); ajustamos rol/estado.
      update public.profiles
         set role = demo.role,
             full_name = demo.full_name,
             onboarding_status = 'active',
             capabilities = coalesce(demo.caps, capabilities),
             payment_status = case when demo.email = 'clienta@letshoot.ai' then 'paid' else payment_status end,
             plan = case when demo.email = 'clienta@letshoot.ai' then 'core' else plan end
       where id = uid;
    end if;
  end loop;
end $$;

-- Verificación:
select u.email, p.role, p.onboarding_status
from auth.users u join public.profiles p on p.id = u.id
where u.email like '%@letshoot.ai'
order by u.email;
