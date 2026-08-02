// Edge function: redeem-invite
// Public join flow: an invited person opens /unirse/<token>, enters name + email
// + password. This validates the invite token (service role) and creates their
// internal-team account as role 'supervisor' with staff_status 'pending' and NO
// access — the admin then approves and assigns puesto + accesos.
// Called with the anon key (verify_jwt passes); all authorization is the token.
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
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();

    if (!token) return reply({ ok: false, error: 'Invitación inválida.' });
    if (!email || !password) return reply({ ok: false, error: 'Correo y contraseña son obligatorios.' });
    if (password.length < 8) return reply({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });

    // Validate the invite.
    const { data: invite } = await svc.from('staff_invites').select('*').eq('token', token).maybeSingle();
    if (!invite) return reply({ ok: false, error: 'Esta invitación no existe.' });
    if (invite.status !== 'pending') return reply({ ok: false, error: 'Esta invitación ya fue usada o cancelada.' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return reply({ ok: false, error: 'Esta invitación expiró. Pide una nueva.' });

    // Create the account (email auto-confirmed).
    const { data: created, error } = await svc.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (error) return reply({ ok: false, error: error.message });

    const { error: upErr } = await svc.from('profiles').update({
      role: 'supervisor',
      staff_status: 'pending',
      full_name,
      job_title: invite.job_title || null,
      capabilities: [],
      onboarding_status: 'active',
    }).eq('id', created.user.id);
    if (upErr) return reply({ ok: false, error: upErr.message });

    await svc.from('staff_invites').update({
      status: 'accepted', used_at: new Date().toISOString(), used_by: created.user.id,
    }).eq('id', invite.id);

    return reply({ ok: true });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
