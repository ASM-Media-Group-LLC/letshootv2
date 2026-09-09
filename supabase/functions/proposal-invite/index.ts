// Edge function: proposal-invite
// El equipo invita a una modelo a una PROPUESTA. Server-side con service role;
// se llama con la anon key (verify_jwt pasa) y la autorización es el link_id.
//  · Usuaria NUEVA  → admin.generateLink('invite'): crea su cuenta, y el correo
//    la manda a /reset a poner su contraseña; al terminar cae en la propuesta.
//  · Usuaria EXISTENTE → el correo la manda DIRECTO a la propuesta (sin password).
// En ambos casos se crea el registro ligado a la propuesta y el id viaja en el
// link (?reg=…) para que el viewer salte el gate. Correo con el diseño de marca.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const APP = 'https://letshoot.ai';
const FROM = 'LetShoot <noreply@letshoot.ai>';
const LOGO = 'https://www.letshoot.ai/logo.png';
const BRAND = '#00B1F6';

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// Mismo shell dark premium-minimal que el resto de los correos (branded-email.ts).
function brandedLayout(o: { eyebrow: string; title: string; body: string; cta: string; url: string; pre: string }) {
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
      <tr><td align="center" style="padding:0 6px 26px 6px;">
        <img src="${LOGO}" width="128" height="25" alt="LetShoot" style="display:inline-block;border:0;outline:none;text-decoration:none;height:25px;width:128px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;letter-spacing:-0.5px;">
      </td></tr>
      <tr><td style="background-color:#0d1319;border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="pad" align="center" style="padding:40px 40px 0 40px;text-align:center;">
            <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${BRAND};text-align:center;">${o.eyebrow}</p>
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
      <tr><td align="center" style="padding:22px 8px 0 8px;text-align:center;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5a6b7a;text-align:center;">LetShoot &middot; tu fot&oacute;grafo IA &middot; <a href="${APP}" style="color:#6b7c8b;text-decoration:underline;">letshoot.ai</a></p>
        <p style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#41505e;text-align:center;">Recibiste este correo porque te preparamos una propuesta privada en LetShoot.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body></html>`;
}

async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: true, skipped: 'RESEND_API_KEY no configurada' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: out?.message || 'Resend error' };
  return { ok: true, id: out?.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const link = String(body.link_id || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || '').trim();
    const lang = body.lang === 'en' ? 'en' : 'es';

    if (!link) return reply({ ok: false, error: 'Propuesta inválida.' });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply({ ok: false, error: 'Correo inválido.' });

    // La propuesta tiene que existir, estar publicada y vigente.
    const { data: prop } = await svc.from('photo_proposals')
      .select('id, status, expires_at, recipient_name, model_name').eq('link_id', link).maybeSingle();
    if (!prop || prop.status !== 'published' || (prop.expires_at && new Date(prop.expires_at) < new Date())) {
      return reply({ ok: false, error: 'Esta propuesta ya no está disponible.' });
    }
    const name = fullName || prop.recipient_name || (lang === 'es' ? 'creadora' : 'creator');
    const model = prop.model_name || 'LetShoot';

    // Registro ligado a la propuesta (para el admin y para ligar el feedback).
    const { data: regRow } = await svc.from('photo_proposal_registrations')
      .insert({ proposal_id: prop.id, name, email }).select('id').single();
    const regId = regRow?.id || '';
    const proposalPath = `/p/${encodeURIComponent(link)}${regId ? `?reg=${regId}` : ''}`;

    // ¿Nueva o existente? generateLink('invite') crea la cuenta si no existe;
    // si ya existe, devuelve error y la mandamos directo a la propuesta.
    const { data: linkData, error: gErr } = await svc.auth.admin.generateLink({
      type: 'invite', email, options: { redirectTo: `${APP}/reset`, data: { full_name: name } },
    });

    let ctaUrl = '', subject = '', eyebrow = '', title = '', intro = '', cta = '', pre = '', flow = '';
    const exists = !!gErr && /registered|already|exist/i.test(String(gErr.message || ''));

    if (!gErr && linkData) {
      // NUEVA: completa el perfil y arma el link a /reset (pone contraseña) → propuesta.
      flow = 'new';
      const uid = linkData.user?.id;
      if (uid) {
        await svc.from('profiles').update({ role: 'creator', full_name: name, onboarding_status: 'registered' }).eq('id', uid);
      }
      const hashed = linkData.properties?.hashed_token || '';
      ctaUrl = hashed
        ? `${APP}/reset?token_hash=${encodeURIComponent(hashed)}&type=invite&next=${encodeURIComponent(proposalPath)}`
        : (linkData.properties?.action_link || `${APP}${proposalPath}`);
      if (lang === 'es') {
        subject = 'Te preparamos una propuesta privada';
        eyebrow = 'Invitación · Selección privada';
        title = `${name}, te preparamos una propuesta`;
        intro = `Creamos tu cuenta en LetShoot para que veas una selección de looks que armamos con ${model}. Crea tu contraseña con el botón y entrarás directo a tu propuesta. Marca los que te gusten — tu opinión llega directo a nuestro equipo.`;
        cta = 'Crear mi contraseña y ver';
        pre = 'Tu propuesta privada de LetShoot te está esperando.';
      } else {
        subject = 'We made you a private proposal';
        eyebrow = 'Invitation · Private selection';
        title = `${name}, we made you a proposal`;
        intro = `We created your LetShoot account so you can see a selection of looks we put together with ${model}. Set your password with the button and you'll go straight to your proposal. Mark the ones you like — your feedback goes straight to our team.`;
        cta = 'Set my password & view';
        pre = 'Your private LetShoot proposal is waiting.';
      }
    } else if (exists) {
      // EXISTENTE: directo a la propuesta, sin contraseña.
      flow = 'existing';
      ctaUrl = `${APP}${proposalPath}`;
      if (lang === 'es') {
        subject = 'Tu propuesta privada está lista';
        eyebrow = 'Selección privada';
        title = `${name}, tu propuesta está lista`;
        intro = `Preparamos una selección de looks con ${model} para ti. Entra con el botón para verla y marcar los que más te gusten — tu opinión llega directo a nuestro equipo.`;
        cta = 'Ver mi propuesta';
        pre = 'Tu propuesta privada de LetShoot está lista.';
      } else {
        subject = 'Your private proposal is ready';
        eyebrow = 'Private selection';
        title = `${name}, your proposal is ready`;
        intro = `We put together a selection of looks with ${model} for you. Tap the button to view it and mark the ones you like best — your feedback goes straight to our team.`;
        cta = 'See my proposal';
        pre = 'Your private LetShoot proposal is ready.';
      }
    } else {
      return reply({ ok: false, error: String(gErr?.message || 'No se pudo generar la invitación.') });
    }

    const html = brandedLayout({ eyebrow, title, body: intro, cta, url: ctaUrl, pre });
    const sent = await sendResend(email, subject, html);
    if (!sent.ok) return reply({ ok: false, error: sent.error || 'Resend error' });
    await svc.from('email_log').insert({ template: 'proposal_invite', recipient: email, subject, resend_id: sent.id || null, lang }).then(() => {}, () => {});

    return reply({ ok: true, flow, registration_id: regId || null, email_id: sent.id || null, skipped: sent.skipped || null });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
