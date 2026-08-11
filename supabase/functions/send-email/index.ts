// Transactional emails via Resend — dark, PREMIUM-MINIMAL, RESPONSIVE, NO EMOJIS.
// Deliberately restrained: flat surfaces, hairline borders, one accent used sparingly
// (eyebrow label + a single solid button), generous whitespace, real type hierarchy.
// No gradients, no glows, no pills — those read as cheap. Table-based for Gmail/Outlook/Apple.
// Caller must be signed-in STAFF (or the event concerns the caller). Admins may pass `to`
// and `from`. `preview:true` returns {subject,html} without sending. No-op without RESEND_API_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const FROM = 'LetShoot <noreply@letshoot.ai>';
const APP = 'https://letshoot.ai';
const LOGO = 'https://www.letshoot.ai/logo.png';
const BRAND = '#00B1F6';

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// Clean, minimal dark shell. One accent color, used only on the eyebrow label and the
// single solid button. Subtle 1px card, no shadow/gradient/glow. Fluid, mobile-friendly.
function layout(o: { accent: string; eyebrow: string; title: string; body: string; cta: string; url: string; pre: string }) {
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${o.title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  a{text-decoration:none;}
  body{margin:0;padding:0;width:100%!important;background-color:#070a0f;}
  @media only screen and (max-width:600px){
    .container{width:100%!important;max-width:100%!important;}
    .pad{padding-left:26px!important;padding-right:26px!important;}
    .h1{font-size:19px!important;}
    .body{font-size:15px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#070a0f;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070a0f;font-size:1px;line-height:1px;">${o.pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070a0f" style="background-color:#070a0f;">
  <tr><td align="center" style="padding:44px 20px;">
    <!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;margin:0 auto;">
      <!-- logo (centered) -->
      <tr><td align="center" style="padding:0 6px 26px 6px;">
        <img src="${LOGO}" width="128" height="25" alt="LetShoot" style="display:inline-block;border:0;outline:none;text-decoration:none;height:25px;width:128px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;letter-spacing:-0.5px;">
      </td></tr>
      <!-- card: flat, hairline border; content centered -->
      <tr><td style="background-color:#0d1319;border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="pad" align="center" style="padding:40px 40px 0 40px;text-align:center;">
            <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${o.accent};text-align:center;">${o.eyebrow}</p>
            <h1 class="h1" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.32;font-weight:bold;color:#ffffff;letter-spacing:-0.2px;text-align:center;">${o.title}</h1>
            <p class="body" style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#9aa8b8;text-align:center;">${o.body}</p>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:28px 40px 40px 40px;text-align:center;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${o.url}" style="height:46px;v-text-anchor:middle;width:230px;" arcsize="18%" fillcolor="#00B1F6" stroke="f"><w:anchorlock/><center style="color:#04222f;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${o.cta}</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- -->
            <a href="${o.url}" style="display:inline-block;background-color:#00B1F6;background-image:linear-gradient(180deg,#2cbcfa 0%,#009fe0 100%);color:#04222f;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 30px;border-radius:8px;">${o.cta}</a>
            <!--<![endif]-->
          </td></tr>
        </table>
      </td></tr>
      <!-- footer (centered) -->
      <tr><td align="center" style="padding:22px 8px 0 8px;text-align:center;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5a6b7a;text-align:center;">LetShoot &middot; tu fot&oacute;grafo IA &middot; <a href="${APP}" style="color:#6b7c8b;text-decoration:underline;">letshoot.ai</a></p>
        <p style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#41505e;text-align:center;">Recibiste este correo porque tienes una cuenta en LetShoot.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body></html>`;
}

// Each template receives (name, extra, lang, url). `url` is an optional caller-supplied
// action link (e.g. a set-password recovery link); templates fall back to a safe default.
const TEMPLATES: Record<string, (name: string, extra: string, lang: string, url: string) => { subject: string; html: string }> = {
  welcome: (name, _e, lang) => lang === 'es'
    ? { subject: 'Bienvenida a LetShoot', html: layout({ accent: BRAND, eyebrow: 'Bienvenida', title: `Hola ${name}, te damos la bienvenida`, body: 'Tu cuenta ya está creada. Completa tu registro (datos, identidad y consentimiento) para activar tu clon y empezar a recibir contenido listo para vender — cada día, sin que muevas un dedo.', cta: 'Entrar a mi portal', url: `${APP}/login`, pre: 'Tu cuenta LetShoot está lista — completa tu registro.' }) }
    : { subject: 'Welcome to LetShoot', html: layout({ accent: BRAND, eyebrow: 'Welcome', title: `Hi ${name}, welcome`, body: 'Your account is ready. Complete your onboarding (info, identity and consent) to activate your clone and start receiving sell-ready content — every day, hands-off.', cta: 'Enter my portal', url: `${APP}/login`, pre: 'Your LetShoot account is ready — finish onboarding.' }) },
  approved: (name, _e, lang) => lang === 'es'
    ? { subject: 'Tu verificación fue aprobada', html: layout({ accent: BRAND, eyebrow: 'Verificación aprobada', title: `¡Felicidades ${name}!`, body: 'Tu identidad fue verificada y tu consentimiento quedó registrado. Ya puedes activar tu plan y empezar — entra a tu portal para completar el último paso.', cta: 'Activar mi plan', url: `${APP}/login`, pre: 'Verificación aprobada — activa tu plan.' }) }
    : { subject: 'Your verification was approved', html: layout({ accent: BRAND, eyebrow: 'Verified', title: `Congrats ${name}!`, body: 'Your identity was verified and your consent is on file. You can now activate your plan — enter your portal to finish the last step.', cta: 'Activate my plan', url: `${APP}/login`, pre: 'Verification approved — activate your plan.' }) },
  rejected: (name, extra, lang) => lang === 'es'
    ? { subject: 'Tu verificación necesita un ajuste', html: layout({ accent: BRAND, eyebrow: 'Acción necesaria', title: `Hola ${name}`, body: `Tu verificación no pasó esta vez${extra ? ` — motivo: ${extra}` : ''}. No se te cobró nada. Entra a tu portal y vuelve a subir imágenes claras de tu documento (bien iluminadas y sin reflejos).`, cta: 'Volver a subir mi ID', url: `${APP}/login`, pre: 'Tu verificación necesita un ajuste — vuelve a subir tu ID.' }) }
    : { subject: 'Your verification needs a fix', html: layout({ accent: BRAND, eyebrow: 'Action needed', title: `Hi ${name}`, body: `Your verification didn't pass this time${extra ? ` — reason: ${extra}` : ''}. You were not charged. Enter your portal and re-upload clear images of your document (well lit, no glare).`, cta: 'Re-upload my ID', url: `${APP}/login`, pre: 'Your verification needs a fix — re-upload your ID.' }) },
  delivery: (name, extra, lang) => lang === 'es'
    ? { subject: 'Tienes contenido nuevo', html: layout({ accent: BRAND, eyebrow: 'Contenido nuevo', title: `Hola ${name}, llegó contenido`, body: `Tu equipo te subió contenido nuevo${extra ? ` en “${extra}”` : ''}. Entra a tu portal para verlo, descargarlo y venderlo hoy mismo.`, cta: 'Ver mi contenido', url: `${APP}/login`, pre: 'Tienes contenido nuevo listo para vender.' }) }
    : { subject: 'New content is ready', html: layout({ accent: BRAND, eyebrow: 'New content', title: `Hi ${name}, content just landed`, body: `Your team uploaded new content${extra ? ` in “${extra}”` : ''}. Enter your portal to view, download and sell it today.`, cta: 'View my content', url: `${APP}/login`, pre: 'New content is ready to sell.' }) },
  invite: (name, _e, lang, url) => lang === 'es'
    ? { subject: 'Tu cuenta en LetShoot está lista', html: layout({ accent: BRAND, eyebrow: 'Bienvenida', title: `Hola ${name}, tu cuenta está lista`, body: 'Creamos tu cuenta en LetShoot. Crea tu contraseña para entrar y empezar a recibir tu contenido listo para vender — cada día, sin que muevas un dedo.', cta: 'Crear mi contraseña', url: url || `${APP}/forgot`, pre: 'Crea tu contraseña y entra a LetShoot.' }) }
    : { subject: 'Your LetShoot account is ready', html: layout({ accent: BRAND, eyebrow: 'Welcome', title: `Hi ${name}, your account is ready`, body: 'We created your LetShoot account. Set your password to sign in and start receiving sell-ready content — every day, hands-off.', cta: 'Set my password', url: url || `${APP}/forgot`, pre: 'Set your password and sign in to LetShoot.' }) },
  expiring: (name, extra, lang) => lang === 'es'
    ? { subject: 'Tu suscripción está por vencer', html: layout({ accent: BRAND, eyebrow: 'Suscripción', title: `Hola ${name}, tu plan está por vencer`, body: `Tu suscripción de LetShoot vence${extra ? ` el ${extra}` : ' pronto'}. Renuévala para no perder la entrega diaria de contenido. Si ya pagaste, ignora este aviso.`, cta: 'Renovar mi plan', url: `${APP}/login`, pre: 'Tu suscripción está por vencer — renueva para seguir.' }) }
    : { subject: 'Your subscription is about to expire', html: layout({ accent: BRAND, eyebrow: 'Subscription', title: `Hi ${name}, your plan is expiring`, body: `Your LetShoot subscription expires${extra ? ` on ${extra}` : ' soon'}. Renew to keep your daily content coming. If you already paid, ignore this notice.`, cta: 'Renew my plan', url: `${APP}/login`, pre: 'Your subscription is about to expire — renew to continue.' }) },
  join: (_n, extra, lang, url) => lang === 'es'
    ? { subject: 'Te invitaron a LetShoot', html: layout({ accent: BRAND, eyebrow: 'Invitación', title: 'Te invitaron a LetShoot', body: `Te invitaron a unirte a LetShoot${extra ? ` como ${extra}` : ''}. Crea tu cuenta con el botón de abajo — solo toma un minuto.`, cta: 'Crear mi cuenta', url: url || APP, pre: 'Te invitaron a unirte a LetShoot.' }) }
    : { subject: 'You are invited to LetShoot', html: layout({ accent: BRAND, eyebrow: 'Invitation', title: 'You are invited to LetShoot', body: `You have been invited to join LetShoot${extra ? ` as ${extra}` : ''}. Create your account with the button below — it only takes a minute.`, cta: 'Create my account', url: url || APP, pre: 'You have been invited to join LetShoot.' }) },
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
    const toEmailRaw = String(body.to || '').trim();
    const extra = String(body.extra || '');
    const actionUrlRaw = String(body.action_url || '').trim();
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!TEMPLATES[template]) return reply({ ok: false, error: 'template inválido.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProf } = await svc.from('profiles').select('role').eq('id', user.id).single();
    const isStaff = ['admin', 'supervisor', 'producer', 'chatter'].includes(callerProf?.role || '');
    const isAdmin = callerProf?.role === 'admin';

    let actionUrl = '';
    if (actionUrlRaw && isStaff) {
      try {
        const h = new URL(actionUrlRaw).hostname;
        const projHost = new URL(url).hostname;
        if (h === 'letshoot.ai' || h === 'www.letshoot.ai' || h.endsWith('.supabase.co') || h === projHost) actionUrl = actionUrlRaw;
      } catch { /* invalid URL → ignore */ }
    }

    if (body.preview === true) {
      if (!isStaff) return reply({ ok: false, error: 'No autorizado.' });
      const nm = String(body.name || (lang === 'es' ? 'Álvaro' : 'Alex'));
      const p = TEMPLATES[template](nm, extra, lang, actionUrl);
      return reply({ ok: true, preview: true, subject: p.subject, html: p.html });
    }

    const fromAddr = (isAdmin && String(body.from || '').trim()) ? String(body.from).trim() : FROM;

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

    const { subject, html } = TEMPLATES[template](name, extra, lang, actionUrl);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to: [email], subject, html }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return reply({ ok: false, error: out?.message || 'Resend error' });
    await svc.from('email_log').insert({ template, recipient: email, subject, resend_id: out?.id || null, sent_by: user.id, lang }).then(() => {}, () => {});
    return reply({ ok: true, id: out?.id });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
