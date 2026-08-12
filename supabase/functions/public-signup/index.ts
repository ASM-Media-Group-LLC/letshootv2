// PUBLIC signup (no session required — the anon key passes the gateway).
// Replaces supabase.auth.signUp() so we NEVER send Supabase's default, unbranded
// confirmation email (which linked to SITE_URL / localhost). We create the account
// already confirmed, send our own branded welcome, and the client then signs in.
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
    const password = String(body.password || '');
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply({ ok: false, error: 'Correo inválido.' });
    if (!password || password.length < 8) return reply({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });

    // Create the account already confirmed — no Supabase confirmation email, ever.
    const { data: created, error } = await svc.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (error) {
      const msg = String(error.message || '');
      if (/already|registered|exists|duplicate/i.test(msg)) return reply({ ok: false, error: 'exists' });
      return reply({ ok: false, error: msg || 'No se pudo crear la cuenta.' });
    }

    // Branded welcome (best-effort — never blocks signup).
    try {
      const tpl = lang === 'es'
        ? { subject: 'Bienvenida a LetShoot', eyebrow: 'Bienvenida', title: 'Tu cuenta está lista', body: 'Creaste tu cuenta en LetShoot. Completa tu registro (datos, identidad y consentimiento) para activar tu clon y empezar a recibir contenido listo para vender — cada día, sin que muevas un dedo.', cta: 'Entrar a mi portal', pre: 'Tu cuenta LetShoot está lista.' }
        : { subject: 'Welcome to LetShoot', eyebrow: 'Welcome', title: 'Your account is ready', body: 'You created your LetShoot account. Finish onboarding (info, identity and consent) to activate your clone and start receiving sell-ready content — every day, hands-off.', cta: 'Enter my portal', pre: 'Your LetShoot account is ready.' };
      const html = brandedLayout({ eyebrow: tpl.eyebrow, title: tpl.title, body: tpl.body, cta: tpl.cta, url: `${APP}/login`, pre: tpl.pre });
      await sendResend(email, tpl.subject, html);
      await svc.from('email_log').insert({ template: 'welcome', recipient: email, subject: tpl.subject, sent_by: created?.user?.id || null, lang }).then(() => {}, () => {});
    } catch { /* email is best-effort */ }

    return reply({ ok: true, user_id: created?.user?.id || null });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
