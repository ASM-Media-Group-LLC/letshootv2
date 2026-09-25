// Edge function: feedback-flush
// Cron (cada 5 min) junta las reacciones de cada modelo (love/change) que llevan
// >5 min sin nueva actividad y aun no se avisaron, y manda UN resumen al equipo de
// ESA modelo: los asignados (Editor=producer / Manager=chatter / PR=supervisor via
// staff_assignments) + admins. Aviso = notificacion in-app (campanita) + correo branded.
// Resuelve el problema de la modelo que reacciona pero NO termina la sesion: igual llega.
// Auth: x-run-secret == app_config.reminder_run_secret (mismo patron que proposal-reminders).
// Server-side con service role. Soporta {dry_run:true} y {minutes:N} para pruebas.
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

// Email branded, estable en todos los clientes (tabla + inline CSS), igual que proposal-reminders.
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

    const minutes = Number.isFinite(body.minutes) ? Number(body.minutes) : 5;
    const dryRun = body.dry_run === true;
    const cutoff = new Date(Date.now() - minutes * 60000).toISOString();

    // Reacciones pendientes de avisar (solo las que dejó la creadora).
    const { data: pend } = await svc.from('feedback')
      .select('id, creator_id, kind, updated_at')
      .is('team_notified_at', null)
      .eq('author_role', 'creator');
    const rows = pend || [];
    if (!rows.length) return reply({ ok: true, creators: 0, notified: 0, emailed: 0 });

    // Agrupar por modelo; solo las INACTIVAS (última reacción <= cutoff de 5 min).
    const byCreator = new Map<string, { ids: string[]; love: number; change: number; last: string }>();
    for (const r of rows) {
      const g = byCreator.get(r.creator_id) || { ids: [], love: 0, change: 0, last: r.updated_at };
      g.ids.push(r.id);
      if (r.kind === 'love') g.love++; else g.change++;
      if (r.updated_at > g.last) g.last = r.updated_at;
      byCreator.set(r.creator_id, g);
    }
    const ready = [...byCreator.entries()].filter(([, g]) => g.last <= cutoff);
    if (!ready.length) return reply({ ok: true, creators: 0, waiting: byCreator.size, notified: 0, emailed: 0 });

    let notified = 0, emailed = 0, done = 0;
    for (const [creatorId, g] of ready) {
      const { data: model } = await svc.from('profiles').select('full_name, stage_name').eq('id', creatorId).single();
      const modelName = model?.stage_name || model?.full_name || 'Una modelo';

      // Equipo de ESA modelo: asignados (Editor/Manager/PR) + admins.
      const { data: asg } = await svc.from('staff_assignments').select('staff_id').eq('creator_id', creatorId);
      const staffIds = (asg || []).map((a) => a.staff_id);
      const assignedRes = staffIds.length
        ? await svc.from('profiles').select('id, email, full_name, role, staff_status, active').in('id', staffIds).in('role', ['producer', 'chatter', 'supervisor'])
        : { data: [] as any[] };
      const { data: admins } = await svc.from('profiles').select('id, email, full_name, role, staff_status, active').eq('role', 'admin');
      const map = new Map<string, any>();
      for (const p of [...(assignedRes.data || []), ...(admins || [])]) {
        if (p.staff_status === 'pending' || p.active === false) continue;
        map.set(p.id, p);
      }
      const recipients = [...map.values()];

      const summary = [g.love ? `${g.love} ❤️ le gustaron` : '', g.change ? `${g.change} ✏️ pide cambio` : ''].filter(Boolean).join(' · ');
      const subject = g.change ? `✏️ ${modelName} pidió ${g.change} cambio${g.change > 1 ? 's' : ''}` : `❤️ ${modelName} reaccionó a sus fotos`;

      if (recipients.length && !dryRun) {
        await svc.from('notifications').insert(recipients.map((r) => ({
          user_id: r.id, kind: 'feedback',
          meta: { creator: modelName, love: g.love, change: g.change, asset: summary, feedback_kind: g.change ? 'change' : 'love' },
        })));
      }
      notified += recipients.length;

      if (recipients.length && resendKey && !dryRun) {
        const htmlFor = (name: string) => brandedLayout({
          eyebrow: 'Reacciones de tu modelo',
          title: `${modelName} revisó sus fotos`,
          body: `Hola ${name}: ${modelName} dejó su opinión — <b style="color:#ffffff">${summary}</b>.${g.change ? ' Hay que resolver lo que pidió cambiar.' : ''} Entrá a verlas en tu panel.`,
          cta: 'Ver las reacciones', url: `${APP}/trabajo`, pre: `${modelName}: ${summary}`,
        });
        await Promise.all(recipients.filter((r) => r.email).map(async (r) => {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: FROM, to: [r.email], subject, html: htmlFor(r.full_name || 'equipo') }),
            });
            if (res.ok) emailed++;
          } catch { /* ignore individual failures */ }
        }));
      }

      // Marcar como avisado (aunque no haya destinatarios, para no reintentar por siempre).
      if (!dryRun) await svc.from('feedback').update({ team_notified_at: new Date().toISOString() }).in('id', g.ids);
      done++;
    }

    return reply({ ok: true, dry_run: dryRun, creators: done, notified, emailed });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
