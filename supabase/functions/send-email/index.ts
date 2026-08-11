// Transactional emails via Resend. Caller must be signed-in STAFF (or the
// event concerns the caller themselves, e.g. welcome). Gracefully no-ops when
// RESEND_API_KEY is not configured yet.
//
// NOTE: this file mirrors the function deployed to Supabase (project
// grbvkwolcjcqxfsiytox). To send real email in production two things must be
// configured in Supabase → Edge Functions secrets / Resend:
//   1) RESEND_API_KEY  (secret)  — without it, every call is a safe no-op.
//   2) The FROM domain (letshoot.ai) must be verified in Resend.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const FROM = 'LetShoot <noreply@letshoot.ai>';

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function layout(title: string, body: string, lang: string) {
  const cta = lang === 'es' ? 'Entrar a mi portal' : 'Enter my portal';
  return `<!doctype html><body style="margin:0;background:#0a0f14;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#101820;border:1px solid #1e2a35;border-radius:16px;padding:32px">
    <div style="font-size:22px;font-weight:bold;color:#fff;margin-bottom:4px">Let<span style="color:#00AFF0">Shoot</span></div>
    <h1 style="color:#ffffff;font-size:19px;margin:18px 0 8px">${title}</h1>
    <p style="color:#9db2c3;font-size:14px;line-height:1.6;margin:0 0 22px">${body}</p>
    <a href="https://letshoot.ai/login" style="display:inline-block;background:#00AFF0;color:#04151f;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px;text-decoration:none">${cta}</a>
    <p style="color:#4a5a68;font-size:11px;margin:26px 0 0">LetShoot · letshoot.ai</p>
  </div></body>`;
}

const TEMPLATES: Record<string, (name: string, extra: string, lang: string) => { subject: string; html: string }> = {
  welcome: (name, _e, lang) => lang === 'es'
    ? { subject: '¡Bienvenida a LetShoot!', html: layout(`Hola ${name} 👋`, 'Tu cuenta está creada. Completa tu registro (datos, identidad y consentimiento) para activar tu clon y empezar a recibir contenido listo para vender.', lang) }
    : { subject: 'Welcome to LetShoot!', html: layout(`Hi ${name} 👋`, 'Your account is ready. Complete your onboarding (info, identity and consent) to activate your clone and start receiving sell-ready content.', lang) },
  approved: (name, _e, lang) => lang === 'es'
    ? { subject: '✅ Tu verificación fue aprobada', html: layout(`¡Felicidades ${name}!`, 'Tu identidad fue verificada y tu consentimiento quedó registrado. Ya puedes activar tu plan y empezar — entra a tu portal para completar el último paso.', lang) }
    : { subject: '✅ Your verification was approved', html: layout(`Congrats ${name}!`, 'Your identity was verified and your consent is on file. You can now activate your plan — enter your portal to finish the last step.', lang) },
  rejected: (name, extra, lang) => lang === 'es'
    ? { subject: 'Tu verificación necesita un ajuste', html: layout(`Hola ${name}`, `Tu verificación no pasó esta vez${extra ? ` — motivo: ${extra}` : ''}. No se te cobró nada. Entra a tu portal y vuelve a subir imágenes claras de tu documento.`, lang) }
    : { subject: 'Your verification needs a fix', html: layout(`Hi ${name}`, `Your verification didn't pass this time${extra ? ` — reason: ${extra}` : ''}. You were not charged. Enter your portal and upload clear images of your document again.`, lang) },
  delivery: (name, extra, lang) => lang === 'es'
    ? { subject: '📸 Tienes contenido nuevo', html: layout(`Hola ${name}`, `Tu equipo te subió contenido nuevo${extra ? ` en “${extra}”` : ''}. Entra a tu portal para verlo, descargarlo y venderlo.`, lang) }
    : { subject: '📸 New content is ready', html: layout(`Hi ${name}`, `Your team uploaded new content${extra ? ` in “${extra}”` : ''}. Enter your portal to view, download and sell it.`, lang) },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesion invalida.' });

    const body = await req.json().catch(() => ({}));
    const template = String(body.template || '');
    const toUserId = String(body.user_id || '');
    const extra = String(body.extra || '');
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!TEMPLATES[template] || !toUserId) return reply({ ok: false, error: 'template y user_id son obligatorios.' });

    // Authorization: staff can email anyone; a user can only trigger their own welcome.
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProf } = await svc.from('profiles').select('role').eq('id', user.id).single();
    const isStaff = ['admin', 'supervisor', 'producer', 'chatter'].includes(callerProf?.role || '');
    if (!isStaff && !(template === 'welcome' && toUserId === user.id)) {
      return reply({ ok: false, error: 'No autorizado.' });
    }

    const { data: target } = await svc.from('profiles').select('email, full_name, stage_name').eq('id', toUserId).single();
    if (!target?.email) return reply({ ok: false, error: 'Usuario no encontrado.' });

    if (!resendKey) return reply({ ok: true, skipped: 'RESEND_API_KEY no configurada' });

    const name = target.stage_name || target.full_name || (lang === 'es' ? 'creadora' : 'creator');
    const { subject, html } = TEMPLATES[template](name, extra, lang);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [target.email], subject, html }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return reply({ ok: false, error: out?.message || 'Resend error' });
    return reply({ ok: true, id: out?.id });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
