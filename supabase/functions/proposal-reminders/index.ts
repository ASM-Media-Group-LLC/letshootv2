// Edge function: proposal-reminders
// Recordatorios escalados (24h · 72h · 7d, máx 3) a quien tiene algo PENDIENTE:
//   · kind 'approval' → aprobación pendiente (externa: approver_email; interna:
//     el revisor del equipo). CTA = link con ?approve=<token>.
//   · kind 'response' → la creadora aún no dio feedback. CTA = su link limpio.
// Acciones:
//   · action:'run'   → lo llama el cron (pg_cron/pg_net). Requiere el header
//     x-run-secret == app_config.reminder_run_secret. Soporta {dry_run:true}.
//   · action:'nudge' → botón "Recordar ahora" del admin. Requiere staff (JWT).
// Server-side con service role; correo branded vía Resend (igual que invite).
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
const THRESHOLDS_H = [24, 72, 168]; // escalado: 24h, 72h, 7 días

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

const isEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const splitEmails = (s: string) => String(s || '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => isEmail(x));

// Contenido del recordatorio por tipo.
function buildEmail(kind: string, name: string, link: string, token: string | null, lang: string) {
  const es = lang !== 'en';
  const who = (name || '').trim() || (es ? 'la creadora' : 'the creator');
  if (kind === 'approval') {
    const url = `${APP}/p/${encodeURIComponent(link)}${token ? `?approve=${encodeURIComponent(token)}` : ''}`;
    return es
      ? { subject: 'Recordatorio: tenés una propuesta para aprobar', eyebrow: 'Pendiente de aprobación', title: 'Todavía falta tu revisión', body: `La propuesta para <b style="color:#fff">${who}</b> sigue esperando tu aprobación. Ábrela, revisá los looks y aprobá o rechazá.`, cta: 'Revisar y aprobar', pre: 'Tenés una propuesta pendiente de aprobar en LetShoot.', url }
      : { subject: 'Reminder: a proposal is waiting for your approval', eyebrow: 'Pending approval', title: 'Your review is still needed', body: `The proposal for <b style="color:#fff">${who}</b> is still waiting for your approval. Open it, review the looks and approve or reject.`, cta: 'Review & approve', pre: 'You have a proposal pending approval on LetShoot.', url };
  }
  // response
  const url = `${APP}/p/${encodeURIComponent(link)}`;
  return es
    ? { subject: 'Recordatorio: tenés contenido para revisar', eyebrow: 'Selección privada', title: `${who}, todavía te esperamos`, body: 'Tenés una selección de looks lista para mirar. Entrá y marcá los que te gusten — tu opinión llega directo a nuestro equipo.', cta: 'Ver mi propuesta', pre: 'Tu propuesta privada de LetShoot sigue esperando.', url }
    : { subject: 'Reminder: you have content to review', eyebrow: 'Private selection', title: `${who}, we're still waiting`, body: 'You have a selection of looks ready to view. Open it and mark the ones you like — your feedback goes straight to our team.', cta: 'See my proposal', pre: 'Your private LetShoot proposal is still waiting.', url };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'run');
    const dryRun = !!body.dry_run;
    const now = Date.now();

    // Emails de una creadora ya invitada que AÚN no dio feedback + los pendientes
    // de aprobación. Devuelve la lista de "candidatos" con su kind, t0 y destino.
    const buildCandidates = async () => {
      const cands: Array<{ pid: string; kind: string; link: string; lang: string; name: string; token: string | null; t0: number; emails: string[] }> = [];
      // Aprobación pendiente (externa + interna)
      const { data: appr } = await svc.from('photo_proposals')
        .select('id, link_id, lang, recipient_name, recipient_kind, approver_email, internal_reviewer_id, approval_token, approval_sent_at, created_at, expires_at, link_killed')
        .eq('status', 'published').eq('approval_required', true).eq('approval_status', 'pending');
      for (const p of appr || []) {
        if (p.link_killed) continue;
        if (p.expires_at && new Date(p.expires_at).getTime() < now) continue;
        let emails: string[] = [];
        if (p.recipient_kind === 'internal' && p.internal_reviewer_id) {
          const { data: rev } = await svc.from('profiles').select('email').eq('id', p.internal_reviewer_id).maybeSingle();
          if (rev?.email && isEmail(rev.email)) emails = [rev.email.toLowerCase()];
        } else {
          emails = splitEmails(p.approver_email);
        }
        if (!emails.length) continue;
        cands.push({ pid: p.id, kind: 'approval', link: p.link_id, lang: p.lang || 'es', name: p.recipient_name || '', token: p.approval_token || null, t0: new Date(p.approval_sent_at || p.created_at).getTime(), emails });
      }
      // Respuesta de la creadora pendiente
      const { data: resp } = await svc.from('photo_proposals')
        .select('id, link_id, lang, recipient_name, recipient_email, recipient_kind, approval_required, approval_status, approved_at, created_at, expires_at, link_killed')
        .eq('status', 'published').neq('recipient_kind', 'internal');
      const respPending = (resp || []).filter((p: any) =>
        !p.link_killed && (!p.expires_at || new Date(p.expires_at).getTime() >= now) &&
        (p.approval_required !== true || p.approval_status === 'approved') && isEmail(String(p.recipient_email || '')));
      if (respPending.length) {
        const ids = respPending.map((p: any) => p.id);
        const { data: fb } = await svc.from('photo_proposal_feedback').select('proposal_id').eq('reviewer_kind', 'creator').in('proposal_id', ids);
        const responded = new Set((fb || []).map((f: any) => f.proposal_id));
        for (const p of respPending) {
          if (responded.has(p.id)) continue;
          cands.push({ pid: p.id, kind: 'response', link: p.link_id, lang: p.lang || 'es', name: p.recipient_name || '', token: null, t0: new Date(p.approved_at || p.created_at).getTime(), emails: [String(p.recipient_email).toLowerCase()] });
        }
      }
      return cands;
    };

    const sentReminder = async (c: any, dry: boolean) => {
      const e = buildEmail(c.kind, c.name, c.link, c.token, c.lang);
      const html = brandedLayout(e);
      const results: any[] = [];
      if (!dry) {
        for (const to of c.emails) {
          const r = await sendResend(to, e.subject, html);
          await svc.from('email_log').insert({ template: `proposal_reminder_${c.kind}`, recipient: to, subject: e.subject, resend_id: (r as any).id || null, lang: c.lang }).then(() => {}, () => {});
          results.push({ to, ok: (r as any).ok, error: (r as any).error });
        }
      }
      return { to: c.emails, subject: e.subject, results };
    };

    // ── RUN (cron) ────────────────────────────────────────────────────────
    if (action === 'run') {
      const secret = req.headers.get('x-run-secret') || body.secret || '';
      const { data: cfg } = await svc.from('app_config').select('value').eq('key', 'reminder_run_secret').maybeSingle();
      if (!cfg?.value || secret !== cfg.value) return reply({ ok: false, error: 'unauthorized' }, 401);

      const cands = await buildCandidates();
      const out: any[] = [];
      for (const c of cands) {
        const { data: rem } = await svc.from('proposal_reminders').select('count, paused').eq('proposal_id', c.pid).eq('kind', c.kind).maybeSingle();
        if (rem?.paused) continue;                 // pausado a mano → no recordar
        const sent = rem?.count ?? 0;
        const elapsedH = (now - c.t0) / 3600000;
        const due = THRESHOLDS_H.filter((t) => t <= elapsedH).length; // 0..3
        if (due <= sent || sent >= 3) continue;
        const send = await sentReminder(c, dryRun);
        if (!dryRun) {
          await svc.from('proposal_reminders').upsert({ proposal_id: c.pid, kind: c.kind, count: sent + 1, last_sent_at: new Date().toISOString() }, { onConflict: 'proposal_id,kind' });
        }
        out.push({ proposal: c.link, kind: c.kind, reminder: sent + 1, ...send });
      }
      return reply({ ok: true, dry_run: dryRun, candidates: cands.length, sent: out.length, items: out });
    }

    // ── NUDGE (botón manual, staff) ─────────────────────────────────────────
    if (action === 'nudge') {
      const authz = req.headers.get('Authorization') || '';
      const token = authz.replace(/^Bearer\s+/i, '');
      if (!token) return reply({ ok: false, error: 'no auth' }, 401);
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
      const { data: staffOk } = await userClient.rpc('is_staff');
      if (!staffOk) return reply({ ok: false, error: 'solo staff' }, 403);

      const pid = String(body.proposal_id || '');
      const kind = body.kind === 'approval' ? 'approval' : 'response';
      if (!pid) return reply({ ok: false, error: 'falta proposal_id' });
      const cands = await buildCandidates();
      const c = cands.find((x) => x.pid === pid && x.kind === kind);
      if (!c) return reply({ ok: false, error: 'Esa propuesta ya no está pendiente de ese recordatorio.' });
      const send = await sentReminder(c, false);
      const { data: rem } = await svc.from('proposal_reminders').select('count').eq('proposal_id', pid).eq('kind', kind).maybeSingle();
      const sent = rem?.count ?? 0;
      await svc.from('proposal_reminders').upsert({ proposal_id: pid, kind, count: Math.min(sent + 1, 3), last_sent_at: new Date().toISOString() }, { onConflict: 'proposal_id,kind' });
      return reply({ ok: true, nudged: true, ...send });
    }

    // ── SET_PAUSE (staff) — parar/reanudar recordatorios a mano ─────────────
    if (action === 'set_pause') {
      const authz = req.headers.get('Authorization') || '';
      const token = authz.replace(/^Bearer\s+/i, '');
      if (!token) return reply({ ok: false, error: 'no auth' }, 401);
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
      const { data: staffOk } = await userClient.rpc('is_staff');
      if (!staffOk) return reply({ ok: false, error: 'solo staff' }, 403);
      const pid = String(body.proposal_id || '');
      const kind = body.kind === 'approval' ? 'approval' : 'response';
      const paused = !!body.paused;
      if (!pid) return reply({ ok: false, error: 'falta proposal_id' });
      const { data: rem } = await svc.from('proposal_reminders').select('count').eq('proposal_id', pid).eq('kind', kind).maybeSingle();
      await svc.from('proposal_reminders').upsert({ proposal_id: pid, kind, count: rem?.count ?? 0, paused }, { onConflict: 'proposal_id,kind' });
      return reply({ ok: true, paused });
    }

    return reply({ ok: false, error: 'acción desconocida' }, 400);
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
