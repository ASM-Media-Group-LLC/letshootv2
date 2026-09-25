// Edge function: notify-event
// Avisos push del ONBOARDING de la modelo (antes todo era "pull"/cola):
//   · signup_info  (completó sus datos)  -> Admin + quien la trajo (agencia/agente)
//   · kyc          (subió su ID)          -> Admin + quien tiene cap 'kyc'
//   · lora         (subió fotos del clon) -> Admin + equipo asignado (Editor/Manager/PR)
// Aviso = notificación in-app (campanita) + correo branded. La dispara un trigger en
// profiles via net.http_post (patrón feedback-flush). Auth: x-run-secret. Soporta {dry_run}.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-run-secret',
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
<style>body{margin:0;padding:0;width:100%!important;background-color:#070a0f;} a{text-decoration:none;}</style></head>
<body style="margin:0;padding:0;background-color:#070a0f;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070a0f;font-size:1px;line-height:1px;">${o.pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070a0f" style="background-color:#070a0f;">
  <tr><td align="center" style="padding:44px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;margin:0 auto;">
      <tr><td align="center" style="padding:0 6px 26px 6px;"><img src="${LOGO}" width="128" height="25" alt="LetShoot" style="display:inline-block;border:0;height:25px;width:128px;"></td></tr>
      <tr><td style="background-color:#0d1319;border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:40px 40px 0 40px;text-align:center;">
            <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${BRAND};">${o.eyebrow}</p>
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.32;font-weight:bold;color:#ffffff;">${o.title}</h1>
            <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#9aa8b8;">${o.body}</p>
          </td></tr>
          <tr><td align="center" style="padding:28px 40px 40px 40px;text-align:center;">
            <a href="${o.url}" style="display:inline-block;background-color:#00B1F6;background-image:linear-gradient(180deg,#2cbcfa 0%,#009fe0 100%);color:#04222f;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 30px;border-radius:8px;">${o.cta}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 8px 0 8px;text-align:center;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5a6b7a;">LetShoot &middot; tu fot&oacute;grafo IA &middot; <a href="${APP}" style="color:#6b7c8b;text-decoration:underline;">letshoot.ai</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const secret = req.headers.get('x-run-secret') || body.secret || '';
    const { data: cfg } = await svc.from('app_config').select('value').eq('key', 'reminder_run_secret').maybeSingle();
    if (!cfg?.value || secret !== cfg.value) return reply({ ok: false, error: 'unauthorized' }, 401);

    const event: string = body.event || '';
    const creatorId: string = body.creator_id || '';
    const dryRun = body.dry_run === true;
    if (!['signup_info', 'kyc', 'lora'].includes(event) || !creatorId) return reply({ ok: false, error: 'event/creator_id inválidos' });

    const { data: model } = await svc.from('profiles').select('full_name, stage_name').eq('id', creatorId).single();
    const modelName = model?.stage_name || model?.full_name || 'Una modelo';

    // Destinatarios según el evento.
    const map = new Map<string, any>();
    const addAll = (arr: any[] | null | undefined) => {
      for (const p of arr || []) {
        if (!p) continue;
        if (p.staff_status === 'pending' || p.active === false) continue;
        map.set(p.id, p);
      }
    };
    const { data: admins } = await svc.from('profiles').select('id, email, full_name, role, staff_status, active').eq('role', 'admin');
    addAll(admins);

    if (event === 'signup_info') {
      // quien la trajo: su agencia + su agente
      const { data: ag } = await svc.from('agency_creators').select('agency_id').eq('creator_id', creatorId);
      const { data: ref } = await svc.from('agent_referrals').select('agent_id').eq('creator_id', creatorId);
      const bringerIds = [...(ag || []).map((r) => r.agency_id), ...(ref || []).map((r) => r.agent_id)].filter(Boolean);
      if (bringerIds.length) {
        const { data: bringers } = await svc.from('profiles').select('id, email, full_name, role, staff_status, active').in('id', bringerIds);
        addAll(bringers);
      }
    } else if (event === 'kyc') {
      const { data: kyc } = await svc.from('profiles').select('id, email, full_name, role, staff_status, active, capabilities').or('role.eq.admin,capabilities.cs.{kyc}');
      addAll(kyc);
    } else if (event === 'lora') {
      const { data: asg } = await svc.from('staff_assignments').select('staff_id').eq('creator_id', creatorId);
      const staffIds = (asg || []).map((a) => a.staff_id);
      if (staffIds.length) {
        const { data: team } = await svc.from('profiles').select('id, email, full_name, role, staff_status, active').in('id', staffIds).in('role', ['producer', 'chatter', 'supervisor']);
        addAll(team);
      }
    }

    const recipients = [...map.values()];

    const COPY: Record<string, { eyebrow: string; subject: string; title: string; body: string; cta: string; url: string; toast: string }> = {
      signup_info: {
        eyebrow: 'Nueva modelo', subject: `🆕 ${modelName} completó su registro`,
        title: `${modelName} completó su registro`, body: `${modelName} ya llenó sus datos. Tómala, asignale su equipo y arranquen.`,
        cta: 'Abrir el equipo', url: `${APP}/admin`, toast: `${modelName} completó su registro`,
      },
      kyc: {
        eyebrow: 'ID por revisar', subject: `🪪 ${modelName} subió su identidad`,
        title: `${modelName} subió su ID`, body: `${modelName} subió su documento de identidad. Está en la cola de Verificaciones esperando aprobación.`,
        cta: 'Revisar el ID', url: `${APP}/trabajo`, toast: `${modelName} subió su ID (por revisar)`,
      },
      lora: {
        eyebrow: 'Fotos del clon', subject: `📸 ${modelName} subió sus fotos del clon`,
        title: `${modelName} subió su set de fotos`, body: `${modelName} cargó las fotos de su clon (LoRA). Ya podés empezar a producirle contenido.`,
        cta: 'Ver en el trabajo', url: `${APP}/trabajo`, toast: `${modelName} subió sus fotos del clon`,
      },
    };
    const c = COPY[event];

    if (recipients.length && !dryRun) {
      await svc.from('notifications').insert(recipients.map((r) => ({
        user_id: r.id, kind: 'onboarding',
        meta: { event, creator: modelName, creator_id: creatorId, text: c.toast },
      })));
    }

    let emailed = 0;
    if (recipients.length && resendKey && !dryRun) {
      const htmlFor = (name: string) => brandedLayout({
        eyebrow: c.eyebrow, title: c.title,
        body: `Hola ${name}: ${c.body}`, cta: c.cta, url: c.url, pre: c.toast,
      });
      await Promise.all(recipients.filter((r) => r.email).map(async (r) => {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM, to: [r.email], subject: c.subject, html: htmlFor(r.full_name || 'equipo') }),
          });
          if (res.ok) emailed++;
        } catch { /* ignore */ }
      }));
    }

    return reply({ ok: true, event, dry_run: dryRun, notified: recipients.length, emailed });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
