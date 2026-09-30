#!/usr/bin/env node
// Auto-cocinero de /kitchen: drena la cola (generations status=queued) usando el CLI de Higgsfield.
// Habla con la edge function `higgsfield` (acciones cook_next / cook_result, protegidas por WORKER_SECRET).
// Corre en la Mac del dueño con el CLI de Higgsfield logueado + workspace seleccionado.
// Modo AUTO: le pasa la imagen de referencia a Soul 2.0 (image_references); Higgsfield escribe
// el prompt detallado solo (enhance) y genera con la soul real de la modelo. Sin ChatGPT, sin vos.
//
// Uso:  WORKER_SECRET=xxxx node scripts/kitchen-worker.mjs
//
// MULTI-CUENTA: cada modelo cocina en SU cuenta de Higgsfield (el servidor manda job.account_id).
//  - Cuenta 1 (la de Julia) = el login de SIEMPRE del CLI (~/.config/higgsfield) → se corre EXACTAMENTE igual que antes.
//  - Otra cuenta = su propio login en ~/.config/higgsfield/accounts/<account_id>/ (lo crea `node scripts/hf-login.mjs <id>`).
//  - Si la cuenta de un job no está conectada en esta Mac, el job se marca fallado con el motivo: NUNCA se cocina
//    con la cuenta equivocada.
//
// BÚSQUEDAS DEL SCRAPER (en segundo plano): al arrancar, este proceso lanza un HIJO (`--scrape-loop`) que le da pasos
// cortos (acción scrape_step, < 140 s cada uno) a las búsquedas de Instagram hasta que terminan, aunque nadie tenga la
// cocina abierta. Tiene que ser OTRO proceso: el CLI de Higgsfield corre con execFileSync y bloquea este proceso hasta
// 25 min por video. El hijo NUNCA toca el CLI ni la cocina. Se relanza solo a los 30 s si se cae.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function envFromFile(path) {
  const out = {};
  try { for (const line of readFileSync(path, 'utf8').split('\n')) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim(); } } catch { /* noop */ }
  return out;
}
const fe = envFromFile(fileURLToPath(new URL('../.env.local', import.meta.url)));
const we = envFromFile(fileURLToPath(new URL('./.worker.env', import.meta.url))); // secreto local (gitignored)
const SB_URL = process.env.SB_URL || fe.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = process.env.SB_ANON || fe.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.WORKER_SECRET || we.WORKER_SECRET;
const MODEL = 'text2image_soul_v2';
const CREDITS = 0.12, USD = 0.011;
// Rasgos FIJOS por modelo (bloqueo de look) para que el pelo/color no varíe entre fotos ni carruseles.
// Provisional acá hasta que haya un campo por-modelo en la DB + UI. creator_id → descripción en inglés.
const LOOKS = {
  // Julia Parker: pelo castaño (no rubio, no negro), con mechas caramelo suaves enmarcando la cara.
  '4014e339-ead8-4fb7-bcda-82fee2c7926e': 'long warm CHESTNUT-BROWN hair (castaño, natural medium brown) with a few subtle lighter caramel face-framing strands, NEVER platinum blonde and NEVER black',
  // Cuenta 2 — leídos de sus fotos reales (color exacto para que el motor no la despinte con la referencia).
  // ALEMIA ROJAS: rubia con raíz oscura (balayage), muy largo — SÍ es rubia.
  'bb6cb184-4bc4-4cb9-923f-269c712a2f61': 'long straight ROOTED BLONDE hair, dark brown roots melting into warm honey/golden-blonde lengths (balayage), very long past the chest, NEVER solid platinum-white and NEVER dark all over',
  // Berenaa: castaño muy oscuro casi negro.
  'd730ed0d-b02f-4372-9ccb-d54a639cc627': 'very long straight VERY DARK BROWN, almost black brunette hair, NEVER blonde and NEVER light',
  // CAROLANE: castaño oscuro espresso — NO rubia.
  'e5edf9d3-8ef5-424d-a4ab-27762a1e07ff': 'dark espresso BROWN hair (deep near-black brunette), long, NEVER blonde and NEVER light',
  // Celia: castaño oscuro — NO rubia.
  '50384f75-14b1-4b76-86dc-e3fd9a314aef': 'deep DARK BROWN brunette hair, NEVER blonde and NEVER light',
  // DANIK MICHELL: castaño oscuro, muy largo.
  '0c49507f-44cb-4135-8212-c3fcb24c18ec': 'very long straight DARK BROWN brunette hair with subtle warm highlights, NEVER blonde',
  // DANYANCAT: castaño caramelo con flequillo.
  '7bf99ff0-d091-4627-824a-6dba4707246c': 'long wavy warm CARAMEL LIGHT-BROWN hair with a blunt FRINGE (bangs) across the forehead, NEVER blonde and NEVER jet black',
  // Gabbielondon: castaño medio natural — NO rubia.
  '4f4d707e-f1e1-40bf-b29d-41367aa3886a': 'long straight natural MEDIUM WARM BROWN (light chestnut) hair, center-parted, NEVER blonde and NEVER platinum',
  // Julieta: rubia balayage con raíz — SÍ es rubia.
  '8d1806e7-47b5-4c04-a356-bc203a33bdc9': 'shoulder-length wavy ROOTED BLONDE hair, dark roots into soft ash/honey blonde (balayage), NEVER solid platinum-white and NEVER dark brunette',
  // Msmartinasmith1: negro azabache, bob con flequillo.
  '67d3634b-0f58-4339-88c5-16889e3bd1d2': 'JET-BLACK straight chin-length BOB with a blunt FRINGE (bangs), NEVER long flowing hair and NEVER blonde',
  // Saritac: negro largo con flequillo.
  'b4a7d6df-ecfe-49b2-b960-48a2be302824': 'long straight JET-BLACK hair with soft wispy BANGS, NEVER blonde and NEVER light',
  // steph.torres: negro/castaño muy oscuro, largo.
  '0b033679-8d8e-4e50-a834-2204b3f22700': 'long straight near-BLACK very dark hair, center-parted, NEVER blonde and NEVER light brown',
};
// La visión guarda en el prompt el PELO del viral (ej: "long straight light blonde hair") y ese texto le gana al
// Soul y al candado → sale rubia. Acá le sacamos cualquier descripción de color/estilo de pelo del prompt: la
// identidad (incluido el pelo) la ponen SOLO el Soul + el candado LOOKS, nunca la referencia. No toca "black bikini",
// "brown eyes", etc. (solo lo pegado a "hair" y las palabras blonde/brunette, que casi siempre son pelo).
const stripHair = (s) => String(s || '')
  .replace(/\b(?:(?:very|super|long|short|medium|shoulder|mid|chin|length|and|with|straight|wavy|curly|sleek|silky|light|dark|deep|bright|golden|honey|ash|dirty|jet|platinum|blonde|blond|brunette|brown|black|auburn|red|ginger|copper|caramel|chestnut|silver|gr[ae]y)[-,\s]+)+hair\b/gi, 'hair')
  .replace(/\b(?:platinum[- ]?)?(?:blonde|blond|brunette)\b/gi, '')
  .replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
if (!SB_URL || !SB_ANON || !SECRET) { console.error('Falta SB_URL / SB_ANON / WORKER_SECRET.'); process.exit(1); }
const FN = `${SB_URL}/functions/v1/higgsfield`;
// Cliente Supabase (anon) SOLO para subir el video ya limpio a un cupo firmado (uploadToSignedUrl). No escribe DB.
const sbw = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Errores TRANSITORIOS de Higgsfield/red que muchas veces salen a la 2da → reintentamos solos.
// NO incluye not_enough_credits (sin saldo es inútil reintentar) ni rechazos permanentes.
const isTransient = (m) => {
  const s = String(m || '');
  if (/not_enough_credits|insufficient|forbidden|unauthorized|401|403/i.test(s)) return false;
  return /\b5\d\d\b|upload_url|failed to PUT|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EPIPE|socket hang up|network|user status lookup|service unavailable|bad gateway|gateway time|temporarily/i.test(s);
};

async function fn(action, extra) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    body: JSON.stringify({ action, worker_secret: SECRET, ...(extra || {}) }),
  });
  return res.json();
}

// ── Cuentas de Higgsfield: un login del CLI por cuenta ──
// Cuenta 1 = login de siempre (~/.config/higgsfield). Julia vive acá y va SIEMPRE acá (decisión del dueño).
const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933';
const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const HF_HOME = join(homedir(), '.config', 'higgsfield');
const HF_ACC_DIR = join(HF_HOME, 'accounts');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const acctFiles = (id) => { const d = join(HF_ACC_DIR, id); return { dir: d, cred: join(d, 'credentials.json'), conf: join(d, 'config.json') }; };
const loginCmd = (id) => `node scripts/hf-login.mjs ${id}`;
const readWorkspace = (path) => { try { return JSON.parse(readFileSync(path, 'utf8'))?.workspace_id || null; } catch { return null; } };
const legacyWorkspace = () => process.env.HIGGSFIELD_WORKSPACE_ID || readWorkspace(process.env.HIGGSFIELD_CONFIG_PATH || join(HF_HOME, 'config.json'));
const badAccounts = new Map(); // account_id → motivo (ej: logueada con la MISMA cuenta que la Cuenta 1)
let legacyEmail = null;        // email del login de siempre (para detectar una cuenta nueva logueada con la vieja)
const soulsAt = new Map();     // account_id → cuándo se mandaron sus Souls por última vez
// Último chequeo OK de cada cuenta (NO es la de Julia) + "firma" de sus archivos de login en ese momento.
// Si después la red falla, solo se deja cocinar si ESE mismo login (archivos sin tocar) se confirmó hace poco.
const verifiedAt = new Map();  // account_id → { at, sig }
const loginSig = (id) => { try { const f = acctFiles(id); const c = statSync(f.cred); let k = 'none'; try { const s = statSync(f.conf); k = `${s.mtimeMs}:${s.size}`; } catch { /* sin config */ } return `${c.mtimeMs}:${c.size}|${k}`; } catch { return ''; } };
const markVerified = (id) => verifiedAt.set(id, { at: Date.now(), sig: loginSig(id) });
const recentlyVerified = (id) => { const v = verifiedAt.get(id); return !!(v && v.sig && v.sig === loginSig(id) && Date.now() - v.at < 10 * 60 * 1000); };

// ÚNICO lugar que corre el CLI de Higgsfield. accountId es OBLIGATORIO (no hay "por defecto" implícito):
//  - Cuenta 1 → execFileSync con las MISMAS opciones de siempre (sin env propio) → Julia idéntica a antes.
//  - otra cuenta → mismo comando con el env de SU login (HIGGSFIELD_CREDENTIALS_PATH / HIGGSFIELD_CONFIG_PATH).
//  - sin cuenta / sin login / login equivocado → tira error: nunca corre en otra cuenta.
// probeOnly=true SOLO para `account status` (no cobra): deja chequear una cuenta marcada como equivocada, para
// poder levantarle la marca cuando la vuelven a loguear bien.
function hf(args, opts, accountId, probeOnly = false) {
  if (accountId === LEGACY_HF_ACCOUNT) return execFileSync('higgsfield', args, opts);
  if (!accountId || !UUID_RE.test(String(accountId))) throw new Error('Job sin cuenta de Higgsfield definida (no se corre en ninguna).');
  const f = acctFiles(accountId);
  if (!existsSync(f.cred)) throw new Error(`Falta el login de la cuenta ${accountId} en la Mac. Corré: ${loginCmd(accountId)}`);
  if (!probeOnly && badAccounts.has(accountId)) throw new Error(badAccounts.get(accountId));
  const env = { ...process.env, HIGGSFIELD_CREDENTIALS_PATH: f.cred, HIGGSFIELD_CONFIG_PATH: f.conf };
  delete env.HIGGSFIELD_WORKSPACE_ID; // el workspace de ESTA cuenta sale de SU config.json, nunca del de la Cuenta 1
  return execFileSync('higgsfield', args, { stdio: ['pipe', 'pipe', 'pipe'], ...opts, env }); // stderr capturado, NO al log (sus "Hint: hf auth login / workspace set" sin este env pisarían el login de Julia)
}

// Saldo real de Higgsfield en créditos (para medir el costo exacto por diferencia) — de la cuenta del job.
function getBalance(accountId) {
  try { const out = hf(['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 }, accountId); const b = JSON.parse(out)?.credits; return typeof b === 'number' ? b : null; } catch { return null; }
}
// Estado de la cuenta (saldo + email) o el error del CLI. Solo para cuentas que NO son la 1.
function probe(accountId) {
  try { const st = JSON.parse(hf(['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 }, accountId, true)); return { ok: true, credits: typeof st?.credits === 'number' ? st.credits : null, email: typeof st?.email === 'string' ? st.email : null }; }
  catch (e) { return { ok: false, err: String(e?.stderr || e?.stdout || e?.message || e).replace(/\s+/g, ' ').trim() }; }
}
// Email del login de siempre (Cuenta 1): sin él no se puede confirmar que otra cuenta NO sea la de Julia.
function ensureLegacyEmail() {
  if (legacyEmail) return legacyEmail;
  try { const st = JSON.parse(hf(['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 }, LEGACY_HF_ACCOUNT)); if (typeof st?.email === 'string' && st.email) legacyEmail = st.email.toLowerCase(); } catch { /* noop */ }
  return legacyEmail;
}
const isAuthErr = (m) => /auth login|unauthori[sz]ed|\b401\b|\b403\b|forbidden|not logged|no workspace selected|credentials|token (expired|invalid)|invalid_grant/i.test(String(m || ''));
// ¿Esta cuenta (que NO es la 1) está logueada con la cuenta de Julia o con su mismo workspace? → le cobraría a la Cuenta 1.
function wrongLoginReason(accountId, label, email) {
  const who = label ? `«${label}»` : accountId;
  if (email && legacyEmail && String(email).toLowerCase() === legacyEmail) return `La cuenta ${who} está logueada en la Mac con la MISMA cuenta que la Cuenta 1 (la de Julia). Volvé a loguearla con la cuenta nueva: ${loginCmd(accountId)}`;
  const ws = readWorkspace(acctFiles(accountId).conf), lws = legacyWorkspace();
  if (ws && lws && ws === lws) return `La cuenta ${who} tiene elegido el MISMO workspace que la Cuenta 1 (la de Julia): le cobraría a esa. Corré: ${loginCmd(accountId)}`;
  return '';
}

// ¿Con qué cuenta se cocina este job? → { account, label } o { error } (el job se falla con ese motivo, no se cocina).
function routeFor(job) {
  if (job.creator_id === JULIA_ID) return { account: LEGACY_HF_ACCOUNT, label: job.account_label || 'Cuenta 1' }; // Julia: como siempre
  const a = job.account_id || null;
  const label = job.account_label || '';
  if (!a) return { error: Object.prototype.hasOwnProperty.call(job, 'account_id')
    ? 'Esta modelo no tiene cuenta de Higgsfield asignada. Asignala en /conexion → «Modelos → cuenta» y tocá Reintentar.'
    : 'El servidor (edge «higgsfield») todavía no manda la cuenta de cada modelo: falta desplegarlo. Mientras tanto solo se cocina Julia.' };
  // Decisión del dueño: en la Cuenta 1 (la vieja) SOLO Julia. Otra modelo ahí no se cocina (no se le cobra a esa cuenta).
  if (a === LEGACY_HF_ACCOUNT) return { error: 'La Cuenta 1 es solo de Julia: esta modelo tiene que ir a la cuenta nueva. Cambiala en /conexion → «Modelos → cuenta» y tocá Reintentar.' };
  if (!UUID_RE.test(String(a))) return { error: 'La cuenta de Higgsfield de esta modelo es inválida.' };
  if (!existsSync(acctFiles(a).cred)) return { error: `Falta conectar la cuenta «${label || a}» en la Mac (login de Higgsfield). Corré: ${loginCmd(a)}` };
  const bad = badAccounts.get(a) || wrongLoginReason(a, label, null);
  if (bad) return { error: bad };
  return { account: a, label };
}
// Antes de gastar en una cuenta que NO es la 1: confirmar que su login anda y que NO es la cuenta de Julia.
// Falla CERRADO: si no se puede confirmar (red/Higgsfield no responde) no se cocina, salvo que ESE mismo login se haya
// confirmado hace poco (archivos sin tocar). Nunca pasa el "Hint: hf workspace set" crudo del CLI (sin el env de la
// cuenta pisaría el config de Julia): siempre manda a correr hf-login.mjs.
async function guardAccount(accountId, label) {
  const who = `«${label || accountId}»`;
  if (badAccounts.has(accountId)) return badAccounts.get(accountId);
  let p = probe(accountId);
  if (!p.ok && !isAuthErr(p.err)) { await sleep(3000); p = probe(accountId); } // un tropiezo de red: 1 reintento
  if (!p.ok) {
    if (isAuthErr(p.err)) return acctNote(accountId, label, p.err) || `El login de la cuenta ${who} en la Mac no anda. Corré: ${loginCmd(accountId)}`;
    return recentlyVerified(accountId) ? '' : `No pude confirmar con qué cuenta está logueada ${who} en la Mac (Higgsfield o la red no responden). No la cociné para no cobrarle a otra cuenta. Tocá Reintentar en un rato.`;
  }
  if (!p.email || !ensureLegacyEmail()) return `No pude comparar el login de ${who} con el de la Cuenta 1 (la de Julia): falta el email de alguna de las dos. No la cociné para no cobrarle a la cuenta de Julia. Tocá Reintentar en un rato.`;
  const bad = wrongLoginReason(accountId, label, p.email);
  if (bad) { badAccounts.set(accountId, bad); return bad; }
  markVerified(accountId);
  return '';
}
// Nota amigable para errores del CLI en una cuenta que NO es la 1 (la de Julia queda con sus notas de siempre).
function acctNote(accountId, label, msg) {
  if (accountId === LEGACY_HF_ACCOUNT) return '';
  const who = `«${label || accountId}»`;
  if (/no workspace selected/i.test(msg)) return `La cuenta ${who} no tiene workspace elegido en la Mac. Corré: ${loginCmd(accountId)}`;
  if (isAuthErr(msg)) return `El login de la cuenta ${who} en la Mac venció o no anda. Corré: ${loginCmd(accountId)}`;
  if (/(custom[_ ]?reference|soul)[^.]{0,40}(not found|does not exist|no existe)|not found[^.]{0,30}(custom[_ ]?reference|soul)/i.test(msg)) return `Esa Soul no está en la cuenta ${who}: revisá la Soul de la modelo en /conexion (tiene que ser de esa cuenta).`;
  return '';
}
// Saldo después de un job: Cuenta 1 → sync_balance {credits} (igual que siempre); otra → reporte POR cuenta.
function reportBalance(accountId, credits) {
  if (accountId === LEGACY_HF_ACCOUNT) return fn('sync_balance', { credits });
  return fn('hf_accounts_report', { accounts: [{ account_id: accountId, ok: true, credits }] });
}

async function cookOne(job) {
  const dir = join(tmpdir(), 'kitchen-worker'); mkdirSync(dir, { recursive: true });

  // ── ¿En qué cuenta de Higgsfield? Sin cuenta usable → se falla con el motivo (no tapa la cola, no usa otra cuenta) ──
  const isVideoJob = !!(job.genjutsu && job.video_ref);
  const route = routeFor(job);
  let blockNote = route.error || '';
  if (!blockNote && route.account !== LEGACY_HF_ACCOUNT) blockNote = await guardAccount(route.account, route.label);
  if (blockNote) {
    await fn('cook_result', { generation_id: job.id, ok: false, note: blockNote, ...(isVideoJob ? { media_type: 'video' } : {}) });
    console.log(`· ${job.id} NO se cocina (cuenta): ${blockNote.replace(/\S+@\S+/g, '[email]').slice(0, 140)}`);
    return;
  }
  const acct = route.account;
  if (acct !== LEGACY_HF_ACCOUNT) console.log(`  cuenta: ${route.label || acct}`);

  // ── VIDEO con Julia (Genjutsu motion transfer): el reel como video de referencia + fotos REALES de la modelo como personaje ──
  if (job.genjutsu && job.video_ref) {
    try {
      const vPath = join(dir, `${job.id}-reel.mp4`);
      try { const vr = await fetch(job.video_ref); writeFileSync(vPath, Buffer.from(await vr.arrayBuffer())); }
      catch (e) { await fn('cook_result', { generation_id: job.id, ok: false, media_type: 'video', note: 'No se pudo bajar el reel de referencia.' }); console.log(`· ${job.id} no se pudo bajar el reel`); return; }
      const imgPaths = [];
      for (const [i, ref] of (Array.isArray(job.image_refs) ? job.image_refs.slice(0, 4) : []).entries()) {
        try { const ext = (String(ref).split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'; const p = join(dir, `${job.id}-j${i}.${ext}`); const r = await fetch(ref); writeFileSync(p, Buffer.from(await r.arrayBuffer())); imgPaths.push(p); } catch { /* skip */ }
      }
      if (!imgPaths.length) { await fn('cook_result', { generation_id: job.id, ok: false, media_type: 'video', note: 'La modelo no tiene fotos reales para la cara.' }); console.log(`· ${job.id} sin fotos reales → skip`); return; }
      const look = LOOKS[job.creator_id];
      // Motion transfer (hf_mult_motion_control): recrea el video con la MODELO como personaje → identidad REAL de la
      // modelo (objects_swap dejaba a la persona original). Con ropa normal pasa el filtro; el reintento nsfw cubre lo borderline.
      const vprompt = (job.prompt || 'The woman from the reference images performs this exact motion — same movement, timing, camera and framing, in the same scene, wearing the same outfit.') + (look ? ` The woman has ${look}.` : '') + ' Photorealistic, natural, high detail. Keep her REAL body from the reference images: her FULL, LARGE natural bust and her curvy hourglass figure with rounded hips and glutes. Do NOT slim, shrink or flatten her chest or her body; match the proportions of the reference photos, not the original video. FACE: match her EXACT face from the reference images — her real eye shape with large, open, rounded, expressive eyes (do NOT make the eyes narrow, slanted, squinty or almond-shaped), her exact nose, full lips and face shape. Her face must clearly read as the SAME woman in the reference photos.';
      const vargs = ['generate', 'create', 'hf_mult_motion_control', '--video-references', vPath];
      for (const p of imgPaths) vargs.push('--image-references', p);
      vargs.push('--resolution', '720p', '--prompt', vprompt, '--wait', '--wait-timeout', '20m', '--wait-interval', '10s', '--json');
      const balBefore = getBalance(acct);
      // REINTENTO AUTOMÁTICO (hasta 5): el filtro NSFW de video es un falso positivo ALEATORIO (mismo input pasa a veces),
      // y los errores 5xx/upload_url/red son transitorios (salen a la 2da). Los rechazos NO cobran; los 5xx suelen fallar
      // antes de generar (gratis). Así el dueño no tiene que venir a darle "Reintentar" a mano.
      const MAX_TRIES = 5;
      let rec = null, nsfw = false, lastMsg = '', hiveDetail = '';
      for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
        try {
          const stdout = hf(vargs, { encoding: 'utf8', timeout: 25 * 60 * 1000, maxBuffer: 128 * 1024 * 1024 }, acct);
          const out = JSON.parse(stdout); const r = Array.isArray(out) ? out[0] : out;
          if (String(r?.status).toLowerCase() === 'nsfw') {
            nsfw = true;
            // Capturamos TODO lo que devuelve Higgsfield/Hive en el rechazo (categorías, score, motivo) para saber POR QUÉ no pasa.
            hiveDetail = (r?.moderation || r?.nsfw_reason || r?.reason || r?.categories || r?.message || r?.detail) ? JSON.stringify({ moderation: r?.moderation, reason: r?.nsfw_reason || r?.reason, categories: r?.categories, message: r?.message, detail: r?.detail }) : JSON.stringify(r);
            hiveDetail = String(hiveDetail).slice(0, 500);
            console.log(`· ${job.id} HIVE/NSFW rechazo (intento ${attempt}/${MAX_TRIES}): ${hiveDetail}`);
            if (attempt < MAX_TRIES) { await sleep(3000); continue; } break;
          }
          rec = r; break;
        } catch (e) {
          lastMsg = String(e.stderr || e.stdout || e.message || e).replace(/\s+/g, ' ').trim();
          nsfw = /nsfw/i.test(lastMsg);
          if (nsfw && !hiveDetail) hiveDetail = lastMsg.slice(0, 500);
          const transient = !nsfw && isTransient(lastMsg);
          if ((nsfw || transient) && attempt < MAX_TRIES) { console.log(`· ${job.id} ${nsfw ? `HIVE/NSFW rechazo: ${lastMsg.slice(0, 120)}` : `error transitorio (${lastMsg.slice(0, 50)})`} (intento ${attempt}/${MAX_TRIES}) — reintento`); await sleep(transient ? 6000 : 3000); continue; }
          break;
        }
      }
      const resultUrl = rec?.result_url || rec?.min_result_url || (Array.isArray(rec?.results) ? rec.results[0]?.url : null) || null;
      if (!resultUrl) {
        const balFail = getBalance(acct);
        let creditsFail = 0;
        if (typeof balBefore === 'number' && typeof balFail === 'number' && balBefore > balFail) creditsFail = Math.round((balBefore - balFail) * 1000) / 1000;
        const note = (!nsfw && acctNote(acct, route.label, lastMsg)) || (nsfw ? `Hive (el moderador de Higgsfield) marcó el video como NSFW tras ${MAX_TRIES} intentos — suele ser piel/bikini (falso positivo) y es aleatorio. Lo que dijo Hive: ${(hiveDetail || 'sin detalle').slice(0, 220)}` : /timed?\s?out|deadline|wait.?timeout/i.test(lastMsg) ? `El video tardó demasiado (tras varios intentos).` : `Error del motor tras ${MAX_TRIES} intentos: ${lastMsg.slice(0, 150) || 'desconocido'}`);
        await fn('cook_result', { generation_id: job.id, ok: false, media_type: 'video', note, credits: creditsFail || null, usd: creditsFail ? Math.round(creditsFail * 0.09 * 1000) / 1000 : null });
        if (typeof balFail === 'number') await reportBalance(acct, balFail);
        console.log(`✗ ${job.id} (video) falló: ${note}${creditsFail ? ` (costó ${creditsFail} créd)` : ''}`); return;
      }
      const balAfter = getBalance(acct);
      let credits = 56;
      if (typeof balBefore === 'number' && typeof balAfter === 'number' && balBefore > balAfter) credits = Math.round((balBefore - balAfter) * 1000) / 1000;
      const usd = Math.round(credits * 0.09 * 1000) / 1000;
      // SIN METADATA: bajamos el resultado, le sacamos la metadata (C2PA "hecho con IA" + EXIF/XMP) con ffmpeg
      // (-map_metadata -1; el remux -c copy NO arrastra el box C2PA de Higgsfield) y subimos el video LIMPIO a
      // nuestro storage por cupo firmado. Si algo falla, cae al fallback (url de Higgsfield, que trae metadata).
      let deliverUrl = resultUrl, cleanOk = false;
      try {
        const rawP = join(dir, `${job.id}-out-raw.mp4`);
        const cleanP = join(dir, `${job.id}-out.mp4`);
        const rr = await fetch(resultUrl); writeFileSync(rawP, Buffer.from(await rr.arrayBuffer()));
        execFileSync('ffmpeg', ['-y', '-i', rawP, '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-c', 'copy', '-movflags', '+faststart', cleanP], { timeout: 180000, stdio: 'ignore' });
        const slot = await fn('video_slot', { generation_id: job.id });
        if (slot?.ok && slot.path && slot.token) {
          const up = await sbw.storage.from('proposal-photos').uploadToSignedUrl(slot.path, slot.token, readFileSync(cleanP), { contentType: 'video/mp4' });
          if (!up.error && slot.public_url) { deliverUrl = slot.public_url; cleanOk = true; }
          else console.log(`· ${job.id} subida limpia falló: ${up.error?.message || 'sin url'}`);
        } else console.log(`· ${job.id} no dieron cupo de subida limpia`);
      } catch (e) { console.log(`· ${job.id} no se pudo limpiar el video (queda con metadata): ${String(e.message || e).slice(0, 120)}`); }
      await fn('cook_result', { generation_id: job.id, ok: !!resultUrl, result_url: deliverUrl, stored_clean: cleanOk, media_type: 'video', credits, usd, engine: 'Genjutsu' });
      if (typeof balAfter === 'number') await reportBalance(acct, balAfter);
      console.log(resultUrl ? `✓ ${job.id} VIDEO (${credits} créd)${cleanOk ? ' SIN metadata' : ' (metadata NO removida)'} → ${String(deliverUrl).slice(0, 60)}…` : `✗ ${job.id} video sin resultado`);
    } catch (e) { await fn('cook_result', { generation_id: job.id, ok: false, media_type: 'video', note: `Error: ${String(e.message || e).slice(0, 140)}` }); }
    return;
  }

  let args;
  if (job.soul_copy && job.image_ref && job.character_id) {
    // VARIACIÓN 'copy' — Soul 2.0 con la réplica como image-ref: outfit/lugar idénticos (copia la pose), cara REAL por la soul.
    const look = LOOKS[job.creator_id];
    const cprompt = (job.prompt || 'Keep this exact composition, outfit, location and lighting. Photorealistic candid amateur phone photo, full natural body, correct hands.') + (look ? ` The woman has ${look}.` : '') + ' Keep her FULL curvy figure with rounded full glutes and natural hips; do NOT slim or flatten her body or her butt.';
    const ext = (String(job.image_ref).split('?')[0].split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const srcPath = join(dir, `${job.id}-src.${ext}`);
    try {
      const r = await fetch(job.image_ref);
      writeFileSync(srcPath, Buffer.from(await r.arrayBuffer()));
    } catch (e) { await fn('cook_result', { generation_id: job.id, ok: false, note: 'No se pudo bajar la foto a copiar.' }); console.log(`· ${job.id} no se pudo bajar la src`); return; }
    args = ['generate', 'create', MODEL, '--custom_reference_id', job.character_id, '--image-references', srcPath, '--prompt', cprompt, '--aspect_ratio', '3:4', '--quality', '2k', '--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json'];
  } else if (!job.character_id) {
    await fn('cook_result', { generation_id: job.id, ok: false, note: 'La modelo no tiene su soul enlazada todavía.' }); console.log(`· ${job.id} sin soul enlazada → skip`); return;
  } else if (job.prompt) {
    // RÉPLICA (con image_ref = la viral → outfit + pose EXACTOS) o VARIACIÓN 'describe' (sin image_ref → pose libre). Todo Soul 2.0.
    // Anclamos el pelo de la modelo para que su cara NO se despinte según la referencia (rubia/negra) — su pelo es el fijo (castaño).
    const look = LOOKS[job.creator_id];
    // Solo en la RÉPLICA (hay image_ref = la viral): forzar que COPIE la pose y el ángulo exactos,
    // que es lo que se despinta (siempre sale de frente). En las variaciones (sin image_ref) NO va esto.
    const poseLock = job.image_ref
      ? 'FIRST AND MOST IMPORTANT: copy the EXACT body pose, body orientation, limb placement, weight distribution and CAMERA ANGLE of the reference photo — match its exact posture (standing / seated / reclining / lying down / kneeling / crouching / leaning / three-quarter turn / profile / back-to-camera), the exact framing and crop, and the exact height and tilt of the camera. Do NOT default to a front-facing, straight-on standing pose; if the reference is turned, seated, from the side or from behind, reproduce THAT. '
      : '';
    // Ajuste del dueño al REHACER (note='tweak:...'): lo que escribió (ej: "más glúteo") pisa por encima de todo.
    const tweak = String(job.note || '').startsWith('tweak:') ? String(job.note).slice(6).trim() : '';
    // Candado de pelo: con look propio se fija el color exacto (como Julia); sin look, si hay referencia (la viral),
    // instrucción genérica para que NO se despinte con el pelo de la foto (rubia/negra) y conserve el de su Soul.
    // ¿El viral (descrito en el prompt) tiene OTRO color de pelo que el candado de la modelo? En Soul 2.0 la imagen-
    // referencia le copia el pelo y NO hay perilla para bajarle el peso (probado: ni el texto más fuerte le gana).
    // Entonces, si hay CONFLICTO, NO pegamos la imagen: copiamos pose + outfit + escena por la DESCRIPCIÓN de texto
    // → sale con SU pelo (probado, receta ganadora). Si el pelo matchea (o no hay candado) usamos la imagen exacta.
    // Julia no se afecta: su castaño matchea el de sus virales; y si alguna vez no, cae en descripción y sigue bien.
    const refBlonde = /\bblondes?\b|\bblond\b|\bplatinum\b|\brubi[ao]s?\b/i.test(job.prompt || '');
    const refDark = /\bhair\b/i.test(job.prompt || '') && /\b(dark|black|jet[- ]?black|brunette|dark[- ]haired)\b/i.test(job.prompt || '');
    const modelBlonde = /blonde|blond|platinum|rubi[ao]/i.test(look || '');
    const hairConflict = !!look && ((refBlonde && !modelBlonde) || (refDark && modelBlonde));
    // La imagen-referencia SOLO se usa con souls FUERTES (LoRA real entrenada = Julia): aguanta el pelo aunque el viral
    // sea de otro color. Las demás usan Soul 2.0 (soul más débil) → la imagen les PISA el pelo sí o sí (probado: ni el
    // texto más fuerte le gana, y detectar el color del viral por el prompt no es confiable — gorra, etc.). Por eso las
    // demás copian pose+outfit+escena por DESCRIPCIÓN (sin imagen) → salen con SU pelo (receta ganadora). Réplica buena.
    const JULIA = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
    const useImage = !!job.image_ref && job.creator_id === JULIA && !hairConflict;
    // El pelo, adelante Y atrás (así quedó ganadora la prueba), para que el Soul no se despinte.
    const hairFront = look ? `HER HAIR IS FIXED — the woman has ${look}, NOT the hair of any reference. ` : '';
    const hairLock = look
      ? ` IMPORTANT: the woman has ${look} — this exact hair, regardless of the reference.`
      : (job.image_ref ? " IMPORTANT: keep the woman's OWN natural hair colour, length and hairstyle exactly as defined by her trained Soul model — do NOT copy, borrow, lighten, darken or blend the hair colour or hairstyle from the reference photo; the reference is only for pose, outfit and scene, never for hair." : '');
    const rprompt = hairFront + poseLock + stripHair(job.prompt) + hairLock + ' Keep her FULL curvy natural figure with rounded full glutes and thighs and natural hips; do NOT slim, shrink, snatch or flatten her body or her butt.' + (tweak ? ` USER ADJUSTMENT — apply exactly this change the user asked for, prioritise it over the reference: ${tweak}.` : '');
    args = ['generate', 'create', MODEL, '--custom_reference_id', job.character_id, '--prompt', rprompt, '--aspect_ratio', '3:4', '--quality', '2k'];
    if (useImage) {
      // Réplica pixel-exacta: la viral como referencia (el pelo matchea). Con image_reference NO va style_id.
      const ext = (String(job.image_ref).split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const refPath = join(dir, `${job.id}-ref.${ext}`);
      try { const r = await fetch(job.image_ref); writeFileSync(refPath, Buffer.from(await r.arrayBuffer())); args.push('--image-references', refPath); }
      catch (e) { if (job.style_id) args.push('--style_id', job.style_id); }
    } else if (job.style_id && !job.image_ref) { args.push('--style_id', job.style_id); }
    if (hairConflict) console.log(`  · pelo del viral ≠ modelo → copio por descripción (sin imagen) para respetar su pelo`);
    args.push('--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json');
  } else {
    // Fallback sin Anthropic: modo imagen con la referencia.
    const ext = (String(job.reference_url).split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const refPath = join(dir, `${job.id}.${ext}`);
    try {
      const r = await fetch(job.reference_url);
      writeFileSync(refPath, Buffer.from(await r.arrayBuffer()));
    } catch (e) { await fn('cook_result', { generation_id: job.id, ok: false, note: 'No se pudo bajar la foto de referencia.' }); console.log(`· ${job.id} no se pudo bajar la ref`); return; }
    args = ['generate', 'create', MODEL, '--custom_reference_id', job.character_id, '--image-references', refPath, '--prompt', 'recreate this photo faithfully — same pose, body position, outfit, setting, framing and lighting; realistic, high detail', '--aspect_ratio', '3:4', '--quality', '2k', '--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json'];
  }

  const balBefore = getBalance(acct);
  // REINTENTO AUTOMÁTICO (hasta 4) ante errores transitorios (5xx/upload_url/red). NSFW en foto suele ser la
  // referencia (permanente) → NO reintenta. Así el dueño no viene a darle "Reintentar" a mano.
  let rec, pmsg = '';
  const PMAX = 4;
  for (let attempt = 1; attempt <= PMAX; attempt++) {
    try {
      const stdout = hf(args, { encoding: 'utf8', timeout: 6 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }, acct);
      const out = JSON.parse(stdout); rec = Array.isArray(out) ? out[0] : out; break;
    } catch (e) {
      // stderr real del CLI (no e.message, que incluye los args con "--wait-timeout" y da falsos "timeout").
      pmsg = String(e.stderr || e.stdout || e.message || e).replace(/\s+/g, ' ').trim();
      if (!/nsfw/i.test(pmsg) && isTransient(pmsg) && attempt < PMAX) { console.log(`· ${job.id} error transitorio (${pmsg.slice(0, 50)}) (intento ${attempt}/${PMAX}) — reintento`); await sleep(5000); continue; }
      break;
    }
  }
  if (!rec) {
    const balF = getBalance(acct);
    let creditsF = 0;
    if (typeof balBefore === 'number' && typeof balF === 'number' && balBefore > balF) creditsF = Math.round((balBefore - balF) * 1000) / 1000;
    const note = (!/nsfw/i.test(pmsg) && acctNote(acct, route.label, pmsg)) || (/nsfw/i.test(pmsg) ? 'NSFW — la referencia es muy explícita para el motor.'
      : /timed?\s?out|deadline|wait.?timeout exceeded/i.test(pmsg) ? 'Tardó demasiado (tras varios intentos).'
      : `Error del motor tras ${PMAX} intentos: ${pmsg.slice(0, 150) || 'desconocido'}`);
    await fn('cook_result', { generation_id: job.id, ok: false, note, credits: creditsF || null, usd: creditsF ? Math.round(creditsF * 0.09 * 1000) / 1000 : null });
    if (typeof balF === 'number') await reportBalance(acct, balF);
    console.log(`✗ ${job.id} falló: ${note}${creditsF ? ` (costó ${creditsF} créd)` : ''}`);
    return;
  }
  const resultUrl = rec?.result_url || rec?.min_result_url || null;
  const prompt = (rec?.params?.prompt || '').slice(0, 800);
  // Costo REAL por diferencia de saldo (sirve para cualquier motor). Fallback al costo Soul si no se pudo medir.
  const balAfter = getBalance(acct);
  let credits = CREDITS;
  if (typeof balBefore === 'number' && typeof balAfter === 'number' && balBefore > balAfter) credits = Math.round((balBefore - balAfter) * 1000) / 1000;
  const usd = Math.round(credits * 0.09 * 1000) / 1000;
  await fn('cook_result', { generation_id: job.id, ok: !!resultUrl, result_url: resultUrl, credits, usd, prompt, engine: 'Soul 2.0' });
  if (typeof balAfter === 'number') await reportBalance(acct, balAfter);
  console.log(resultUrl ? `✓ ${job.id} (${credits} créd) → ${resultUrl.slice(0, 60)}…` : `✗ ${job.id} sin resultado`);
}

// Sincroniza el saldo REAL de Higgsfield al servidor (para las finanzas) + latido de las cuentas.
async function syncBalance() {
  // Cuenta 1 (login de siempre): EXACTAMENTE como antes → sync_balance { credits }.
  let legacy = null;
  try {
    const out = hf(['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 }, LEGACY_HF_ACCOUNT);
    const st = JSON.parse(out);
    const bal = st?.credits;
    if (typeof st?.email === 'string' && st.email) legacyEmail = st.email.toLowerCase();
    if (typeof bal === 'number') { await fn('sync_balance', { credits: bal }); console.log(`saldo real: ${bal} créd`); legacy = { credits: bal, email: st?.email || null }; }
  } catch (e) { /* noop */ }
  await reportAccounts(legacy);
}

// Latido: por cada login de cuenta en ~/.config/higgsfield/accounts/<id>/ → ¿anda?, saldo, email. Va TODA la lista
// (full:true) para que /conexion marque "sin login en la Mac" a las cuentas que no están. Nunca imprime emails ni tokens.
async function reportAccounts(legacy) {
  const report = [];
  if (legacy) report.push({ account_id: LEGACY_HF_ACCOUNT, ok: true, credits: legacy.credits, email: legacy.email });
  let ids = [];
  try { ids = readdirSync(HF_ACC_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && UUID_RE.test(d.name) && d.name.toLowerCase() !== LEGACY_HF_ACCOUNT).map((d) => d.name); } catch { ids = []; }
  for (const id of ids) {
    if (!existsSync(acctFiles(id).cred)) { report.push({ account_id: id, ok: false, error: `Sin login en la Mac. Corré: ${loginCmd(id)}` }); continue; }
    // La marca de "login equivocado" (badAccounts) NO se borra antes de chequear: solo se levanta con un chequeo OK que
    // confirme que NO es la cuenta de Julia (abajo). Un error de red deja todo como estaba: nunca abre el candado.
    const p = probe(id);
    if (!p.ok) {
      if (isAuthErr(p.err)) {
        const e = /no workspace selected/i.test(p.err) ? `No tiene workspace elegido. Corré: ${loginCmd(id)}` : `El login venció o no anda. Corré: ${loginCmd(id)}`;
        report.push({ account_id: id, ok: false, error: e });
      } else report.push({ account_id: id, transient: true }); // red caída: no cambia el estado guardado
      continue;
    }
    // Sin el email de la Cuenta 1 (o de esta) no se puede confirmar que no sea la de Julia → no se cambia nada.
    if (!legacyEmail || !p.email) { report.push({ account_id: id, transient: true }); continue; }
    const bad = wrongLoginReason(id, '', p.email);
    if (bad) { badAccounts.set(id, bad); report.push({ account_id: id, ok: false, error: bad, email: p.email }); console.log(`⚠ cuenta ${id.slice(0, 8)}…: ${bad}`); continue; }
    badAccounts.delete(id); // confirmado: login que anda y NO es la cuenta de Julia (ni su workspace)
    markVerified(id);
    const item = { account_id: id, ok: true, credits: p.credits, email: p.email };
    // Cada ~10 min: las Souls 2.0 de esa cuenta (para elegir la Soul de cada modelo en /conexion).
    if (Date.now() - (soulsAt.get(id) || 0) > 10 * 60 * 1000) {
      try {
        const list = JSON.parse(hf(['soul-id', 'list', '--soul-2', '--size', '100', '--json'], { encoding: 'utf8', timeout: 30000 }, id));
        if (Array.isArray(list)) { item.souls = list.map((s) => ({ id: s?.id, name: s?.name, status: s?.status })); soulsAt.set(id, Date.now()); }
      } catch { /* la próxima */ }
    }
    report.push(item);
  }
  try {
    const r = await fn('hf_accounts_report', { accounts: report, full: true });
    if (r?.ok && Array.isArray(r.accounts)) {
      const sig = report.map((x) => `${x.account_id}:${x.ok === true ? 'ok' : x.transient ? '?' : 'x'}`).join(',');
      if (sig !== reportAccounts.last) {
        reportAccounts.last = sig;
        const lab = new Map(r.accounts.map((a) => [a.id, a.label]));
        const line = report.map((x) => `${lab.get(x.account_id) || x.account_id.slice(0, 8)}: ${x.ok === true ? `lista${typeof x.credits === 'number' ? ` (${x.credits} créd)` : ''}` : x.transient ? 'sin red' : 'NO anda'}`).join(' · ');
        if (line) console.log(`cuentas Higgsfield → ${line}`);
      }
    }
  } catch { /* noop: servidor viejo o sin red */ }
}

// ── Buscador en segundo plano (proceso HIJO): pasos de scrape_step, uno detrás de otro ──
// Con el mismo secreto del worker (nunca se imprime). Si el servidor todavía no tiene las búsquedas en segundo plano
// (edge viejo o sin la migración) duerme 10 min y vuelve a probar: un edge viejo no se entera.
const SCRAPE_LOOP = process.argv.includes('--scrape-loop');
async function fnT(action, extra, signal) {
  const res = await fetch(FN, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    body: JSON.stringify({ action, worker_secret: SECRET, ...(extra || {}) }),
  });
  return res.json();
}
const stepLine = (j) => {
  if (!j) return 'scrape: (sin datos)';
  const who = j.handle ? `@${j.handle}` : j.kind === 'tema' ? String(j.query || '').split(',').filter(Boolean).map((t) => `#${t}`).join(' ') : 'reel';
  const w = j.want || {}, g = j.got || {};
  const parts = [];
  if (w.photos) parts.push(`fotos ${Math.max(0, (Number(g.photos) || 0) - (Number(g.ai_rejected) || 0))}/${w.photos}`);
  if (w.videos) parts.push(`videos ${Number(g.videos) || 0}/${w.videos}`);
  const st = ['ok', 'partial', 'empty', 'error', 'canceled'].includes(j.status) ? ` · ${j.status}` : '';
  return `scrape: ${who} ${parts.join(' ')}${st}`.slice(0, 160);
};
async function scrapeLoop() {
  console.log('[scrape-loop] arriba · búsquedas de Instagram en segundo plano');
  let backoff = 5000;
  for (;;) {
    let out;
    try { out = await fnT('scrape_step', {}, AbortSignal.timeout(145_000)); }
    catch (e) {
      console.log(`scrape: el servidor no respondió (${String(e?.name || 'error').slice(0, 40)}) — reintento en ${Math.round(backoff / 1000)} s`);
      await sleep(backoff); backoff = Math.min(120_000, backoff * 2); continue;
    }
    if (out?.needs_migration || /desconocida/i.test(String(out?.error || ''))) {
      console.log('scrape: el servidor todavía no tiene las búsquedas en segundo plano (falta desplegar el edge o la migración 0131) — reviso en 10 min');
      await sleep(600_000); continue;
    }
    if (!out?.ok) {
      console.log(`scrape: error — ${String(out?.error || 'sin detalle').replace(/\S+@\S+/g, '[email]').slice(0, 140)} (reintento en ${Math.round(backoff / 1000)} s)`);
      await sleep(backoff); backoff = Math.min(120_000, backoff * 2); continue;
    }
    backoff = 5000;
    if (out.stepped) console.log(stepLine(out.job));
    if (out.stepped || out.more_due) { await sleep(1000); continue; }
    await sleep(Math.max(3000, Math.min(60_000, Number(out.next_in_ms) || 30_000)));
  }
}
if (SCRAPE_LOOP) { await scrapeLoop(); process.exit(0); }

// Padre: lanza el buscador hijo y lo mantiene vivo (relanza a los 30 s si se cae; lo mata al salir).
let scrapeChild = null, stoppingChild = false;
function startScrapeChild() {
  if (stoppingChild) return;
  try {
    scrapeChild = spawn(process.execPath, [fileURLToPath(import.meta.url), '--scrape-loop'], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env });
    scrapeChild.on('exit', (code, signal) => {
      scrapeChild = null;
      if (stoppingChild) return;
      console.log(`[kitchen-worker] el buscador de Instagram se cerró (${code ?? signal}); lo relanzo en 30 s`);
      setTimeout(startScrapeChild, 30_000);
    });
  } catch (e) { console.log(`[kitchen-worker] no pude lanzar el buscador de Instagram: ${String(e?.message || e).slice(0, 100)}`); setTimeout(startScrapeChild, 30_000); }
}
const stopScrapeChild = () => { stoppingChild = true; try { scrapeChild?.kill('SIGTERM'); } catch { /* noop */ } };
process.on('exit', stopScrapeChild);
process.on('SIGINT', () => { stopScrapeChild(); process.exit(130); });
process.on('SIGTERM', () => { stopScrapeChild(); process.exit(143); });
startScrapeChild();

console.log(`[kitchen-worker] arriba · ${FN}`);
await syncBalance();
let idle = 0;
for (;;) {
  let res;
  // routing:1 = este cocinero sabe cocinar cada modelo en SU cuenta (el servidor solo le da jobs de otras cuentas a este).
  try { res = await fn('cook_next', { routing: 1 }); } catch (e) { console.log('err cook_next:', String(e.message || e).slice(0, 120)); await sleep(5000); continue; }
  if (!res?.ok) { console.log('no autorizado / error:', res?.error); await sleep(8000); continue; }
  if (!res.job) { if (idle % 12 === 0) { console.log('cola vacía, esperando…'); await syncBalance(); } idle++; await sleep(5000); continue; }
  idle = 0;
  console.log(`→ cocinando ${res.job.id}`);
  await cookOne(res.job);
  await syncBalance();
}
