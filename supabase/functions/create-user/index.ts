// Edge function: create-user (v12 — optional creator profile passthrough for full alta)
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
const VALID_CAPS = ['datos', 'kyc', 'add_creators', 'content', 'requests', 'feedback', 'metrics', 'billing', 'agencies', 'team'];
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
    const callerCaps = Array.isArray(prof?.capabilities) ? prof.capabilities : [];
    const isSup = prof?.role === 'supervisor';
    const canTeam = isSup && callerCaps.includes('team');            // crear empleados
    const canAddCreators = isSup && callerCaps.includes('add_creators'); // dar de alta creadoras
    const canAddAgencies = isSup && callerCaps.includes('agencies');     // crear agencias
    if (!isAdmin && !canTeam && !canAddCreators && !canAddAgencies) return reply({ ok: false, error: 'No tienes permiso para crear usuarios.' });

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
    // A non-admin can create only the account types their accesses allow.
    if (!isAdmin) {
      const ok = (role === 'supervisor' && canTeam)
        || (role === 'creator' && canAddCreators)
        || (role === 'agency' && canAddAgencies);
      if (!ok) return reply({ ok: false, error: 'No tienes permiso para crear ese tipo de cuenta.' });
    }

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
    // Optional creator profile fields (perfil público, identidad, suscripción, cortesía,
    // nota). Applied server-side so a non-admin with 'add_creators' can set them too
    // (client-side they'd be blocked by RLS). Whitelisted — no arbitrary columns.
    if (role === 'creator' && body.profile && typeof body.profile === 'object') {
      const p = body.profile as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
      const set = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== '') patch[k] = v; };
      set('stage_name', str(p.stage_name));
      set('handle', str(p.handle) ? String(p.handle).replace(/^@/, '') : undefined);
      set('phone', str(p.phone));
      set('country', str(p.country));
      set('legal_first_name', str(p.legal_first_name));
      set('legal_last_name', str(p.legal_last_name));
      set('date_of_birth', str(p.date_of_birth));
      const plan = str(p.plan);
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      if (p.comp === true) { // cortesía: nace activa, gratis hasta la fecha
        patch.comp_until = str(p.comp_until) || in30;
        patch.payment_status = 'paid';
        patch.onboarding_status = 'active';
        patch.plan = plan || 'core';
        patch.subscription_ends_at = str(p.comp_until) || in30;
        patch.billing_note = str(p.billing_note) || 'Cortesía (gratis)';
      } else if (p.activate === true) {
        patch.payment_status = 'paid';
        patch.onboarding_status = 'active';
        patch.plan = plan || 'core';
        patch.subscription_ends_at = str(p.ends_at) || in30;
        set('billing_note', str(p.billing_note));
      } else {
        set('plan', plan);
        patch.onboarding_status = 'authorized';
        set('billing_note', str(p.billing_note));
      }
    }
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
        // Link straight to OUR /reset with the token_hash (custom-email pattern). This avoids
        // depending on Supabase's redirect allow-list and survives inbox link-scanners better
        // than the hosted verify redirect. /reset calls verifyOtp with these params.
        const hashed = linkData?.properties?.hashed_token || '';
        const actionUrl = hashed
          ? `${APP}/reset?token_hash=${encodeURIComponent(hashed)}&type=recovery`
          : (linkData?.properties?.action_link || '');
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
