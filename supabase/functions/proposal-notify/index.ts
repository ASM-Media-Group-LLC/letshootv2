// Edge function: proposal-notify
// Avisa por correo a QUIEN ARMÓ la propuesta cuando la CREADORA responde
// (le gustó / rechazó / comentó). Se llama fire-and-forget desde el viewer con
// la anon key (verify_jwt pasa). No expone datos: recibe sólo el link_id y
// resuelve todo server-side con service role.
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

function brandedLayout(o: { eyebrow: string; title: string; body: string; cta: string; url: string; pre: string }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${o.title}</title>
<style>body{margin:0;padding:0;width:100%!important;background-color:#070a0f;} a{text-decoration:none;}
@media only screen and (max-width:600px){.container{width:100%!important;max-width:100%!important;} .pad{padding-left:26px!important;padding-right:26px!important;}}</style></head>
<body style="margin:0;padding:0;background-color:#070a0f;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070a0f;font-size:1px;line-height:1px;">${o.pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070a0f" style="background-color:#070a0f;">
  <tr><td align="center" style="padding:44px 20px;">
    <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;margin:0 auto;">
      <tr><td align="center" style="padding:0 6px 26px 6px;"><img src="${LOGO}" width="128" height="25" alt="LetShoot" style="display:inline-block;border:0;height:25px;width:128px;"></td></tr>
      <tr><td style="background-color:#0d1319;border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="pad" align="center" style="padding:40px 40px 0 40px;text-align:center;">
            <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${BRAND};">${o.eyebrow}</p>
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.32;font-weight:bold;color:#ffffff;letter-spacing:-0.2px;">${o.title}</h1>
            <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#9aa8b8;">${o.body}</p>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:28px 40px 40px 40px;text-align:center;">
            <a href="${o.url}" style="display:inline-block;background-color:#00B1F6;background-image:linear-gradient(180deg,#2cbcfa 0%,#009fe0 100%);color:#04222f;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 30px;border-radius:8px;">${o.cta}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 8px 0 8px;text-align:center;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5a6b7a;">LetShoot &middot; <a href="${APP}" style="color:#6b7c8b;text-decoration:underline;">letshoot.ai</a></p></td></tr>
    </table>
  </td></tr>
</table></body></html>`;
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
    if (!link) return reply({ ok: false, error: 'Propuesta inválida.' });

    const { data: prop } = await svc.from('photo_proposals')
      .select('created_by, created_by_name, recipient_name, name, lang')
      .eq('link_id', link).maybeSingle();
    if (!prop || !prop.created_by) return reply({ ok: true, skipped: 'sin creador vinculado' });

    // Correo del empleado que la armó (resuelto por service role desde auth).
    let email = '';
    try {
      const { data: u } = await svc.auth.admin.getUserById(String(prop.created_by));
      email = u?.user?.email || '';
    } catch { /* sin email → no se manda */ }
    if (!email) return reply({ ok: true, skipped: 'sin correo' });

    const es = prop.lang !== 'en';
    const who = (prop.recipient_name || (es ? 'La creadora' : 'The creator')).toString().slice(0, 80);
    const pname = (prop.name || (es ? 'tu propuesta' : 'your proposal')).toString().slice(0, 120);
    const html = brandedLayout({
      eyebrow: es ? 'Novedad · Propuesta' : 'Update · Proposal',
      title: es ? `${who} respondió tu propuesta` : `${who} responded to your proposal`,
      body: es
        ? `${who} acaba de revisar «${pname}». Entrá al Almacén para ver qué le gustó, qué mandó a recrear y sus comentarios.`
        : `${who} just reviewed “${pname}”. Open the Warehouse to see what they liked, what to recreate and their comments.`,
      cta: es ? 'Ver en el Almacén' : 'Open the Warehouse',
      url: `${APP}/trabajo?tab=almacen`,
      pre: es ? `${who} respondió.` : `${who} responded.`,
    });
    const subject = es ? `${who} respondió: ${pname}` : `${who} responded: ${pname}`;
    const r = await sendResend(email, subject, html);
    await svc.from('email_log').insert({ template: 'proposal_response', recipient: email, subject, resend_id: r.id || null, lang: es ? 'es' : 'en' }).then(() => {}, () => {});
    if (r.ok === false) return reply({ ok: false, error: r.error });
    return reply({ ok: true, sent_to: email, skipped: r.skipped });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
