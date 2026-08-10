// Edge function: reset-password — el admin (o un jefe de equipo) le pone una
// contraseña temporal nueva a una cuenta. Corre con el service role.
// Reglas:
//  · admin (dueño) puede resetear a cualquiera.
//  · supervisor con capacidad 'team' puede resetear a NO-admins.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });

    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesion invalida.' });
    const { data: prof } = await caller.from('profiles').select('role, capabilities').eq('id', user.id).single();

    const isAdmin = prof?.role === 'admin';
    const hasTeam = prof?.role === 'supervisor' && Array.isArray(prof?.capabilities) && prof.capabilities.includes('team');
    if (!isAdmin && !hasTeam) return reply({ ok: false, error: 'No tienes permiso para resetear contrasenas.' });

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || '').trim();
    const password = String(body.password || '');
    if (!user_id || !password) return reply({ ok: false, error: 'Falta la cuenta o la contrasena.' });
    if (password.length < 8) return reply({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    // A team manager cannot reset an admin/owner.
    const { data: target } = await svc.from('profiles').select('role').eq('id', user_id).single();
    if (!target) return reply({ ok: false, error: 'Cuenta no encontrada.' });
    if (target.role === 'admin' && !isAdmin) return reply({ ok: false, error: 'Solo el dueno puede resetear a un admin.' });

    const { error } = await svc.auth.admin.updateUserById(user_id, { password });
    if (error) return reply({ ok: false, error: error.message });
    return reply({ ok: true });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
