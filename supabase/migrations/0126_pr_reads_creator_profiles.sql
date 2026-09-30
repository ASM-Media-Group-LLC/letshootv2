-- PR (role 'supervisor') ve TODAS las modelos también en la tabla profiles.
-- Antes solo admin / cada uno lo suyo / agencias sus modelos podían leer perfiles de creadoras: la PR veía las modelos
-- vía team_creators() (38) pero cualquier pantalla que leyera el perfil directo (p. ej. el correo de la modelo para
-- mandarle la propuesta, o la lista de creadoras) le devolvía 0. Ver [[roles-system]].
-- can_see_creator() decide A QUIÉN: hoy PR ve todas (decisión del dueño); si mañana se acota a sus asignadas, esta
-- política lo sigue sola. Solo filas de CREADORAS (no ve al resto del equipo). current_role/can_see_creator son
-- SECURITY DEFINER → sin recursión de RLS sobre profiles.
drop policy if exists "profiles staff read creators" on public.profiles;
create policy "profiles staff read creators" on public.profiles
  for select to authenticated
  using (role = 'creator' and public."current_role"() = 'supervisor' and public.can_see_creator(id));
