// Proxy SERVIDOR ↔ Higgsfield API. La llave NUNCA toca el navegador: vive solo
// como secreto de esta edge function (HIGGSFIELD_KEY_ID / HIGGSFIELD_KEY_SECRET).
// Solo admin/supervisor puede llamarla. Base actual del API: https://api.higgsfield.ai
// (auth 'Authorization: Key ID:SECRET'). Ver memoria [[julia-parker-soul]].
//
// Acciones (body.action):
//   verify   → confirma que la llave está bien (estimate contra soul/v2/standard).
//   estimate → cotiza un payload (no cobra).           { model?, payload }
//   generate → manda a generar (cobra al completar).   { model?, payload }
//   status   → estado + imágenes de una generación.    { request_id }
//   upload_url → pide URL firmada para subir una foto de referencia. { content_type }
//   create_character → crea un personaje API-nativo (identidad).  { name, image_urls[] }
//   character_status → estado del personaje.            { character_id }
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
const HF_KEY_ID = Deno.env.get('HIGGSFIELD_KEY_ID') || '';
const HF_KEY_SECRET = Deno.env.get('HIGGSFIELD_KEY_SECRET') || '';
const HF_AUTH = `Key ${HF_KEY_ID}:${HF_KEY_SECRET}`;
// Modelo por defecto para la foto de prueba: el Soul v2 estándar (el más barato).
const DEFAULT_MODEL = 'higgsfield-ai/soul/v2/standard';
const DEFAULT_PAYLOAD = { prompt: 'professional portrait photo of a woman, studio lighting, high detail', aspect_ratio: '3:4', quality: '720p', batch_size: 1 };

// fetch a Higgsfield con la auth inyectada + parseo robusto de la respuesta.
async function hf(path: string, init: RequestInit = {}) {
  const res = await fetch(`${HF_BASE}${path}`, {
    ...init,
    headers: { Authorization: HF_AUTH, 'Content-Type': 'application/json', ...(init.headers || {}) },
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
    // 1) Autenticación del que llama: tiene que ser admin o supervisor.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) {
      return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });
    }
    // 2) ¿Está configurada la llave?
    if (!HF_KEY_ID || !HF_KEY_SECRET) {
      return reply({ ok: false, error: 'Falta configurar la llave de Higgsfield (secretos HIGGSFIELD_KEY_ID y HIGGSFIELD_KEY_SECRET).', needsKey: true });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    // 3) Acciones.
    if (action === 'verify') {
      // Cotiza contra el modelo por defecto: 200 = todo bien; 401/403 = llave mala;
      // otro 4xx = la llave AUTENTICA (pasó el auth) pero el payload no le gustó.
      const r = await hf(`/estimate/${DEFAULT_MODEL}`, { method: 'POST', body: JSON.stringify(DEFAULT_PAYLOAD) });
      if (r.ok) return reply({ ok: true, connected: true, quote: r.json, base: HF_BASE });
      if (r.status === 401 || r.status === 403) {
        return reply({ ok: false, connected: false, error: 'La llave fue rechazada (401/403). Revisá HIGGSFIELD_KEY_ID / HIGGSFIELD_KEY_SECRET.', status: r.status, detail: r.json });
      }
      // Auth OK pero el modelo/payload cambió: igual confirma que la conexión sirve.
      return reply({ ok: true, connected: true, note: 'Auth OK; el modelo por defecto necesita ajuste de parámetros.', status: r.status, detail: r.json, base: HF_BASE });
    }

    if (action === 'estimate') {
      const model = String(body?.model || DEFAULT_MODEL);
      const payload = body?.payload || DEFAULT_PAYLOAD;
      const r = await hf(`/estimate/${model}`, { method: 'POST', body: JSON.stringify(payload) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    if (action === 'generate') {
      const model = String(body?.model || DEFAULT_MODEL);
      const payload = body?.payload || DEFAULT_PAYLOAD;
      const r = await hf(`/${model}`, { method: 'POST', body: JSON.stringify(payload) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    if (action === 'status') {
      const id = String(body?.request_id || '');
      if (!id) return reply({ ok: false, error: 'Falta request_id.' });
      const r = await hf(`/requests/${id}/status`, { method: 'GET' });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    if (action === 'upload_url') {
      const content_type = String(body?.content_type || 'image/jpeg');
      const r = await hf(`/files/generate-upload-url`, { method: 'POST', body: JSON.stringify({ content_type }) });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    // Identidad API-nativa (SDK v1, sigue funcionando): crea un personaje que el
    // API SÍ encuentra (a diferencia del soul entrenado por la web).
    if (action === 'create_character') {
      const name = String(body?.name || '').trim();
      const imgs = Array.isArray(body?.image_urls) ? body.image_urls.filter((u: unknown) => typeof u === 'string') : [];
      if (!name || imgs.length === 0) return reply({ ok: false, error: 'Falta name o image_urls.' });
      const r = await hf(`/v1/custom-references`, {
        method: 'POST',
        body: JSON.stringify({ name, input_images: imgs.map((image_url: string) => ({ type: 'image_url', image_url })) }),
      });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    if (action === 'character_status') {
      const cid = String(body?.character_id || '');
      if (!cid) return reply({ ok: false, error: 'Falta character_id.' });
      const r = await hf(`/v1/custom-references/${cid}`, { method: 'GET' });
      return reply({ ok: r.ok, status: r.status, result: r.json });
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
