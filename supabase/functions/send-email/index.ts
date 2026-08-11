// Transactional emails via Resend — dark, on-brand, table-based HTML that holds
// up across Gmail / Outlook / Apple Mail. Caller must be signed-in STAFF (or the
// event concerns the caller themselves, e.g. welcome). Admins may pass `to` to
// send a test to any address. No-ops safely when RESEND_API_KEY isn't set.
//
// PROD config: RESEND_API_KEY secret + letshoot.ai verified in Resend.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const FROM = 'LetShoot <noreply@letshoot.ai>';
const APP = 'https://letshoot.ai';

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// Dark, brand-consistent shell. Bulletproof (tables + inline styles), with an
// Outlook (VML) fallback for the CTA button and a hidden preheader.
function layout(o: { accent: string; emoji: string; title: string; body: string; cta: string; url: string; pre: string }) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${o.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#05070a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#05070a;font-size:1px;line-height:1px;">${o.pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#05070a;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:520px;">
      <!-- brand bar -->
      <tr><td style="padding:8px 4px 20px 4px;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">Let<span style="color:#00AFF0;">Shoot</span></span>
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;color:#4a5a68;text-transform:uppercase;">&nbsp;&nbsp;for OnlyFans creators</span>
      </td></tr>
      <!-- card -->
      <tr><td style="background-color:#0e151c;border:1px solid #1b2732;border-radius:20px;padding:0;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="height:4px;background-color:${o.accent};line-height:4px;font-size:4px;">&nbsp;</td></tr>
          <tr><td style="padding:36px 36px 8px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width:56px;height:56px;background-color:${o.accent}1f;border-radius:16px;text-align:center;vertical-align:middle;font-size:26px;">${o.emoji}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:20px 36px 0 36px;">
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:bold;color:#ffffff;">${o.title}</h1>
          </td></tr>
          <tr><td style="padding:14px 36px 0 36px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#9db2c3;">${o.body}</p>
          </td></tr>
          <tr><td style="padding:28px 36px 40px 36px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${o.url}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="${o.accent}" stroke="f"><w:anchorlock/><center style="color:#04151f;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${o.cta}</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- -->
            <a href="${o.url}" style="display:inline-block;background-color:${o.accent};color:#04151f;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 26px;border-radius:999px;">${o.cta} &nbsp;&rarr;</a>
            <!--<![endif]-->
          </td></tr>
        </table>
      </td></tr>
      <!-- footer -->
      <tr><td style="padding:22px 8px 4px 8px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#4a5a68;">
          LetShoot &middot; tu fot&oacute;grafo IA &middot; <a href="${APP}" style="color:#5a6b7a;text-decoration:underline;">letshoot.ai</a><br>
          Recibiste este correo porque tienes una cuenta en LetShoot.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const TEMPLATES: Record<string, (name: string, extra: string, lang: string) => { subject: string; html: string }> = {
  welcome: (name, _e, lang) => lang === 'es'
    ? { subject: '¡Bienvenida a LetShoot! 🎬', html: layout({ accent: '#00AFF0', emoji: '👋', title: `Hola ${name}, bienvenida`, body: 'Tu cuenta ya está creada. Completa tu registro (datos, identidad y consentimiento) para activar tu clon y empezar a recibir contenido listo para vender — cada día, sin que muevas un dedo.', cta: 'Entrar a mi portal', url: `${APP}/login`, pre: 'Tu cuenta LetShoot está lista — completa tu registro.' }) }
    : { subject: 'Welcome to LetShoot! 🎬', html: layout({ accent: '#00AFF0', emoji: '👋', title: `Hi ${name}, welcome`, body: 'Your account is ready. Complete your onboarding (info, identity and consent) to activate your clone and start receiving sell-ready content — every day, hands-off.', cta: 'Enter my portal', url: `${APP}/login`, pre: 'Your LetShoot account is ready — finish onboarding.' }) },
  approved: (name, _e, lang) => lang === 'es'
    ? { subject: '✅ Tu verificación fue aprobada', html: layout({ accent: '#22c55e', emoji: '✅', title: `¡Felicidades ${name}!`, body: 'Tu identidad fue verificada y tu consentimiento quedó registrado. Ya puedes activar tu plan y empezar — entra a tu portal para completar el último paso.', cta: 'Activar mi plan', url: `${APP}/login`, pre: 'Verificación aprobada — activa tu plan.' }) }
    : { subject: '✅ Your verification was approved', html: layout({ accent: '#22c55e', emoji: '✅', title: `Congrats ${name}!`, body: 'Your identity was verified and your consent is on file. You can now activate your plan — enter your portal to finish the last step.', cta: 'Activate my plan', url: `${APP}/login`, pre: 'Verification approved — activate your plan.' }) },
  rejected: (name, extra, lang) => lang === 'es'
    ? { subject: 'Tu verificación necesita un ajuste', html: layout({ accent: '#f59e0b', emoji: '⚠️', title: `Hola ${name}`, body: `Tu verificación no pasó esta vez${extra ? ` — motivo: ${extra}` : ''}. No se te cobró nada. Entra a tu portal y vuelve a subir imágenes claras de tu documento (bien iluminadas y sin reflejos).`, cta: 'Volver a subir mi ID', url: `${APP}/login`, pre: 'Tu verificación necesita un ajuste — vuelve a subir tu ID.' }) }
    : { subject: 'Your verification needs a fix', html: layout({ accent: '#f59e0b', emoji: '⚠️', title: `Hi ${name}`, body: `Your verification didn't pass this time${extra ? ` — reason: ${extra}` : ''}. You were not charged. Enter your portal and re-upload clear images of your document (well lit, no glare).`, cta: 'Re-upload my ID', url: `${APP}/login`, pre: 'Your verification needs a fix — re-upload your ID.' }) },
  delivery: (name, extra, lang) => lang === 'es'
    ? { subject: '📸 Tienes contenido nuevo', html: layout({ accent: '#00AFF0', emoji: '📸', title: `Hola ${name}, llegó contenido`, body: `Tu equipo te subió contenido nuevo${extra ? ` en “${extra}”` : ''}. Entra a tu portal para verlo, descargarlo y venderlo hoy mismo.`, cta: 'Ver mi contenido', url: `${APP}/login`, pre: 'Tienes contenido nuevo listo para vender.' }) }
    : { subject: '📸 New content is ready', html: layout({ accent: '#00AFF0', emoji: '📸', title: `Hi ${name}, content just landed`, body: `Your team uploaded new content${extra ? ` in “${extra}”` : ''}. Enter your portal to view, download and sell it today.`, cta: 'View my content', url: `${APP}/login`, pre: 'New content is ready to sell.' }) },
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
    const toEmailRaw = String(body.to || '').trim();       // admin-only direct recipient (test)
    const extra = String(body.extra || '');
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!TEMPLATES[template]) return reply({ ok: false, error: 'template inválido.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProf } = await svc.from('profiles').select('role').eq('id', user.id).single();
    const isStaff = ['admin', 'supervisor', 'producer', 'chatter'].includes(callerProf?.role || '');
    const isAdmin = callerProf?.role === 'admin';

    // Resolve recipient + name.
    let email = '', name = lang === 'es' ? 'creadora' : 'creator';
    if (toEmailRaw) {
      if (!isAdmin) return reply({ ok: false, error: 'Solo el admin puede enviar a un correo directo.' });
      email = toEmailRaw;
      name = String(body.name || name);
    } else {
      if (!toUserId) return reply({ ok: false, error: 'user_id es obligatorio.' });
      if (!isStaff && !(template === 'welcome' && toUserId === user.id)) return reply({ ok: false, error: 'No autorizado.' });
      const { data: target } = await svc.from('profiles').select('email, full_name, stage_name').eq('id', toUserId).single();
      if (!target?.email) return reply({ ok: false, error: 'Usuario no encontrado.' });
      email = target.email;
      name = target.stage_name || target.full_name || name;
    }

    if (!resendKey) return reply({ ok: true, skipped: 'RESEND_API_KEY no configurada' });

    const { subject, html } = TEMPLATES[template](name, extra, lang);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject, html }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return reply({ ok: false, error: out?.message || 'Resend error' });
    return reply({ ok: true, id: out?.id });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
