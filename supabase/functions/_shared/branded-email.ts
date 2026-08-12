// Shared branded email shell for PUBLIC edge functions (signup/forgot) that can't
// call the staff-only send-email function. Same premium-minimal dark look: logo,
// hairline card, one accent, single solid button, no emojis. Table-based for Gmail/
// Outlook/Apple. Keep in visual sync with functions/send-email/index.ts.
export const APP = 'https://letshoot.ai';
export const FROM = 'LetShoot <noreply@letshoot.ai>';
const LOGO = 'https://www.letshoot.ai/logo.png';
const BRAND = '#00B1F6';

export function brandedLayout(o: { eyebrow: string; title: string; body: string; cta: string; url: string; pre: string }) {
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
        <p style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#41505e;text-align:center;">Recibiste este correo porque alguien usó tu dirección en LetShoot. Si no fuiste tú, ignóralo.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body></html>`;
}

// Fire a Resend email. No-op (skipped) if RESEND_API_KEY isn't configured.
export async function sendResend(to: string, subject: string, html: string) {
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
