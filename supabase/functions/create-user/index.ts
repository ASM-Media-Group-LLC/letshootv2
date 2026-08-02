// Edge function: create-user (v4 — accepts job_title/puesto for Equipo)
// Creates accounts with the service role. Who can create what:
//  · admin → any role (admin, supervisor/Equipo, agency, creator) + capabilities
//  · staff with the 'team' capability → ONLY role 'supervisor' (Equipo) + capabilities
// Capabilities are the granular functions of an internal puesto.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const VALID_ROLES = ['admin', 'supervisor', 'chatter', 'producer', 'creator', 'agency'];
const VALID_CAPS = ['datos', 'kyc', 'content', 'requests', 'feedback', 'metrics', 'team'];

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
    if (!isAdmin && !hasTeam) return reply({ ok: false, error: 'No tienes permiso para crear usuarios.' });

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();
    const job_title = String(body.job_title || '').trim();
    const role = String(body.role || '');
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.filter((c: unknown) => typeof c === 'string' && VALID_CAPS.includes(c))
      : [];

    if (!email || !password || !role) return reply({ ok: false, error: 'Correo, contrasena y rol son obligatorios.' });
    if (password.length < 8) return reply({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' });
    if (!VALID_ROLES.includes(role)) return reply({ ok: false, error: 'Rol invalido.' });
    // A team manager (non-admin) can only create Equipo positions.
    if (!isAdmin && role !== 'supervisor') return reply({ ok: false, error: 'Solo puedes crear puestos de Equipo.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (error) return reply({ ok: false, error: error.message });

    const patch: Record<string, unknown> = { role, full_name, email };
    if (role !== 'creator') patch.onboarding_status = 'active';
    if (role === 'supervisor') { patch.capabilities = capabilities; if (job_title) patch.job_title = job_title; }
    const { error: upErr } = await svc.from('profiles').update(patch).eq('id', created.user.id);
    if (upErr) return reply({ ok: false, error: upErr.message });

    return reply({ ok: true, id: created.user.id });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
