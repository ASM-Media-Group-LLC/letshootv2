// Edge function: create-user (v9 — invitation to set own password for ANY role with real email)
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
const APP = 'https://letshoot.ai';

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
    const emailProvided = String(body.email || '').trim() !== '';
    let email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();
    const job_title = String(body.job_title || '').trim();
    const role = String(body.role || '');
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.filter((c: unknown) => typeof c === 'string' && VALID_CAPS.includes(c))
      : [];

    if (!password || !role) return reply({ ok: false, error: 'Contrasena y rol son obligatorios.' });
    if (password.length < 8) return reply({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' });
    if (!VALID_ROLES.includes(role)) return reply({ ok: false, error: 'Rol invalido.' });
    // A team manager (non-admin) can only create Equipo positions.
    if (!isAdmin && role !== 'supervisor') return reply({ ok: false, error: 'Solo puedes crear puestos de Equipo.' });

    // Email is OPTIONAL — the admin can onboard someone who has no email. When blank we
    // mint an internal company login (name-based @equipo.letshoot.ai) so the auth user
    // can exist; the admin shares that login + password. No real mail is sent to it.
    if (!email) {
      const slug = (full_name || 'empleado').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'empleado';
      email = `${slug}.${crypto.randomUUID().slice(0, 4)}@equipo.letshoot.ai`;
    }

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (error) {
      // The most common failure is a duplicate email — turn the raw English into a clear,
      // actionable Spanish message so the admin knows exactly what to do.
      const dup = /already been registered|already registered|already exists|duplicate|has already/i.test(error.message || '');
      const msg = dup
        ? `Ya existe una cuenta con el correo ${email}. Usa otro correo, o busca a esa persona en la lista para editarla o reenviarle acceso.`
        : error.message;
      return reply({ ok: false, error: msg });
    }

    const patch: Record<string, unknown> = { role, full_name, email };
    if (role !== 'creator') patch.onboarding_status = 'active';
    if (role === 'supervisor') { patch.capabilities = capabilities; if (job_title) patch.job_title = job_title; }
    const { error: upErr } = await svc.from('profiles').update(patch).eq('id', created.user.id);
    if (upErr) return reply({ ok: false, error: upErr.message });

    // ANY account with a real email gets a branded "set your password" invitation so the
    // person sets their own clave — the admin never handles a password. Best-effort: a
    // failed email must never fail the account creation. Real recovery link + send-email.
    let invited = false;
    if (emailProvided && body.send_invite !== false) {
      try {
        const { data: linkData } = await svc.auth.admin.generateLink({
          type: 'recovery', email, options: { redirectTo: `${APP}/reset` },
        });
        const actionUrl = linkData?.properties?.action_link || '';
        if (actionUrl) {
          const r = await fetch(`${url}/functions/v1/send-email`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, apikey: anon, 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: 'invite', user_id: created.user.id, action_url: actionUrl, lang: 'es' }),
          });
          const out = await r.json().catch(() => ({}));
          invited = !!out?.ok;
        }
      } catch { /* non-fatal — account still created */ }
    }

    return reply({ ok: true, id: created.user.id, invited, login_email: email, generated_email: !emailProvided });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
