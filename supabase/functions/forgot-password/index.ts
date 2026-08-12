// PUBLIC password reset (no session — anon key passes the gateway).
// Replaces supabase.auth.resetPasswordForEmail() so the email is OUR branded
// template and the link points to letshoot.ai/reset (token_hash pattern), never
// to Supabase's SITE_URL. Anti-enumeration: always replies ok, even if unknown.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { brandedLayout, sendResend, APP } from '../_shared/branded-email.ts';

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
    const email = String(body.email || '').trim().toLowerCase();
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply({ ok: true }); // don't reveal

    const { data: linkData } = await svc.auth.admin.generateLink({
      type: 'recovery', email, options: { redirectTo: `${APP}/reset` },
    });
    const hashed = linkData?.properties?.hashed_token || '';
    const actionUrl = hashed
      ? `${APP}/reset?token_hash=${encodeURIComponent(hashed)}&type=recovery`
      : (linkData?.properties?.action_link || '');
    // Unknown email → generateLink errors silently; just reply ok (anti-enumeration).
    if (!actionUrl) return reply({ ok: true });

    const tpl = lang === 'es'
      ? { subject: 'Restablece tu contraseña de LetShoot', eyebrow: 'Restablecer contraseña', title: 'Crea una nueva contraseña', body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta LetShoot. Toca el botón para elegir una nueva. El enlace caduca en una hora.', cta: 'Crear nueva contraseña', pre: 'Restablece tu contraseña de LetShoot.' }
      : { subject: 'Reset your LetShoot password', eyebrow: 'Reset password', title: 'Create a new password', body: 'We received a request to reset your LetShoot password. Tap the button to choose a new one. This link expires in one hour.', cta: 'Create new password', pre: 'Reset your LetShoot password.' };
    const html = brandedLayout({ eyebrow: tpl.eyebrow, title: tpl.title, body: tpl.body, cta: tpl.cta, url: actionUrl, pre: tpl.pre });
    const sent = await sendResend(email, tpl.subject, html);
    if (sent.ok) await svc.from('email_log').insert({ template: 'reset', recipient: email, subject: tpl.subject, lang }).then(() => {}, () => {});

    return reply({ ok: true });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
