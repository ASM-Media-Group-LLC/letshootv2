// Edge function: reset-password (v5) — two modes, service role.
//  1) send_email:true  → generate a recovery link and email the person a branded
//     "set your password" message so THEY choose it (admin/team only; needs a real email).
//  2) password:"..."    → admin/team/agency set a temporary password directly (fallback,
//     and the only option for internal accounts with no real email).
// Who: admin resets anyone; supervisor with 'team' resets NON-admins; an agency resets
// ONLY its own linked creators (temp-password only).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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
    const isAgency = prof?.role === 'agency';
    if (!isAdmin && !hasTeam && !isAgency) return reply({ ok: false, error: 'No tienes permiso para resetear contrasenas.' });

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || '').trim();
    const sendEmailMode = body.send_email === true;
    const password = String(body.password || '');
    if (!user_id) return reply({ ok: false, error: 'Falta la cuenta.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: target } = await svc.from('profiles').select('role, email').eq('id', user_id).single();
    if (!target) return reply({ ok: false, error: 'Cuenta no encontrada.' });
    if (target.role === 'admin' && !isAdmin) return reply({ ok: false, error: 'Solo el dueno puede resetear a un admin.' });

    // An agency (neither admin nor team) may reset ONLY its own linked creators.
    if (isAgency && !isAdmin && !hasTeam) {
      if (target.role !== 'creator') return reply({ ok: false, error: 'Solo puedes resetear a tus modelos.' });
      const { data: link } = await svc.from('agency_creators').select('creator_id').eq('agency_id', user.id).eq('creator_id', user_id).maybeSingle();
      if (!link) return reply({ ok: false, error: 'Esa modelo no esta vinculada a tu agencia.' });
    }

    // Mode 1: email the person a self-serve reset link (branded, via send-email).
    if (sendEmailMode) {
      if (!isAdmin && !hasTeam) return reply({ ok: false, error: 'La opcion de correo es solo para el equipo.' });
      const email = String(target.email || '');
      if (!email || email.endsWith('@equipo.letshoot.ai')) {
        return reply({ ok: false, error: 'Esta cuenta no tiene un correo real. Ponle una contrasena temporal.' });
      }
      const { data: linkData } = await svc.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${APP}/reset` } });
      // Link straight to OUR /reset with token_hash (custom-email pattern) — no dependency on
      // Supabase's redirect allow-list and more robust against inbox link-scanners.
      const hashed = linkData?.properties?.hashed_token || '';
      const actionUrl = hashed
        ? `${APP}/reset?token_hash=${encodeURIComponent(hashed)}&type=recovery`
        : (linkData?.properties?.action_link || '');
      if (!actionUrl) return reply({ ok: false, error: 'No se pudo generar el link.' });
      const r = await fetch(`${url}/functions/v1/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'invite', user_id, action_url: actionUrl, lang: 'es' }),
      });
      const out = await r.json().catch(() => ({}));
      if (!out?.ok) return reply({ ok: false, error: out?.error || 'No se pudo enviar el correo.' });
      return reply({ ok: true, emailed: true, email });
    }

    // Mode 2: set a temporary password directly.
    if (!password || password.length < 8) return reply({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' });
    const { error } = await svc.auth.admin.updateUserById(user_id, { password });
    if (error) return reply({ ok: false, error: error.message });
    return reply({ ok: true });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
