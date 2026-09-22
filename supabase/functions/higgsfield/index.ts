// Proxy SERVIDOR ↔ Higgsfield API + cocina de generación (/kitchen).
// La llave se resuelve por request: app_config (set desde la app) → secreto de entorno.
// Base: api.higgsfield.ai. Solo admin/supervisor. Ver [[julia-parker-soul]].
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const HF_BASE = (Deno.env.get('HIGGSFIELD_BASE_URL') || 'https://api.higgsfield.ai').replace(/\/$/, '');
const DEFAULT_MODEL = 'higgsfield-ai/soul/v2/standard';
const DEFAULT_PAYLOAD = { prompt: 'professional portrait photo of a woman, studio lighting, high detail', aspect_ratio: '3:4', quality: '720p', batch_size: 1 };

function clean(v: unknown) {
  let s = String(v ?? '').replace(/[\r\n\t]+/g, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s.trim();
}
async function hf(path: string, keyId: string, keySecret: string, init: RequestInit = {}) {
  const res = await fetch(`${HF_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Key ${keyId}:${keySecret}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json, text };
}
// Saca el id de request de las distintas formas que puede devolver la API.
function reqIdOf(j: any) {
  return j?.request_id || j?.id || (Array.isArray(j?.jobs) ? (j.jobs[0]?.id || j.jobs[0]?.request_id) : null) || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'set_key') {
      const keyId = clean(body?.key_id), keySecret = clean(body?.key_secret);
      if (!keyId || !keySecret) return reply({ ok: false, error: 'Faltan las dos partes de la llave.' });
      const { error } = await svc.from('app_config').upsert([
        { key: 'higgsfield_key_id', value: keyId, updated_at: new Date().toISOString(), updated_by: user.id },
        { key: 'higgsfield_key_secret', value: keySecret, updated_at: new Date().toISOString(), updated_by: user.id },
      ], { onConflict: 'key' });
      if (error) return reply({ ok: false, error: `No se pudo guardar: ${error.message}` });
      return reply({ ok: true, saved: true });
    }

    // Resolver llave.
    let keyId = '', keySecret = '', source = 'none';
    const { data: cfg } = await svc.from('app_config').select('key, value').in('key', ['higgsfield_key_id', 'higgsfield_key_secret']);
    const cfgMap: Record<string, string> = {};
    (Array.isArray(cfg) ? cfg : []).forEach((r: any) => { cfgMap[r.key] = r.value; });
    if (cfgMap.higgsfield_key_id && cfgMap.higgsfield_key_secret) { keyId = clean(cfgMap.higgsfield_key_id); keySecret = clean(cfgMap.higgsfield_key_secret); source = 'app'; }
    else if (Deno.env.get('HIGGSFIELD_KEY_ID') && Deno.env.get('HIGGSFIELD_KEY_SECRET')) { keyId = clean(Deno.env.get('HIGGSFIELD_KEY_ID')); keySecret = clean(Deno.env.get('HIGGSFIELD_KEY_SECRET')); source = 'env'; }

    if (action === 'key_status') return reply({ ok: true, configured: !!(keyId && keySecret), source, base: HF_BASE });
    if (!keyId || !keySecret) return reply({ ok: false, error: 'Falta configurar la llave de Higgsfield. Pegala arriba y guardá.', needsKey: true });

    // ── Motor básico ──
    if (action === 'verify') {
      const r = await hf(`/estimate/${DEFAULT_MODEL}`, keyId, keySecret, { method: 'POST', body: JSON.stringify(DEFAULT_PAYLOAD) });
      if (r.ok) return reply({ ok: true, connected: true, quote: r.json, base: HF_BASE, source });
      if (r.status === 401 || r.status === 403) return reply({ ok: false, connected: false, error: 'La llave fue rechazada (401/403).', status: r.status, detail: r.json });
      return reply({ ok: true, connected: true, note: 'Auth OK; ajustar parámetros.', status: r.status, detail: r.json, base: HF_BASE, source });
    }
    if (action === 'generate') {
      const r = await hf(`/${String(body?.model || DEFAULT_MODEL)}`, keyId, keySecret, { method: 'POST', body: JSON.stringify(body?.payload || DEFAULT_PAYLOAD) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }
    if (action === 'status') {
      const id = String(body?.request_id || '');
      if (!id) return reply({ ok: false, error: 'Falta request_id.' });
      const r = await hf(`/requests/${id}/status`, keyId, keySecret, { method: 'GET' });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    // ── Identidad de la modelo (personaje API-nativo, v1) ──
    if (action === 'create_character') {
      const creatorId = String(body?.creator_id || '');
      const name = String(body?.name || '').trim();
      const imgs = Array.isArray(body?.image_urls) ? body.image_urls.filter((u: unknown) => typeof u === 'string') : [];
      if (!name || imgs.length === 0) return reply({ ok: false, error: 'Falta name o image_urls.' });
      const r = await hf(`/v1/custom-references`, keyId, keySecret, { method: 'POST', body: JSON.stringify({ name, input_images: imgs.map((image_url: string) => ({ type: 'image_url', image_url })) }) });
      const cid = (r.json as any)?.id || (r.json as any)?.character_id || null;
      if (r.ok && cid && creatorId) {
        await svc.from('creator_identity').upsert({ creator_id: creatorId, character_id: cid, status: 'ready', n_photos: imgs.length, updated_at: new Date().toISOString() });
      }
      return reply({ ok: r.ok, status: r.status, result: r.json, character_id: cid });
    }
    if (action === 'character_status') {
      const cid = String(body?.character_id || '');
      if (!cid) return reply({ ok: false, error: 'Falta character_id.' });
      const r = await hf(`/v1/custom-references/${cid}`, keyId, keySecret, { method: 'GET' });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    // ── /kitchen: recrear una viral con la cara de la modelo ──
    if (action === 'recreate') {
      const creatorId = String(body?.creator_id || '');
      const ref = String(body?.reference_url || '');
      const prompt = String(body?.prompt || 'recreate this photo — same pose, framing and vibe, natural realistic look, high quality');
      if (!creatorId || !ref) return reply({ ok: false, error: 'Falta creator_id o reference_url.' });
      const { data: idrow } = await svc.from('creator_identity').select('character_id').eq('creator_id', creatorId).maybeSingle();
      const charId = (idrow as any)?.character_id;
      if (!charId) return reply({ ok: false, error: 'Esa creadora todavía no tiene identidad creada.' });
      const v1body = { prompt, custom_reference_id: charId, custom_reference_strength: 1, image_reference_url: ref, quality: '1080p', aspect_ratio: '3:4' };
      const r = await hf(`/v1/text2image/soul`, keyId, keySecret, { method: 'POST', body: JSON.stringify(v1body) });
      const rid = reqIdOf(r.json);
      // costo estimado (best-effort) para el contador.
      let credits: number | null = null, usd: number | null = null;
      try { const e = await hf(`/estimate/${DEFAULT_MODEL}`, keyId, keySecret, { method: 'POST', body: JSON.stringify(DEFAULT_PAYLOAD) }); credits = Number((e.json as any)?.credits) || null; usd = Number((e.json as any)?.usd) || null; } catch { /* noop */ }
      const { data: gen } = await svc.from('generations').insert({ creator_id: creatorId, reference_url: ref, request_id: rid, status: rid ? 'queued' : 'failed', credits, usd, model: 'soul-v1', created_by: user.id }).select('id').single();
      return reply({ ok: !!rid, status: r.status, generation_id: (gen as any)?.id, request_id: rid, detail: rid ? undefined : r.json });
    }
    if (action === 'gen_poll') {
      const gid = String(body?.generation_id || '');
      const { data: g } = await svc.from('generations').select('request_id, status').eq('id', gid).maybeSingle();
      const rid = (g as any)?.request_id;
      if (!rid) return reply({ ok: false, error: 'Generación sin request.' });
      const r = await hf(`/requests/${rid}/status`, keyId, keySecret, { method: 'GET' });
      const st = (r.json as any)?.status;
      if (st === 'completed') {
        const imgs = ((r.json as any)?.images || []).map((x: any) => x?.url).filter(Boolean);
        await svc.from('generations').update({ status: 'done', result_url: imgs[0] || null }).eq('id', gid);
        return reply({ ok: true, status: 'done', result_url: imgs[0] || null });
      }
      if (['failed', 'nsfw', 'canceled'].includes(st)) { await svc.from('generations').update({ status: 'failed' }).eq('id', gid); return reply({ ok: true, status: 'failed', detail: r.json }); }
      return reply({ ok: true, status: st || 'in_progress' });
    }
    if (action === 'approve_gen') {
      const gid = String(body?.generation_id || '');
      const approve = body?.approve !== false;
      const { data: g } = await svc.from('generations').select('creator_id, result_url').eq('id', gid).maybeSingle();
      if (!g) return reply({ ok: false, error: 'No existe.' });
      await svc.from('generations').update({ status: approve ? 'approved' : 'rejected' }).eq('id', gid);
      if (approve && (g as any).result_url && (g as any).creator_id) {
        await svc.from('creator_vault').insert({ creator_id: (g as any).creator_id, kind: 'ia', url: (g as any).result_url, caption: 'Generada en /kitchen' });
      }
      return reply({ ok: true });
    }
    if (action === 'kitchen_summary') {
      const { data: gens } = await svc.from('generations').select('credits, usd, status');
      let credits = 0, usd = 0, count = 0;
      (Array.isArray(gens) ? gens : []).forEach((g: any) => { if (g.status !== 'failed') { credits += Number(g.credits || 0); usd += Number(g.usd || 0); count += 1; } });
      const { data: ids } = await svc.from('creator_identity').select('creator_id, status, character_id, n_photos');
      return reply({ ok: true, total_credits: credits, total_usd: usd, total_images: count, identities: Array.isArray(ids) ? ids : [] });
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
