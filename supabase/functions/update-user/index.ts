// Edge function: update-user — admin edits an account's name and/or email.
// Email changes touch auth (updateUserById) + the profiles row; name is profile-only.
// Rules mirror the rest: admin can edit anyone; a supervisor with the 'team' capability
// can edit NON-admins (e.g. fix a typo in an employee they manage).
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
    if (!isAdmin && !hasTeam) return reply({ ok: false, error: 'No tienes permiso para editar cuentas.' });

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || '').trim();
    if (!user_id) return reply({ ok: false, error: 'Falta la cuenta.' });
    const full_name = body.full_name === undefined ? undefined : String(body.full_name || '').trim();
    const emailRaw = body.email === undefined ? undefined : String(body.email || '').trim().toLowerCase();
    if (emailRaw !== undefined && emailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return reply({ ok: false, error: 'Correo no válido.' });
    }
    if (full_name === undefined && emailRaw === undefined) return reply({ ok: false, error: 'Nada que cambiar.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: target } = await svc.from('profiles').select('role, email').eq('id', user_id).single();
    if (!target) return reply({ ok: false, error: 'Cuenta no encontrada.' });
    if (target.role === 'admin' && !isAdmin) return reply({ ok: false, error: 'Solo el dueño puede editar a un admin.' });

    // Email → auth first (source of truth for login), then mirror into the profile.
    if (emailRaw !== undefined && emailRaw && emailRaw !== target.email) {
      const { error: authErr } = await svc.auth.admin.updateUserById(user_id, { email: emailRaw, email_confirm: true });
      if (authErr) return reply({ ok: false, error: authErr.message });
    }
    const patch: Record<string, unknown> = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (emailRaw !== undefined && emailRaw) patch.email = emailRaw;
    if (Object.keys(patch).length) {
      const { error: upErr } = await svc.from('profiles').update(patch).eq('id', user_id);
      if (upErr) return reply({ ok: false, error: upErr.message });
    }
    return reply({ ok: true });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
