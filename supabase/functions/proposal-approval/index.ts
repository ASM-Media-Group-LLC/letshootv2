// Edge function: proposal-approval
// Flujo de aprobación de una propuesta antes de que le llegue a la creadora.
//   · action:'send'   → manda al APROBADOR (approver_email) un correo con un link
//                        de revisión (/p/<link>?approve=<token>). Marca 'pending'.
//   · action:'decide' → el aprobador Aprueba/Rechaza (verifica el token):
//        - 'approved' → status 'approved' + dispara la invitación a la creadora
//                       (llama a proposal-invite) y queda el estado en el admin.
//        - 'rejected' → status 'rejected' + motivo (vuelve al admin, no a la creadora).
// Server-side con service role; se llama con la anon key (verify_jwt pasa) y la
// autorización real es el link_id (send) o el token (decide).
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || svcKey;
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const link = String(body.link_id || '').trim();
    if (!link) return reply({ ok: false, error: 'Propuesta inválida.' });

    const { data: prop } = await svc.from('photo_proposals')
      .select('id, status, expires_at, name, lang, recipient_name, recipient_email, recipient_kind, model_name, approval_required, approver_email, approval_token, approval_status')
      .eq('link_id', link).maybeSingle();
    if (!prop) return reply({ ok: false, error: 'Esta propuesta no existe.' });
    const lang = prop.lang === 'en' ? 'en' : 'es';

    // ── action: SEND (avisar al aprobador) ──
    if (action === 'send') {
      if (!prop.approval_required || !prop.approver_email) {
        return reply({ ok: false, error: 'Esta propuesta no tiene aprobador configurado.' });
      }
      if (prop.status !== 'published' || (prop.expires_at && new Date(prop.expires_at) < new Date())) {
        return reply({ ok: false, error: 'Esta propuesta ya no está disponible.' });
      }
      await svc.from('photo_proposals').update({ approval_status: 'pending', approval_sent_at: new Date().toISOString() }).eq('id', prop.id);
      const reviewUrl = `${APP}/p/${encodeURIComponent(link)}?approve=${encodeURIComponent(prop.approval_token)}&lang=${lang}`;
      const forName = prop.recipient_name || (lang === 'es' ? 'una creadora' : 'a creator');
      const es = lang === 'es';
      const html = brandedLayout({
        eyebrow: es ? 'Aprobación · Propuesta privada' : 'Approval · Private proposal',
        title: es ? `Revisá la propuesta para ${forName}` : `Review the proposal for ${forName}`,
        body: es
          ? `Te compartimos una propuesta para que la revises antes de enviarla. Abrila, mirá los looks y aprobála o rechazála con un motivo. Si la aprobás, se envía automáticamente a la creadora.`
          : `We're sharing a proposal for you to review before it's sent. Open it, look through the looks and approve or reject it with a reason. If you approve, it's sent to the creator automatically.`,
        cta: es ? 'Revisar y aprobar' : 'Review & approve',
        url: reviewUrl,
        pre: es ? 'Una propuesta espera tu aprobación.' : 'A proposal is waiting for your approval.',
      });
      const sent = await sendResend(prop.approver_email, es ? `Aprobación: propuesta para ${forName}` : `Approval: proposal for ${forName}`, html);
      if (!sent.ok) return reply({ ok: false, error: sent.error || 'Resend error' });
      await svc.from('email_log').insert({ template: 'proposal_approval_request', recipient: prop.approver_email, subject: `Aprobación: ${forName}`, resend_id: sent.id || null, lang }).then(() => {}, () => {});
      return reply({ ok: true, sent_to: prop.approver_email, email_id: sent.id || null, skipped: sent.skipped || null });
    }

    // ── action: DECIDE (aprobar / rechazar) ──
    if (action === 'decide') {
      const token = String(body.token || '').trim();
      const decision = body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : '';
      const reason = String(body.reason || '').trim().slice(0, 800);
      if (!prop.approval_required || !prop.approval_token) return reply({ ok: false, error: 'Esta propuesta no requiere aprobación.' });
      if (!token || token !== String(prop.approval_token)) return reply({ ok: false, error: 'Link de aprobación inválido.' }, 403);
      if (!decision) return reply({ ok: false, error: 'Decisión inválida.' });
      if (prop.approval_status === 'approved') return reply({ ok: true, already: true, status: 'approved' });

      if (decision === 'rejected') {
        await svc.from('photo_proposals').update({ approval_status: 'rejected', approval_reason: reason || null }).eq('id', prop.id);
        return reply({ ok: true, status: 'rejected' });
      }

      // approved → marcar y disparar invitación a la creadora (si hay correo).
      await svc.from('photo_proposals').update({ approval_status: 'approved', approved_at: new Date().toISOString(), approval_reason: reason || null }).eq('id', prop.id);
      let invited = false, inviteError: string | null = null;
      const creatorEmail = String(prop.recipient_email || '').trim();
      if (creatorEmail) {
        try {
          const r = await fetch(`${url}/functions/v1/proposal-invite`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ link_id: link, email: creatorEmail, full_name: prop.recipient_name || '', lang }),
          });
          const j = await r.json().catch(() => ({}));
          invited = !!j?.ok;
          if (!j?.ok) inviteError = j?.error || 'No se pudo enviar a la creadora.';
        } catch (e) { inviteError = String((e as Error)?.message || e); }
      }
      return reply({ ok: true, status: 'approved', invited, invite_error: inviteError });
    }

    return reply({ ok: false, error: 'Acción inválida.' });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
