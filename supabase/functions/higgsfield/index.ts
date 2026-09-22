// Proxy SERVIDOR ↔ Higgsfield API. La llave NUNCA toca el navegador.
// La llave se puede setear DESDE la app (/conexion → action set_key, se guarda en
// app_config vía service role) o por secreto de entorno. Se lee dinámica por request:
// primero app_config, si no el secreto HIGGSFIELD_KEY_ID/SECRET. Base: api.higgsfield.ai
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

// Limpia un valor de llave: saca saltos de línea, tabs y espacios de los bordes, y
// comillas envolventes (evita el error "not a valid ByteString" del header).
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // 1) Auth: admin o supervisor.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) {
      return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });
    }

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    // Guardar la llave desde la app (limpia y persiste en app_config).
    if (action === 'set_key') {
      const keyId = clean(body?.key_id);
      const keySecret = clean(body?.key_secret);
      if (!keyId || !keySecret) return reply({ ok: false, error: 'Faltan las dos partes de la llave.' });
      const rows = [
        { key: 'higgsfield_key_id', value: keyId, updated_at: new Date().toISOString(), updated_by: user.id },
        { key: 'higgsfield_key_secret', value: keySecret, updated_at: new Date().toISOString(), updated_by: user.id },
      ];
      const { error } = await svc.from('app_config').upsert(rows, { onConflict: 'key' });
      if (error) return reply({ ok: false, error: `No se pudo guardar: ${error.message}` });
      return reply({ ok: true, saved: true, id_len: keyId.length, secret_len: keySecret.length });
    }

    // Resolver la llave: primero app_config, si no el secreto de entorno.
    let keyId = '', keySecret = '', source = 'none';
    const { data: cfg } = await svc.from('app_config').select('key, value').in('key', ['higgsfield_key_id', 'higgsfield_key_secret']);
    const cfgMap: Record<string, string> = {};
    (Array.isArray(cfg) ? cfg : []).forEach((r: { key: string; value: string }) => { cfgMap[r.key] = r.value; });
    if (cfgMap.higgsfield_key_id && cfgMap.higgsfield_key_secret) {
      keyId = clean(cfgMap.higgsfield_key_id); keySecret = clean(cfgMap.higgsfield_key_secret); source = 'app';
    } else if (Deno.env.get('HIGGSFIELD_KEY_ID') && Deno.env.get('HIGGSFIELD_KEY_SECRET')) {
      keyId = clean(Deno.env.get('HIGGSFIELD_KEY_ID')); keySecret = clean(Deno.env.get('HIGGSFIELD_KEY_SECRET')); source = 'env';
    }

    if (action === 'key_status') {
      return reply({ ok: true, configured: !!(keyId && keySecret), source, base: HF_BASE });
    }

    if (!keyId || !keySecret) {
      return reply({ ok: false, error: 'Falta configurar la llave de Higgsfield. Pegala arriba y guardá.', needsKey: true });
    }

    if (action === 'verify') {
      const r = await hf(`/estimate/${DEFAULT_MODEL}`, keyId, keySecret, { method: 'POST', body: JSON.stringify(DEFAULT_PAYLOAD) });
      if (r.ok) return reply({ ok: true, connected: true, quote: r.json, base: HF_BASE, source });
      if (r.status === 401 || r.status === 403) return reply({ ok: false, connected: false, error: 'La llave fue rechazada (401/403). Revisala.', status: r.status, detail: r.json });
      return reply({ ok: true, connected: true, note: 'Auth OK; el modelo por defecto necesita ajuste de parámetros.', status: r.status, detail: r.json, base: HF_BASE, source });
    }
    if (action === 'estimate') {
      const r = await hf(`/estimate/${String(body?.model || DEFAULT_MODEL)}`, keyId, keySecret, { method: 'POST', body: JSON.stringify(body?.payload || DEFAULT_PAYLOAD) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
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
    if (action === 'create_character') {
      const name = String(body?.name || '').trim();
      const imgs = Array.isArray(body?.image_urls) ? body.image_urls.filter((u: unknown) => typeof u === 'string') : [];
      if (!name || imgs.length === 0) return reply({ ok: false, error: 'Falta name o image_urls.' });
      const r = await hf(`/v1/custom-references`, keyId, keySecret, { method: 'POST', body: JSON.stringify({ name, input_images: imgs.map((image_url: string) => ({ type: 'image_url', image_url })) }) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }
    if (action === 'character_status') {
      const cid = String(body?.character_id || '');
      if (!cid) return reply({ ok: false, error: 'Falta character_id.' });
      const r = await hf(`/v1/custom-references/${cid}`, keyId, keySecret, { method: 'GET' });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
