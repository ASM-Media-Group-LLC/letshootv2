// Proxy SERVIDOR ↔ Higgsfield API + cocina de generación (/kitchen).
// La llave se resuelve por request: app_config (set desde la app) → secreto de entorno.
// Multi-cuenta: cada modelo cocina en SU cuenta (creator_identity.account_id → cook_next manda account_id al worker;
// las llamadas REST de una modelo usan la llave de su cuenta). Julia = Cuenta 1 fija. Ver acctFor().
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
// Un video Genjutsu cuesta ~7 créditos/seg (8s ≈ 56). Abajo de esto NO se puede cocinar un video:
// avisamos y frenamos ANTES de encolar, en vez de dejarlo morir con `not_enough_credits`.
const MIN_VIDEO_CREDITS = 50;

// ── Ruteo POR CUENTA de Higgsfield (cada modelo cocina en SU cuenta) ──
// La Cuenta 1 es el login de SIEMPRE del CLI en la Mac (~/.config/higgsfield): Julia Parker vive ahí y NO se mueve.
// Toda OTRA cuenta usa su propio login del CLI (~/.config/higgsfield/accounts/<id>/, ver scripts/hf-login.mjs).
// Va fijo por id (no por el flag "default"): el flag solo decide la llave REST de las pruebas de /conexion.
const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933';
const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type HfAcct = { id: string; label: string; is_default: boolean };
// Cuenta de una modelo = creator_identity.account_id. Julia va SIEMPRE a la Cuenta 1 (decisión del dueño: ella
// sigue exactamente como hoy, aunque alguien le cambie la cuenta). Cualquier OTRA modelo sin cuenta → null:
// NUNCA cae a la Cuenta 1 (esa es solo de Julia).
// rowAccountId: undefined = buscarlo acá; null/string = ya lo trajo quien llama.
async function acctFor(svc: any, creatorId: string, rowAccountId?: string | null): Promise<HfAcct | null> {
  let id: string | null = rowAccountId ?? null;
  if (creatorId === JULIA_ID) id = LEGACY_HF_ACCOUNT;
  else if (rowAccountId === undefined && creatorId) {
    const { data } = await svc.from('creator_identity').select('account_id').eq('creator_id', creatorId).maybeSingle();
    id = (data as any)?.account_id || null;
  }
  if (!id) return null;
  const { data: a } = await svc.from('higgsfield_accounts').select('id, label, is_default').eq('id', id).maybeSingle();
  if (a) return { id: String((a as any).id), label: String((a as any).label || 'Cuenta'), is_default: !!(a as any).is_default };
  return id === LEGACY_HF_ACCOUNT ? { id, label: 'Cuenta 1 (actual)', is_default: true } : null;
}
const noAcctMsg = 'Esta modelo no tiene cuenta de Higgsfield asignada. Asignala en /conexion → «Modelos → cuenta» y tocá Reintentar.';
const legacyOnlyJuliaMsg = 'La Cuenta 1 es solo de Julia: esta modelo tiene que ir a la cuenta nueva. Cambiala en /conexion → «Modelos → cuenta» y tocá Reintentar.';
// '' = esta modelo se puede cocinar/cobrar en esa cuenta. Decisión del dueño: en la Cuenta 1 SOLO Julia.
const acctRuleProblem = (a: HfAcct | null, creatorId: string): string =>
  !a ? noAcctMsg : (a.id === LEGACY_HF_ACCOUNT && creatorId !== JULIA_ID) ? legacyOnlyJuliaMsg : '';
const loginMsg = (a: HfAcct) => `Falta conectar la cuenta «${a.label}» en la Mac (login de Higgsfield). Corré: node scripts/hf-login.mjs ${a.id}`;
// ¿El cocinero de la Mac tiene un login que FUNCIONA para esa cuenta? Devuelve el motivo si NO (o '' si sí / no se sabe).
// La Cuenta 1 (login de siempre) nunca se bloquea acá. Sin la migración 0130 no se sabe → no bloquea (el worker frena igual).
async function cliProblem(svc: any, a: HfAcct): Promise<string> {
  if (a.id === LEGACY_HF_ACCOUNT) return '';
  const { data, error } = await svc.from('higgsfield_accounts').select('cli_seen_at, cli_error').eq('id', a.id).maybeSingle();
  if (error || !data) return '';
  if ((data as any).cli_error) return `La cuenta «${a.label}» no anda en la Mac: ${String((data as any).cli_error).slice(0, 160)} — Corré: node scripts/hf-login.mjs ${a.id}`;
  if (!(data as any).cli_seen_at) return loginMsg(a);
  return '';
}
// Saldo real de Higgsfield. Con creatorId → el de SU cuenta; sin creatorId → el global de siempre (Cuenta 1).
// Va por el id FIJO de la Cuenta 1 (no por el flag "default"): la global = SIEMPRE el saldo de la Cuenta 1 (Julia),
// cualquier otra cuenta = el saldo de SU fila. Así "Hacer default" en /conexion no cambia el saldo de nadie.
async function hfBalance(svc: any, creatorId?: string): Promise<number | null> {
  if (creatorId) {
    const a = await acctFor(svc, creatorId);
    if (!a) return null;
    if (a.id !== LEGACY_HF_ACCOUNT) {
      const { data, error } = await svc.from('higgsfield_accounts').select('balance').eq('id', a.id).maybeSingle();
      const v = (data as any)?.balance;
      if (error || v == null) return null;
      const n = Number(v); return isFinite(n) ? n : null;
    }
  }
  const { data } = await svc.from('app_config').select('value').eq('key', 'higgsfield_balance').maybeSingle();
  const n = Number((data as any)?.value); return isFinite(n) ? n : null;
}

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

// ── Helpers del scraper: fotos/videos, costo real de Apify, registro de corrida ──
const APIFY_HASHTAG = 'apify~instagram-hashtag-scraper';
const APIFY_POSTS = 'apify~instagram-post-scraper';
const APIFY_REELS = 'apify~instagram-reel-scraper';
const APIFY_IG = 'apify~instagram-scraper'; // traer UN reel por su link (fetch_reel)
const APIFY_API = 'https://api.apify.com/v2';
const isVideoItem = (it: any): boolean => !!(it?.videoUrl || it?.type === 'Video' || it?.productType === 'clips' || it?.isVideo);
const scoreOf = (it: any): number => (Number(it?.videoViewCount || it?.videoPlayCount || 0) || 0) + (Number(it?.likesCount) || 0);
const imgOf = (it: any): string | null => it?.displayUrl || it?.imageUrl || (Array.isArray(it?.images) ? it.images[0] : null) || null;

// ── TIEMPOS del scraper: el servidor MATA la función a los ~150 s ──
// Probado en producción: un scrape de @sophieraiin (0 fotos, 5 videos) devolvió 504 IDLE_TIMEOUT a los 150.3 s y NO quedó
// ni la fila ni los videos (el trabajo muere con la request). Nada puede depender de seguir después de ~150 s: cada request
// del scraper contesta en < 140 s contando TODAS las esperas de Apify, bajadas y llamadas a la IA.
//   · Toda llamada externa lleva su AbortSignal (tabla abajo). La base (svcS) usa un fetch con tope (timedFetch).
//   · Una "unidad" de trabajo arranca solo si lo que lleva la request + su PEOR caso entra en STEP_HARD_MS.
const STEP_SOFT_MS = 95_000;    // pasado esto, un paso no arranca ninguna unidad nueva
const STEP_HARD_MS = 128_000;   // una unidad arranca solo si lo que lleva + su peor caso ≤ esto (la respuesta sale antes de ~135 s)
const LEGACY_BUDGET_MS = 118_000; // camino viejo (sincrónico): página vieja o sin la migración
const LEGACY_HARD_MS = 120_000;
const T_API = 10_000;   // API de Apify (poll = waitForFinish + esto)
const T_DS = 15_000;    // leer un dataset de Apify
const T_IMG = 8_000;    // bajar una imagen (5 s dentro de la bajada de un video)
const T_ANT = 15_000;   // Anthropic (visión)
const T_MP4 = 20_000;   // bajar un mp4 de Instagram
const U_PERSIST = 8_000, U_SAVE = 8_000, U_REVIEW = 31_000, U_SOLA = 23_000, U_VIDEO = 58_000; // peores casos por unidad
const MAX_VIDEO_BYTES = 50_000_000;
const tfetch = (u: string, ms: number, init: RequestInit = {}) => fetch(u, { ...init, signal: init.signal ?? AbortSignal.timeout(ms) });
// fetch de la base con tope: 8 s por consulta; storage 20 s (6 s si sube algo chico, ej. una portada).
function timedFetch(input: Request | URL | string, init?: RequestInit): Promise<Response> {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let ms = 8_000;
  if (u.includes('/storage/v1/object/')) {
    const b: any = init?.body; const n = Number(b?.byteLength ?? b?.size ?? NaN);
    ms = Number.isFinite(n) && n <= 2_000_000 ? 6_000 : 20_000;
  }
  return fetch(input, { ...(init || {}), signal: init?.signal ?? AbortSignal.timeout(ms) });
}
const sinceT = (t0: number) => Date.now() - t0;
// ¿Entra una unidad con peor caso `worst` que puede arrancar hasta `latest` (ms desde que empezó la request)?
const fitsT = (t0: number, worst: number, latest: number, hard = STEP_HARD_MS) => { const e = sinceT(t0); return e <= latest && e + worst <= hard; };
// Los links de IG vencen (parámetro oe = epoch en hex). Con menos de 60 s de vida no se intenta.
const oeLeftMs = (u: unknown): number | null => { const m = String(u || '').match(/[?&]oe=([0-9A-Fa-f]{6,10})(?:&|$)/); return m ? parseInt(m[1], 16) * 1000 - Date.now() : null; };
const linkExpired = (u: unknown) => { const l = oeLeftMs(u); return l != null && l < 60_000; };
// Baja un mp4 (con tope) y lo re-hospeda. Solo para el scraper (cook_result sigue con storeVideo, sin cambios).
type StoreOut = { url: string | null; http: number; reason: string | null };
async function storeVideoT(svc: any, creatorId: string, srcUrl: string, ms = T_MP4): Promise<StoreOut> {
  try {
    const r = await tfetch(srcUrl, ms);
    if (!r.ok) return { url: null, http: r.status, reason: `el link respondió ${r.status}` };
    const len = Number(r.headers.get('content-length') || 0);
    if (len > MAX_VIDEO_BYTES) { try { await r.body?.cancel(); } catch { /* noop */ } return { url: null, http: r.status, reason: 'muy pesado' }; }
    const ab = new Uint8Array(await r.arrayBuffer());
    if (ab.length < 1000) return { url: null, http: r.status, reason: 'video vacío' };
    if (ab.length > MAX_VIDEO_BYTES) return { url: null, http: r.status, reason: 'muy pesado' };
    const path = `vault/${creatorId}/video/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    const up = await svc.storage.from('proposal-photos').upload(path, ab, { contentType: 'video/mp4', upsert: true });
    if (up.error) return { url: null, http: 0, reason: 'no se pudo subir' };
    const { data: pub } = svc.storage.from('proposal-photos').getPublicUrl(path);
    const url = (pub as any)?.publicUrl || null;
    return { url, http: 200, reason: url ? null : 'no se pudo subir' };
  } catch (e) {
    return { url: null, http: 0, reason: /abort|timeout/i.test(String((e as Error)?.name || e)) ? 'tardó demasiado' : 'no se pudo bajar' };
  }
}
// Baja el video de Instagram (sus links vencen) y lo re-hospeda en nuestro storage. Devuelve la URL pública o null.
async function storeVideo(svc: any, creatorId: string, srcUrl: string): Promise<string | null> {
  try {
    const r = await fetch(srcUrl);
    if (!r.ok) return null;
    const ab = new Uint8Array(await r.arrayBuffer());
    if (ab.length < 1000 || ab.length > 80_000_000) return null; // ni vacío ni gigante
    const path = `vault/${creatorId}/video/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    const up = await svc.storage.from('proposal-photos').upload(path, ab, { contentType: 'video/mp4', upsert: true });
    if (up.error) return null;
    const { data: pub } = svc.storage.from('proposal-photos').getPublicUrl(path);
    return (pub as any)?.publicUrl || null;
  } catch { return null; }
}
// Re-hospeda una imagen (la PORTADA de un video) en nuestro storage: así la miniatura NO vence (los links de IG
// caducan) y la url queda ÚNICA (no choca con la foto del mismo carrusel en el índice único de creator_vault).
async function storeImg(svc: any, creatorId: string, srcUrl: string, ms = T_IMG): Promise<string | null> {
  try {
    const r = await tfetch(srcUrl, ms);
    if (!r.ok) return null;
    const ab = new Uint8Array(await r.arrayBuffer());
    if (ab.length < 200 || ab.length > 20_000_000) return null;
    const ct = (r.headers.get('content-type') || 'image/jpeg').toLowerCase();
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const path = `vault/${creatorId}/video/poster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await svc.storage.from('proposal-photos').upload(path, ab, { contentType: ct.startsWith('image/') ? ct : 'image/jpeg', upsert: true });
    if (up.error) return null;
    const { data: pub } = svc.storage.from('proposal-photos').getPublicUrl(path);
    return (pub as any)?.publicUrl || null;
  } catch { return null; }
}
// ── COSTO REAL del scraper ──
// Cada actor de Apify se lanza como corrida con SU run id (POST /acts/{actor}/runs, no run-sync): así el costo que
// guardamos es el usageTotalUsd de ESA corrida (antes se leía "la última corrida del actor", que podía ser otra).
// Si Apify no da el costo, queda null (NUNCA se copia el estimado como real) y la app lo muestra como estimado.
const APIFY_DONE = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
type ApifyOut = { ok: boolean; http: number; items: any[]; run_id: string | null; status: string | null; usd: number | null; started_at: string | null; error?: string; detail?: unknown };
// El token de Apify va en el HEADER, nunca en la URL: los errores de fetch traen la URL completa y esos textos se
// guardan en scrape_runs.error y se muestran en la app. scrubTok es la segunda defensa (por si algún texto lo trae igual).
const apifyInit = (token: string, init: RequestInit = {}): RequestInit => ({ ...init, headers: { ...((init.headers as Record<string, string>) || {}), Authorization: `Bearer ${token}` } });
const scrubTok = (s: unknown, token: string): string => { let t = String(s ?? ''); if (token) t = t.split(token).join('***').split(encodeURIComponent(token)).join('***'); return t; };
// usageTotalUsd de una corrida. Lo lee hasta que dé DOS veces el mismo número (= ya es el final); si nunca, el último que vio.
// Corrida que todavía NO terminó (RUNNING/ABORTING…) → null: lo que lleva cobrado no es el costo final (no se guarda como verificado).
async function apifyRunUsd(runId: string, token: string, tries = 4, ms = 6_000): Promise<number | null> {
  let prev: number | null = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${APIFY_API}/actor-runs/${encodeURIComponent(runId)}`, apifyInit(token, { signal: AbortSignal.timeout(ms) }));
      if (r.ok) {
        const d = ((await r.json()) as any)?.data;
        if (!APIFY_DONE.has(String(d?.status))) return null;
        const u = d?.usageTotalUsd;
        if (typeof u === 'number' && isFinite(u)) { if (prev != null && Math.abs(prev - u) < 1e-9) return u; prev = u; }
      }
    } catch { /* reintento */ }
    if (i < tries - 1) await sleep(1500);
  }
  return prev;
}
// Corre un actor de Apify y espera que termine (hasta maxWaitMs, sin pasarse: cada espera se acota a lo que queda).
// onStart se llama apenas Apify da el run id (antes de esperar) → la corrida queda registrada aunque después se corte todo.
// Devuelve sus items + run id + costo real de ESA corrida.
// reqT0 = cuándo empezó la request (camino viejo): el costo final se lee solo si todavía entra en el tiempo.
async function apifyRun(actor: string, token: string, input: unknown, maxWaitMs = 150_000, onStart?: (runId: string) => Promise<void>, reqT0?: number): Promise<ApifyOut> {
  const t0 = Date.now();
  const left = () => maxWaitMs - (Date.now() - t0);
  const waitS = () => Math.max(1, Math.min(60, Math.ceil(left() / 1000)));
  const out: ApifyOut = { ok: false, http: 0, items: [], run_id: null, status: null, usd: null, started_at: null };
  let run: any = null;
  try {
    // Sin waitForFinish: vuelve apenas arranca (así el run id se registra enseguida).
    const r = await fetch(`${APIFY_API}/acts/${actor}/runs`, apifyInit(token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(T_API) }));
    out.http = r.status;
    const j = await r.json().catch(() => null);
    if (!r.ok) { out.error = `Apify devolvió ${r.status}.`; out.detail = j; return out; }
    run = (j as any)?.data || null;
  } catch (e) { out.error = scrubTok(`No se pudo llamar al scraper: ${(e as Error)?.message}`, token); return out; }
  if (!run?.id) { out.error = 'Apify no devolvió la corrida.'; return out; }
  out.run_id = String(run.id);
  out.started_at = run.startedAt ? String(run.startedAt) : null;
  if (onStart) { try { await onStart(out.run_id); } catch { /* noop */ } }
  while (!APIFY_DONE.has(String(run.status)) && left() > 0) {
    try {
      const ws = waitS();
      const r = await fetch(`${APIFY_API}/actor-runs/${encodeURIComponent(out.run_id)}?waitForFinish=${ws}`, apifyInit(token, { signal: AbortSignal.timeout(T_API + ws * 1000) }));
      const j = await r.json().catch(() => null);
      if ((j as any)?.data) run = (j as any).data; else await sleep(Math.min(3000, Math.max(0, left())));
    } catch { await sleep(Math.min(3000, Math.max(0, left()))); }
  }
  out.status = String(run.status || '');
  if (!APIFY_DONE.has(out.status)) {
    // Nadie va a leer sus resultados → se CANCELA para que Apify no siga cobrando (lo ya cobrado se completa después).
    // Si justo terminó, abort no hace nada y devuelve la corrida terminada → se leen sus resultados igual.
    try {
      const r = await fetch(`${APIFY_API}/actor-runs/${encodeURIComponent(out.run_id)}/abort`, apifyInit(token, { method: 'POST', signal: AbortSignal.timeout(T_API) }));
      const d = ((await r.json().catch(() => null)) as any)?.data;
      if (r.ok && d?.status) { run = d; out.status = String(d.status); }
    } catch { /* noop */ }
    if (!APIFY_DONE.has(out.status) || out.status === 'ABORTED') {
      out.error = 'Apify tardó demasiado: se canceló la corrida para que no siga cobrando. Lo que ya cobró se completa después con «Traer costo real de Apify».';
      return out;
    }
  }
  try {
    const r = await fetch(`${APIFY_API}/datasets/${run.defaultDatasetId}/items?format=json`, apifyInit(token, { signal: AbortSignal.timeout(T_DS) }));
    const j = await r.json().catch(() => null);
    if (r.ok && Array.isArray(j)) out.items = j;
    else { out.error = `Apify no devolvió los resultados (${r.status}).`; out.detail = j; }
  } catch (e) { out.error = scrubTok(`No se pudieron leer los resultados de Apify: ${(e as Error)?.message}`, token); }
  // Costo final: 2 lecturas (≤ ~14 s). Sin tiempo → queda null y «Traer costo real de Apify» lo completa por el run id.
  if (reqT0 == null || fitsT(reqT0, 14_000, 100_000, LEGACY_HARD_MS)) out.usd = await apifyRunUsd(out.run_id, token, 2);
  if (!out.error && out.status !== 'SUCCEEDED' && !out.items.length) out.error = `El scraper de Apify terminó en ${out.status} sin resultados.`;
  out.ok = !out.error;
  return out;
}
async function ratePerPhoto(svc: any): Promise<number> {
  const { data } = await svc.from('app_config').select('value').eq('key', 'scraper_cost_per_photo').maybeSingle();
  const n = Number((data as any)?.value); return isNaN(n) || n <= 0 ? 0.0023 : n;
}
// Filtro IA (visión Anthropic): tokens REALES de cada respuesta × precio público de Claude Haiku 4.5
// (US$1 por millón de tokens de entrada, US$5 por millón de salida; la imagen cuenta como tokens de entrada).
const AI_MODEL = 'claude-haiku-4-5-20251001';
const AI_USD_IN = 1 / 1_000_000;
const AI_USD_OUT = 5 / 1_000_000;
type AiUse = { calls: number; in_tokens: number; out_tokens: number; usd: number; kept: number };
const aiUse = (): AiUse => ({ calls: 0, in_tokens: 0, out_tokens: 0, usd: 0, kept: 0 });
function addAiUsage(acc: AiUse | undefined, j: any) {
  if (!acc) return;
  const u = j?.usage || {};
  const inT = Number(u.input_tokens) || 0, cw = Number(u.cache_creation_input_tokens) || 0, cr = Number(u.cache_read_input_tokens) || 0, outT = Number(u.output_tokens) || 0;
  acc.calls += 1; acc.in_tokens += inT + cw + cr; acc.out_tokens += outT;
  acc.usd += inT * AI_USD_IN + cw * AI_USD_IN * 1.25 + cr * AI_USD_IN * 0.1 + outT * AI_USD_OUT;
}
// Una parte del costo (un actor de Apify) para cost_breakdown: usd = real de Apify (o null) · est = resultados × tarifa.
function apifyPart(actor: string, run: ApifyOut | null, rate: number, extra: Record<string, unknown> = {}) {
  if (!run || (!run.run_id && !run.items.length)) return null;
  return { actor, run_id: run.run_id, status: run.status, items: run.items.length, usd: run.usd != null ? r6(run.usd) : null, est: r6(run.items.length * rate), ...extra };
}
// Columnas de costo de una corrida (migración 0131). cost_real = SOLO lo que cobró Apify (null si no se supo).
function scrapeCostFields(parts: { photos?: any; videos?: any }, ai: AiUse) {
  const ps = [parts.photos, parts.videos].filter(Boolean) as any[];
  const known = ps.filter((p) => typeof p.usd === 'number');
  const cost_apify = known.length ? r6(known.reduce((s, p) => s + p.usd, 0)) : null;
  return {
    cost_real: cost_apify,
    cost_est: r6(ps.reduce((s, p) => s + (Number(p.est) || 0), 0)),
    cost_apify,
    cost_ai: r6(ai.usd),
    apify_run_ids: ps.map((p) => p.run_id).filter(Boolean),
    // 'none' = no hubo corrida de Apify (nada que cobrar ni que verificar) · NUNCA 'apify' sin un costo leído.
    cost_source: !ps.length ? 'none' : known.length === ps.length ? 'apify' : known.length ? 'partial' : 'estimate',
    cost_checked_at: new Date().toISOString(),
    cost_breakdown: { v: 1, photos: parts.photos || null, videos: parts.videos || null, ai: { model: AI_MODEL, calls: ai.calls, in_tokens: ai.in_tokens, out_tokens: ai.out_tokens, usd: r6(ai.usd), kept: ai.kept } },
  };
}
// Registra la corrida. Si la migración 0131 todavía no está, guarda solo las columnas de siempre (no se pierde la corrida).
const RUN_LEGACY_COLS = ['creator_id', 'account_id', 'kind', 'query', 'run_at', 'found', 'saved', 'kept', 'cost_real', 'cost_est', 'apify_status', 'status', 'error', 'run_by'];
const legacyCols = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([k]) => RUN_LEGACY_COLS.includes(k)));
// Registro EN VIVO: la fila se crea apenas Apify da el primer run id (status 'running') y se completa al final (run_at =
// cuando terminó). Si la función se corta por tiempo, la corrida y su run id (→ costo real) no se pierden.
type RunLog = { id: string | null; legacy: boolean };
const newRunLog = (): RunLog => ({ id: null, legacy: false });
async function saveRunLog(svc: any, log: RunLog, row: Record<string, unknown>) {
  try {
    if (log.id) {
      const { error } = await svc.from('scrape_runs').update(log.legacy ? legacyCols(row) : row).eq('id', log.id);
      if (error && !log.legacy) { log.legacy = true; await svc.from('scrape_runs').update(legacyCols(row)).eq('id', log.id); }
      return;
    }
    let res: any = log.legacy ? { error: true } : await svc.from('scrape_runs').insert(row).select('id').maybeSingle();
    if (res?.error) { log.legacy = true; res = await svc.from('scrape_runs').insert(legacyCols(row)).select('id').maybeSingle(); }
    log.id = res?.data?.id ? String(res.data.id) : null;
  } catch { /* noop */ }
}
async function logRun(svc: any, row: Record<string, unknown>) { await saveRunLog(svc, newRunLog(), row); }
// Parte "en curso" (corrida arrancada, costo todavía sin leer) para la fila en vivo.
const pendingPart = (actor: string, runId: string) => ({ actor, run_id: runId, status: 'RUNNING', items: 0, usd: null, est: 0 });
// Camino VIEJO (sincrónico: página vieja o base sin la migración de las búsquedas en segundo plano): TODO entra en
// LEGACY_BUDGET_MS (118 s) desde que empezó la request. Apify espera como mucho 75 s (y deja 40 s para leer y guardar);
// los reels solo arrancan si quedan ≥ 70 s. Lo que no entra se corta (y Apify se cancela para que no siga cobrando).
const legacyWait = (t0: number, reserveMs: number, capMs = 75_000) => Math.min(capMs, LEGACY_BUDGET_MS - sinceT(t0) - reserveMs);
const fitsL = (t0: number, worst: number, latest: number) => fitsT(t0, worst, latest, LEGACY_HARD_MS);
// ¿La imagen (portada de un reel) muestra a UNA sola mujer, SOLA? El dueño NO quiere videos donde la creadora
// está acompañada. La visión (Anthropic) mira la portada. true=sola, false=acompañada/hombre/no se distingue, null=error.
async function isSoloWoman(key: string, imageUrl: string, acc?: AiUse): Promise<boolean | null> {
  try {
    const r = await tfetch(imageUrl, T_IMG);
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || 'image/jpeg').toLowerCase();
    const media = ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : 'image/jpeg';
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = ''; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
    const b64 = btoa(bin);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 60,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: b64 } },
          { type: 'text', text: 'Es la PORTADA de un reel de Instagram. Solo quiero videos donde aparezca UNA sola mujer, ELLA SOLA. Respondé SOLO JSON {"solo":true|false}. Poné solo:false si hay 2 o más personas, si aparece cualquier hombre (aunque sea de fondo, parcial, borroso o de espaldas), si hay multitud/público/gente detrás, si no se distingue claramente a una única protagonista femenina, o si la portada no muestra a una persona (pantallas, carteles, comida, productos, lugares vacíos). Poné solo:true SOLO si estás seguro de que es una única mujer sola.' },
        ] }] }),
      signal: AbortSignal.timeout(T_ANT),
    });
    const j = await res.json();
    addAiUsage(acc, j);
    const txt = (j as any)?.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    const v = m ? JSON.parse(m[0]) : null;
    return v && typeof v.solo === 'boolean' ? v.solo : null;
  } catch { return null; }
}
// Guarda hasta nPhotos fotos + nVideos videos, eligiendo los MEJORES ÉXITOS (más views/likes). Videos → a storage.
// Camino VIEJO (sincrónico). t0 = cuándo empezó la request: cada consulta / chequeo «sola» / bajada arranca solo si entra
// en LEGACY_HARD_MS con su peor caso (la respuesta tiene que llegar antes de que el servidor corte a los ~150 s).
async function saveItems(svc: any, creatorId: string, items: any[], vibe: string | null, nPhotos: number, nVideos: number, ai?: AiUse, t0 = Date.now()) {
  // Videos: posts de video sueltos + videos DENTRO de carruseles (childPosts). Heredan números del post.
  const vidItems: any[] = [];
  for (const it of items) {
    if (isVideoItem(it)) { vidItems.push(it); continue; }
    if (Array.isArray(it?.childPosts)) {
      it.childPosts.forEach((ch: any, i: number) => {
        if (ch?.videoUrl) vidItems.push({ ...ch, ownerUsername: it?.ownerUsername, url: ch?.url || `${it?.url || ''}#v${i}`, likesCount: it?.likesCount, commentsCount: it?.commentsCount, caption: it?.caption, videoViewCount: ch?.videoViewCount || it?.videoViewCount, timestamp: it?.timestamp, shortCode: it?.shortCode });
      });
    }
  }
  const vids = vidItems.sort((a, b) => scoreOf(b) - scoreOf(a));
  const pics = items.filter((it) => !isVideoItem(it)).sort((a, b) => scoreOf(b) - scoreOf(a));
  let saved = 0, savedVideos = 0;
  const photoIds: string[] = []; // ids de las fotos que ESTA corrida guardó → el filtro IA revisa solo esas (y se le cobran a esta corrida)
  // Solo NUEVAS: la misma foto de IG vuelve con otra URL firmada (el índice por url no la frena y quedaba repetida,
  // y la IA la volvía a revisar/cobrar) → se compara por el post (source_url) y se eligen los mejores éxitos NUEVOS.
  const seenPosts = new Set<string>();
  const postUrls = nPhotos > 0 ? [...new Set(pics.map((it) => it?.url).filter(Boolean).map(String))] : [];
  let seenOk = true;
  for (let i = 0; i < postUrls.length; i += 80) {
    if (!fitsL(t0, U_SAVE, 100_000)) { seenOk = false; break; }
    const { data: ex } = await svc.from('creator_vault').select('source_url').eq('creator_id', creatorId).eq('kind', 'ref').eq('media_type', 'image').in('source_url', postUrls.slice(i, i + 80));
    (Array.isArray(ex) ? ex : []).forEach((r: any) => { if (r?.source_url) seenPosts.add(String(r.source_url)); });
  }
  const freshPics = seenOk ? pics.filter((it) => !(it?.url && seenPosts.has(String(it.url)))) : [];
  for (const it of freshPics.slice(0, nPhotos)) {
    if (!fitsL(t0, U_SAVE, 108_000)) break;
    const imgUrl = imgOf(it); if (!imgUrl) continue;
    const views = Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null;
    const comments = Number(it?.commentsCount) || null;
    const row: Record<string, unknown> = {
      creator_id: creatorId, kind: 'ref', media_type: 'image', url: imgUrl, source_platform: 'instagram',
      source_handle: it?.ownerUsername || null, source_url: it?.url || null,
      likes: Number(it?.likesCount) || null, views, comments, score: scoreOf(it),
      vibe, caption: it?.caption ? String(it.caption).slice(0, 200) : null,
      meta: { likes: Number(it?.likesCount) || null, views, comments, type: it?.type || null, shortCode: it?.shortCode || null, timestamp: it?.timestamp || null, owner: it?.ownerUsername || null },
    };
    // saved = filas NUEVAS de verdad (con ignoreDuplicates, .select() devuelve solo lo que se insertó).
    const { data: ins, error } = await svc.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true }).select('id');
    if (!error && Array.isArray(ins) && ins.length) { saved += 1; if (ins[0]?.id) photoIds.push(String(ins[0].id)); }
  }
  // Filtro SOLA: bajamos solo videos donde la creadora está SOLA. La visión mira la portada; seguimos
  // probando candidatos (mejores éxitos primero) hasta juntar nVideos que pasen, acotando el costo de visión.
  let vkey = '';
  if (nVideos > 0 && vids.length) { const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle(); vkey = clean((ak as any)?.value); }
  let vchecks = 0;
  for (const it of vids) {
    if (savedVideos >= nVideos) break;
    if (vchecks >= nVideos + 14) break;
    // Sin tiempo: no arrancar otro chequeo (dedup 8 s + «sola» 23 s) — la fila final tiene que llegar a guardarse.
    if (!fitsL(t0, U_SAVE + U_SOLA, 89_000)) break;
    const vurl = it?.videoUrl; if (!vurl) continue;
    if (linkExpired(vurl)) continue; // link de IG vencido: ni se intenta
    // Solo NUEVOS: si ya tenemos ese post COMO VIDEO, no lo re-descargamos. (Si solo tenemos su
    // miniatura como FOTO, igual bajamos el video — por eso filtramos media_type='video'.)
    if (it?.url) { const { data: ex } = await svc.from('creator_vault').select('id').eq('creator_id', creatorId).eq('source_url', it.url).eq('media_type', 'video').limit(1); if (ex && (ex as any).length) continue; }
    // Sin portada no podemos verificar 'sola' ni mostrar miniatura → la saltamos.
    const poster = imgOf(it); if (!poster) continue;
    // ¿Está SOLA? Fail-CLOSED: solo bajamos si la visión confirma que es UNA mujer sola.
    // Si hay 2+ personas, un hombre, multitud, o duda (null/error), la saltamos y probamos el siguiente éxito.
    if (vkey) { vchecks += 1; const solo = await isSoloWoman(vkey, poster, ai); if (solo !== true) continue; }
    // La bajada (mp4 20 s + subida 20 s + portada 5+6 s + fila 8 s) solo si entra entera.
    if (!fitsL(t0, U_VIDEO, 62_000)) break;
    const stored = (await storeVideoT(svc, creatorId, vurl)).url;
    if (!stored) continue;
    // Re-hospedamos la PORTADA: miniatura que no vence + url ÚNICA (no choca con la foto del mismo post).
    const posterStored = await storeImg(svc, creatorId, poster, 5_000) || poster;
    const vviews = Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null;
    const vcomments = Number(it?.commentsCount) || null;
    const row: Record<string, unknown> = {
      creator_id: creatorId, kind: 'ref', media_type: 'video', url: posterStored, video_url: stored, source_platform: 'instagram',
      source_handle: it?.ownerUsername || null, source_url: it?.url || null,
      likes: Number(it?.likesCount) || null, views: vviews, comments: vcomments, score: scoreOf(it),
      vibe, caption: it?.caption ? String(it.caption).slice(0, 200) : null, duration: Number(it?.videoDuration) || null,
      meta: { likes: Number(it?.likesCount) || null, views: vviews, comments: vcomments, type: 'Video', shortCode: it?.shortCode || null, timestamp: it?.timestamp || null, owner: it?.ownerUsername || null },
    };
    const { error } = await svc.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true });
    if (!error) savedVideos += 1;
  }
  return { saved, savedVideos, photoIds };
}

// Corre el scraper de Apify (Instagram por hashtag) y guarda en creator_vault. Reusado por acción staff y worker.
// Camino VIEJO (sincrónico): todo entra en LEGACY_BUDGET_MS desde t0 (ver legacyWait / fitsL).
async function runScrape(svc: any, creatorId: string, opts: any = {}, t0 = Date.now()) {
  if (!creatorId) return { ok: false, error: 'Falta la modelo.' };
  const nPhotos = Math.min(Math.max(Number(opts.photos ?? 24), 0), 60);
  const nVideos = Math.min(Math.max(Number(opts.videos ?? 0), 0), 12);
  const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
  const apToken = clean((tk as any)?.value);
  if (!apToken) return { ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' };
  let tags: string[] = Array.isArray(opts.niches) && opts.niches.length ? opts.niches : [];
  if (!tags.length) {
    const { data: sp } = await svc.from('creator_search_profile').select('niches, hashtags').eq('creator_id', creatorId).maybeSingle();
    tags = [...(((sp as any)?.hashtags) || []), ...(((sp as any)?.niches) || [])];
  }
  tags = tags.map((h: string) => String(h).trim().replace(/^#/, '')).filter(Boolean).slice(0, 5);
  if (!tags.length) return { ok: false, error: 'Configurá al menos un nicho o hashtag para esta modelo.' };
  const limit = Math.min(nPhotos + nVideos + 12, 90);
  const rate = await ratePerPhoto(svc);
  const ai = aiUse();
  const log = newRunLog();
  const base = { creator_id: creatorId, kind: 'tema', query: tags.join(',') };
  // La fila se crea apenas arranca la corrida de Apify (status 'running'): si esto se corta, el run id queda.
  // Apify espera como mucho 75 s y deja 40 s para leer, guardar y registrar (lo que no entra se corta en saveItems).
  const run = await apifyRun(APIFY_HASHTAG, apToken, { hashtags: tags, resultsLimit: limit }, legacyWait(t0, 40_000),
    (id) => saveRunLog(svc, log, { ...base, found: 0, saved: 0, videos: 0, status: 'running', ...scrapeCostFields({ photos: pendingPart(APIFY_HASHTAG, id) }, ai) }), t0);
  if (!run.ok) {
    // Si la corrida llegó a arrancar, Apify la cobra igual → queda registrada con su costo.
    if (run.run_id) await saveRunLog(svc, log, { ...base, run_at: new Date().toISOString(), found: run.items.length, saved: 0, videos: 0, apify_status: run.http, status: 'error', error: String(run.error || '').slice(0, 300), ...scrapeCostFields({ photos: apifyPart(APIFY_HASHTAG, run, rate) }, ai) });
    return { ok: false, error: run.error, detail: run.detail };
  }
  const items = run.items;
  const { saved, savedVideos, photoIds } = await saveItems(svc, creatorId, items, tags[0] || null, nPhotos, nVideos, ai, t0);
  // Filtro IA: SOLO las fotos que guardó esta búsqueda (su costo es de esta búsqueda). Sin tiempo → las revisa
  // reviewLeftovers en una búsqueda próxima (la fila final tiene que llegar a guardarse antes del corte del servidor).
  const reviewed = photoIds.length ? await aiReview(svc, creatorId, photoIds, ai, t0, 85_000) : 0;
  const cf = scrapeCostFields({ photos: apifyPart(APIFY_HASHTAG, run, rate) }, ai);
  await saveRunLog(svc, log, { ...base, run_at: new Date().toISOString(), found: items.length, saved, kept: ai.kept, videos: savedVideos, apify_status: run.http, status: (saved + savedVideos) ? 'ok' : 'empty', error: null, ...cf });
  await reviewLeftovers(svc, creatorId, t0);
  return { ok: true, found: items.length, saved, savedVideos, tags, reviewed, cost_real: cf.cost_apify, cost_ai: cf.cost_ai, cost_est: cf.cost_est };
}

// Trae los POSTS de las CUENTAS GUÍA (creadoras de referencia) de la modelo, vía Apify instagram-scraper.
// Es lo que el dueño pidió: apuntar a cuentas modelo y bajar exactamente lo que ellas postean.
// Camino VIEJO (sincrónico): todo entra en LEGACY_BUDGET_MS desde t0.
async function runScrapeAccounts(svc: any, creatorId: string, opts: any = {}, t0 = Date.now()) {
  if (!creatorId) return { ok: false, error: 'Falta la modelo.' };
  const nPhotos = Math.min(Math.max(Number(opts.photos ?? 30), 0), 60);
  const nVideos = Math.min(Math.max(Number(opts.videos ?? 0), 0), 12);
  const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
  const apToken = clean((tk as any)?.value);
  if (!apToken) return { ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' };
  let accts: string[] = Array.isArray(opts.accounts) && opts.accounts.length ? opts.accounts : [];
  if (!accts.length) {
    const { data: sp } = await svc.from('creator_search_profile').select('seed_accounts').eq('creator_id', creatorId).maybeSingle();
    accts = Array.isArray((sp as any)?.seed_accounts) ? (sp as any).seed_accounts : [];
  }
  accts = accts.map((a: string) => String(a).trim().replace(/^@/, '').replace(/\/+$/, '').split('/').pop() || '').filter(Boolean).slice(0, 8);
  if (!accts.length) return { ok: false, error: 'Agregá al menos una cuenta guía (ej: @creadora).' };
  // Mantener la ficha (scrape_accounts) sincronizada con lo que se scrapea.
  for (const h of accts) { try { await svc.from('scrape_accounts').upsert({ creator_id: creatorId, handle: h }, { onConflict: 'creator_id,handle', ignoreDuplicates: true }); } catch { /* noop */ } }
  if (nPhotos + nVideos <= 0) return { ok: false, error: 'Pedí al menos 1 foto o 1 video.' };
  const rate = await ratePerPhoto(svc);
  const ai = aiUse();
  const single = accts.length === 1 ? accts[0] : null;
  let account_id: string | null = null;
  if (single) { const { data: sa } = await svc.from('scrape_accounts').select('id').eq('creator_id', creatorId).eq('handle', single).maybeSingle(); account_id = (sa as any)?.id || null; }
  const query = single || accts.join(',');
  const log = newRunLog();
  const base = { creator_id: creatorId, account_id, kind: 'account', query };
  // Partes del costo en vivo: la fila se crea/actualiza apenas cada actor de Apify da su run id (status 'running').
  const live: { photos?: any; videos?: any } = {};
  const liveCounts = { found: 0, saved: 0 }; // lo que ya se guardó (si se corta en los reels, la fila igual lo dice)
  const saveLive = () => saveRunLog(svc, log, { ...base, ...liveCounts, videos: 0, status: 'running', ...scrapeCostFields(live, ai) });
  // FOTOS: post-scraper. resultsLimit es POR CUENTA en Apify → fotos pedidas + 12 de margen (antes sumaba los videos y
  // multiplicaba ×3, y se pagaban cientos de resultados que no se guardaban). Con 0 fotos NO se corre (se pagaba igual).
  let photosRun: ApifyOut | null = null;
  if (nPhotos > 0) {
    // Si también hay videos, se le deja lugar a los reels (≥ 70 s). Solo fotos → hasta 75 s.
    const waitP = nVideos > 0 ? legacyWait(t0, 80_000, 40_000) : legacyWait(t0, 40_000);
    photosRun = await apifyRun(APIFY_POSTS, apToken, { username: accts, resultsLimit: Math.min(nPhotos + 12, 72), proxyConfiguration: { useApifyProxy: true } }, waitP,
      (id) => { live.photos = pendingPart(APIFY_POSTS, id); return saveLive(); }, t0);
    if (!photosRun.ok) {
      if (photosRun.run_id) await saveRunLog(svc, log, { ...base, run_at: new Date().toISOString(), found: photosRun.items.length, saved: 0, videos: 0, apify_status: photosRun.http, status: 'error', error: String(photosRun.error || '').slice(0, 300), ...scrapeCostFields({ photos: apifyPart(APIFY_POSTS, photosRun, rate) }, ai) });
      return { ok: false, error: photosRun.error, detail: photosRun.detail, apify_status: photosRun.http };
    }
    live.photos = apifyPart(APIFY_POSTS, photosRun, rate);
  }
  const items: any[] = photosRun ? photosRun.items : [];
  const apifyStatus = photosRun ? photosRun.http : 0;
  // Fotos: del post-scraper. Videos: de un actor de REELS aparte (el de posts da la portada, no el videoUrl).
  const { saved, photoIds } = await saveItems(svc, creatorId, items, null, nPhotos, 0, ai, t0);
  liveCounts.found = items.length; liveCounts.saved = saved;
  let savedVideos = 0;
  let reel_debug: any = null;
  let reelsRun: ApifyOut | null = null;
  let videosSkipped = false;
  // Sin tiempo para los reels (quedan < 70 s) → NO se lanza (Apify cobraría una corrida que no se llega a leer).
  if (nVideos > 0 && LEGACY_BUDGET_MS - sinceT(t0) < 70_000) videosSkipped = true;
  else if (nVideos > 0) {
    reelsRun = await apifyRun(APIFY_REELS, apToken, { username: accts, resultsLimit: nVideos + 8 }, legacyWait(t0, 40_000),
      (id) => { live.videos = pendingPart(APIFY_REELS, id); return saveLive(); }, t0);
    const reels = reelsRun.items;
    reel_debug = { http: reelsRun.http, run_id: reelsRun.run_id, status: reelsRun.status, is_array: true, count: reels.length };
    if (reelsRun.error) reel_debug.error = `${reelsRun.error}${reelsRun.detail ? ` ${JSON.stringify(reelsRun.detail).slice(0, 200)}` : ''}`;
    if (reels.length) {
      reel_debug.sample_keys = Object.keys(reels[0] || {}).slice(0, 26);
      reel_debug.with_video = reels.filter((x: any) => x?.videoUrl).length;
      reel_debug.types = [...new Set(reels.map((x: any) => x?.type || x?.productType || '?'))].slice(0, 6);
      const rv = await saveItems(svc, creatorId, reels, null, 0, nVideos, ai, t0);
      savedVideos = rv.savedVideos;
    }
  }
  // Filtro IA: SOLO las fotos que guardó esta búsqueda (su costo va a esta cuenta, no a la próxima que se busque).
  // Sin tiempo → las revisa reviewLeftovers después (la fila final tiene que llegar a guardarse antes del corte).
  const reviewed = photoIds.length ? await aiReview(svc, creatorId, photoIds, ai, t0, 85_000) : 0;
  const nowIso = new Date().toISOString();
  for (const h of accts) { try { await svc.from('scrape_accounts').update({ last_run_at: nowIso }).eq('creator_id', creatorId).eq('handle', h); } catch { /* noop */ } }
  const reelItems = reelsRun ? reelsRun.items : [];
  const found = items.length + reelItems.length;
  const cf = scrapeCostFields({ photos: apifyPart(APIFY_POSTS, photosRun, rate), videos: apifyPart(APIFY_REELS, reelsRun, rate, { saved: savedVideos }) }, ai);
  const runErr = videosSkipped ? 'No alcanzó el tiempo para los videos: buscalos aparte.' : (reelsRun && reelsRun.error ? String(reelsRun.error).slice(0, 300) : null);
  await saveRunLog(svc, log, { ...base, run_at: new Date().toISOString(), found, saved, kept: ai.kept, videos: savedVideos, apify_status: apifyStatus || (reelsRun ? reelsRun.http : 0), status: (saved + savedVideos) ? 'ok' : 'empty', error: runErr, ...cf });
  await reviewLeftovers(svc, creatorId, t0);
  // Diagnóstico: si Apify devolvió items de ERROR (cuenta privada/bloqueo), devolvemos el motivo textual.
  const diag = items.length ? items : reelItems; // solo videos → el diagnóstico sale del actor de reels
  const sample_keys = diag.length ? Object.keys(diag[0] || {}).slice(0, 24) : [];
  const error_items = errorItemsOf(diag);
  return { ok: true, found, saved, savedVideos, accounts: accts, reviewed, apify_status: apifyStatus, sample_keys, error_items, cost_real: cf.cost_apify, cost_ai: cf.cost_ai, cost_est: cf.cost_est, reel_debug, videos_skipped: videosSkipped };
}
const errorItemsOf = (items: any[]) => items.filter((i: any) => i && (i.error || i.errorDescription)).slice(0, 3)
  .map((i: any) => ({ error: i.error || null, desc: i.errorDescription || null, msgs: Array.isArray(i.requestErrorMessages) ? i.requestErrorMessages.slice(0, 3) : null, input: i.inputUrl || i.url || i.username || null }));

// Fotos de búsquedas ANTERIORES que quedaron sin revisar (antes se revisaban "las 20 más nuevas" en cada búsqueda y
// se le cobraban a la búsqueda siguiente, de OTRA cuenta). Ahora van en una pasada APARTE con su propio renglón
// (kind 'ia_pendientes'): su costo no cae en ninguna cuenta guía. Solo si la request lleva < 60 s (la respuesta tiene que
// llegar antes del corte del servidor). NO toca las fotos de una búsqueda en segundo plano (scrape_run_id): esas las
// revisa (y se las cobra) su propia búsqueda.
async function reviewLeftovers(svc: any, creatorId: string, t0: number) {
  if (sinceT(t0) > 60_000) return;
  try {
    const sel = () => svc.from('creator_vault').select('id')
      .eq('creator_id', creatorId).eq('kind', 'ref').eq('source_platform', 'instagram').is('ai_ok', null).is('ai_reason', null)
      .neq('media_type', 'video');
    let r = await sel().is('scrape_run_id', null).order('created_at', { ascending: false }).limit(20);
    if (r.error) r = await sel().order('created_at', { ascending: false }).limit(20); // sin la migración (no hay scrape_run_id)
    const ids = (Array.isArray(r.data) ? r.data : []).map((x: any) => String(x?.id || '')).filter(Boolean);
    if (!ids.length) return;
    const ai = aiUse();
    const n = await aiReview(svc, creatorId, ids, ai, t0, 85_000);
    if (!ai.calls) return;
    await logRun(svc, { creator_id: creatorId, kind: 'ia_pendientes', query: `Filtro IA de ${ids.length} foto${ids.length === 1 ? '' : 's'} pendiente${ids.length === 1 ? '' : 's'} de búsquedas anteriores`, found: 0, saved: 0, kept: ai.kept, videos: 0, apify_status: 0, status: n ? 'ok' : 'empty', ...scrapeCostFields({}, ai) });
  } catch { /* noop */ }
}

// UNA foto por el filtro IA (visión Anthropic): ¿sirve como referencia o es basura? Devuelve 1 si quedó revisada.
// Peor caso ≈ 31 s (imagen 8 s + Anthropic 15 s + guardar 8 s). Si la IA responde pero no se entiende, queda sin revisar
// con ai_reason (no se reintenta ni se re-cobra).
async function aiReviewOne(svc: any, key: string, style: string, r: any, acc?: AiUse): Promise<number> {
  try {
    // Descargar la imagen y mandarla como base64: la IA de Anthropic NO puede leer URLs de Instagram (por eso el filtro nunca corría).
    const imgRes = await tfetch(String(r.url), T_IMG);
    if (!imgRes.ok) { await svc.from('creator_vault').update({ ai_ok: false, ai_reason: 'imagen no disponible' }).eq('id', r.id); return 1; }
    const ct = (imgRes.headers.get('content-type') || 'image/jpeg').toLowerCase();
    const media = ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : ct.includes('gif') ? 'image/gif' : 'image/jpeg';
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    let bin = ''; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
    const b64 = btoa(bin);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 120,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: b64 } },
          { type: 'text', text: `Mirá la foto. ¿Sirve como REFERENCIA para recrear una pose + outfit con una modelo mujer (estilo influencer)? Decí ok:true SOLO si cumple TODO: es UNA sola mujer real, es claramente la protagonista, se le ve el cuerpo o medio cuerpo con una pose y un outfit útiles, y la foto es nítida y de buena calidad.${style ? ` ADEMÁS — REQUISITO DURO: la mujer y la foto tienen que ENCAJAR con este estilo buscado: "${style}". Si el tipo de cuerpo, el vibe o el outfit NO encajan con ese estilo, decí ok:false con reason "no es el estilo".` : ''} Decí ok:false — y sé ESTRICTO, ante la MÍNIMA duda descartá — si: aparece algún hombre, hay 2 o más personas, es un producto / ropa sola / flatlay, comida, paisaje, animal, auto, meme, collage, captura de pantalla, dibujo o caricatura, tiene texto o logos encima, está borrosa, es muy chica, o está muy filtrada/editada. Respondé SOLO JSON: {"ok":true|false,"reason":"motivo corto en español"}` },
        ] }],
      }),
      signal: AbortSignal.timeout(T_ANT),
    });
    const j = await res.json();
    addAiUsage(acc, j);
    const txt = (j as any)?.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    let v: any = null;
    try { v = m ? JSON.parse(m[0]) : null; } catch { v = null; }
    if (v && typeof v.ok === 'boolean') {
      await svc.from('creator_vault').update({ ai_ok: v.ok, ai_reason: String(v.reason || '').slice(0, 140) }).eq('id', r.id);
      if (v.ok && acc) acc.kept += 1;
      return 1;
    }
    if (res.ok) {
      // Respondió (y cobró) pero no se entiende: queda en la mesa sin revisar, marcada para no volver a cobrarla.
      await svc.from('creator_vault').update({ ai_reason: 'sin revisar: la IA no dio una respuesta clara' }).eq('id', r.id).is('ai_ok', null);
    }
  } catch { /* noop */ }
  return 0;
}
// Revisa con visión (Anthropic) ESAS fotos (ids) de la modelo que siguen sin revisar: ¿sirve como referencia o es basura?
// De a 20 en paralelo. t0/latest: cada tanda arranca solo si entra en el tiempo de la request (camino viejo).
async function aiReview(svc: any, creatorId: string, ids: string[], acc?: AiUse, t0?: number, latest = 95_000) {
  const want = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!want.length) return 0;
  const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
  const key = clean((ak as any)?.value);
  if (!key) return 0;
  const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', creatorId).maybeSingle();
  const style = String((sp as any)?.style_desc || '').slice(0, 200);
  let n = 0;
  for (let ci = 0; ci < want.length; ci += 20) {
    if (t0 != null && !fitsL(t0, U_SAVE + U_REVIEW, latest)) break;
    const { data: rows } = await svc.from('creator_vault').select('id, url')
      .eq('creator_id', creatorId).in('id', want.slice(ci, ci + 20)).is('ai_ok', null);
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const got = await Promise.all(rows.map((r: any) => aiReviewOne(svc, key, style, r, acc)));
    n += got.reduce((s, x) => s + x, 0);
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// BÚSQUEDAS EN SEGUNDO PLANO («jobs» del scraper)
// Una búsqueda = UNA fila de scrape_runs (requested ≠ null) que avanza de a PASOS cortos (acción scrape_step, < 140 s
// cada uno) hasta terminar, aunque se cierre la página: la maneja la página abierta y/o el cocinero de la Mac (un proceso
// aparte). Un candado (lease, RPC scrape_job_claim) deja UN solo paso por búsqueda a la vez; cada escritura va con
// .eq('lease_owner', yo): si otro tomó la búsqueda, el paso viejo no pisa nada y se corta.
//   · Los números (fotos/videos guardados, la IA sacó, sin revisar) salen SIEMPRE de creator_vault.scrape_run_id = job:
//     son exactos aunque un paso muera a la mitad (se pierde como mucho UNA unidad: un archivo huérfano o una llamada IA).
//   · Pedís N fotos → N que la IA deja (count_mode 'kept'); se trae de más y, si la cuenta tenía más, UNA recarga.
//   · Apify: cada corrida con timeout + maxTotalChargeUsd (techo de gasto) y su costo REAL por run id (jobCostFields).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type AnyRec = Record<string, any>;
const JOB_ACTIVE = ['queued', 'running'];
const JOB_LEASE_S = 150; // ≥ el corte del servidor: un paso que murió suelta la búsqueda solo, a los 150 s de tomarla
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const JOB_FIELDS = 'url,shortCode,type,productType,displayUrl,imageUrl,images,videoUrl,isVideo,videoViewCount,videoPlayCount,viewsCount,likesCount,commentsCount,caption,timestamp,ownerUsername,childPosts,videoDuration,error,errorDescription,requestErrorMessages,inputUrl,username';
const GROUP_ACTOR: Record<string, string> = { posts: APIFY_POSTS, reels: APIFY_REELS, hashtag: APIFY_HASHTAG, ig: APIFY_IG };
const APIFY_PRICE: Record<string, number> = { posts: 0.0027, reels: 0.0026, hashtag: 0.0026, ig: 0.0027 }; // por resultado (free tier, PAY_PER_EVENT)
const TOPUP_CAP: Record<string, number> = { posts: 250, reels: 100, hashtag: 150, ig: 1 };
const DEFAULT_YIELD = 0.34; // fotos que sirven por post (sin historial de la cuenta)
const JOB_COLS = 'id, creator_id, account_id, kind, query, status, run_at, created_at, updated_at, finished_at, found, saved, videos, kept, cost_est, cost_real, cost_apify, cost_ai, cost_source, cost_breakdown, apify_run_ids, requested, progress, note, error, phase, apify_active, lease_until, next_step_at, cancel_requested_at';
const NEEDS_MIG = { ok: false, needs_migration: true, error: 'Falta aplicar la migración 0131 (búsquedas en segundo plano): mientras tanto se busca como antes.' };
const isoAt = (ms = Date.now()) => new Date(ms).toISOString();
const clampN = (v: unknown, lo: number, hi: number, d = 0) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const normHandle = (a: unknown) => String(a ?? '').trim().replace(/^@/, '').replace(/\/+$/, '').split('/').pop() || '';
const missingCol = (e: any) => !!e && (['42703', 'PGRST204'].includes(String(e.code)) || /column .* does not exist|Could not find the '.*' column/i.test(String(e.message || '')));
const missingFn = (e: any) => !!e && (['42883', 'PGRST202'].includes(String(e.code)) || /function .* does not exist|Could not find the function/i.test(String(e.message || '')));
const laneGroup = (kind: string, lane: string) => (kind === 'tema' ? 'hashtag' : kind === 'reel_link' ? 'ig' : lane === 'photos' ? 'posts' : 'reels');
const groupOfActor = (actor: string) => Object.keys(GROUP_ACTOR).find((g) => GROUP_ACTOR[g] === actor) || 'posts';
const isTopup = (r: AnyRec) => r.kind === 'topup' || r.kind === 'refresh';
// Una corrida de Apify planeada (status '' = todavía no arrancó). timeout y maxTotalChargeUsd = techo si algo se descontrola.
function newRun(group: string, role: string, kind: string, input: AnyRec, limit: number, items: number): AnyRec {
  const price = APIFY_PRICE[group] || 0.0027;
  const timeout_s = group === 'ig' ? 180 : group === 'reels' ? Math.min(900, 120 + 4 * items) : Math.min(900, 120 + 2 * items);
  const max_usd = group === 'ig' ? 0.02 : Math.round(1.5 * (items * price + (group === 'reels' ? 0.001 : 0) + 0.01) * 1000) / 1000;
  return { id: null, role, kind, actor: GROUP_ACTOR[group], input, status: '', dataset: null, kvs: null, limit, plan_items: items, total: 0, items_live: 0, offset: 0, http: 0,
    started_at: null, finished_at: null, start_attempt_at: null, unk: 0, post_fail: 0, retry_at: null, usd: null, usd_so_far: null, est: 0, timeout_s, max_usd, polls: 0, evaluated: false, ours_abort: false };
}
function initProgress(kind: string, photos: number, videos: number): AnyRec {
  const lanes: AnyRec = {};
  if (photos > 0) lanes.photos = { target: photos, saved: 0, kept: 0, ai_rejected: 0, pending_review: 0, cursor: 0, examined: 0, exhausted: false, topups: 0, retries: 0, review_tries: 0, done: false, note: null, error: null };
  if (videos > 0) lanes.videos = { target: videos, saved: 0, cursor: 0, pending_video_items: [], rejected: [], expired: 0, topups: 0, retries: 0, done: false, note: null, error: null, attempts: 0, link_fails: 0, dl_fails: 0, fresh: 0, sola: 0, sola_rejected: 0, cook_done: false, last: null };
  return { v: 1, phase: 'queued', wait_reason: null, planned: false, apify: { posts: [], reels: [], hashtag: [], ig: [] }, lanes,
    ai: { calls: 0, in_tokens: 0, out_tokens: 0, usd: 0, kept: 0, photo_calls: 0, sola_calls: 0 }, issue: null, error_items: [], steps: 0, last_step_at: null, last_driver: 'start', last_error: null, cook: null };
}
const jobRunsFlat = (p: AnyRec): AnyRec[] => ['posts', 'reels', 'hashtag', 'ig'].flatMap((g) => (Array.isArray(p?.apify?.[g]) ? p.apify[g] : []));
// COSTO de una búsqueda (v2): cada corrida de Apify (principal, reintento, recarga) con SU costo real; agregados de
// fotos / videos con la MISMA forma que v1 (usd = real si se conocen TODAS sus corridas, si no null → el estimado).
function costFromRuns(runs: AnyRec[], ai: AnyRec) {
  const started = (Array.isArray(runs) ? runs : []).filter((r) => r && r.run_id);
  const agg = (list: AnyRec[]) => {
    if (!list.length) return null;
    const known = list.filter((r) => typeof r.usd === 'number');
    return { actor: list[0].actor, run_id: list[0].run_id, run_ids: list.map((r) => String(r.run_id)), status: list[list.length - 1].status,
      items: list.reduce((s, r) => s + (Number(r.items) || 0), 0), usd: known.length === list.length ? r6(known.reduce((s, r) => s + r.usd, 0)) : null,
      est: r6(list.reduce((s, r) => s + (Number(r.est) || 0), 0)), topups: list.filter(isTopup).length };
  };
  const known = started.filter((r) => typeof r.usd === 'number');
  const cost_apify = known.length ? r6(known.reduce((s, r) => s + r.usd, 0)) : null;
  const aiO = { model: AI_MODEL, calls: Number(ai?.calls) || 0, in_tokens: Number(ai?.in_tokens) || 0, out_tokens: Number(ai?.out_tokens) || 0, usd: r6(Number(ai?.usd) || 0), kept: Number(ai?.kept) || 0 };
  return {
    cost_real: cost_apify,
    cost_est: r6(started.reduce((s, r) => s + (Number(r.est) || 0), 0)),
    cost_apify,
    cost_ai: aiO.usd,
    apify_run_ids: started.map((r) => String(r.run_id)),
    cost_source: !started.length ? 'none' : known.length === started.length ? 'apify' : known.length ? 'partial' : 'estimate',
    cost_checked_at: isoAt(),
    cost_breakdown: {
      v: 2,
      runs: started.map((r) => ({ role: r.role, kind: r.kind, actor: r.actor, run_id: String(r.run_id), status: r.status, items: Number(r.items) || 0, usd: typeof r.usd === 'number' ? r6(r.usd) : null, est: r6(Number(r.est) || 0) })),
      photos: agg(started.filter((r) => r.role === 'photos' || r.role === 'both')),
      videos: agg(started.filter((r) => r.role === 'videos' || r.role === 'reel')),
      ai: aiO,
    },
  };
}
function jobCostFields(p: AnyRec, rate: number) {
  const runs = jobRunsFlat(p).filter((r) => r.id).map((r) => ({ role: r.role, kind: r.kind, actor: r.actor, run_id: r.id, status: r.status, items: Number(r.total) || 0,
    usd: typeof r.usd === 'number' ? r.usd : null, est: r6(Math.max(Number(r.total) || 0, Number(r.items_live) || 0) * rate) }));
  return costFromRuns(runs, p?.ai || {});
}
// Candidatas en orden FIJO (más views/likes primero, desempate por url): el cursor de cada carril apunta acá.
const byScoreUrl = (a: any, b: any) => (scoreOf(b) - scoreOf(a)) || (String(a?.url || '') < String(b?.url || '') ? -1 : String(a?.url || '') > String(b?.url || '') ? 1 : 0);
const usableItem = (it: any) => !!it && !it.error && !it.errorDescription;
function photoCands(items: any[]): any[] {
  const seen = new Set<string>(); const out: any[] = [];
  for (const it of items) {
    if (!usableItem(it) || isVideoItem(it) || !imgOf(it)) continue; // carruseles cuentan como foto (su portada); reels no
    const k = String(it.url || imgOf(it)); if (seen.has(k)) continue; seen.add(k); out.push(it);
  }
  return out.sort(byScoreUrl);
}
function videoCands(items: any[]): any[] {
  const seen = new Set<string>(); const out: any[] = [];
  const push = (it: any) => { const k = String(it.url || it.videoUrl || ''); if (!k || seen.has(k)) return; seen.add(k); out.push(it); };
  for (const it of items) {
    if (!usableItem(it)) continue;
    if (isVideoItem(it)) { if (it.videoUrl) push(it); continue; }
    if (Array.isArray(it?.childPosts)) {
      it.childPosts.forEach((ch: any, i: number) => {
        if (ch?.videoUrl) push({ ...ch, ownerUsername: it?.ownerUsername, url: ch?.url || `${it?.url || ''}#v${i}`, likesCount: it?.likesCount, commentsCount: it?.commentsCount, caption: it?.caption, videoViewCount: ch?.videoViewCount || it?.videoViewCount, timestamp: it?.timestamp, shortCode: it?.shortCode, displayUrl: ch?.displayUrl || it?.displayUrl });
      });
    }
  }
  return out.sort(byScoreUrl);
}
// Por qué NO jaló una cuenta (mismas reglas que la página): private | not_found | no_posts | blocked.
function issueOf(items: any[]): { issue: string | null; error_items: any[] } {
  const errs = items.filter((i: any) => i && (i.error || i.errorDescription));
  const error_items = errorItemsOf(items);
  if (!errs.length) return { issue: null, error_items };
  const t = errs.map((e: any) => `${e.errorDescription || ''} ${e.error || ''} ${Array.isArray(e.requestErrorMessages) ? e.requestErrorMessages.join(' ') : ''}`).join(' ').toLowerCase();
  const issue = /priv|restrict|login/.test(t) ? 'private' : /not.?found|no.?exist|doesn|invalid|404/.test(t) ? 'not_found' : /empty|no.?post|sin/.test(t) ? 'no_posts' : 'blocked';
  return { issue, error_items };
}
function photoRowOf(creatorId: string, it: any, vibe: string | null, jobId: string): AnyRec {
  const views = Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null;
  const comments = Number(it?.commentsCount) || null;
  return {
    creator_id: creatorId, kind: 'ref', media_type: 'image', url: imgOf(it), source_platform: 'instagram',
    source_handle: it?.ownerUsername || null, source_url: it?.url || null,
    likes: Number(it?.likesCount) || null, views, comments, score: scoreOf(it),
    vibe, caption: it?.caption ? String(it.caption).slice(0, 200) : null,
    meta: { likes: Number(it?.likesCount) || null, views, comments, type: it?.type || null, shortCode: it?.shortCode || null, timestamp: it?.timestamp || null, owner: it?.ownerUsername || null },
    scrape_run_id: jobId,
  };
}
// Video aprobado (pasó «sola»), esperando su bajada: lo mínimo para armar la fila después.
const pendingOf = (it: any): AnyRec => ({
  source_url: it?.url || null, video_url: it?.videoUrl, poster: imgOf(it), score: scoreOf(it), owner: it?.ownerUsername || null,
  likes: Number(it?.likesCount) || null, views: Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null, comments: Number(it?.commentsCount) || null,
  caption: it?.caption ? String(it.caption).slice(0, 200) : null, duration: Number(it?.videoDuration) || null, shortCode: it?.shortCode || null, timestamp: it?.timestamp || null,
});
function videoRowOf(creatorId: string, pv: AnyRec, thumb: string, stored: string, vibe: string | null, jobId: string): AnyRec {
  return {
    creator_id: creatorId, kind: 'ref', media_type: 'video', url: thumb, video_url: stored, source_platform: 'instagram',
    source_handle: pv.owner || null, source_url: pv.source_url || null,
    likes: pv.likes, views: pv.views, comments: pv.comments, score: pv.score, vibe, caption: pv.caption, duration: pv.duration,
    meta: { likes: pv.likes, views: pv.views, comments: pv.comments, type: 'Video', shortCode: pv.shortCode, timestamp: pv.timestamp, owner: pv.owner },
    scrape_run_id: jobId,
  };
}
const inputKeyJ = (inp: any) => {
  if (!inp || typeof inp !== 'object') return null;
  const raw = inp.hashtags ?? inp.username ?? (Array.isArray(inp.directUrls) ? inp.directUrls.map((u: any) => (typeof u === 'string' ? u : u?.url)) : null);
  const arr: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return JSON.stringify({ u: arr.map((s) => String(s ?? '').trim().replace(/^[@#]/, '').toLowerCase()).sort(), l: Number(inp.resultsLimit) || null });
};
// Cocinar el reel traído (Genjutsu): MISMOS chequeos y orden que antes (fotos reales → cuenta de la modelo → login del
// CLI en la Mac → créditos) y la generación con created_by = quien pidió la búsqueda. Lo usan fetch_reel y scrape_step.
async function cookReel(svcX: any, creatorId: string, stored: string, runBy: string | null): Promise<{ cooking: string | null; warn?: string; low_credits?: boolean }> {
  const { data: reals } = await svcX.from('creator_vault').select('id').eq('creator_id', creatorId).eq('kind', 'real').limit(1);
  if (!reals || !(reals as any).length) return { cooking: null, warn: 'Traído, pero la modelo no tiene fotos reales para cocinarlo.' };
  const acctR = await acctFor(svcX, creatorId);
  const ruleR = acctRuleProblem(acctR, creatorId);
  if (ruleR || !acctR) return { cooking: null, warn: `Reel traído, pero no lo cociné: ${ruleR || noAcctMsg}` };
  const cliR = await cliProblem(svcX, acctR);
  if (cliR) return { cooking: null, warn: `Reel traído, pero no lo cociné: ${cliR}` };
  const balR = await hfBalance(svcX, creatorId);
  if (balR != null && balR < MIN_VIDEO_CREDITS) return { cooking: null, low_credits: true, warn: `Reel traído, pero Higgsfield casi sin créditos en «${acctR.label}» (quedan ${balR.toFixed(1)}, se necesitan ~${MIN_VIDEO_CREDITS}). Recargá y cocinalo desde «Videos».` };
  const { data: gen } = await svcX.from('generations').insert({ creator_id: creatorId, reference_url: stored, status: 'queued', model: 'genjutsu', media_type: 'video', created_by: runBy }).select('id').maybeSingle();
  return { cooking: (gen as any)?.id || null };
}
const ISSUE_TEXT: Record<string, string> = {
  private: 'es privada: Instagram no la deja ver sin login.',
  not_found: 'no existe o está mal escrita: revisá el @.',
  no_posts: 'no tiene posts públicos usables.',
  blocked: 'Instagram la bloqueó o la restringió.',
};

class ScrapeJob {
  svc: any; row: AnyRec; id: string; owner: string; t0: number; soft: number; pollEnd: number; driver: string; inline: boolean;
  rq: AnyRec; kind: string; cid: string; handle: string | null; p: AnyRec;
  token = ''; akey = ''; style = ''; rate = 0.0023; maxActive = 3;
  did: Record<string, number> = {}; lost = false; cancel = false; finished = false; planned = false;
  ds = new Map<string, any[]>(); seenV = new Set<string>(); seenChecked = new Set<string>(); acctRejects: string[] = []; newRejects: string[] = [];
  others: AnyRec[] = []; othersDue = false; activeElsewhere = 0; finalStatus: string | null = null; lastPoll = 0; pendChecked = false;
  constructor(svc: any, row: AnyRec, owner: string, t0: number, o: { soft?: number; pollEnd?: number; driver?: string; inline?: boolean } = {}) {
    this.svc = svc; this.row = row; this.id = String(row.id); this.owner = owner; this.t0 = t0;
    this.soft = o.soft ?? STEP_SOFT_MS; this.pollEnd = o.pollEnd ?? this.soft; this.driver = o.driver || 'page'; this.inline = !!o.inline;
    this.rq = row.requested && typeof row.requested === 'object' ? row.requested : {};
    this.kind = String(this.rq.kind || row.kind || 'account');
    this.cid = String(row.creator_id || '');
    this.handle = this.kind === 'account' ? String((Array.isArray(this.rq.accounts) && this.rq.accounts[0]) || row.query || '') : null;
    this.p = row.progress && typeof row.progress === 'object' && row.progress.lanes ? JSON.parse(JSON.stringify(row.progress)) : initProgress(this.kind, Number(this.rq.photos) || 0, Number(this.rq.videos) || 0);
    this.p.apify = { posts: [], reels: [], hashtag: [], ig: [], ...(this.p.apify || {}) };
  }
  el() { return Date.now() - this.t0; }
  fits(worst: number, latest = STEP_SOFT_MS) { return fitsT(this.t0, worst, Math.min(latest, this.soft)); }
  mark(k: string, n = 1) { this.did[k] = (this.did[k] || 0) + n; }
  get L(): AnyRec { return this.p.lanes || {}; }
  runs(): AnyRec[] { return jobRunsFlat(this.p); }
  cur(lane: string): AnyRec | null { const a = this.p.apify[laneGroup(this.kind, lane)] || []; return a.length ? a[a.length - 1] : null; }
  activeRuns() { return this.runs().filter((r) => (r.id && !APIFY_DONE.has(r.status)) || r.status === 'START_UNKNOWN'); }
  lanesOf(r: AnyRec): AnyRec[] { const g = groupOfActor(r.actor); return ['photos', 'videos'].filter((ln) => this.L[ln] && laneGroup(this.kind, ln) === g).map((ln) => this.L[ln]); }
  label() { return this.kind === 'account' ? `@${this.handle}` : this.kind === 'tema' ? String(this.row.query || '').split(',').filter(Boolean).map((t) => `#${t}`).join(' ') : 'El reel'; }
  vibe() { return this.kind === 'tema' ? (String(this.row.query || '').split(',')[0] || null) : null; }
  laneDone(L: AnyRec, note: string | null, error = false) { L.done = true; if (note) L.note = note; if (error && note) L.error = note; }
  allDone() { const ls = Object.values(this.L) as AnyRec[]; return ls.every((l) => l.done); }
  addAi(acc: AiUse, field?: string) {
    const a = this.p.ai; a.calls += acc.calls; a.in_tokens += acc.in_tokens; a.out_tokens += acc.out_tokens; a.usd = r6(a.usd + acc.usd); a.kept += acc.kept;
    if (field) a[field] = (a[field] || 0) + acc.calls;
  }
  noteText(): string {
    const parts: string[] = [];
    for (const ln of ['photos', 'videos']) { const n = this.L[ln]?.note; if (n && !parts.includes(n)) parts.push(n); }
    if (this.p.cook?.warn && !parts.includes(this.p.cook.warn)) parts.push(this.p.cook.warn);
    if (this.p.final_note && !parts.includes(this.p.final_note)) parts.push(this.p.final_note);
    return parts.join(' ').slice(0, 600);
  }
  mirror(): AnyRec {
    const runs = this.runs(); const L = this.L;
    const started = runs.some((r) => r.id || r.status === 'START_UNKNOWN');
    return {
      progress: this.p, phase: this.p.phase, status: started ? 'running' : 'queued',
      found: runs.reduce((s, r) => s + (Number(r.total) || 0), 0),
      saved: L.photos ? L.photos.saved : 0, kept: L.photos ? L.photos.kept : null, videos: L.videos ? L.videos.saved : 0,
      apify_active: this.activeRuns().length, updated_at: isoAt(), note: this.noteText() || null,
      ...jobCostFields(this.p, this.rate),
    };
  }
  async flushRejects() {
    if (!this.newRejects.length || !this.handle) return;
    const merged = [...new Set([...this.acctRejects, ...this.newRejects])].slice(-300);
    const { error } = await this.svc.from('scrape_accounts').update({ video_rejects: merged }).eq('creator_id', this.cid).eq('handle', this.handle);
    if (!error) { this.acctRejects = merged; this.newRejects = []; }
  }
  // Toda escritura va con el candado: 0 filas = otro tomó la búsqueda (o se borró) → este paso se corta YA.
  async persist(extra: AnyRec = {}): Promise<boolean> {
    if (this.lost) return false;
    this.p.last_step_at = isoAt(); this.p.last_driver = this.driver;
    if (this.newRejects.length) { try { await this.flushRejects(); } catch { /* la próxima */ } }
    const patch = { ...this.mirror(), ...extra };
    const { data, error } = await this.svc.from('scrape_runs').update(patch).eq('id', this.id).eq('lease_owner', this.owner).select('cancel_requested_at');
    if (error || !Array.isArray(data) || !data.length) { this.lost = true; return false; }
    if (data[0]?.cancel_requested_at) this.cancel = true;
    return true;
  }
  async release(waitMs: number) {
    this.p.steps = (Number(this.p.steps) || 0) + 1;
    await this.persist({ lease_until: null, lease_owner: null, next_step_at: isoAt(Date.now() + Math.max(0, waitMs)) });
  }
  async loadCfg(): Promise<boolean> {
    const { data, error } = await this.svc.from('app_config').select('key, value').in('key', ['apify_token', 'anthropic_api_key', 'scraper_cost_per_photo', 'scraper_max_active']);
    if (error) return false;
    const m: AnyRec = {}; (Array.isArray(data) ? data : []).forEach((r: any) => { m[r.key] = r.value; });
    this.token = clean(m.apify_token); this.akey = clean(m.anthropic_api_key);
    const rt = Number(clean(m.scraper_cost_per_photo)); this.rate = rt > 0 ? rt : 0.0023;
    const mx = Number(clean(m.scraper_max_active)); this.maxActive = mx >= 1 ? Math.min(20, Math.floor(mx)) : 3;
    await Promise.all([
      (async () => { if (!this.akey || !this.L.photos) return; const { data: sp } = await this.svc.from('creator_search_profile').select('style_desc').eq('creator_id', this.cid).maybeSingle(); this.style = String((sp as any)?.style_desc || '').slice(0, 200); })(),
      (async () => { if (this.kind !== 'account' || !this.L.videos || !this.handle) return; const { data: sa } = await this.svc.from('scrape_accounts').select('video_rejects').eq('creator_id', this.cid).eq('handle', this.handle).maybeSingle(); this.acctRejects = Array.isArray((sa as any)?.video_rejects) ? (sa as any).video_rejects.map(String) : []; })(),
    ]);
    return true;
  }
  async loadOthers() {
    const { data } = await this.svc.from('scrape_runs').select('id, status, apify_active, next_step_at, lease_until').in('status', JOB_ACTIVE).neq('id', this.id).limit(300);
    this.others = Array.isArray(data) ? data : [];
    const now = Date.now();
    this.othersDue = this.others.some((o) => (!o.lease_until || Date.parse(o.lease_until) < now) && (!o.next_step_at || Date.parse(o.next_step_at) <= now + 2_000));
    this.activeElsewhere = this.others.filter((o) => o.status === 'running' && Number(o.apify_active) > 0).length;
  }
  // Recuento EXACTO desde el baúl (lo que esta búsqueda guardó de verdad), aunque un paso haya muerto a la mitad.
  async recount(): Promise<boolean> {
    const { data, error } = await this.svc.from('creator_vault').select('media_type, ai_ok, ai_reason').eq('scrape_run_id', this.id).limit(5000);
    if (error) return false;
    const rows = Array.isArray(data) ? data : [];
    const ph = rows.filter((r: any) => r.media_type !== 'video');
    const L = this.L;
    if (L.photos) {
      L.photos.saved = ph.length; L.photos.ai_rejected = ph.filter((r: any) => r.ai_ok === false).length; L.photos.kept = ph.filter((r: any) => r.ai_ok === true).length;
      L.photos.pending_review = ph.filter((r: any) => r.ai_ok == null && r.ai_reason == null).length;
    }
    if (L.videos) L.videos.saved = rows.length - ph.length;
    return true;
  }
  async countVault(onlyVideo: boolean): Promise<number> {
    let q = this.svc.from('creator_vault').select('id', { count: 'exact', head: true }).eq('creator_id', this.cid).eq('source_handle', String(this.handle || '').toLowerCase());
    if (onlyVideo) q = q.eq('media_type', 'video');
    const { count } = await q; return Number(count) || 0;
  }
  // Fotos que sirven por post de ESTA cuenta (últimas 3 búsquedas con fotos): 0.15 – 0.6 (sin historial 0.34).
  async yieldFor(): Promise<number> {
    const { data } = await this.svc.from('scrape_runs').select('found, kept').eq('creator_id', this.cid).eq('kind', 'account').eq('query', this.handle).in('status', ['ok', 'partial', 'empty']).order('run_at', { ascending: false }).limit(3);
    const rows = (Array.isArray(data) ? data : []).filter((r: any) => Number(r.found) > 0 && r.kept != null);
    const f = rows.reduce((s: number, r: any) => s + Number(r.found), 0), k = rows.reduce((s: number, r: any) => s + Number(r.kept), 0);
    return !rows.length || f <= 0 ? DEFAULT_YIELD : Math.min(0.6, Math.max(0.15, k / f));
  }
  // Planea las corridas que faltan (al arrancar: cuentas "ya vistas" frescas). Se trae DE MÁS (resultsLimit cuenta POSTS,
  // no fotos: una cuenta con muchos reels da pocas fotos) y se re-pagan las ya vistas (Apify no tiene "más viejos que").
  async plan() {
    const L = this.L; const a = this.p.apify;
    if (this.kind === 'tema') {
      if (!a.hashtag.length) {
        const tags = String(this.row.query || '').split(',').map((s) => s.trim()).filter(Boolean);
        const per = Math.min(Math.ceil(((L.photos?.target || 0) / DEFAULT_YIELD + (L.videos?.target || 0) * 3) / Math.max(1, tags.length)) + 8, 100);
        a.hashtag.push(newRun('hashtag', 'both', 'main', { hashtags: tags, resultsLimit: per }, per, per * Math.max(1, tags.length)));
      }
    } else if (this.kind === 'reel_link') {
      if (!a.ig.length) a.ig.push(newRun('ig', 'reel', 'main', { directUrls: [String(this.rq.url || this.row.query || '')], resultsType: 'posts', resultsLimit: 1, addParentData: false }, 1, 1));
    } else {
      const needP = !!L.photos && !a.posts.length; const needV = !!L.videos && !a.reels.length;
      if (needP || needV) {
        const [seenAll, seenVid, yld] = await Promise.all([needP ? this.countVault(false) : 0, needV ? this.countVault(true) : 0, needP ? this.yieldFor() : DEFAULT_YIELD]);
        const h = String(this.handle);
        if (needP) { const lp = Math.min(seenAll + Math.ceil(L.photos.target / yld) + 12, 150); a.posts.push(newRun('posts', 'photos', 'main', { username: [h], resultsLimit: lp, proxyConfiguration: { useApifyProxy: true } }, lp, lp)); }
        if (needV) { const lv = Math.min(seenVid + this.acctRejects.length + 2 * L.videos.target + 8, 60); a.reels.push(newRun('reels', 'videos', 'main', { username: [h], resultsLimit: lv }, lv, lv)); }
      }
    }
    this.p.planned = true; this.planned = true;
  }
  laneFail(r: AnyRec, msg: string) {
    r.status = 'NOT_STARTED';
    this.lanesOf(r).forEach((L) => this.laneDone(L, `${this.kind === 'reel_link' ? '' : `${this.label()}: `}${msg}`, true));
    this.p.last_error = msg;
  }
  async post(r: AnyRec, ms: number): Promise<string> {
    const q = `timeout=${r.timeout_s}&maxTotalChargeUsd=${r.max_usd}&waitForFinish=0`;
    try {
      const res = await fetch(`${APIFY_API}/acts/${r.actor}/runs?${q}`, apifyInit(this.token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.input), signal: AbortSignal.timeout(ms) }));
      r.http = res.status;
      const j: any = await res.json().catch(() => null);
      if (res.ok && j?.data?.id) { this.adoptData(r, j.data); return 'ok'; }
      if (res.ok) return 'unknown';
      const t = `${j?.error?.type || ''} ${j?.error?.message || ''}`;
      if (res.status === 402) return /memory/i.test(t) ? 'memory' : 'nousage';
      if (res.status === 401 || res.status === 403) return 'key';
      if (res.status === 429 || res.status >= 500) return 'retry';
      return 'bad';
    } catch { return 'unknown'; }
  }
  adoptData(r: AnyRec, d: AnyRec) {
    r.id = String(d.id); r.status = String(d.status || 'READY'); r.dataset = d.defaultDatasetId || r.dataset || null; r.kvs = d.defaultKeyValueStoreId || r.kvs || null;
    r.started_at = d.startedAt || isoAt(); if (typeof d.usageTotalUsd === 'number') r.usd_so_far = d.usageTotalUsd;
    if (APIFY_DONE.has(r.status)) r.finished_at = d.finishedAt || isoAt();
  }
  // Arranca en Apify las corridas planeadas. Antes del POST se guarda START_UNKNOWN: si el paso muere justo después,
  // el próximo la ADOPTA (por su INPUT) en vez de pagarla dos veces.
  async startPending(due: AnyRec[], postMs: number, slotOk = false) {
    if (!slotOk && !this.activeRuns().length) { // la búsqueda no tiene cupo tomado todavía → ¿hay lugar en Apify?
      await this.loadOthers();
      if (this.activeElsewhere >= this.maxActive) { const at = isoAt(Date.now() + 20_000); due.forEach((r) => { r.retry_at = at; }); this.p.wait_reason = 'slots'; this.mark('wait_slot'); return; }
    }
    const at = isoAt();
    due.forEach((r) => { r.status = 'START_UNKNOWN'; r.start_attempt_at = at; r.retry_at = null; });
    if (!(await this.persist())) return;
    const outs = await Promise.all(due.map((r) => this.post(r, postMs)));
    let started = false;
    outs.forEach((o, i) => {
      const r = due[i];
      if (o === 'ok') { started = true; this.mark('start'); return; }
      if (o === 'unknown') { r.unk = (Number(r.unk) || 0) + 1; this.p.wait_reason = 'start_unknown'; return; }
      r.status = '';
      if (o === 'memory') { r.retry_at = isoAt(Date.now() + 30_000); this.p.wait_reason = 'apify_memory'; }
      else if (o === 'retry') {
        r.post_fail = (Number(r.post_fail) || 0) + 1;
        if (r.post_fail >= 3) this.laneFail(r, `Apify no responde (${r.http}) después de 3 intentos: probá más tarde.`);
        else { r.retry_at = isoAt(Date.now() + 10_000 * 2 ** (r.post_fail - 1)); this.p.wait_reason = 'apify_busy'; }
      }
      else if (o === 'nousage') this.laneFail(r, 'Apify sin saldo o llegó al límite del mes: revisá la cuenta de Apify.');
      else if (o === 'key') this.laneFail(r, 'La llave de Apify no sirve: pegala de nuevo en /conexion.');
      else this.laneFail(r, `Apify rechazó la búsqueda (${r.http}).`);
    });
    if (started) { this.p.phase = 'apify'; if (!this.runs().some((r) => r.status === '' || r.status === 'START_UNKNOWN')) this.p.wait_reason = null; }
    await this.persist();
  }
  // POST que no respondió: ¿Apify la creó igual? Se busca entre sus últimas corridas por hora + INPUT. A los 60 s sin
  // encontrarla se reintenta el POST (2 intentos como mucho).
  async adopt(r: AnyRec) {
    if (!this.fits(T_API * 3 + U_PERSIST)) return;
    const t0a = Date.parse(r.start_attempt_at) || Date.now();
    try {
      const res = await fetch(`${APIFY_API}/acts/${r.actor}/runs?desc=1&limit=10`, apifyInit(this.token, { signal: AbortSignal.timeout(T_API) }));
      const items: any[] = res.ok ? (((await res.json().catch(() => null)) as any)?.data?.items || []) : [];
      const mine = new Set(this.runs().map((x) => String(x.id || '')));
      const want = inputKeyJ(r.input);
      for (const it of items) {
        const st = Date.parse(it?.startedAt) || 0;
        if (!it?.id || mine.has(String(it.id)) || st < t0a - 5_000 || st > t0a + 90_000 || !it.defaultKeyValueStoreId) continue;
        if (!this.fits(T_API + U_PERSIST)) break;
        const ir = await fetch(`${APIFY_API}/key-value-stores/${encodeURIComponent(it.defaultKeyValueStoreId)}/records/INPUT`, apifyInit(this.token, { signal: AbortSignal.timeout(T_API) }));
        const inp = ir.ok ? await ir.json().catch(() => null) : null;
        if (inp && inputKeyJ(inp) === want) { this.adoptData(r, it); this.p.phase = 'apify'; this.mark('adopt'); return; }
      }
    } catch { /* la próxima */ }
    if (Date.now() - t0a > 60_000) {
      if ((Number(r.unk) || 0) < 2) { r.status = ''; r.retry_at = null; }
      else this.laneFail(r, 'No pude confirmar que Apify arrancó la búsqueda (2 intentos): probá de nuevo.');
    }
  }
  async poll(wfs: number): Promise<boolean> {
    const act = this.runs().filter((r) => r.id && !APIFY_DONE.has(r.status));
    if (!act.length || !this.fits(T_API + wfs * 1000 + T_API + U_PERSIST, 125_000)) return false;
    this.lastPoll = Date.now();
    await Promise.all(act.map(async (r) => {
      try {
        const res = await fetch(`${APIFY_API}/actor-runs/${encodeURIComponent(r.id)}?waitForFinish=${wfs}`, apifyInit(this.token, { signal: AbortSignal.timeout(T_API + wfs * 1000) }));
        const d: any = ((await res.json().catch(() => null)) as any)?.data;
        if (d?.status) {
          r.status = String(d.status);
          if (typeof d.usageTotalUsd === 'number') r.usd_so_far = d.usageTotalUsd;
          if (!r.dataset && d.defaultDatasetId) r.dataset = d.defaultDatasetId;
          if (APIFY_DONE.has(r.status)) r.finished_at = d.finishedAt || isoAt();
        }
        r.polls = (Number(r.polls) || 0) + 1;
        // Cada 2 lecturas: cuántos posts lleva (para mostrar «Apify trayendo posts… (18)»).
        if (!APIFY_DONE.has(r.status) && r.dataset && r.polls % 2 === 0 && this.fits(T_API + U_PERSIST, 125_000)) {
          const dr = await fetch(`${APIFY_API}/datasets/${encodeURIComponent(r.dataset)}`, apifyInit(this.token, { signal: AbortSignal.timeout(T_API) }));
          const dd: any = ((await dr.json().catch(() => null)) as any)?.data;
          const n = Number(dd?.itemCount ?? dd?.cleanItemCount); if (Number.isFinite(n)) r.items_live = n;
        }
      } catch { /* la próxima */ }
    }));
    this.mark('poll');
    return true;
  }
  // Items de una corrida TERMINADA (una lectura por paso; cursor = índice en el orden fijo). null = no se pudo leer.
  async items(r: AnyRec): Promise<any[] | null> {
    if (!r.dataset) return [];
    const hit = this.ds.get(r.dataset); if (hit) return hit;
    if (!this.fits(T_DS + U_PERSIST)) return null;
    try {
      const res = await fetch(`${APIFY_API}/datasets/${encodeURIComponent(r.dataset)}/items?clean=1&offset=0&limit=1000&fields=${JOB_FIELDS}`, apifyInit(this.token, { signal: AbortSignal.timeout(T_DS) }));
      const j = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(j)) { r.ds_fail = (Number(r.ds_fail) || 0) + 1; return null; }
      this.ds.set(r.dataset, j); r.total = j.length; r.offset = j.length;
      return j;
    } catch { r.ds_fail = (Number(r.ds_fail) || 0) + 1; return null; }
  }
  // Primera vez que se leen los items de una corrida terminada: cuenta privada / falló sin nada → reintento / vacía.
  evaluate(r: AnyRec, items: any[]): string {
    if (r.evaluated) return 'ok';
    r.evaluated = true;
    const lanes = this.lanesOf(r);
    const { issue, error_items } = issueOf(items);
    if (error_items.length) this.p.error_items = error_items;
    if (items.some(usableItem)) return 'ok';
    const reel = this.kind === 'reel_link';
    if (issue) {
      this.p.issue = issue;
      const n = reel ? 'No se pudo leer ese link (¿es un reel público?).' : `${this.label()} ${ISSUE_TEXT[issue]}`;
      // Cuenta privada / inexistente: TODOS los carriles terminan (la otra corrida se cancela al cerrar: no se paga de más).
      (issue === 'private' || issue === 'not_found' ? (Object.values(this.L) as AnyRec[]) : lanes).forEach((L) => this.laneDone(L, n));
      return 'done';
    }
    if (r.status !== 'SUCCEEDED' && !(r.status === 'ABORTED' && r.ours_abort)) {
      if (lanes.every((L) => (Number(L.retries) || 0) < 1)) {
        const g = groupOfActor(r.actor);
        lanes.forEach((L) => { L.retries = 1; L.cursor = 0; });
        this.p.apify[g].push(newRun(g, r.role, 'retry', r.input, r.limit, Number(r.plan_items) || r.limit));
        this.mark('retry');
        return 'retry';
      }
      lanes.forEach((L) => this.laneDone(L, `${reel ? '' : `${this.label()}: `}Apify falló (${r.status}) dos veces: probá más tarde.`, true));
      return 'done';
    }
    lanes.forEach((L) => this.laneDone(L, reel ? 'No se pudo leer ese link (¿es un reel público?).' : `${this.label()}: sin posts públicos usables.`));
    return 'done';
  }
  shortNote(ln: string): string {
    const L = this.L[ln]; const g = laneGroup(this.kind, ln); const rs = this.p.apify[g] || [];
    if (this.kind === 'reel_link') return L.link_fails + L.dl_fails > 0 ? 'No se pudo guardar el video (¿muy grande o link vencido?).' : 'Ese link no tiene video (¿es un reel?).';
    if (ln === 'photos') {
      const good = L.saved - L.ai_rejected; const seen = Math.max(0, ...rs.map((r: AnyRec) => Number(r.total) || 0));
      return this.kind === 'account'
        ? `${this.label()}: pediste ${L.target} fotos, la cuenta solo tenía ${good} foto${good === 1 ? '' : 's'} nueva${good === 1 ? '' : 's'} que sirve${good === 1 ? '' : 'n'} (revisé sus últimos ${seen} posts).`
        : `${this.label()}: pediste ${L.target} fotos y encontré ${good} nueva${good === 1 ? '' : 's'} que sirve${good === 1 ? '' : 'n'} (revisé ${rs.reduce((s: number, r: AnyRec) => s + (Number(r.total) || 0), 0)} posts).`;
    }
    const fails = (L.link_fails || 0) + (L.dl_fails || 0) + (L.expired || 0);
    return `${this.label()}: traje ${L.saved} de ${L.target} videos: tenía ${L.fresh || 0} reel${L.fresh === 1 ? '' : 's'} nuevo${L.fresh === 1 ? '' : 's'} y ${L.sola_rejected || 0} no pasaron el filtro «sola».${fails ? ` ${fails} no se pudieron bajar.` : ''}`;
  }
  // Se acabaron las candidatas y falta: UNA recarga si la cuenta tenía más (la corrida llegó a su tope), o refresco de
  // links si la mitad de las bajadas falló por link vencido. Si no, el carril termina con la explicación.
  exhausted(ln: string): string {
    const L = this.L[ln]; const r = this.cur(ln)!; const g = laneGroup(this.kind, ln);
    const need = ln === 'photos' ? L.target - (L.saved - L.ai_rejected) : L.target - L.saved - L.pending_video_items.length;
    if (need <= 0) { this.laneDone(L, null); return 'did'; }
    const age = Date.now() - (Date.parse(this.row.created_at || this.row.run_at) || Date.now());
    const cap = TOPUP_CAP[g] || 0;
    const ntags = g === 'hashtag' ? Math.max(1, (r.input?.hashtags || []).length) : 1;
    const good = ln === 'photos' ? L.saved - L.ai_rejected : L.saved;
    const rObs = good / Math.max(1, Number(r.total) || 0);
    if (ln === 'photos' && good === 0 && L.ai_rejected >= 10) { this.laneDone(L, `${this.label()}: la IA sacó todo: no encaja con el estilo.`); return 'did'; }
    const refresh = ln === 'videos' && L.attempts >= 2 && ((L.link_fails || 0) + (L.expired || 0)) * 2 >= L.attempts;
    const hitCap = (Number(r.total) || 0) >= 0.9 * r.limit * ntags;
    const can = !this.p.issue && (Number(L.topups) || 0) < 1 && age < 6 * 3600_000 && g !== 'ig' && (refresh || (hitCap && r.limit < cap));
    if (!can) { this.laneDone(L, this.shortNote(ln)); return 'did'; }
    const limit2 = refresh ? r.limit : Math.min(r.limit + Math.ceil(need / Math.max(rObs, 0.1) / ntags) + 12, cap);
    this.p.apify[g].push(newRun(g, r.role, refresh ? 'refresh' : 'topup', { ...r.input, resultsLimit: limit2 }, limit2, limit2 * ntags));
    L.topups = (Number(L.topups) || 0) + 1;
    this.lanesOf(r).forEach((x) => { if (!x.done) { x.cursor = 0; if (refresh && x.pending_video_items) x.pending_video_items = []; } });
    this.mark(refresh ? 'refresh' : 'topup');
    return 'did';
  }
  async reviewPending(n: number): Promise<number> {
    if (n <= 0) return 0;
    const { data, error } = await this.svc.from('creator_vault').select('id, url').eq('scrape_run_id', this.id).is('ai_ok', null).is('ai_reason', null).neq('media_type', 'video').limit(n);
    if (error) return -1;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) return 0;
    const acc = aiUse();
    this.L.photos.review_tries = (Number(this.L.photos.review_tries) || 0) + rows.length;
    await Promise.all(rows.map((row: any) => aiReviewOne(this.svc, this.akey, this.style, row, acc)));
    this.addAi(acc, 'photo_calls');
    this.mark('review', rows.length);
    return rows.length;
  }
  // FOTOS: guardar las mejores nuevas hasta cubrir lo pedido (contando las que la IA deja), revisar de a 8, repetir.
  async collectPhotos(): Promise<string> {
    const L = this.L.photos; if (!L || L.done) return 'idle';
    const r = this.cur('photos'); if (!r || !r.id || !APIFY_DONE.has(r.status)) return 'idle';
    const items = await this.items(r); if (items === null) return this.fits(T_DS + U_PERSIST) ? 'err' : 'time';
    if (this.evaluate(r, items) !== 'ok') return (await this.persist()) ? 'did' : 'stop';
    const cands = photoCands(items);
    let need = L.target - (L.saved - L.ai_rejected);
    if (need > 0 && L.cursor < cands.length) {
      if (!this.fits(U_SAVE * 2 + U_PERSIST)) return 'time';
      const slice = cands.slice(L.cursor, L.cursor + 20);
      const urls = [...new Set(slice.map((it: any) => String(it.url || '')).filter(Boolean))];
      const seen = new Set<string>();
      if (urls.length) {
        const { data, error } = await this.svc.from('creator_vault').select('source_url').eq('creator_id', this.cid).eq('kind', 'ref').eq('media_type', 'image').in('source_url', urls);
        if (error) return 'err';
        (Array.isArray(data) ? data : []).forEach((x: any) => { if (x?.source_url) seen.add(String(x.source_url)); });
      }
      let since = 0;
      for (const it of slice) {
        if (need <= 0 || !this.fits(U_SAVE + U_PERSIST)) break;
        L.cursor += 1; L.examined = (Number(L.examined) || 0) + 1;
        if (it.url && seen.has(String(it.url))) continue;
        const { data: ins, error } = await this.svc.from('creator_vault').upsert(photoRowOf(this.cid, it, this.vibe(), this.id), { onConflict: 'creator_id,kind,url', ignoreDuplicates: true }).select('id');
        if (!error && Array.isArray(ins) && ins.length) { L.saved += 1; L.pending_review += 1; need -= 1; since += 1; this.mark('save'); }
        if (since >= 5) { since = 0; if (!(await this.persist())) return 'stop'; }
      }
      return (await this.persist()) ? 'did' : 'stop';
    }
    const cap = L.target * 3 + 12;
    const canReview = !!this.akey && (Number(L.review_tries) || 0) < cap;
    if (L.pending_review > 0 && canReview) {
      if (!this.fits(U_SAVE + U_REVIEW + U_SAVE + U_PERSIST)) return 'time';
      const n = await this.reviewPending(Math.min(8, cap - (Number(L.review_tries) || 0)));
      await this.recount();
      if (!(await this.persist())) return 'stop';
      return n < 0 ? 'err' : 'did';
    }
    need = L.target - (L.saved - L.ai_rejected);
    if (need <= 0) { this.laneDone(L, this.akey ? null : `${this.label()}: sin filtro IA: falta la llave de Anthropic.`); return (await this.persist()) ? 'did' : 'stop'; }
    const res = this.exhausted('photos');
    return (await this.persist()) ? res : 'stop';
  }
  async loadSeenV(cands: any[]): Promise<boolean> {
    const urls = [...new Set(cands.map((it: any) => String(it.url || '')).filter((u) => u && !this.seenChecked.has(u)))];
    if (!urls.length) return true;
    const { data, error } = await this.svc.from('creator_vault').select('source_url').eq('creator_id', this.cid).eq('media_type', 'video').in('source_url', urls);
    if (error) return false;
    urls.forEach((u) => this.seenChecked.add(u));
    (Array.isArray(data) ? data : []).forEach((x: any) => { if (x?.source_url) this.seenV.add(String(x.source_url)); });
    return true;
  }
  // Bajar UN video aprobado: mp4 (≤ 20 s, ≤ 50 MB) → storage, portada re-hospedada, fila con scrape_run_id.
  async downloadOne() {
    const L = this.L.videos; const pv = L.pending_video_items.shift(); if (!pv) return;
    L.attempts = (Number(L.attempts) || 0) + 1;
    if (linkExpired(pv.video_url)) { L.expired = (Number(L.expired) || 0) + 1; this.mark('expired'); return; }
    const st = await storeVideoT(this.svc, this.cid, String(pv.video_url), T_MP4);
    if (!st.url) {
      if (st.http === 403 || st.http === 410) L.link_fails = (Number(L.link_fails) || 0) + 1; else L.dl_fails = (Number(L.dl_fails) || 0) + 1;
      L.last_fail = st.reason; this.mark('video_fail'); return;
    }
    let thumb: string | null = null;
    if (pv.poster && !linkExpired(pv.poster)) thumb = await storeImg(this.svc, this.cid, String(pv.poster), this.inline ? 6_000 : 5_000);
    // Sin portada propia → la miniatura es el mismo mp4 (la app muestra su primer cuadro): nunca un link de IG que vence.
    const { data: ins, error } = await this.svc.from('creator_vault').upsert(videoRowOf(this.cid, pv, thumb || st.url, st.url, this.vibe(), this.id), { onConflict: 'creator_id,kind,url', ignoreDuplicates: true }).select('id');
    if (!error && Array.isArray(ins) && ins.length) { L.saved += 1; if (pv.source_url) this.seenV.add(String(pv.source_url)); L.last = { video_url: st.url, handle: pv.owner || null }; this.mark('video'); }
    else L.dl_fails = (Number(L.dl_fails) || 0) + 1;
  }
  // Reel por link con «cocinar»: se encola UNA vez (marca 'started' ANTES de insertar: si el paso muere, el próximo
  // mira si la generación ya existe en vez de encolar dos).
  async cookUnit(): Promise<string> {
    const L = this.L.videos;
    if (!this.rq.cook || L.cook_done === true) { this.laneDone(L, L.note); return (await this.persist()) ? 'did' : 'stop'; }
    if (!this.fits(9 * U_SAVE + U_PERSIST)) return 'time';
    const stored = String(L.last?.video_url || '');
    if (L.cook_done === 'started') {
      const { data } = await this.svc.from('generations').select('id').eq('creator_id', this.cid).eq('reference_url', stored).limit(1);
      if (Array.isArray(data) && data.length) { this.p.cook = { cooking: String(data[0].id) }; L.cook_done = true; this.laneDone(L, null); return (await this.persist()) ? 'did' : 'stop'; }
    }
    L.cook_done = 'started';
    if (!(await this.persist())) return 'stop';
    const c = await cookReel(this.svc, this.cid, stored, this.rq.run_by || null);
    this.p.cook = c; L.cook_done = true; this.mark('cook');
    this.laneDone(L, null);
    return (await this.persist()) ? 'did' : 'stop';
  }
  // VIDEOS: filtro «sola» de a uno (el mejor éxito nuevo primero) → aprobados a la espera → bajar de a uno.
  async collectVideos(): Promise<string> {
    const L = this.L.videos; if (!L || L.done) return 'idle';
    const r = this.cur('videos'); if (!r || !r.id || !APIFY_DONE.has(r.status)) return 'idle';
    const items = await this.items(r); if (items === null) return this.fits(T_DS + U_PERSIST) ? 'err' : 'time';
    if (this.evaluate(r, items) !== 'ok') return (await this.persist()) ? 'did' : 'stop';
    const reel = this.kind === 'reel_link';
    if (reel && L.saved >= 1) return this.cookUnit();
    // Aprobados que quedaron de un paso anterior: si ese paso murió DESPUÉS de guardar la fila (y antes de anotarlo),
    // el video ya está en el baúl → se saca de la espera (nunca se baja dos veces).
    if (!this.pendChecked && L.pending_video_items.length) {
      const us = [...new Set(L.pending_video_items.map((x: AnyRec) => String(x.source_url || '')).filter(Boolean))] as string[];
      if (us.length) {
        const { data, error } = await this.svc.from('creator_vault').select('source_url').eq('creator_id', this.cid).eq('media_type', 'video').in('source_url', us);
        if (error) return 'err';
        const have = new Set((Array.isArray(data) ? data : []).map((x: any) => String(x.source_url)));
        have.forEach((u) => this.seenV.add(u));
        L.pending_video_items = L.pending_video_items.filter((x: AnyRec) => !have.has(String(x.source_url || '')));
      }
      this.pendChecked = true;
    }
    if (L.pending_video_items.length) {
      const worst = this.inline ? 50_000 : U_VIDEO; // reel por link en la misma request: topes 20/20/6 s
      if (this.fits(worst + U_PERSIST, this.inline ? 75_000 : 70_000)) { await this.downloadOne(); return (await this.persist()) ? 'did' : 'stop'; }
      if (L.saved + L.pending_video_items.length >= L.target) return 'time';
    }
    const cands = videoCands(items);
    const need = L.target - L.saved - L.pending_video_items.length;
    const solaOn = !!this.akey && !reel;
    if (need > 0 && L.cursor < cands.length) {
      if (solaOn && (Number(L.sola) || 0) >= L.target * 3 + 10) { this.laneDone(L, `${this.shortNote('videos')} (llegué al tope de chequeos «sola»)`); return (await this.persist()) ? 'did' : 'stop'; }
      if (!this.fits((solaOn ? U_SOLA : 0) + U_SAVE + U_PERSIST)) return 'time';
      if (!reel && !(await this.loadSeenV(cands.slice(L.cursor, L.cursor + 20)))) return 'err';
      while (L.cursor < cands.length) {
        const it = cands[L.cursor]; const su = String(it.url || '');
        if (!reel && su && !this.seenChecked.has(su)) break; // fuera de la tanda chequeada: la próxima vuelta
        L.cursor += 1;
        if (!reel && su && (this.seenV.has(su) || L.rejected.includes(su) || this.acctRejects.includes(su))) continue;
        if (!it.videoUrl) continue;
        if (linkExpired(it.videoUrl)) { L.expired = (Number(L.expired) || 0) + 1; continue; }
        const poster = imgOf(it); if (!poster && !reel) continue;
        L.fresh = (Number(L.fresh) || 0) + 1;
        if (solaOn) {
          const acc = aiUse(); const solo = await isSoloWoman(this.akey, String(poster), acc);
          this.addAi(acc, 'sola_calls'); L.sola = (Number(L.sola) || 0) + 1; this.mark('sola');
          if (solo === false) { L.rejected.push(su); L.sola_rejected = (Number(L.sola_rejected) || 0) + 1; if (su && this.kind === 'account') this.newRejects.push(su); break; }
          if (solo !== true) { L.rejected.push(su); break; } // error / duda: se salta (no se marca en la cuenta)
          L.pending_video_items.push(pendingOf(it)); break;
        }
        L.pending_video_items.push(pendingOf(it));
        if (L.saved + L.pending_video_items.length >= L.target) break;
      }
      L.rejected = L.rejected.slice(-200);
      return (await this.persist()) ? 'did' : 'stop';
    }
    if (L.pending_video_items.length) return 'time';
    const res = this.exhausted('videos');
    return (await this.persist()) ? res : 'stop';
  }
  // Una vuelta: arrancar → adoptar → juntar → cerrar / esperar a Apify. null = seguir en este paso; número = soltar la
  // búsqueda y volver en esos ms; 'stop' = no hay nada que soltar (terminó o perdió el candado).
  async tick(): Promise<number | 'stop' | null> {
    if (!this.p.planned) {
      if (!this.fits(3 * U_SAVE + T_API + 2 * U_PERSIST)) return 0;
      await this.plan();
    }
    const now = Date.now();
    const due = this.runs().filter((r) => r.status === '' && (!r.retry_at || Date.parse(r.retry_at) <= now));
    if (due.length) {
      if (!this.fits(U_SAVE + T_API + 2 * U_PERSIST)) return 0;
      await this.startPending(due, T_API);
      if (this.lost) return 'stop';
    }
    for (const r of this.runs().filter((x) => x.status === 'START_UNKNOWN')) { await this.adopt(r); if (this.lost) return 'stop'; }
    // Mientras se trabaja un carril, una mirada rápida (sin esperar) a las corridas que siguen en Apify cada ~10 s.
    const act0 = this.runs().filter((r) => r.id && !APIFY_DONE.has(r.status));
    if (act0.length && Date.now() - this.lastPoll > 10_000 && this.fits(2 * T_API + U_PERSIST, 110_000)) await this.poll(0);
    let did = false, time = false, err = false;
    for (const ln of ['photos', 'videos']) {
      const res = ln === 'photos' ? await this.collectPhotos() : await this.collectVideos();
      if (res === 'stop') return 'stop';
      if (res === 'did') did = true; else if (res === 'time') time = true; else if (res === 'err') err = true;
    }
    if (did) return null;
    if (this.allDone()) { await this.finalize(); return 'stop'; }
    const act = this.runs().filter((r) => r.id && !APIFY_DONE.has(r.status));
    if (act.length && !time) {
      const wfs = this.othersDue || err ? 0 : Math.max(0, Math.min(20, Math.floor((Math.min(this.soft, this.pollEnd) - this.el() - T_API - U_PERSIST) / 1000)));
      if (await this.poll(wfs)) {
        if (!(await this.persist())) return 'stop';
        if (act.some((r) => APIFY_DONE.has(r.status))) return null; // algo terminó: a juntar
        if (wfs > 0 && !this.othersDue) return null;               // sigue esperando en este paso
      }
    }
    const w = this.waitHint(time, err);
    if (w == null) { await this.finalize(); return 'stop'; }
    return w;
  }
  // Cuándo conviene volver: ya (faltó tiempo en este paso) · 10 s (Apify sigue / error) · cuando toque reintentar.
  waitHint(time = false, err = false): number | null {
    const waits: number[] = [];
    if (time) waits.push(0);
    if (err) waits.push(10_000);
    if (this.runs().some((r) => r.id && !APIFY_DONE.has(r.status))) waits.push(10_000);
    this.runs().forEach((r) => {
      if (r.status === '') waits.push(Math.max(0, (Date.parse(r.retry_at) || Date.now()) - Date.now()));
      if (r.status === 'START_UNKNOWN') waits.push(10_000);
    });
    return waits.length ? Math.min(...waits) : null;
  }
  async step() {
    if (!(await this.loadCfg())) { await this.release(10_000); return; }
    await this.loadOthers();
    if (!this.token) { await this.finalize('error', 'Falta la llave de Apify: pegala en /conexion.'); return; }
    if (this.row.cancel_requested_at) { await this.finalize('canceled'); return; }
    if (!(await this.recount())) { await this.release(10_000); return; }
    if (Date.now() - (Date.parse(this.row.created_at || this.row.run_at) || Date.now()) > 24 * 3600_000) { await this.finalize('late'); return; }
    let wait = 0;
    for (let i = 0; i < 400; i++) {
      if (this.lost || this.finished) return;
      if (this.cancel) { await this.finalize('canceled'); return; }
      if (this.el() > this.soft) { wait = 0; break; }
      const r = await this.tick();
      if (r === 'stop') return;
      if (r === null) continue;
      wait = r; break;
    }
    if (!this.lost && !this.finished) await this.release(wait);
  }
  async abortRun(r: AnyRec) {
    r.ours_abort = true;
    try {
      const res = await fetch(`${APIFY_API}/actor-runs/${encodeURIComponent(r.id)}/abort`, apifyInit(this.token, { method: 'POST', signal: AbortSignal.timeout(T_API) }));
      const d: any = ((await res.json().catch(() => null)) as any)?.data;
      if (res.ok && d?.status) { r.status = String(d.status); if (!APIFY_DONE.has(r.status)) r.status = 'ABORTED'; r.finished_at = isoAt(); }
    } catch { /* sigue acotada por su timeout y su techo de gasto */ }
  }
  // Cierre: cancela lo que siga corriendo, lee el costo REAL de cada corrida, revisa lo que falte y escribe la fila final.
  async finalize(forced?: string, msg?: string) {
    if (this.finished || this.lost) return;
    const act = this.runs().filter((r) => r.id && !APIFY_DONE.has(r.status));
    if (act.length && this.fits(T_API + U_PERSIST, 125_000)) await Promise.all(act.map((r) => this.abortRun(r)));
    const need = this.runs().filter((r) => r.id && r.usd == null && APIFY_DONE.has(r.status));
    if (need.length && this.fits(14_000 + U_PERSIST, 118_000)) {
      const us = await Promise.all(need.map((r) => apifyRunUsd(String(r.id), this.token, 2, 6_000)));
      us.forEach((u, i) => { if (u != null) need[i].usd = u; });
    }
    const L = this.L;
    if (forced !== 'canceled' && L.photos && L.photos.pending_review > 0 && this.akey && (Number(L.photos.review_tries) || 0) < L.photos.target * 3 + 12 && this.fits(U_SAVE + U_REVIEW + U_SAVE + U_PERSIST, 95_000)) await this.reviewPending(8);
    await this.recount();
    const ph = L.photos, vi = L.videos;
    const got = (ph ? ph.saved : 0) + (vi ? vi.saved : 0);
    const met = (!ph || ph.saved - ph.ai_rejected >= ph.target) && (!vi || vi.saved >= vi.target);
    const laneErr = [ph, vi].find((x: AnyRec | undefined) => x && x.error)?.error || null;
    let status: string;
    if (forced === 'canceled') status = got ? 'partial' : 'canceled';
    else if (forced === 'error') status = got ? 'partial' : 'error';
    else if (forced === 'late') status = got ? 'partial' : 'empty';
    else if (met) status = 'ok';
    else if (got) status = 'partial';
    else if (laneErr && !this.p.issue) status = 'error';
    else status = 'empty';
    if (forced === 'late') this.p.final_note = 'Se retomó tarde: los links de Instagram vencieron.';
    if (forced === 'canceled') this.p.final_note = 'Cancelada.';
    if (forced === 'error' && msg) this.p.final_note = msg;
    const err = forced === 'error' ? (msg || null) : status === 'error' ? laneErr : null;
    if (err) this.p.last_error = err;
    this.p.phase = 'done'; this.p.wait_reason = null;
    for (const x of [ph, vi]) if (x && !x.done) x.done = true;
    const now = isoAt();
    const ok = await this.persist({ status, phase: 'done', finished_at: now, run_at: now, apify_active: 0, lease_until: null, lease_owner: null, next_step_at: null, error: err ? String(err).slice(0, 300) : null });
    if (!ok) return;
    this.finished = true; this.finalStatus = status; this.mark('done');
    if (this.kind === 'account' && this.handle) {
      const patch: AnyRec = { last_run_at: now };
      if (this.p.issue === 'private') patch.status = 'private'; else if (this.p.issue === 'not_found') patch.status = 'dead';
      try { await this.svc.from('scrape_accounts').update(patch).eq('creator_id', this.cid).eq('handle', this.handle); } catch { /* noop */ }
    }
    if (this.el() < 60_000 && this.akey) await reviewLeftovers(this.svc, this.cid, this.t0);
  }
}

// Vista de una búsqueda para la página (sin los arreglos pesados del progreso).
function slimProgress(p: AnyRec): AnyRec {
  if (!p || typeof p !== 'object') return {};
  const lanes: AnyRec = {};
  for (const [k, v] of Object.entries(p.lanes || {})) { const x: AnyRec = { ...(v as AnyRec) }; if (Array.isArray(x.pending_video_items)) x.pending_video_items = x.pending_video_items.length; if (Array.isArray(x.rejected)) x.rejected = x.rejected.length; lanes[k] = x; }
  const apify: AnyRec = {};
  for (const g of ['posts', 'reels', 'hashtag', 'ig']) apify[g] = (p.apify?.[g] || []).map((r: AnyRec) => ({ id: r.id, role: r.role, kind: r.kind, status: r.status, limit: r.limit, total: r.total, items_live: r.items_live, usd: r.usd, usd_so_far: r.usd_so_far, started_at: r.started_at, finished_at: r.finished_at }));
  return { v: p.v, phase: p.phase, wait_reason: p.wait_reason, lanes, apify, ai: p.ai, issue: p.issue, error_items: p.error_items, steps: p.steps, last_step_at: p.last_step_at, last_driver: p.last_driver, last_error: p.last_error, cook: p.cook };
}
function jobView(r: AnyRec, now: number, queuePos: number | null): AnyRec {
  const rq = r.requested || {}; const p = r.progress || {}; const L = p.lanes || {}; const kind = String(rq.kind || r.kind || 'account');
  const active = JOB_ACTIVE.includes(String(r.status));
  const live = !!r.lease_until && Date.parse(r.lease_until) > now;
  const stale = active && !live && now - (Date.parse(r.updated_at || r.created_at || r.run_at) || now) > 180_000;
  const ap = (lane: string) => {
    const a: AnyRec[] = p.apify?.[laneGroup(kind, lane)] || []; const c = a.length ? a[a.length - 1] : null;
    return c ? { status: c.status || 'pendiente', items: Math.max(Number(c.total) || 0, Number(c.items_live) || 0), limit: c.limit, topups: a.filter(isTopup).length } : null;
  };
  return {
    id: r.id, creator_id: r.creator_id, account_id: r.account_id, kind: r.kind, query: r.query, status: r.status, run_at: r.run_at, created_at: r.created_at, updated_at: r.updated_at, finished_at: r.finished_at,
    found: r.found, saved: r.saved, videos: r.videos, kept: r.kept, cost_est: r.cost_est, cost_real: r.cost_real, cost_apify: r.cost_apify, cost_ai: r.cost_ai, cost_source: r.cost_source, cost_breakdown: r.cost_breakdown, apify_run_ids: r.apify_run_ids,
    requested: rq, progress: slimProgress(p), note: r.note || null, error: r.error || null,
    handle: kind === 'account' ? String((Array.isArray(rq.accounts) && rq.accounts[0]) || r.query || '') : null,
    want: { photos: Number(rq.photos) || 0, videos: Number(rq.videos) || 0 },
    got: { photos: Number(L.photos?.saved ?? r.saved) || 0, kept: Number(L.photos?.kept) || 0, ai_rejected: Number(L.photos?.ai_rejected) || 0, videos: Number(L.videos?.saved ?? r.videos) || 0, pending_review: Number(L.photos?.pending_review) || 0 },
    apify: { photos: L.photos ? ap('photos') : null, videos: L.videos ? ap('videos') : null },
    phase: r.phase || p.phase || null, queue_pos: queuePos, wait_reason: p.wait_reason || null, stale, issue: p.issue || null, batch_id: rq.batch_id || null, cancel_requested: !!r.cancel_requested_at,
  };
}
// Búsquedas activas + las terminadas hace poco (since_ms). También: si el cocinero de la Mac está prendido, cupos, y
// cuándo conviene volver a dar un paso.
async function listJobs(svc: any, o: { creatorId?: string | null; ids?: string[]; sinceMs?: number } = {}): Promise<AnyRec> {
  const since = isoAt(Date.now() - Math.max(0, o.sinceMs ?? 600_000));
  let q = svc.from('scrape_runs').select(JOB_COLS).not('requested', 'is', null);
  if (o.ids?.length) q = q.in('id', o.ids); else q = q.or(`status.in.(queued,running),finished_at.gte."${since}"`);
  if (o.creatorId) q = q.eq('creator_id', o.creatorId);
  const [res, cfg] = await Promise.all([
    q.order('created_at', { ascending: true }).limit(200),
    svc.from('app_config').select('key, value').in('key', ['scrape_worker_seen_at', 'scraper_max_active']),
  ]);
  if (res.error) return missingCol(res.error) ? { ...NEEDS_MIG } : { ok: false, error: `No se pudieron leer las búsquedas: ${res.error.message}` };
  const m: AnyRec = {}; (Array.isArray(cfg.data) ? cfg.data : []).forEach((x: any) => { m[x.key] = x.value; });
  const now = Date.now();
  const seen = Date.parse(clean(m.scrape_worker_seen_at)) || 0;
  const rows: AnyRec[] = Array.isArray(res.data) ? res.data : [];
  const queued = rows.filter((r) => r.status === 'queued');
  const active = rows.filter((r) => JOB_ACTIVE.includes(String(r.status)));
  const jobs = rows.map((r) => { const qi = queued.indexOf(r); return jobView(r, now, qi >= 0 ? qi : null); });
  const liveL = (r: AnyRec) => !!r.lease_until && Date.parse(r.lease_until) > now;
  const more_due = active.some((r) => !liveL(r) && (!r.next_step_at || Date.parse(r.next_step_at) <= now));
  const nexts = active.map((r) => Math.max(Date.parse(r.next_step_at) || now, liveL(r) ? Date.parse(r.lease_until) : 0) - now);
  const next_in_ms = nexts.length ? Math.min(60_000, Math.max(3_000, Math.min(...nexts))) : 60_000;
  const mx = Number(clean(m.scraper_max_active));
  return { ok: true, jobs, more_due, next_in_ms, worker_online: !!seen && now - seen < 180_000, slots: { active: active.filter((r) => r.status === 'running' && Number(r.apify_active) > 0).length, max: mx >= 1 ? Math.floor(mx) : 3 } };
}
// UN paso: toma UNA búsqueda que toca (candado 150 s), la avanza hasta ~95 s y la suelta.
async function scrapeStep(svc: any, o: { driver: string; t0: number; budgetMs: number; preferCreator?: string | null; jobId?: string | null }): Promise<AnyRec> {
  const owner = crypto.randomUUID();
  const pref = o.preferCreator && UUID_RE.test(o.preferCreator) ? o.preferCreator : null;
  const jid = o.jobId && UUID_RE.test(o.jobId) ? o.jobId : null;
  const { data, error } = await svc.rpc('scrape_job_claim', { p_owner: owner, p_job: jid, p_prefer: pref, p_lease_s: JOB_LEASE_S });
  if (error) return missingFn(error) || missingCol(error) ? { ...NEEDS_MIG } : { ok: false, error: `No se pudo tomar una búsqueda: ${error.message}` };
  if (o.driver === 'worker') { try { await svc.from('app_config').upsert({ key: 'scrape_worker_seen_at', value: isoAt(), updated_at: isoAt() }, { onConflict: 'key' }); } catch { /* noop */ } }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) { const js = await listJobs(svc, {}); return { ...js, ok: js.ok !== false, stepped: null, idle: true }; }
  const job = new ScrapeJob(svc, row, owner, o.t0, { soft: Math.min(Math.max(o.budgetMs, 20_000), STEP_SOFT_MS), driver: o.driver });
  try { await job.step(); }
  catch (e) { job.p.last_error = String((e as Error)?.message || e).slice(0, 200); if (!job.lost && !job.finished) { try { await job.release(10_000); } catch { /* noop */ } } }
  const out: AnyRec = { ok: true, stepped: job.id, did: Object.entries(job.did).map(([k, n]) => (n > 1 ? `${k}:${n}` : k)), status: job.finalStatus || null };
  if (Date.now() - o.t0 <= 125_000) {
    const js = await listJobs(svc, {});
    if (js.ok !== false) { out.jobs = js.jobs; out.job = (js.jobs as AnyRec[]).find((j) => j.id === job.id) || null; out.more_due = js.more_due; out.next_in_ms = js.next_in_ms; out.worker_online = js.worker_online; out.slots = js.slots; }
  }
  if (!out.job) { out.job = jobView({ ...row, ...job.mirror(), status: job.finalStatus || job.mirror().status }, Date.now(), null); out.more_due = out.more_due ?? true; out.next_in_ms = out.next_in_ms ?? 3_000; }
  return out;
}
// ¿Está la migración (columnas + función del candado)? Una llamada a la función que no toma nada.
async function jobsReady(svc: any): Promise<boolean> {
  const { error } = await svc.rpc('scrape_job_claim', { p_owner: ZERO_UUID, p_job: ZERO_UUID, p_prefer: null, p_lease_s: 1 });
  return !error;
}
async function insertJobs(svc: any, rows: AnyRec[]): Promise<{ inserted: AnyRec[]; dups: AnyRec[]; mig?: boolean; error?: string }> {
  const out: { inserted: AnyRec[]; dups: AnyRec[]; mig?: boolean; error?: string } = { inserted: [], dups: [] };
  const one = async (row: AnyRec) => {
    const { data, error } = await svc.from('scrape_runs').insert(row).select(JOB_COLS);
    if (!error) { out.inserted.push(...(Array.isArray(data) ? data : [data])); return; }
    if (missingCol(error)) { out.mig = true; return; }
    if (String(error.code) === '23505') {
      const { data: ex } = await svc.from('scrape_runs').select(JOB_COLS).eq('dedupe_key', row.dedupe_key).in('status', JOB_ACTIVE).limit(1);
      if (Array.isArray(ex) && ex[0]) out.dups.push(ex[0]);
      return;
    }
    out.error = error.message;
  };
  const { data, error } = await svc.from('scrape_runs').insert(rows).select(JOB_COLS);
  if (!error) { out.inserted = Array.isArray(data) ? data : []; return out; }
  if (missingCol(error)) return { inserted: [], dups: [], mig: true };
  if (String(error.code) !== '23505') return { inserted: [], dups: [], error: error.message };
  for (const row of rows) { await one(row); if (out.mig) break; } // alguna ya se estaba buscando: de a una
  return out;
}
// Crea las búsquedas (una por cuenta, o una de tema / reel) y arranca en Apify las que entran en el cupo. Contesta en ~1-2 s.
async function scrapeStart(svc: any, user: string, body: AnyRec, t0: number): Promise<AnyRec> {
  const kind = body.kind === 'tema' ? 'tema' : 'account';
  const cid = String(body.creator_id || '');
  if (!UUID_RE.test(cid)) return { ok: false, error: 'Falta la modelo.' };
  const photos = clampN(body.photos, 0, 100, 0), videos = clampN(body.videos, 0, 30, 0);
  if (photos + videos <= 0) return { ok: false, error: 'Pedí al menos 1 foto o 1 video.' };
  if (!(await jobsReady(svc))) return { ...NEEDS_MIG };
  const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
  if (!clean((tk as any)?.value)) return { ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' };
  type Target = { handle: string | null; query: string; account_id: string | null };
  const targets: Target[] = []; const skipped: AnyRec[] = []; let tags: string[] = [];
  if (kind === 'account') {
    const accts = [...new Set((Array.isArray(body.accounts) ? body.accounts : []).map(normHandle).filter(Boolean))].slice(0, 20) as string[];
    if (!accts.length) return { ok: false, error: 'Agregá al menos una cuenta guía (ej: @creadora).' };
    await Promise.all(accts.map((h) => svc.from('scrape_accounts').upsert({ creator_id: cid, handle: h, added_by: user }, { onConflict: 'creator_id,handle', ignoreDuplicates: true }).then(() => null, () => null)));
    const { data: sa } = await svc.from('scrape_accounts').select('id, handle, status').eq('creator_id', cid).in('handle', accts);
    const byH = new Map<string, AnyRec>((Array.isArray(sa) ? sa : []).map((x: any) => [String(x.handle), x]));
    for (const h of accts) {
      const a = byH.get(h);
      if (a && ['private', 'dead'].includes(String(a.status)) && body.force !== true) { skipped.push({ job_id: null, handle: h, status: 'skipped', skipped: String(a.status) === 'dead' ? 'dead' : 'private' }); continue; }
      targets.push({ handle: h, query: h, account_id: a?.id || null });
    }
  } else {
    tags = Array.isArray(body.niches) && body.niches.length ? body.niches : [];
    if (!tags.length) {
      const { data: sp } = await svc.from('creator_search_profile').select('niches, hashtags').eq('creator_id', cid).maybeSingle();
      tags = [...(((sp as any)?.hashtags) || []), ...(((sp as any)?.niches) || [])];
    }
    tags = [...new Set(tags.map((h: string) => String(h).trim().replace(/^#/, '')).filter(Boolean))].slice(0, 5);
    if (!tags.length) return { ok: false, error: 'Configurá al menos un nicho o hashtag para esta modelo.' };
    targets.push({ handle: null, query: tags.join(','), account_id: null });
  }
  if (!targets.length) return { ok: true, batch_id: null, jobs: skipped, worker_online: false, est_usd_max: 0 };
  const batch = UUID_RE.test(String(body.batch_id || '')) ? String(body.batch_id) : targets.length > 1 ? crypto.randomUUID() : null;
  const owner = crypto.randomUUID(); const now = isoAt();
  const rows = targets.map((t) => ({
    creator_id: cid, account_id: t.account_id, kind, query: t.query, status: 'queued', phase: 'queued', run_at: now, created_at: now, updated_at: now, run_by: user,
    found: 0, saved: 0, videos: 0, apify_active: 0, apify_run_ids: [], cost_source: 'none', cost_est: 0,
    requested: { v: 1, kind, accounts: t.handle ? [t.handle] : [], niches: kind === 'tema' ? tags : [], url: null, cook: false, photos, videos, count_mode: 'kept', batch_id: batch, run_by: user, driver: 'page' },
    progress: initProgress(kind, photos, videos), dedupe_key: `${cid}|${kind}|${t.query.toLowerCase()}`, next_step_at: now, lease_owner: owner, lease_until: isoAt(Date.now() + 60_000),
  }));
  const ins = await insertJobs(svc, rows);
  if (ins.mig) return { ...NEEDS_MIG };
  if (ins.error && !ins.inserted.length) return { ok: false, error: `No se pudo crear la búsqueda: ${ins.error}` };
  const { data: act } = await svc.from('scrape_runs').select('id, status, apify_active').in('status', JOB_ACTIVE).limit(300);
  const mine = new Set(ins.inserted.map((r) => String(r.id)));
  const { data: mxr } = await svc.from('app_config').select('value').eq('key', 'scraper_max_active').maybeSingle();
  const mx = Number(clean((mxr as any)?.value)); const maxA = mx >= 1 ? Math.floor(mx) : 3;
  const busy = (Array.isArray(act) ? act : []).filter((r: any) => !mine.has(String(r.id)) && r.status === 'running' && Number(r.apify_active) > 0).length;
  const free = Math.max(0, maxA - busy);
  const startNow = ins.inserted.slice(0, free); const later = ins.inserted.slice(free);
  let est = 0;
  const started = await Promise.all(startNow.map(async (row) => {
    const job = new ScrapeJob(svc, row, owner, t0, { soft: 30_000, driver: 'start' });
    try {
      if (await job.loadCfg()) {
        await job.plan();
        const due = job.runs().filter((r) => r.status === '');
        if (due.length) await job.startPending(due, 4_000, true); // el cupo ya se contó arriba
      }
    } catch (e) { job.p.last_error = String((e as Error)?.message || e).slice(0, 200); }
    est += job.runs().reduce((s, r) => s + (Number(r.max_usd) || 0), 0);
    if (!job.lost) {
      if (job.allDone()) await job.finalize(); else await job.release(Math.max(job.waitHint() ?? 0, job.activeRuns().length ? 8_000 : 0));
    }
    return { id: job.id, status: job.finalStatus || job.mirror().status };
  }));
  if (later.length) await svc.from('scrape_runs').update({ lease_until: null, lease_owner: null }).in('id', later.map((r) => r.id)).eq('lease_owner', owner);
  // Techo de gasto de las que quedaron en cola (misma cuenta que plan(), sin historial): informativo.
  later.forEach(() => { est += (photos ? 1.5 * ((Math.ceil(photos / 0.15) + 12) * APIFY_PRICE.posts + 0.01) : 0) + (videos ? 1.5 * ((2 * videos + 8) * APIFY_PRICE.reels + 0.011) : 0); });
  const stMap = new Map(started.map((s) => [s.id, s.status]));
  const js = await listJobs(svc, { ids: [...ins.inserted.map((r) => String(r.id)), ...ins.dups.map((r) => String(r.id))] });
  const views = new Map<string, AnyRec>(((js.jobs as AnyRec[]) || []).map((j) => [String(j.id), j]));
  const jobs = [
    ...ins.inserted.map((r) => ({ job_id: r.id, handle: r.requested?.accounts?.[0] || null, status: stMap.get(String(r.id)) || 'queued', job: views.get(String(r.id)) || null })),
    ...ins.dups.map((r) => ({ job_id: r.id, handle: r.requested?.accounts?.[0] || null, status: r.status, dedup: true, job: views.get(String(r.id)) || null })),
    ...skipped,
  ];
  return { ok: true, batch_id: batch, jobs, worker_online: !!js.worker_online, slots: js.slots || null, est_usd_max: Math.round(est * 1000) / 1000, elapsed_ms: Date.now() - t0 };
}
// Cancelar: marca el pedido; si ningún paso la tiene tomada, la cierra ya (cancela Apify y guarda lo que haya).
async function scrapeCancel(svc: any, jobId: string, t0: number): Promise<AnyRec> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: 'Falta la búsqueda.' };
  const { data, error } = await svc.from('scrape_runs').update({ cancel_requested_at: isoAt() }).eq('id', jobId).in('status', JOB_ACTIVE).select('id');
  if (error) return missingCol(error) ? { ...NEEDS_MIG } : { ok: false, error: error.message };
  if (Array.isArray(data) && data.length) {
    const owner = crypto.randomUUID();
    const { data: cl } = await svc.rpc('scrape_job_claim', { p_owner: owner, p_job: jobId, p_prefer: null, p_lease_s: 60 });
    const row = Array.isArray(cl) ? cl[0] : cl;
    if (row) { const job = new ScrapeJob(svc, row, owner, t0, { soft: 40_000, driver: 'cancel' }); if (await job.loadCfg()) { await job.recount(); await job.finalize('canceled'); } else await job.release(0); }
  }
  const js = await listJobs(svc, { ids: [jobId] });
  return { ok: true, job: ((js.jobs as AnyRec[]) || [])[0] || null };
}
// Reel por LINK: busca con el scraper de Instagram y espera en la misma request hasta ~65 s; si llegó, lo baja (con topes
// más cortos) y, si pidieron, lo manda a cocinar. Si no llegó → { pending, job_id } y los pasos lo terminan (y lo cocinan).
// null = sin la migración (se usa el camino viejo).
async function fetchReelJob(svc: any, user: string, cid: string, link: string, cook: boolean, t0: number): Promise<AnyRec | null> {
  if (!(await jobsReady(svc))) return null;
  const owner = crypto.randomUUID(); const now = isoAt(); const query = link.slice(0, 300);
  const row = { creator_id: cid, kind: 'reel_link', query, status: 'queued', phase: 'queued', run_at: now, created_at: now, updated_at: now, run_by: user, found: 0, saved: 0, videos: 0, apify_active: 0, apify_run_ids: [], cost_source: 'none', cost_est: 0,
    requested: { v: 1, kind: 'reel_link', accounts: [], niches: [], url: link, cook, photos: 0, videos: 1, count_mode: 'kept', batch_id: null, run_by: user, driver: 'page' },
    progress: initProgress('reel_link', 0, 1), dedupe_key: `${cid}|reel_link|${link.split('?')[0].replace(/\/+$/, '').toLowerCase()}`, next_step_at: now, lease_owner: owner, lease_until: isoAt(Date.now() + JOB_LEASE_S * 1000) };
  const ins = await insertJobs(svc, [row]);
  if (ins.mig) return null;
  if (ins.dups.length) return { ok: true, pending: true, job_id: ins.dups[0].id, dedup: true };
  if (!ins.inserted.length) return { ok: false, error: `No se pudo crear la búsqueda del reel: ${ins.error || 'error'}` };
  const job = new ScrapeJob(svc, ins.inserted[0], owner, t0, { soft: 75_000, pollEnd: 65_000, driver: 'start', inline: true });
  try { await job.step(); } catch (e) { job.p.last_error = String((e as Error)?.message || e).slice(0, 200); if (!job.lost && !job.finished) { try { await job.release(10_000); } catch { /* noop */ } } }
  if (!job.finished) return { ok: true, pending: true, job_id: job.id };
  const L = job.L.videos || {};
  if (job.finalStatus === 'ok' && L.last?.video_url) {
    const c = job.p.cook || { cooking: null };
    return { ok: true, saved: true, video_url: L.last.video_url, handle: L.last.handle || null, cooking: c.cooking || null, ...(c.low_credits ? { low_credits: true } : {}), ...(c.warn ? { warn: c.warn } : {}), job_id: job.id };
  }
  return { ok: false, error: job.noteText() || 'No se pudo traer el reel.', job_id: job.id };
}

// Mira la foto de referencia con visión (Anthropic) y escribe un prompt en inglés que clava la POSE exacta.
async function visionPrompt(key: string, refUrl: string, styleDesc: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400,
        system: 'You are a fashion photography art director writing a single English text-to-image prompt that RE-STAGES the EXACT body posture of a reference photo, for a NEW photoshoot with a generic anonymous woman model.\n\nRULE #1 — POSTURE FIRST. The prompt MUST begin by naming the overall body posture explicitly, choosing the correct one: standing, sitting / seated on <surface>, reclining, lying down, kneeling, crouching, squatting, or leaning against <surface>. Look at the hips and weight: if her hips or buttocks rest on a bench, step, ledge, chair, bed or floor she is SEATED — never default to standing. State what bears her weight (which leg she stands on, which hand props her up, the surface she sits/leans on) and her leg configuration (extended, bent, crossed, tucked).\n\nThen, in order: torso orientation (facing camera / three-quarter turn / profile / back-to-camera), the exact position of EACH arm and hand, each leg, head tilt and gaze direction; then the EXACT outfit described precisely — the garment type and coverage (e.g. a tiny string bikini must stay a tiny string bikini and NEVER become a sports bra + leggings or a one-piece; a dress stays that same dress), every colour, the cut, neckline, straps/ties, fabric/texture and any printed text or logos; then the setting/background, and the lighting and camera framing (full-body / three-quarter / waist-up, high or low angle).\n\nNever describe the face, hair or body of any real person: do NOT state any hair colour, hair length or hairstyle, nor skin tone, eye colour, age or body type — those come from the trained model, not from you (if you state the reference hair colour, e.g. blonde or black, you WRONGLY repaint the model). Describe ONLY her posture, her clothing, the setting, the lighting and the camera framing. Output only the prompt text, one line, no quotes, no preamble.',
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'url', url: refUrl } },
          { type: 'text', text: `Write the image prompt for a generic influencer woman reproducing THIS composition with the SAME body posture. Decide FIRST and state FIRST whether she is standing, sitting/seated, reclining, lying down, kneeling or crouching — study the hips and what her weight rests on, do NOT assume standing. Then match each arm, hand and leg, and the EXACT same outfit (same garment type and coverage — a string bikini stays a string bikini, do NOT turn it into a sports set or one-piece; same colours, cut and any logos), same setting, lighting and framing. Do NOT describe her hair, skin, eyes, age or body — those come from the model; describe ONLY posture, the exact outfit and the scene. Natural realistic photo.${styleDesc ? ` Overall style: ${styleDesc}.` : ''}` },
        ] }],
      }),
    });
    const j = await res.json();
    const t = String((j as any)?.content?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
    // Detector de rechazo: si el modelo se niega, devolver null (el worker cae al modo imagen).
    if (/i can’?t|i cannot|i'?m (sorry|unable|not able)|no puedo|i won'?t|as an ai/i.test(t) || t.length < 40) return null;
    return t.slice(0, 1500);
  } catch { return null; }
}
const REALISTIC_STYLE = '74abc530-cec8-4c13-88a6-2b3f78bfd0ff'; // "Digital camera": look de foto real.
// Momentos de la vida real para el carrusel (auto): actividad + expresión + ENCUADRE + prop DISTINTOS en cada foto. Se barajan.
// El lugar es el MISMO punto exacto; solo cambia cuánto se ve (el crop), la pose y la situación.
const POSE_POOL = [
  'Straight-on bedroom mirror selfie, phone held at mid-chest and half caught in the reflection, weight dropped onto one hip with the free hand hooked loosely into the waistband, a calm closed-lip almost-smirk.',
  'Overhead front-facing angle with the phone held just above and tilted down, lying back into a pile of pillows with one knee bent up and both arms relaxed at the sides, a drowsy soft half-smile.',
  'Waist-up shot at full arm length beside a window, standing side-on and turned back toward the lens while both hands cradle a steaming ceramic mug near the chest, a gentle content smile.',
  'Candid framing from a phone propped on a table a few feet away, sunk low into a soft couch with the legs curled to one side and one arm draped along the backrest, laughing naturally with the head tilted.',
  'Low front-facing angle with the phone near floor level looking slightly up, sitting on the floor with the back leaned against the bed and the knees pulled up, forearms resting on them, a relaxed mid-thought look.',
  'Full-length shot from a phone held at hip height and angled up, standing barefoot and turned three-quarters away to look out a window with one hand flat on the frame, a soft wistful expression in profile.',
  'Handheld selfie at arm length lying on the stomach with the upper body propped on both elbows and the ankles crossed in the air behind, an easy playful grin caught mid-laugh.',
  'Low-angle full-body shot from near the floor aimed steeply upward, standing tall with the weight shifted onto one leg, one hand lifted toward the collarbone and the other loose at the side, glancing off to the side with a calm confident look.',
  'Wide shot framed from across the room so the whole figure sits small within the space, caught mid-stride walking toward the camera with both arms swinging naturally, laughing openly as if mid-conversation.',
  'Shot from directly behind at shoulder height, glancing back over one shoulder toward the lens with the hips squared away and one hand trailing along a nearby edge, a subtle amused smirk.',
  'Tight waist-up close-up filling the frame from just below the ribs upward, the torso squared to the camera with one hand resting lightly at the collarbone, a warm close-mouthed smile straight down the lens.',
  'Over-the-shoulder shot from just behind and beside, the camera peeking past the near shoulder to reveal her looking down at a phone cupped in both hands, a quiet focused half-smile.',
  'Eye-level three-quarter shot, kneeling upright with the weight settled back on the heels and one hand raised mid-gesture, mouth open mid-sentence as if telling a story to someone off-camera, brows lifted and animated.',
  'Low candid side angle, crouched and balanced on the balls of the feet with the weight carried over the toes, one hand reaching down to adjust a shoe strap, brow lightly furrowed in casual concentration.',
  'Eye-level medium shot leaning the shoulder and upper back into a wall with the weight tipped against it and the ankles loosely crossed, holding the phone down at the side, gazing off-frame with a quiet relaxed look.',
  'Eye-level three-quarter shot perched on the front edge of a couch with the weight balanced on that edge and both feet planted flat, hands resting loosely in the lap, turning toward the camera with a warm genuine smile.',
  'Slightly low-angle waist-up shot, standing with the weight on one hip while lifting a sweating clear plastic cup of iced coffee toward the mouth mid-sip, the gaze dropped to the straw with a relaxed soft smile.',
  'Slightly low upward angle, the chin lifted toward the light with the eyes gently closed and a serene content half-smile, the arms loose and relaxed as if soaking in the warmth.',
];
function shufflePoses(): string[] { const b = [...POSE_POOL]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// Variación: mira la foto YA generada y escribe un prompt nuevo que mantiene MISMO lugar + MISMO outfit pero cambia la pose/situación.
async function variationPrompt(key: string, srcUrl: string, styleDesc: string, idea: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 900,
        system: 'You write ONE text-to-image prompt for Higgsfield Soul 2.0 from a reference photo: another frame of the SAME shoot, the same outfit, the same location and the same lighting, but a NEW body pose, situation, camera angle, framing and facial expression, like the next photo in the same phone camera roll. Output only the finished prompt, with no quotes and no preface. IDENTITY: never describe her face, hair, eyes, skin tone, age or body type, because a trained Soul model supplies all of that; the only face words allowed are a plain expression with a real cause, for example a soft closed-lip smile, an open mid-laugh, a quiet focused look or eyes gently closed in the light. If you describe identity you fight the Soul and it drifts into a different woman. OUTFIT, top priority with realism: read the garment exactly and lock it word for word. Name the precise garment type, its cut, its coverage and exactly how much skin it leaves bare, the neckline, every strap tie knot and band, the cups or underwire if any, the colours, any print or pattern, the fabric and its finish, and any logo or text. State plainly it is the SAME EXACT garment as the reference, unchanged. Do NOT morph, swap, restyle, redesign, lengthen, shorten, widen, narrow, cover up, add to or remove the garment, and keep the exact same skin coverage. Use literal garment words: a string bikini stays thin strings and small triangles and never becomes a bandeau or sports bra or cup top; an underwire cup top keeps its underwire cups. Because there is no image reference, over-specify the garment and name the garment noun once more near the end. PLACE and LIGHT: recreate the same room, the same surfaces furniture and props, and the same single main light source with its direction and quality, the same time of day and the same colour cast, so the carousel reads as one continuous shoot. Do not move her, change the hour or add a light that is not in the reference. NEW POSE and SITUATION, the only thing that changes, so spell it out fully: state the camera angle first as the dominant instruction (a high selfie tilted down, a low angle from near the floor aimed up, a straight-on eye-level shot, a shot from directly behind, an over-the-shoulder shot or a straight-down overhead shot), then the framing crop (waist-up, full-body, tight chest-up close-up or a wide shot from across the room), then the body with weight-bearing verbs: which way the torso turns, which leg carries the weight and which knee is soft, where each hand lands and what it touches or holds, and where the gaze points. Give the moment a real cause so the expression is genuinely felt. Keep any prop small, natural and actually held, and never let a prop or a hand hide the outfit. BODY: keep her full natural body with real soft proportions; do not slim, snatch, reshape, trim the waist or beautify, and never use words like slim, toned, slender or snatched. REALISM is the single top priority: it must look like a real candid amateur smartphone snapshot, not a professional or studio or AI image. Stack real-skin language: natural bare skin texture with visible pores and fine peach fuzz, subtle uneven tone, faint natural blemishes and freckles, no skin smoothing and no beauty filter. Force real light: available natural light from one real source, soft believable directional shadows, slightly blown highlights, imperfect white balance and a mild everyday colour cast. Add phone-camera imperfections: a slight handheld tilt and crooked framing, faint motion blur, mild grain and noise, soft imperfect focus in places and light compression softness. End with negatives: NOT glossy, NOT plastic or waxy skin, NOT airbrushed or retouched, NOT CGI or a 3D render, NOT HDR glow, no ring-light catchlights, not oversaturated, not magazine perfect and not AI-looking. ASSEMBLY: write one flowing prompt in this order: the exact garment lock, then the place and light lock, then the new pose situation angle and expression, then the body clause, then the realism block ending with the negatives. Vary only the pose, situation, angle, framing and expression; keep the garment, place and light identical word for word.',
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'url', url: srcUrl } },
          { type: 'text', text: `Here is the reference photo. Write ONE new Soul 2.0 prompt for another frame of the SAME shoot (same exact garment, same location, same lighting) but a NEW pose, situation, camera angle, framing and expression. Stage EXACTLY this new moment: ${idea || 'a clearly different natural pose and camera angle than the reference'}.${styleDesc ? ` Overall creator style: ${styleDesc}.` : ''} Output only the finished prompt.` },
        ] }],
      }),
    });
    const j = await res.json();
    const t = String((j as any)?.content?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
    if (/i can’?t|i cannot|i'?m (sorry|unable|not able)|no puedo|i won'?t|as an ai/i.test(t) || t.length < 40) return null;
    return t.slice(0, 2000);
  } catch { return null; }
}

// ── Limpieza de metadata (misma idea que lib/cleanImage.js de producción) ──
// Higgsfield mete credenciales C2PA ("hecho con IA") + EXIF/XMP dentro del archivo.
// Antes de entregar al baúl, reescribimos el archivo dejando SOLO los datos de píxeles
// → cae todo el EXIF/XMP/C2PA (queda "como un screenshot"), sin tocar la imagen.
function concatU8(parts: Uint8Array[]): Uint8Array {
  let n = 0; for (const q of parts) n += q.length;
  const o = new Uint8Array(n); let off = 0; for (const q of parts) { o.set(q, off); off += q.length; } return o;
}
// PNG: conserva solo los chunks críticos de imagen; descarta tEXt/zTXt/iTXt/eXIf/caBX(C2PA)/iCCP/tIME/etc.
function stripPng(buf: Uint8Array): Uint8Array | null {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  const keep = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB']);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const parts: Uint8Array[] = [new Uint8Array(sig)];
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
    const end = p + 12 + len;
    if (end > buf.length) break;
    if (keep.has(type)) parts.push(buf.subarray(p, end));
    p = end;
    if (type === 'IEND') break;
  }
  return concatU8(parts);
}
// JPEG: descarta todos los segmentos APPn (EXIF/XMP/ICC/JUMBF-C2PA) y comentarios; conserva la imagen.
function stripJpeg(buf: Uint8Array): Uint8Array | null {
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  const parts: Uint8Array[] = [buf.subarray(0, 2)];
  let p = 2;
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xFF) break;
    const marker = buf[p + 1];
    if (marker === 0xDA || marker === 0xD9) { parts.push(buf.subarray(p)); break; } // SOS/EOI → resto tal cual
    const len = (buf[p + 2] << 8) | buf[p + 3];
    const end = p + 2 + len;
    if (end > buf.length) break;
    const drop = (marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE; // APPn + COM
    if (!drop) parts.push(buf.subarray(p, end));
    p = end;
  }
  return concatU8(parts);
}
// Baja la foto generada, le saca la metadata y la re-hospeda limpia en storage. Devuelve la URL limpia (o la original si algo falla).
async function cleanAndStore(svc: any, creatorId: string, gid: string, srcUrl: string): Promise<string> {
  try {
    const r = await fetch(srcUrl);
    if (!r.ok) return srcUrl;
    const ab = new Uint8Array(await r.arrayBuffer());
    let out: Uint8Array | null = null; let ext = 'png'; let ct = 'image/png';
    if (ab[0] === 0x89 && ab[1] === 0x50) { out = stripPng(ab); ext = 'png'; ct = 'image/png'; }
    else if (ab[0] === 0xFF && ab[1] === 0xD8) { out = stripJpeg(ab); ext = 'jpg'; ct = 'image/jpeg'; }
    if (!out) out = ab; // formato raro: al menos la re-hospedamos fuera de CloudFront
    const path = `vault/${creatorId}/ia/${gid}.${ext}`;
    const up = await svc.storage.from('proposal-photos').upload(path, out, { contentType: ct, upsert: true });
    if (up.error) return srcUrl;
    const { data: pub } = svc.storage.from('proposal-photos').getPublicUrl(path);
    return (pub as any)?.publicUrl || srcUrl;
  } catch { return srcUrl; }
}

Deno.serve(async (req) => {
  const t0 = Date.now(); // cuándo empezó la request: todo lo del scraper se mide desde acá (el servidor corta a los ~150 s)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    // Cliente SOLO del scraper: cada consulta / subida con tope (timedFetch). `svc` (el de la cocina) queda igual que siempre.
    const svcS = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: timedFetch } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    // ── Búsquedas en segundo plano: un PASO del cocinero de la Mac (proceso aparte), con el mismo secreto del worker ──
    if (action === 'scrape_step' && typeof (body as any)?.worker_secret === 'string') {
      const { data: sc } = await svcS.from('app_config').select('value').eq('key', 'kitchen_worker_secret').maybeSingle();
      const secret = clean((body as any)?.worker_secret);
      if (!secret || !(sc as any)?.value || secret !== clean((sc as any).value)) return reply({ ok: false, error: 'Worker no autorizado.' });
      return reply(await scrapeStep(svcS, { driver: 'worker', t0, budgetMs: 90_000 }));
    }

    // ── Worker del cocinero (sin usuario; protegido por secreto en app_config) ──
    // Corre en la Mac del dueño con el CLI logueado; drena la cola de generations.
    if (action === 'cook_next' || action === 'cook_result' || action === 'sync_balance' || action === 'hf_accounts_report' || action === 'scrape_run' || action === 'scrape_accounts_run' || action === 'video_slot') {
      const { data: sc } = await svc.from('app_config').select('value').eq('key', 'kitchen_worker_secret').maybeSingle();
      const secret = clean((body as any)?.worker_secret);
      if (!secret || !(sc as any)?.value || secret !== clean((sc as any).value)) return reply({ ok: false, error: 'Worker no autorizado.' });
      // Cupo de subida firmado: el worker sube el video YA LIMPIO (sin metadata) directo a storage (no tiene service key).
      if (action === 'video_slot') {
        const gid = String((body as any)?.generation_id || '');
        const { data: grow } = await svc.from('generations').select('creator_id').eq('id', gid).maybeSingle();
        const cid = (grow as any)?.creator_id;
        if (!cid) return reply({ ok: false, error: 'Generación sin creator.' });
        const path = `vault/${cid}/ia/video-${gid}-${Date.now()}.mp4`;
        const { data: slot, error } = await svc.storage.from('proposal-photos').createSignedUploadUrl(path);
        if (error || !slot) return reply({ ok: false, error: error?.message || 'No se pudo crear el cupo de subida.' });
        const { data: pub } = svc.storage.from('proposal-photos').getPublicUrl((slot as any).path || path);
        return reply({ ok: true, path: (slot as any).path || path, token: (slot as any).token, public_url: (pub as any)?.publicUrl });
      }
      if (action === 'scrape_run') {
        const r = await runScrape(svcS, String((body as any)?.creator_id || ''), { niches: (body as any)?.niches, photos: Number((body as any)?.photos ?? (body as any)?.limit ?? 24), videos: Number((body as any)?.videos) || 0 }, t0);
        return reply(r);
      }
      if (action === 'scrape_accounts_run') {
        const r = await runScrapeAccounts(svcS, String((body as any)?.creator_id || ''), { accounts: (body as any)?.accounts, photos: Number((body as any)?.photos ?? (body as any)?.limit ?? 30), videos: Number((body as any)?.videos) || 0 }, t0);
        return reply(r);
      }
      if (action === 'sync_balance') {
        // Saldo del login de SIEMPRE del CLI (= Cuenta 1, la de Julia). Mismo contrato que antes: { credits }.
        // app_config.higgsfield_balance = SIEMPRE el saldo de la Cuenta 1 (exactamente como hoy), sea o no la "default":
        // el flag default solo decide la llave de las pruebas de /conexion. Ninguna otra cuenta escribe acá.
        const bal = Number((body as any)?.credits);
        if (!isNaN(bal)) {
          const now = new Date().toISOString();
          await svc.from('app_config').upsert({ key: 'higgsfield_balance', value: String(bal), updated_at: now }, { onConflict: 'key' });
          // Columnas de 0130 (si todavía no se aplicó, esto falla solo y no afecta lo de arriba).
          await svc.from('higgsfield_accounts').update({ balance: bal, balance_at: now, cli_seen_at: now, cli_error: null }).eq('id', LEGACY_HF_ACCOUNT);
        }
        return reply({ ok: true });
      }
      // Latido del cocinero: por cada cuenta, si su login del CLI en la Mac FUNCIONA + su saldo real + con qué email está logueada.
      // accounts: [{ account_id, ok, credits?, email?, error?, transient? }] · full:true = esa es TODA la lista de logins de la Mac
      // (las cuentas que no vinieron quedan marcadas "sin login en la Mac").
      if (action === 'hf_accounts_report') {
        const list = Array.isArray((body as any)?.accounts) ? (body as any).accounts.slice(0, 50) : [];
        const { data: rows, error: rErr } = await svc.from('higgsfield_accounts').select('id, label, is_default');
        if (rErr) return reply({ ok: false, error: rErr.message });
        const known = new Map<string, any>((Array.isArray(rows) ? rows : []).map((r: any) => [String(r.id), r]));
        const now = new Date().toISOString();
        const seen = new Set<string>();
        for (const it of list) {
          const id = String(it?.account_id || '');
          if (!UUID_RE.test(id) || !known.has(id) || seen.has(id)) continue;
          seen.add(id);
          if (it?.transient === true) continue; // la Mac no pudo chequearla (red): queda el estado anterior
          const ok = it?.ok === true;
          const cr = typeof it?.credits === 'number' && isFinite(it.credits) ? Number(it.credits) : null;
          const patch: Record<string, unknown> = ok ? { cli_seen_at: now, cli_error: null } : { cli_error: String(it?.error || 'El login de esta cuenta en la Mac no funciona.').slice(0, 300) };
          if (typeof it?.email === 'string' && it.email) patch.cli_email = String(it.email).slice(0, 200);
          if (ok && cr != null) { patch.balance = cr; patch.balance_at = now; }
          // Souls 2.0 de esa cuenta (el worker las manda cada tanto) → /conexion las ofrece para enlazar cada modelo.
          if (ok && Array.isArray(it?.souls)) {
            patch.souls = it.souls.slice(0, 200).filter((s: any) => s && UUID_RE.test(String(s.id || ''))).map((s: any) => ({ id: String(s.id).toLowerCase(), name: String(s.name || '').slice(0, 80), status: String(s.status || '').slice(0, 20) }));
            patch.souls_at = now;
          }
          await svc.from('higgsfield_accounts').update(patch).eq('id', id);
          // La global (app_config.higgsfield_balance) NO se toca acá: es solo de la Cuenta 1 y la escribe sync_balance.
        }
        if ((body as any)?.full === true) {
          for (const id of known.keys()) {
            if (id === LEGACY_HF_ACCOUNT || seen.has(id)) continue;
            await svc.from('higgsfield_accounts').update({ cli_error: 'No hay login de esta cuenta en la Mac del cocinero.' }).eq('id', id);
          }
        }
        return reply({ ok: true, accounts: [...known.values()].map((r: any) => ({ id: r.id, label: r.label })) });
      }
      if (action === 'cook_next') {
        // Reaper: jobs trabados en 'in_progress' hace >30 min = huérfanos (el cocinero se reinició mientras cocinaban).
        // Los marcamos fallados para que salgan de "Cocinándose". Si alguno seguía vivo, su cook_result lo corrige por id.
        await svc.from('generations').update({ status: 'failed', note: 'Se trabó (el cocinero se reinició mientras lo hacía). Tocá Reintentar.' }).eq('status', 'in_progress').lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());
        // routing>=1 = cocinero NUEVO (cocina cada modelo con el login de SU cuenta). A uno VIEJO solo le damos jobs de la
        // Cuenta 1: cualquier otro lo cocinaría con el login de siempre y se lo cobraría a la cuenta de Julia.
        const routing = Number((body as any)?.routing) >= 1;
        // Un job que no se puede rutear se marca fallado con el motivo (NO se deja en la cola: taparía a los de atrás)
        // y seguimos con el siguiente.
        for (let pick = 0; pick < 10; pick++) {
          const { data: job } = await svc.from('generations').select('id, creator_id, reference_url, note, media_type, model').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
          if (!job) return reply({ ok: true, job: null });
          const { data: idrow } = await svc.from('creator_identity').select('character_id, engine, account_id').eq('creator_id', (job as any).creator_id).maybeSingle();
          const jCreator = String((job as any).creator_id || '');
          const acct = await acctFor(svc, jCreator, (idrow as any)?.account_id ?? null);
          const unroutable = acctRuleProblem(acct, jCreator)
            || ((acct && acct.id !== LEGACY_HF_ACCOUNT && !routing) ? `El cocinero de la Mac está desactualizado y no sabe usar la cuenta «${acct.label}». Reinicialo (node scripts/kitchen-worker.mjs) y tocá Reintentar.` : '');
          if (unroutable) {
            await svc.from('generations').update({ status: 'failed', note: unroutable }).eq('id', (job as any).id).eq('status', 'queued');
            continue;
          }
          await svc.from('generations').update({ status: 'in_progress' }).eq('id', (job as any).id);
          // Con qué cuenta de Higgsfield se cocina ESTE job (el worker elige el login del CLI por esto).
          const acctF = { account_id: acct!.id, account_label: acct!.label };
          // VIDEO con Julia (Genjutsu motion transfer): el reel como video de referencia + las fotos REALES de la modelo como personaje.
          if (String((job as any).media_type) === 'video' || String((job as any).model) === 'genjutsu') {
            const { data: reals } = await svc.from('creator_vault').select('url').eq('creator_id', (job as any).creator_id).eq('kind', 'real').order('created_at', { ascending: false }).limit(4);
            const image_refs = (Array.isArray(reals) ? reals : []).map((r: any) => r.url).filter(Boolean);
            return reply({ ok: true, job: { id: (job as any).id, creator_id: (job as any).creator_id, genjutsu: true, video_ref: (job as any).reference_url, image_refs, ...acctF } });
          }
          const note = String((job as any)?.note || '');
          const isVar = note.startsWith('var:') || note.startsWith('varx:') || note.startsWith('varf:');
          // VARIACIÓN de carrusel — SIEMPRE con Soul 2.0 (único motor que mantiene la identidad real de la modelo).
          // Dos modos que elige el dueño: 'describe' (var:) = poses distintas: la IA describe outfit/lugar/luz + pose nueva
          // y Soul 2.0 genera SIN image-ref (cara garantizada + pose libre). 'copy' (varx:) = outfit/lugar idénticos vía
          // image-ref, pero copia la pose de la réplica.
          if (isVar && (job as any).reference_url) {
            const copyMode = note.startsWith('varx:');
            const freeMode = note.startsWith('varf:');
            const pose = note.replace(/^var[xf]?:/, '').trim();
            const charId = (idrow as any)?.character_id || null;
            if (freeMode) {
              // SUELTA / SORPRÉNDEME: foto NUEVA y variada de ELLA (otro lugar/outfit), soul pura, SIN image-ref ni lock de escena.
              const fp = `A candid amateur smartphone snapshot of the woman. ${pose || 'a natural everyday candid moment'} She wears her own casual everyday outfit in a natural setting that fits the moment — a DIFFERENT place and look from any other photo, her real life. Photorealistic, natural bare skin texture with pores and subtle imperfections, available natural light, slight handheld tilt, mild grain and soft focus — a real phone photo, NOT studio, NOT airbrushed, NOT AI-looking. Full natural body, correct hands. Keep her FULL curvy natural figure with rounded glutes and natural hips; do not slim or flatten her.`;
              return reply({ ok: true, job: { ...(job as any), character_id: charId, prompt: fp, style_id: REALISTIC_STYLE, ...acctF } });
            }
            if (copyMode) {
              const cp = `The SAME woman. Keep EXACTLY this photo: the same body pose, the same exact outfit, the same location and background, and the same lighting and framing. Do not change the composition or the garment. Photorealistic natural candid amateur phone photo, real skin texture, full natural body, correct hands.`;
              return reply({ ok: true, job: { ...(job as any), character_id: charId, soul_copy: true, image_ref: (job as any).reference_url, prompt: cp, ...acctF } });
            }
            let vprompt: string | null = null, vstyle: string | null = null;
            const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
            const akey = clean((ak as any)?.value);
            if (akey) {
              const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', (job as any).creator_id).maybeSingle();
              vprompt = await variationPrompt(akey, (job as any).reference_url, String((sp as any)?.style_desc || ''), pose);
              if (vprompt) vstyle = REALISTIC_STYLE;
            }
            return reply({ ok: true, job: { ...(job as any), character_id: charId, prompt: vprompt, style_id: vstyle, ...acctF } });
          }
          // RÉPLICA (foto 1): Soul 2.0 con la VIRAL como image_reference → outfit + pose EXACTOS (clave para vender ropa).
          // La visión (Anthropic) describe el outfit al detalle para reforzar; el worker le pone el candado de pelo (LOOKS).
          // Con image_reference NO va style_id (Soul 2.0 no los combina).
          let vprompt: string | null = null;
          const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
          const akey = clean((ak as any)?.value);
          if (akey && (job as any).reference_url) {
            const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', (job as any).creator_id).maybeSingle();
            vprompt = await visionPrompt(akey, (job as any).reference_url, String((sp as any)?.style_desc || ''));
          }
          const finalPrompt = vprompt || 'Recreate this exact photo: the same exact outfit and garment in full detail, the same pose, the same location and lighting. Photorealistic candid amateur phone photo, full natural body, correct hands.';
          return reply({ ok: true, job: { ...(job as any), character_id: (idrow as any)?.character_id || null, prompt: finalPrompt, image_ref: (job as any).reference_url, ...acctF } });
        }
        return reply({ ok: true, job: null });
      }
      const gid = String((body as any)?.generation_id || '');
      let rurl = (body as any)?.result_url || null;
      const isVideo = String((body as any)?.media_type) === 'video';
      const good = (body as any)?.ok !== false && !!rurl;
      const { data: grow } = await svc.from('generations').select('creator_id, created_by, auto_carousel, carousel_of').eq('id', gid).maybeSingle();
      // VIDEO: si el worker ya lo subió LIMPIO (sin metadata) a storage, lo dejamos tal cual.
      // Si no (fallback), re-hospedamos el resultado de Higgsfield (sus links vencen) — pero ese trae metadata.
      const alreadyClean = (body as any)?.stored_clean === true;
      if (isVideo && good && rurl && grow && !alreadyClean) { const stored = await storeVideo(svc, (grow as any).creator_id, rurl); if (stored) rurl = stored; }
      await svc.from('generations').update({ status: good ? 'done' : 'failed', result_url: rurl, media_type: isVideo ? 'video' : 'image', credits: Number((body as any)?.credits) || null, usd: Number((body as any)?.usd) || null, prompt: (body as any)?.prompt || null, note: (body as any)?.note || null, engine_label: (body as any)?.engine || null }).eq('id', gid);
      // Auto-carrusel (solo FOTOS): si la réplica salió bien y venía marcada, encola sus variaciones (misma escena, otras poses).
      if (!isVideo && good && rurl && grow && Number((grow as any).auto_carousel) > 0 && !(grow as any).carousel_of) {
        const nn = Math.min(Math.max(Number((grow as any).auto_carousel), 1), 7);
        const poses = shufflePoses();
        const rows = Array.from({ length: nn }, (_, i) => ({ creator_id: (grow as any).creator_id, reference_url: rurl, status: 'queued', model: 'soul-v2', note: `var:${poses[i % poses.length]}`, carousel_of: gid, created_by: (grow as any).created_by }));
        await svc.from('generations').insert(rows);
        await svc.from('generations').update({ auto_carousel: 0 }).eq('id', gid);
      }
      return reply({ ok: true });
    }

    // ── Auth de usuario (admin/supervisor) para todo lo demás ──
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });

    // ── Búsquedas en segundo plano (scraper): crear · dar un paso · ver · cancelar ──
    // scrape_start { kind:'account'|'tema', creator_id, accounts?, niches?, photos, videos, batch_id?, force? }
    //   → { ok, batch_id, jobs:[{ job_id, handle, status, dedup?, skipped?, job }], worker_online, slots, est_usd_max }
    //   (también `scrape` / `scrape_accounts` con async:true). Sin la migración → { ok:false, needs_migration:true }.
    if (action === 'scrape_start' || ((action === 'scrape' || action === 'scrape_accounts') && (body as any)?.async === true)) {
      const b = { ...(body as any), kind: action === 'scrape' ? 'tema' : action === 'scrape_accounts' ? 'account' : (body as any)?.kind };
      return reply(await scrapeStart(svcS, user.id, b, t0));
    }
    // scrape_step { prefer_creator_id?, job_id?, budget_ms? } → { ok, stepped, did, job, jobs, more_due, next_in_ms, worker_online }
    if (action === 'scrape_step') {
      return reply(await scrapeStep(svcS, { driver: 'page', t0, budgetMs: clampN((body as any)?.budget_ms, 20_000, 95_000, 90_000), preferCreator: (body as any)?.prefer_creator_id || null, jobId: (body as any)?.job_id || null }));
    }
    // scrape_jobs { creator_id?, ids?, since_ms? } → { ok, jobs, worker_online, slots, more_due, next_in_ms }
    if (action === 'scrape_jobs') {
      const ids = Array.isArray((body as any)?.ids) ? (body as any).ids.map(String).filter((x: string) => UUID_RE.test(x)).slice(0, 100) : [];
      const cidJ = UUID_RE.test(String((body as any)?.creator_id || '')) ? String((body as any).creator_id) : null;
      return reply(await listJobs(svcS, { creatorId: cidJ, ids, sinceMs: clampN((body as any)?.since_ms, 0, 7 * 86_400_000, 600_000) }));
    }
    // scrape_cancel { job_id } → { ok, job }
    if (action === 'scrape_cancel') return reply(await scrapeCancel(svcS, String((body as any)?.job_id || ''), t0));

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

    // ── Costo REAL del scraper (Apify): factura del mes + completar el costo de corridas viejas ──
    // apify_usage (admin/supervisor): lo que Apify cobró de verdad en el ciclo actual. Nunca devuelve el token.
    //   → { ok, month_usd, limit_usd, cycle_start, cycle_end, daily: [{ date, usd }] }
    // scrape_cost_backfill (solo admin, { dry?: true, recheck_all?: true }): a cada corrida registrada sin costo verificado le busca SU corrida
    //   en Apify (mismo actor + ventana de tiempo + el MISMO input: las mismas cuentas / hashtags / link) y guarda el usageTotalUsd real;
    //   re-lee las que tienen run id sin costo; informa las corridas de Apify que la app no tiene registradas.
    //   Una fila sin corrida verificable (no se pudo leer el input en Apify) NO se empareja: queda en unmatched_rows (sigue estimado).
    if (action === 'apify_usage' || action === 'scrape_cost_backfill') {
      const { data: tkA } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
      const apTok = clean((tkA as any)?.value);
      if (!apTok) return reply({ ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' });
      const apGet = (path: string) => fetch(`${APIFY_API}${path}`, apifyInit(apTok)); // token en el header, nunca en la URL
      const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
      if (action === 'apify_usage') {
        let limits: any = null, monthly: any = null;
        try { const r = await apGet('/users/me/limits'); if (r.ok) limits = ((await r.json()) as any)?.data || null; } catch { /* noop */ }
        try { const r = await apGet('/users/me/usage/monthly'); if (r.ok) monthly = ((await r.json()) as any)?.data || null; } catch { /* noop */ }
        if (!limits && !monthly) return reply({ ok: false, error: 'Apify no respondió el consumo del mes.' });
        const cycle = limits?.monthlyUsageCycle || monthly?.usageCycle || {};
        const daily = (Array.isArray(monthly?.dailyServiceUsages) ? monthly.dailyServiceUsages : [])
          .map((d: any) => ({ date: String(d?.date || '').slice(0, 10), usd: num(d?.totalUsageCreditsUsd) })).filter((d: any) => d.date);
        return reply({
          ok: true, source: 'apify',
          month_usd: num(limits?.current?.monthlyUsageUsd) ?? num(monthly?.totalUsageCreditsUsdAfterVolumeDiscount) ?? num(monthly?.totalUsageCreditsUsdBeforeVolumeDiscount),
          limit_usd: num(limits?.limits?.maxMonthlyUsageUsd),
          cycle_start: cycle?.startAt || null, cycle_end: cycle?.endAt || null, daily,
        });
      }
      if (prof.role !== 'admin') return reply({ ok: false, error: 'Solo un admin puede completar el costo real.' });
      const dry = (body as any)?.dry === true;
      const recheckAll = (body as any)?.recheck_all === true; // re-leer también las ya verificadas que tienen run id
      // TODAS las corridas registradas, de a 1000 (el servidor corta cada respuesta en 1000 filas aunque se pida más).
      const rowsB: any[] = [];
      // `requested` (búsquedas en segundo plano) solo existe con la parte nueva de 0131: sin ella se lee lo de siempre.
      let bfCols = 'id, kind, query, run_at, status, found, cost_real, cost_est, cost_source, cost_apify, apify_run_ids, cost_breakdown, requested';
      for (let from = 0; from < 100_000; from += 1000) {
        let { data: pg, error: rbErr } = await svc.from('scrape_runs').select(bfCols)
          .order('run_at', { ascending: true }).order('id', { ascending: true }).range(from, from + 999);
        if (rbErr && from === 0 && bfCols.endsWith(', requested') && missingCol(rbErr)) {
          bfCols = bfCols.replace(', requested', '');
          ({ data: pg, error: rbErr } = await svc.from('scrape_runs').select(bfCols).order('run_at', { ascending: true }).order('id', { ascending: true }).range(from, from + 999));
        }
        if (rbErr) {
          if (from === 0 && (String((rbErr as any).code) === '42703' || /column .* does not exist/i.test(String(rbErr.message || '')))) return reply({ ok: false, needs_migration: true, error: 'Falta aplicar la migración 0131 (columnas de costo real) antes de completar costos.' });
          return reply({ ok: false, error: `No se pudieron leer las búsquedas registradas: ${rbErr.message}` });
        }
        const page = Array.isArray(pg) ? pg : [];
        rowsB.push(...page);
        if (page.length < 1000) break;
      }
      type ARun = { id: string; actor: string; started: number; finished: number; usd: number | null; status: string; kvs: string | null };
      const apRuns: ARun[] = [];
      for (const actor of [APIFY_POSTS, APIFY_REELS, APIFY_HASHTAG, APIFY_IG]) {
        for (let offset = 0; offset < 5000; offset += 1000) {
          let its: any[] = [];
          try { const r = await apGet(`/acts/${actor}/runs?desc=1&limit=1000&offset=${offset}`); if (r.ok) its = ((await r.json()) as any)?.data?.items || []; } catch { /* noop */ }
          for (const it of its) apRuns.push({ id: String(it?.id || ''), actor, started: Date.parse(it?.startedAt) || 0, finished: Date.parse(it?.finishedAt) || 0, usd: num(it?.usageTotalUsd), status: String(it?.status || ''), kvs: it?.defaultKeyValueStoreId ? String(it.defaultKeyValueStoreId) : null });
          if (its.length < 1000) break;
        }
      }
      // Corrida que todavía no terminó → null (lo que lleva cobrado no es el final): la fila queda sin verificar y la
      // próxima pasada la re-lee por su run id.
      const usdOf = async (a: { id: string; usd: number | null; status: string }) => (!APIFY_DONE.has(a.status) ? null : a.usd != null ? a.usd : await apifyRunUsd(a.id, apTok, 2));
      // INPUT de una corrida de Apify (qué cuentas / hashtags / link se le pidió): es lo que la ata a UNA fila, no solo la hora.
      const inputCache = new Map<string, any>();
      const inputOf = async (a: ARun): Promise<any> => {
        if (inputCache.has(a.id)) return inputCache.get(a.id);
        let kvs = a.kvs;
        if (!kvs) { try { const r = await apGet(`/actor-runs/${encodeURIComponent(a.id)}`); if (r.ok) kvs = ((await r.json()) as any)?.data?.defaultKeyValueStoreId || null; } catch { /* noop */ } }
        let inp: any = null;
        if (kvs) { try { const r = await apGet(`/key-value-stores/${encodeURIComponent(kvs)}/records/INPUT`); if (r.ok) inp = await r.json().catch(() => null); } catch { /* noop */ } }
        inputCache.set(a.id, inp);
        return inp;
      };
      const normSet = (xs: unknown[]) => [...new Set(xs.map((s) => String(s ?? '').trim().replace(/^[@#]/, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()).filter(Boolean))].sort().join('|');
      const inputKeyOf = (actor: string, inp: any): string | null => {
        if (!inp || typeof inp !== 'object') return null;
        const raw = actor === APIFY_HASHTAG ? inp.hashtags : actor === APIFY_IG ? (Array.isArray(inp.directUrls) ? inp.directUrls.map((u: any) => (typeof u === 'string' ? u : u?.url)) : null) : inp.username;
        const arr: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
        return arr.length ? normSet(arr) : null;
      };
      const rowKeyOf = (r: any) => normSet(String(r.kind) === 'reel_link' ? [String(r.query || '')] : String(r.query || '').split(','));
      // true = mismo input · false = otro input · null = no se pudo leer (no se empareja por las dudas)
      const inputMatch = async (a: ARun, r: any): Promise<boolean | null> => { const k = inputKeyOf(a.actor, await inputOf(a)); return k == null ? null : k === rowKeyOf(r); };
      const claimed = new Set<string>();
      rowsB.forEach((r) => (Array.isArray(r.apify_run_ids) ? r.apify_run_ids : []).forEach((id: unknown) => claimed.add(String(id))));
      const isVerified = (r: any) => (r.cost_source === 'apify' || r.cost_source === 'backfill') && r.cost_apify != null;
      const actorFor = (k: string) => (k === 'tema' ? APIFY_HASHTAG : k === 'reel_link' ? APIFY_IG : APIFY_POSTS);
      const WIN = 10 * 60 * 1000; // el registro se escribía al final (después de guardar + reels + filtro IA)
      const nowIso = new Date().toISOString();
      const matched: any[] = []; const unmatched: any[] = []; let rechecked = 0;
      const sumParts = (bd: any) => { const ps = [bd.photos, bd.videos].filter(Boolean); const k = ps.filter((p: any) => typeof p.usd === 'number'); return { usd: k.length ? r6(k.reduce((s: number, p: any) => s + p.usd, 0)) : null, all: k.length === ps.length }; };
      // Candidatas de UNA fila vieja: mismo actor, sin reclamar, en la ventana de tiempo y con el MISMO input.
      //   · fila terminada (run_at = cuando se registró, al final): la corrida terminó hasta WIN antes → la más cercana primero.
      //   · fila 'running' (se cortó; run_at = cuando arrancó la corrida): la corrida arrancó a la vez (±60 s).
      const candsFor = async (r: any, actor: string, at: number) => {
        const running = String(r.status) === 'running';
        const pool = apRuns.filter((a) => a.id && a.actor === actor && !claimed.has(a.id) && (running ? (a.started > 0 && Math.abs(a.started - at) <= 60_000) : (a.finished > 0 && a.finished <= at + 15_000 && a.finished >= at - WIN)))
          .sort((x, y) => (running ? Math.abs(x.started - at) - Math.abs(y.started - at) : y.finished - x.finished));
        const ok: ARun[] = [];
        for (const a of pool) if ((await inputMatch(a, r)) === true) ok.push(a);
        return ok;
      };
      for (const r of rowsB) {
        // Registrada SIN corrida de Apify (lista vacía, no null) o pasada del filtro IA: no hay nada de Apify que emparejar.
        if ((Array.isArray(r.apify_run_ids) && r.apify_run_ids.length === 0) || String(r.kind) === 'ia_pendientes') continue;
        const ids: string[] = Array.isArray(r.apify_run_ids) ? r.apify_run_ids.map(String) : [];
        const isJob = r.requested != null; // búsqueda en segundo plano: su estado lo maneja SOLO el motor (nunca «se cortó»)
        if (isJob && JOB_ACTIVE.includes(String(r.status))) continue; // en curso: el motor cierra su costo al terminar
        const stale = !isJob && String(r.status) === 'running' && (Date.now() - (Date.parse(r.run_at) || 0)) > 15 * 60 * 1000;
        if (isVerified(r) && !(recheckAll && ids.length) && !stale) continue;
        // v2 (búsqueda en segundo plano): TODAS sus corridas (principal, reintento, recargas) por run id → se rehacen los agregados.
        if (ids.length && r.cost_breakdown && r.cost_breakdown.v === 2 && Array.isArray(r.cost_breakdown.runs)) {
          const runs2 = r.cost_breakdown.runs.map((x: any) => ({ ...x }));
          let changed2 = false;
          for (const x of runs2) {
            if (x.run_id && (x.usd == null || recheckAll)) { const u = await apifyRunUsd(String(x.run_id), apTok, 2); if (u != null && u !== x.usd) { x.usd = r6(u); changed2 = true; } }
          }
          if (!changed2) continue;
          rechecked += 1;
          const cf2 = costFromRuns(runs2, r.cost_breakdown.ai || {});
          if (!dry) await svc.from('scrape_runs').update({ cost_breakdown: cf2.cost_breakdown, cost_apify: cf2.cost_apify, cost_real: cf2.cost_real, cost_source: cf2.cost_source, cost_checked_at: nowIso }).eq('id', r.id);
          continue;
        }
        if (ids.length) {
          // Corrida nueva con run id pero sin costo final todavía (o que se cortó) → se re-lee por id.
          const bd = r.cost_breakdown && typeof r.cost_breakdown === 'object' ? { ...r.cost_breakdown } : { v: 1 };
          let changed = false;
          for (const key of ['photos', 'videos']) {
            const p = bd[key] ? { ...bd[key] } : null;
            if (p && p.run_id && (p.usd == null || recheckAll)) { const u = await apifyRunUsd(String(p.run_id), apTok, 2); if (u != null && u !== p.usd) { p.usd = r6(u); bd[key] = p; changed = true; } }
          }
          if (!changed && !stale) continue;
          const t = sumParts(bd);
          if (changed) rechecked += 1;
          if (!dry) {
            await svc.from('scrape_runs').update({
              cost_breakdown: bd, cost_apify: t.usd, cost_real: t.usd, cost_source: t.all ? (r.cost_source === 'backfill' || bd.backfill === true ? 'backfill' : 'apify') : 'partial', cost_checked_at: nowIso,
              ...(stale ? { status: 'error', error: 'Se cortó por tiempo en el servidor (Apify sí cobró la corrida).' } : {}),
            }).eq('id', r.id);
          }
          continue;
        }
        // Corrida VIEJA (sin run id): su corrida de Apify = mismo actor + mismo input + terminó justo ANTES de registrarse + nadie la reclamó.
        const at = Date.parse(r.run_at) || 0; const kind = String(r.kind || '');
        let act = actorFor(kind);
        let cands = await candsFor(r, act, at);
        // Búsqueda de SOLO videos (sin corrida de fotos): su corrida principal es la de reels.
        if (!cands.length && kind === 'account') { act = APIFY_REELS; cands = await candsFor(r, act, at); }
        const old = r.cost_real == null ? null : Number(r.cost_real);
        const main = (old != null && isFinite(old) && old > 0 ? cands.find((a) => a.usd != null && Math.abs(a.usd - old) < 1e-6) : null) || cands[0];
        if (!main) { unmatched.push({ id: r.id, kind: r.kind, query: String(r.query || '').slice(0, 80), run_at: r.run_at }); continue; }
        claimed.add(main.id);
        // Reels de la MISMA búsqueda (mismas cuentas, entre que arrancaron las fotos y el registro). Si todas las candidatas
        // se pudieron leer y ninguna es de esta búsqueda → esa búsqueda no pidió videos (costo de videos = 0, conocido).
        let reel: ARun | null = null; let reelUnsure = false;
        if (kind === 'account' && act === APIFY_POSTS) {
          const running = String(r.status) === 'running';
          const pool = apRuns.filter((a) => a.id && a.actor === APIFY_REELS && !claimed.has(a.id) && a.started >= main.started - 5_000 && (running ? a.started <= at + WIN : (a.finished > 0 && a.finished <= at + 15_000)))
            .sort((x, y) => x.started - y.started);
          for (const a of pool) { const m = await inputMatch(a, r); if (m === true) { reel = a; break; } if (m == null) reelUnsure = true; }
          if (reel) claimed.add(reel.id);
        }
        const mainUsd = await usdOf(main);
        const mainPart = { actor: act, run_id: main.id, status: main.status, items: Number(r.found) || 0, usd: mainUsd != null ? r6(mainUsd) : null, est: r6(Number(r.cost_est) || 0), backfill: true };
        const bd: any = { v: 1, backfill: true, photos: null, videos: null, ai: (r.cost_breakdown && r.cost_breakdown.ai) || null };
        if (act === APIFY_IG || act === APIFY_REELS) bd.videos = mainPart; else bd.photos = mainPart;
        if (reel) { const ru = await usdOf(reel); bd.videos = { actor: APIFY_REELS, run_id: reel.id, status: reel.status, items: null, usd: ru != null ? r6(ru) : null, est: 0, backfill: true }; }
        else if (kind === 'account' && act === APIFY_POSTS && !reelUnsure) bd.videos_checked = true;
        const t = sumParts(bd);
        const runIds = [main.id, ...(reel ? [reel.id] : [])];
        matched.push({ id: r.id, kind: r.kind, query: String(r.query || '').slice(0, 80), run_at: r.run_at, apify_run_ids: runIds, usd: t.usd, before: old });
        if (!dry) await svc.from('scrape_runs').update({ apify_run_ids: runIds, cost_breakdown: bd, cost_apify: t.usd, cost_real: t.usd, cost_source: t.all ? 'backfill' : 'partial', cost_checked_at: nowIso, ...(String(r.status) === 'running' ? { status: 'error', error: 'Se cortó por tiempo en el servidor (Apify sí cobró la corrida).' } : {}) }).eq('id', r.id);
      }
      // Corridas de Apify que la app NO tiene registradas (antes del registro, pruebas, cortes): plata real sin asignar.
      const loose = apRuns.filter((a) => a.id && !claimed.has(a.id)).sort((x, y) => y.started - x.started);
      const looseUsd = r6(loose.reduce((s, a) => s + (a.usd || 0), 0));
      return reply({
        ok: true, dry,
        matched: matched.length, matched_usd: r6(matched.reduce((s, m) => s + (m.usd || 0), 0)), rechecked,
        unmatched_rows: unmatched, unclaimed_count: loose.length, unclaimed_usd: looseUsd,
        unclaimed: loose.slice(0, 60).map((a) => ({ id: a.id, actor: a.actor, started_at: a.started ? new Date(a.started).toISOString() : null, usd: a.usd, status: a.status })),
        details: matched.slice(0, 100),
      });
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

    // Llave REST de la cuenta de UNA modelo (llamadas que son de una modelo). La cuenta DEFAULT usa la llave de siempre
    // (app_config → env, exactamente como hoy: Julia/Cuenta 1). Otra cuenta usa SU llave de higgsfield_accounts.
    // Una modelo que no es Julia y no tiene cuenta NUNCA cae a la default (no se le cobra a la cuenta de Julia).
    const keyForCreator = async (creatorId: string): Promise<{ kid: string; ksec: string; acct: HfAcct | null; error?: string }> => {
      const acct = await acctFor(svc, creatorId);
      const rule = acctRuleProblem(acct, creatorId);
      if (rule || !acct) return { kid: '', ksec: '', acct: null, error: rule || noAcctMsg };
      if (acct.is_default) return { kid: keyId, ksec: keySecret, acct };
      const { data: k } = await svc.from('higgsfield_accounts').select('key_id, key_secret').eq('id', acct.id).maybeSingle();
      const kid = clean((k as any)?.key_id), ksec = clean((k as any)?.key_secret);
      if (!kid || !ksec) return { kid: '', ksec: '', acct, error: `La cuenta «${acct.label}» no tiene su llave API cargada. Cargala en /conexion → Cuentas de Higgsfield.` };
      return { kid, ksec, acct };
    };

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
      // Candado: NO pisar una Soul que ya anda. La de Julia no se toca nunca desde acá; otra modelo solo con force:true.
      let kid = keyId, ksec = keySecret, cAcct: HfAcct | null = null;
      if (creatorId) {
        const { data: ex } = await svc.from('creator_identity').select('status, character_id').eq('creator_id', creatorId).maybeSingle();
        const hasSoul = (ex as any)?.status === 'ready' && !!(ex as any)?.character_id;
        if (hasSoul && (creatorId === JULIA_ID || (body as any)?.force !== true)) {
          return reply({ ok: false, error: creatorId === JULIA_ID ? 'Julia ya tiene su Soul real enlazada (la de su cuenta). No se pisa desde acá.' : 'Esta modelo ya tiene su Soul enlazada. No la piso (mandá force:true si de verdad querés reemplazarla).' });
        }
        const k = await keyForCreator(creatorId);
        if (k.error) return reply({ ok: false, error: k.error });
        kid = k.kid; ksec = k.ksec; cAcct = k.acct;
      }
      const r = await hf(`/v1/custom-references`, kid, ksec, { method: 'POST', body: JSON.stringify({ name, input_images: imgs.map((image_url: string) => ({ type: 'image_url', image_url })) }) });
      const cid = (r.json as any)?.id || (r.json as any)?.character_id || null;
      if (r.ok && cid && creatorId) {
        const row: Record<string, unknown> = { creator_id: creatorId, character_id: cid, status: 'ready', n_photos: imgs.length, updated_at: new Date().toISOString() };
        if (cAcct) row.account_id = cAcct.id; // la Soul vive en la cuenta cuya llave la creó
        await svc.from('creator_identity').upsert(row);
      }
      return reply({ ok: r.ok, status: r.status, result: r.json, character_id: cid });
    }
    if (action === 'character_status') {
      const cid = String(body?.character_id || '');
      if (!cid) return reply({ ok: false, error: 'Falta character_id.' });
      // Con creator_id → con la llave de SU cuenta; sin creator_id → la de siempre.
      let kid = keyId, ksec = keySecret;
      const csCreator = String((body as any)?.creator_id || '');
      if (csCreator) { const k = await keyForCreator(csCreator); if (k.error) return reply({ ok: false, error: k.error }); kid = k.kid; ksec = k.ksec; }
      const r = await hf(`/v1/custom-references/${cid}`, kid, ksec, { method: 'GET' });
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
      // Con la llave de la cuenta de ESTA modelo (Julia/default = la de siempre).
      const rk = await keyForCreator(creatorId);
      if (rk.error) return reply({ ok: false, error: rk.error });
      const v1body = { prompt, custom_reference_id: charId, custom_reference_strength: 1, image_reference_url: ref, width_and_height: '1536x2048', quality: '1080p', batch_size: 1 };
      const r = await hf(`/v1/text2image/soul`, rk.kid, rk.ksec, { method: 'POST', body: JSON.stringify({ params: v1body }) });
      const rid = reqIdOf(r.json);
      // costo estimado (best-effort) para el contador.
      let credits: number | null = null, usd: number | null = null;
      try { const e = await hf(`/estimate/${DEFAULT_MODEL}`, rk.kid, rk.ksec, { method: 'POST', body: JSON.stringify(DEFAULT_PAYLOAD) }); credits = Number((e.json as any)?.credits) || null; usd = Number((e.json as any)?.usd) || null; } catch { /* noop */ }
      const { data: gen } = await svc.from('generations').insert({ creator_id: creatorId, reference_url: ref, request_id: rid, status: rid ? 'queued' : 'failed', credits, usd, model: 'soul-v1', created_by: user.id }).select('id').single();
      return reply({ ok: !!rid, status: r.status, generation_id: (gen as any)?.id, request_id: rid, detail: rid ? undefined : r.json });
    }
    // VIDEO con Julia: encola un job Genjutsu (motion transfer) a partir de un reel. El worker usa el reel como
    // video de referencia + las fotos REALES de la modelo como personaje. Sale en Resultados como VIDEO.
    if (action === 'make_video') {
      const creatorId = String(body?.creator_id || '');
      const ref = String(body?.reference_url || '');
      if (!creatorId || !ref) return reply({ ok: false, error: 'Falta creator_id o el reel de referencia.' });
      const { data: reals } = await svc.from('creator_vault').select('id').eq('creator_id', creatorId).eq('kind', 'real').limit(1);
      if (!reals || !(reals as any).length) return reply({ ok: false, error: 'Esta modelo no tiene fotos reales cargadas para poner su cara.' });
      // Cuenta de ESTA modelo: sin cuenta, o con su login del CLI sin conectar en la Mac → avisamos ANTES de encolar.
      const acctV = await acctFor(svc, creatorId);
      const ruleV = acctRuleProblem(acctV, creatorId);
      if (ruleV || !acctV) return reply({ ok: false, no_account: true, error: ruleV || noAcctMsg });
      const cliV = await cliProblem(svc, acctV);
      if (cliV) return reply({ ok: false, cli_missing: true, account_id: acctV.id, error: cliV });
      // Freno de créditos: si SU cuenta de Higgsfield no tiene saldo para un video, avisamos ANTES en vez de encolar y fallar feo.
      const balV = await hfBalance(svc, creatorId);
      if (balV != null && balV < MIN_VIDEO_CREDITS) return reply({ ok: false, low_credits: true, balance: balV, error: `Higgsfield casi sin créditos en «${acctV.label}»: quedan ${balV.toFixed(1)} y un video necesita ~${MIN_VIDEO_CREDITS}. Recargá créditos y reintentá.` });
      const { data: gen } = await svc.from('generations').insert({ creator_id: creatorId, reference_url: ref, status: 'queued', model: 'genjutsu', media_type: 'video', created_by: user.id }).select('id').single();
      return reply({ ok: true, generation_id: (gen as any)?.id, queued: true });
    }
    // Traer un REEL puntual por su LINK (no por cuenta): Apify directUrls → baja ESE video a la modelo.
    // Con cook:true además lo manda a cocinar de una (Genjutsu). Reusa el scraper que ya está.
    if (action === 'fetch_reel') {
      const creatorId = String(body?.creator_id || '');
      const link = String((body as any)?.url || '').trim();
      const cook = (body as any)?.cook === true;
      if (!creatorId || !link) return reply({ ok: false, error: 'Falta la modelo o el link del reel.' });
      const { data: tk } = await svcS.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
      const apToken = clean((tk as any)?.value);
      if (!apToken) return reply({ ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' });
      // ¿Ya lo tenemos? (mismo post como VIDEO) → no se le paga a Apify de nuevo.
      const linkBase = link.split('?')[0];
      const { data: haveV } = await svcS.from('creator_vault').select('video_url, source_handle').eq('creator_id', creatorId).eq('media_type', 'video')
        .in('source_url', [...new Set([link, linkBase, linkBase.replace(/\/+$/, '') + '/', linkBase.replace(/\/+$/, '')])]).limit(1);
      if (Array.isArray(haveV) && haveV.length) return reply({ ok: true, saved: true, already: true, video_url: (haveV[0] as any).video_url || null, handle: (haveV[0] as any).source_handle || null, cooking: null, warn: 'Ese reel ya estaba en «Videos»: cocinalo desde ahí.' });
      // Búsqueda en segundo plano: espera hasta ~65 s acá; si Apify tarda más → { pending, job_id } y los pasos lo terminan.
      const jr = await fetchReelJob(svcS, user.id, creatorId, link, cook, t0);
      if (jr) return reply(jr);
      // ── Camino VIEJO (sin la migración): todo en esta request, con topes (el servidor corta a los ~150 s) ──
      // Corrida con run id → su costo REAL queda registrado (kind 'reel_link'), salga bien o mal.
      // La fila se crea apenas Apify da el run id (status 'running') y se completa al final.
      const reelLog = newRunLog();
      const reelBase = { creator_id: creatorId, kind: 'reel_link', query: link.slice(0, 300), run_by: user.id };
      // Apify espera como mucho 60 s (deja lugar para bajar el video y cocinarlo antes del corte).
      const rr = await apifyRun(APIFY_IG, apToken, { directUrls: [link], resultsType: 'posts', resultsLimit: 1, addParentData: false }, legacyWait(t0, 55_000, 60_000),
        (id) => saveRunLog(svcS, reelLog, { ...reelBase, found: 0, saved: 0, videos: 0, status: 'running', ...scrapeCostFields({ videos: pendingPart(APIFY_IG, id) }, aiUse()) }), t0);
      const rrRate = await ratePerPhoto(svcS);
      const logReel = async (status: string, error: string | null, handle: string | null) => {
        if (!rr.run_id) return;
        await saveRunLog(svcS, reelLog, { ...reelBase, run_at: new Date().toISOString(), found: rr.items.length, saved: 0, videos: status === 'ok' ? 1 : 0, apify_status: rr.http, status, error, ...scrapeCostFields({ videos: apifyPart(APIFY_IG, rr, rrRate, { handle }) }, aiUse()) });
      };
      if (!rr.ok) { await logReel('error', String(rr.error || '').slice(0, 300), null); return reply({ ok: false, error: rr.error || 'No se pudo bajar el reel.', detail: rr.detail }); }
      const items: any[] = rr.items;
      if (!items.length) { await logReel('empty', 'sin resultados', null); return reply({ ok: false, error: 'No se pudo leer ese link (¿es un reel público?).' }); }
      const it = items.find((x: any) => x?.videoUrl) || items[0];
      if (!it?.videoUrl) { await logReel('empty', 'sin video', it?.ownerUsername || null); return reply({ ok: false, error: 'Ese link no tiene video (¿es un reel?).' }); }
      if (!fitsT(t0, 50_000, 75_000)) { await logReel('error', 'sin tiempo para bajar el video', it?.ownerUsername || null); return reply({ ok: false, error: 'Apify tardó en traer el reel y no llegué a bajarlo: probá de nuevo en un rato.' }); }
      const stored = (await storeVideoT(svcS, creatorId, it.videoUrl, T_MP4)).url;
      if (!stored) { await logReel('error', 'no se pudo guardar el video', it?.ownerUsername || null); return reply({ ok: false, error: 'No se pudo guardar el video (¿muy grande o link vencido?).' }); }
      const poster = imgOf(it);
      const posterStored = poster ? (await storeImg(svcS, creatorId, poster, 6_000) || poster) : stored;
      const row: Record<string, unknown> = {
        creator_id: creatorId, kind: 'ref', media_type: 'video', url: posterStored, video_url: stored, source_platform: 'instagram',
        source_handle: it?.ownerUsername || null, source_url: it?.url || link,
        likes: Number(it?.likesCount) || null, views: Number(it?.videoViewCount || it?.videoPlayCount) || null, comments: Number(it?.commentsCount) || null,
        caption: it?.caption ? String(it.caption).slice(0, 200) : null, duration: Number(it?.videoDuration) || null,
        meta: { type: 'Video', owner: it?.ownerUsername || null, shortCode: it?.shortCode || null },
      };
      await svcS.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true });
      await logReel('ok', null, it?.ownerUsername || null);
      let cooking: string | null = null;
      if (cook) {
        const c = await cookReel(svcS, creatorId, stored, user.id);
        if (!c.cooking) return reply({ ok: true, saved: true, video_url: stored, handle: it?.ownerUsername || null, cooking: null, ...(c.low_credits ? { low_credits: true } : {}), ...(c.warn ? { warn: c.warn } : {}) });
        cooking = c.cooking;
      }
      return reply({ ok: true, saved: true, video_url: stored, handle: it?.ownerUsername || null, cooking });
    }
    // Variaciones: mismo lugar + mismo outfit, otras poses/situaciones. Una idea POR FOTO (ideas[]),
    // o modo sorpresa (n fotos con idea vacía = la IA elige cada pose). Encola jobs con note='var:<idea>'.
    if (action === 'make_variations') {
      const gid = String(body?.generation_id || '');
      let ideas: string[];
      if (Array.isArray((body as any)?.ideas)) {
        ideas = (body as any).ideas.map((x: unknown) => String(x ?? '').slice(0, 200)).slice(0, 8);
      } else {
        const n = Math.min(Math.max(Number(body?.n) || 4, 1), 8);
        ideas = Array.from({ length: n }, () => String(body?.idea || '').slice(0, 200));
      }
      if (!ideas.length) return reply({ ok: false, error: 'Elegí al menos una.' });
      const { data: g } = await svc.from('generations').select('creator_id, result_url, reference_url').eq('id', gid).maybeSingle();
      if (!g || !(g as any).creator_id) return reply({ ok: false, error: 'No existe esa foto.' });
      // Mismo candado de cuenta que make_video: sin cuenta usable (o su login sin conectar en la Mac) → no se encola.
      // Julia: acctRuleProblem y cliProblem dan '' (Cuenta 1) → igual que hoy.
      const acctM = await acctFor(svc, String((g as any).creator_id));
      const ruleM = acctRuleProblem(acctM, String((g as any).creator_id));
      if (ruleM || !acctM) return reply({ ok: false, no_account: true, error: ruleM || noAcctMsg });
      const cliM = await cliProblem(svc, acctM);
      if (cliM) return reply({ ok: false, cli_missing: true, account_id: acctM.id, error: cliM });
      const src = (g as any).result_url || (g as any).reference_url;
      if (!src) return reply({ ok: false, error: 'Esa foto no tiene imagen para variar.' });
      const method = String((body as any)?.method || 'describe');
      const prefix = method === 'copy' ? 'varx:' : method === 'free' ? 'varf:' : 'var:';
      const rows = ideas.map((idea) => ({ creator_id: (g as any).creator_id, reference_url: src, status: 'queued', model: 'soul-v2', note: `${prefix}${idea}`, carousel_of: gid, created_by: user.id }));
      const { error } = await svc.from('generations').insert(rows);
      if (error) return reply({ ok: false, error: `No se pudo encolar: ${error.message}` });
      return reply({ ok: true, queued: rows.length });
    }
    if (action === 'gen_poll') {
      const gid = String(body?.generation_id || '');
      const { data: g } = await svc.from('generations').select('request_id, status, creator_id').eq('id', gid).maybeSingle();
      const rid = (g as any)?.request_id;
      if (!rid) return reply({ ok: false, error: 'Generación sin request.' });
      // El request vive en la cuenta de ESA modelo → se consulta con SU llave.
      const pk = await keyForCreator(String((g as any)?.creator_id || ''));
      if (pk.error) return reply({ ok: false, error: pk.error });
      const r = await hf(`/requests/${rid}/status`, pk.kid, pk.ksec, { method: 'GET' });
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
      const { data: g } = await svc.from('generations').select('creator_id, result_url, media_type').eq('id', gid).maybeSingle();
      if (!g) return reply({ ok: false, error: 'No existe.' });
      await svc.from('generations').update({ status: approve ? 'approved' : 'rejected' }).eq('id', gid);
      if (approve && (g as any).result_url && (g as any).creator_id) {
        if (String((g as any).media_type) === 'video') {
          // Video (ya re-hospedado y LIMPIO en cook_result): al baúl como ia/video.
          await svc.from('creator_vault').insert({ creator_id: (g as any).creator_id, kind: 'ia', media_type: 'video', url: (g as any).result_url, video_url: (g as any).result_url, caption: 'Video generado en /kitchen' });
        } else {
          // Entrega LIMPIA: le saca la metadata (C2PA/EXIF/XMP) y la re-hospeda antes de mandarla al baúl.
          const cleanUrl = await cleanAndStore(svc, (g as any).creator_id, gid, (g as any).result_url);
          await svc.from('creator_vault').insert({ creator_id: (g as any).creator_id, kind: 'ia', url: cleanUrl, caption: 'Generada en /kitchen' });
          await svc.from('generations').update({ result_url: cleanUrl }).eq('id', gid);
        }
      }
      return reply({ ok: true });
    }
    if (action === 'kitchen_summary') {
      const { data: gens } = await svc.from('generations').select('credits, usd, status');
      let credits = 0, usd = 0, count = 0;
      (Array.isArray(gens) ? gens : []).forEach((g: any) => { if (g.status !== 'failed') { credits += Number(g.credits || 0); usd += Number(g.usd || 0); count += 1; } });
      const { data: ids } = await svc.from('creator_identity').select('creator_id, status, character_id, n_photos, account_id');
      const { data: bal } = await svc.from('app_config').select('value, updated_at').eq('key', 'higgsfield_balance').maybeSingle();
      const gBal = (bal as any)?.value ? Number((bal as any).value) : null;
      // Cuentas de Higgsfield (SIN llaves): etiqueta + saldo real + si su login del CLI anda en la Mac → la cabecera de
      // cada modelo muestra SU cuenta y SU saldo. La Cuenta 1 (por id fijo, no por "default") usa la global de siempre
      // (idéntico a hoy para Julia); cualquier otra cuenta, SOLO el saldo de su fila.
      let accRows: any[] = [];
      const ra = await svc.from('higgsfield_accounts').select('id, label, is_default, balance, balance_at, cli_seen_at, cli_error').order('created_at');
      if (ra.error) { const rb = await svc.from('higgsfield_accounts').select('id, label, is_default').order('created_at'); accRows = Array.isArray(rb.data) ? rb.data : []; }
      else accRows = Array.isArray(ra.data) ? ra.data : [];
      const accounts: Record<string, unknown> = {};
      for (const a of accRows) {
        const legacy = a.id === LEGACY_HF_ACCOUNT;
        const own = a.balance != null && isFinite(Number(a.balance)) ? Number(a.balance) : null;
        const tracked = Object.prototype.hasOwnProperty.call(a, 'cli_seen_at'); // false = 0130 sin aplicar
        accounts[a.id] = {
          id: a.id, label: a.label, is_default: !!a.is_default, legacy,
          balance: legacy ? (gBal ?? own) : own,
          balance_at: legacy ? ((bal as any)?.updated_at || a.balance_at || null) : (a.balance_at || null),
          // ok | missing (nunca se conectó en la Mac) | error (logueada mal / sin login) | null (no se sabe)
          cli: legacy ? 'ok' : !tracked ? null : a.cli_error ? 'error' : a.cli_seen_at ? 'ok' : 'missing',
          cli_error: a.cli_error || null, cli_seen_at: a.cli_seen_at || null,
        };
      }
      // Julia = Cuenta 1 siempre (igual que el cocinero). Cualquier otra sin cuenta queda null.
      const identities = (Array.isArray(ids) ? ids : []).map((i: any) => ({ ...i, account_id: i.creator_id === JULIA_ID ? LEGACY_HF_ACCOUNT : (i.account_id || null) }));
      return reply({ ok: true, total_credits: credits, total_usd: usd, total_images: count, identities, balance: gBal, balance_at: (bal as any)?.updated_at || null, accounts, legacy_account: LEGACY_HF_ACCOUNT });
    }

    // ── Scraper de virales (Apify → Instagram por nicho/hashtag de la modelo) ──
    // Camino VIEJO (sincrónico, con topes: contesta antes de ~130 s). La página nueva usa scrape_start.
    if (action === 'scrape') {
      const r = await runScrape(svcS, String(body?.creator_id || ''), { niches: (body as any)?.niches, photos: Number((body as any)?.photos ?? (body as any)?.limit ?? 24), videos: Number((body as any)?.videos) || 0 }, t0);
      return reply(r);
    }
    // Traer los posts de las CUENTAS GUÍA (creadoras de referencia) de la modelo.
    if (action === 'scrape_accounts') {
      const r = await runScrapeAccounts(svcS, String(body?.creator_id || ''), { accounts: (body as any)?.accounts, photos: Number((body as any)?.photos ?? (body as any)?.limit ?? 30), videos: Number((body as any)?.videos) || 0 }, t0);
      return reply(r);
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
