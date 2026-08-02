-- ─────────────────────────────────────────────────────────────────────────
-- Granular staff functions (owner: "bien desmenuzada cada función"):
--   kyc      → Verificar IDs
--   content  → Subir entregas
--   requests → Atender pedidos (tomar / marcar entregado)
--   feedback → Responder feedback
--   metrics  → Ver métricas
--   team     → Gestionar equipo (crear puestos Equipo + asignar funciones)
-- 'team' now WORKS outside the admin: a staff member with it can manage the
-- functions of other Equipo members (never admins) via this RPC, and can
-- create Equipo accounts via the create-user edge function (v3).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.set_staff_functions(target uuid, caps text[])
returns void language plpgsql security definer set search_path = public as $$
declare tr public.user_role;
begin
  if not (public.is_admin() or public.has_cap('team')) then
    raise exception 'No tienes permiso para gestionar el equipo.';
  end if;
  select role into tr from public.profiles where id = target;
  if tr is null then raise exception 'Usuario no encontrado.'; end if;
  -- Only internal Equipo positions can be managed; admins are untouchable here.
  if tr not in ('supervisor','producer','chatter') then
    raise exception 'Solo puestos del equipo interno.';
  end if;
  -- Whitelist the functions.
  if exists (
    select 1 from unnest(caps) c
    where c not in ('kyc','content','requests','feedback','metrics','team')
  ) then
    raise exception 'Función inválida.';
  end if;
  update public.profiles set capabilities = caps where id = target;
end; $$;
revoke execute on function public.set_staff_functions(uuid, text[]) from anon, public;
grant execute on function public.set_staff_functions(uuid, text[]) to authenticated;

-- Remap existing demo staff to the 6-function model.
update public.profiles set capabilities = '{kyc,content,requests,feedback,metrics,team}' where email = 'manager@letshoot.ai';
update public.profiles set capabilities = '{content,requests,feedback}' where email = 'fotos@letshoot.ai';
update public.profiles set capabilities = '{content,requests}' where email = 'chatter@letshoot.ai';
update public.profiles set capabilities = '{kyc}' where email = 'ids@letshoot.ai';
