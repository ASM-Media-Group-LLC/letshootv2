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
// Saca las URLs de imagen de las distintas formas del resultado (job_set, jobs[], results[], images[]).
function imgUrlsOf(j: any): string[] {
  const urls: string[] = [];
  const push = (u: unknown) => { if (typeof u === 'string' && /^https?:\/\//.test(u)) urls.push(u); };
  const scan = (node: any, depth = 0) => {
    if (!node || depth > 6) return;
    if (typeof node === 'string') { push(node); return; }
    if (Array.isArray(node)) { node.forEach((n) => scan(n, depth + 1)); return; }
    if (typeof node === 'object') {
      for (const k of ['url', 'image_url', 'image', 'output_url', 'result_url', 'signed_url', 'min', 'raw']) push(node[k]);
      for (const k of ['images', 'results', 'jobs', 'outputs', 'output', 'result', 'assets', 'data']) if (node[k]) scan(node[k], depth + 1);
    }
  };
  scan(j);
  return [...new Set(urls)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    // ── Worker del cocinero (sin usuario; protegido por secreto en app_config) ──
    // Corre en la Mac del dueño con el CLI logueado; drena la cola de generations.
    if (action === 'cook_next' || action === 'cook_result' || action === 'sync_balance') {
      const { data: sc } = await svc.from('app_config').select('value').eq('key', 'kitchen_worker_secret').maybeSingle();
      const secret = clean((body as any)?.worker_secret);
      if (!secret || !(sc as any)?.value || secret !== clean((sc as any).value)) return reply({ ok: false, error: 'Worker no autorizado.' });
      if (action === 'sync_balance') {
        const bal = Number((body as any)?.credits);
        if (!isNaN(bal)) await svc.from('app_config').upsert({ key: 'higgsfield_balance', value: String(bal), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        return reply({ ok: true });
      }
      if (action === 'cook_next') {
        const { data: job } = await svc.from('generations').select('id, creator_id, reference_url').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (!job) return reply({ ok: true, job: null });
        const { data: idrow } = await svc.from('creator_identity').select('character_id, engine').eq('creator_id', (job as any).creator_id).maybeSingle();
        await svc.from('generations').update({ status: 'in_progress' }).eq('id', (job as any).id);
        return reply({ ok: true, job: { ...(job as any), character_id: (idrow as any)?.character_id || null } });
      }
      const gid = String((body as any)?.generation_id || '');
      const rurl = (body as any)?.result_url || null;
      const good = (body as any)?.ok !== false && !!rurl;
      await svc.from('generations').update({ status: good ? 'done' : 'failed', result_url: rurl, credits: Number((body as any)?.credits) || null, usd: Number((body as any)?.usd) || null, prompt: (body as any)?.prompt || null, note: (body as any)?.note || null }).eq('id', gid);
      return reply({ ok: true });
    }

    // ── Auth de usuario (admin/supervisor) para todo lo demás ──
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });

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

    // Guardar/consultar otras llaves (Apify para el scraper, Anthropic para la visión del cocinero).
    if (action === 'set_config') {
      const ALLOW = ['apify_token', 'anthropic_api_key'];
      const k = String((body as any)?.k || ''); const v = clean((body as any)?.v);
      if (!ALLOW.includes(k)) return reply({ ok: false, error: 'Clave no permitida.' });
      if (!v) return reply({ ok: false, error: 'Falta el valor de la llave.' });
      const { error } = await svc.from('app_config').upsert({ key: k, value: v, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: 'key' });
      if (error) return reply({ ok: false, error: `No se pudo guardar: ${error.message}` });
      return reply({ ok: true, saved: true });
    }
    if (action === 'config_status') {
      const { data } = await svc.from('app_config').select('key').in('key', ['apify_token', 'anthropic_api_key']);
      const have = new Set((Array.isArray(data) ? data : []).map((r: any) => r.key));
      return reply({ ok: true, apify: have.has('apify_token'), anthropic: have.has('anthropic_api_key') });
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
      const r = await hf(`/${String(body?.model || DEFAULT_MODEL)}`, keyId, keySecret, { method: 'POST', body: JSON.stringify({ params: (body?.payload || DEFAULT_PAYLOAD) }) });
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
      const v1body = { prompt, custom_reference_id: charId, custom_reference_strength: 1, image_reference_url: ref, width_and_height: '1536x2048', quality: '1080p', batch_size: 1 };
      const r = await hf(`/v1/text2image/soul`, keyId, keySecret, { method: 'POST', body: JSON.stringify({ params: v1body }) });
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
      const st = String((r.json as any)?.status || '').toLowerCase();
      const imgs = imgUrlsOf(r.json);
      if (['completed', 'succeeded', 'success', 'done', 'finished'].includes(st) || imgs.length) {
        await svc.from('generations').update({ status: 'done', result_url: imgs[0] || null }).eq('id', gid);
        return reply({ ok: true, status: 'done', result_url: imgs[0] || null, images: imgs });
      }
      if (['failed', 'nsfw', 'canceled', 'error', 'rejected'].includes(st)) { await svc.from('generations').update({ status: 'failed' }).eq('id', gid); return reply({ ok: true, status: 'failed', detail: r.json }); }
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
      const { data: bal } = await svc.from('app_config').select('value, updated_at').eq('key', 'higgsfield_balance').maybeSingle();
      return reply({ ok: true, total_credits: credits, total_usd: usd, total_images: count, identities: Array.isArray(ids) ? ids : [], balance: (bal as any)?.value ? Number((bal as any).value) : null, balance_at: (bal as any)?.updated_at || null });
    }

    // ── Scraper de virales (Apify → Instagram por nicho/hashtag de la modelo) ──
    if (action === 'scrape') {
      const creatorId = String(body?.creator_id || '');
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
      const apToken = clean((tk as any)?.value);
      if (!apToken) return reply({ ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' });
      const { data: sp } = await svc.from('creator_search_profile').select('niches, hashtags').eq('creator_id', creatorId).maybeSingle();
      const tags = [...(((sp as any)?.hashtags) || []), ...(((sp as any)?.niches) || [])]
        .map((h: string) => String(h).trim().replace(/^#/, '')).filter(Boolean).slice(0, 5);
      if (tags.length === 0) return reply({ ok: false, error: 'Configurá al menos un nicho o hashtag para esta modelo (arriba).' });
      const limit = Math.min(Number(body?.limit) || 24, 50);
      const runUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apToken)}`;
      let items: any = [];
      try {
        const ar = await fetch(runUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashtags: tags, resultsLimit: limit }) });
        items = await ar.json();
        if (!ar.ok) return reply({ ok: false, error: `Apify devolvió ${ar.status}.`, detail: items });
      } catch (e) { return reply({ ok: false, error: `No se pudo llamar al scraper: ${(e as Error)?.message}` }); }
      if (!Array.isArray(items)) return reply({ ok: false, error: 'El scraper no devolvió una lista.', detail: items });
      let saved = 0;
      for (const it of items) {
        const imgUrl = it?.displayUrl || it?.imageUrl || (Array.isArray(it?.images) ? it.images[0] : null);
        if (!imgUrl) continue;
        const row: Record<string, unknown> = {
          creator_id: creatorId, kind: 'ref', url: imgUrl, source_platform: 'instagram',
          source_handle: it?.ownerUsername || null, source_url: it?.url || null,
          likes: Number(it?.likesCount) || null, vibe: tags[0] || null,
          caption: it?.caption ? String(it.caption).slice(0, 200) : null,
        };
        const { error } = await svc.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url' });
        if (!error) saved += 1;
      }
      return reply({ ok: true, found: items.length, saved });
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
