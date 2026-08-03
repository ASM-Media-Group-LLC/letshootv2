// Edge function: notify-request
// When a creator or agency submits a content request, notify every internal team
// member who attends requests (has_cap 'requests', plus admins): an in-app
// notification (drives the live pop-up) + a transactional email. Service role.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const FROM = 'LetShoot <noreply@letshoot.ai>';
function reply(o: unknown, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } }); }

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

    const { request_id } = await req.json().catch(() => ({}));
    if (!request_id) return reply({ ok: false, error: 'request_id requerido.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: rq } = await svc.from('requests').select('id, title, creator_id, chatter_id, ref_images').eq('id', request_id).single();
    if (!rq) return reply({ ok: false, error: 'Pedido no encontrado.' });
    // Only the requester (creator or the agency/manager on the request) may fan out.
    if (user.id !== rq.creator_id && user.id !== rq.chatter_id) return reply({ ok: false, error: 'No autorizado.' });

    const { data: who } = await svc.from('profiles').select('full_name, stage_name').eq('id', user.id).single();
    const requester = who?.stage_name || who?.full_name || 'una creadora';

    // Recipients: admins + approved staff who attend requests.
    const { data: staff } = await svc.from('profiles')
      .select('id, email, full_name, role, capabilities, staff_status')
      .in('role', ['admin', 'supervisor', 'producer', 'chatter']);
    const recipients = (staff || []).filter((s) =>
      s.role === 'admin' || ((s.capabilities || []).includes('requests') && s.staff_status !== 'pending'));

    if (recipients.length) {
      await svc.from('notifications').insert(recipients.map((r) => ({
        user_id: r.id, kind: 'request',
        meta: { request_id: rq.id, title: rq.title, requester, has_refs: (rq.ref_images || []).length > 0 },
      })));
    }

    // Emails (graceful no-op if Resend is not configured).
    let emailed = 0;
    if (resendKey) {
      const html = (name: string) => `<!doctype html><body style="margin:0;background:#0a0f14;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#101820;border:1px solid #1e2a35;border-radius:16px;padding:32px"><div style="font-size:22px;font-weight:bold;color:#fff;margin-bottom:4px">Let<span style="color:#00AFF0">Shoot</span></div><h1 style="color:#fff;font-size:19px;margin:18px 0 8px">Nuevo pedido de ${requester}</h1><p style="color:#9db2c3;font-size:14px;line-height:1.6;margin:0 0 8px">Hola ${name}, entró un pedido de contenido para atender:</p><p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 22px">“${rq.title || 'Pedido'}”</p><a href="https://letshoot.ai/trabajo" style="display:inline-block;background:#00AFF0;color:#04151f;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px;text-decoration:none">Ver el pedido</a><p style="color:#4a5a68;font-size:11px;margin:26px 0 0">LetShoot · letshoot.ai</p></div></body>`;
      await Promise.all(recipients.filter((r) => r.email).map(async (r) => {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM, to: [r.email], subject: `📥 Nuevo pedido de ${requester}`, html: html(r.full_name || 'equipo') }),
          });
          if (res.ok) emailed++;
        } catch { /* ignore individual failures */ }
      }));
    }

    return reply({ ok: true, notified: recipients.length, emailed });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
