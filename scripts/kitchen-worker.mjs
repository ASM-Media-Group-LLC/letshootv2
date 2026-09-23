#!/usr/bin/env node
// Auto-cocinero de /kitchen: drena la cola (generations status=queued) usando el CLI de Higgsfield.
// Habla con la edge function `higgsfield` (acciones cook_next / cook_result, protegidas por WORKER_SECRET).
// Corre en la Mac del dueño con el CLI de Higgsfield logueado + workspace seleccionado.
// Modo AUTO: le pasa la imagen de referencia a Soul 2.0 (image_references); Higgsfield escribe
// el prompt detallado solo (enhance) y genera con la soul real de la modelo. Sin ChatGPT, sin vos.
//
// Uso:  WORKER_SECRET=xxxx node scripts/kitchen-worker.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
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
};
if (!SB_URL || !SB_ANON || !SECRET) { console.error('Falta SB_URL / SB_ANON / WORKER_SECRET.'); process.exit(1); }
const FN = `${SB_URL}/functions/v1/higgsfield`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fn(action, extra) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    body: JSON.stringify({ action, worker_secret: SECRET, ...(extra || {}) }),
  });
  return res.json();
}

// Saldo real de Higgsfield en créditos (para medir el costo exacto por diferencia).
function getBalance() {
  try { const out = execFileSync('higgsfield', ['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 }); const b = JSON.parse(out)?.credits; return typeof b === 'number' ? b : null; } catch { return null; }
}

async function cookOne(job) {
  const dir = join(tmpdir(), 'kitchen-worker'); mkdirSync(dir, { recursive: true });

  let args;
  if (job.nano_edit && job.image_ref) {
    // VARIACIÓN por EDICIÓN (Nano Banana Pro): baja la réplica y la edita → misma mujer/outfit/lugar/luz, pose y ángulo distintos. No necesita soul.
    // El prompt BLOQUEA la identidad (cara + cuerpo de la persona de la foto): sin esto, Nano regenera a otra mujer al cambiar el encuadre.
    const pose = String(job.note || job.pose || '').replace(/^var:/, '').trim();
    const look = LOOKS[job.creator_id];
    const hairLock = look ? ` Her hair is ${look} — keep EXACTLY this hair colour, do not lighten or darken it.` : ' Keep her hair the EXACT same colour as in the photo (do not lighten it to blonde or darken it to black).';
    const editPrompt = `This is a real photo of ONE specific woman. KEEP HER EXACTLY THE SAME PERSON: identical face, same facial features, same eye colour and shape, same eyebrows, same nose and lips, same skin tone, same hairstyle, and the same body shape and proportions.${hairLock} She must be unmistakably the SAME woman as in the photo — do not restyle her, do not change her identity, do not swap her face, do not beautify, slim or plump her. Keep the SAME exact outfit, the SAME location and background, and the SAME lighting. This is the same photoshoot on the same day. ONLY change her body POSE and the CAMERA ANGLE so it looks like a different frame from the same phone session: now she is ${pose || 'in a clearly different natural pose than the original'}. Make it a REAL candid amateur phone photo — natural skin texture and real lighting, never glossy, plastic or AI-looking; keep her full natural body with correct anatomy and correct hands.`;
    const ext = (String(job.image_ref).split('?')[0].split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const srcPath = join(dir, `${job.id}-src.${ext}`);
    try {
      const r = await fetch(job.image_ref);
      writeFileSync(srcPath, Buffer.from(await r.arrayBuffer()));
    } catch (e) { await fn('cook_result', { generation_id: job.id, ok: false, note: 'No se pudo bajar la foto a editar.' }); console.log(`· ${job.id} no se pudo bajar la src`); return; }
    args = ['generate', 'create', 'nano_banana_pro', '--image-references', srcPath, '--prompt', editPrompt, '--aspect_ratio', '3:4', '--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json'];
  } else if (!job.character_id) {
    await fn('cook_result', { generation_id: job.id, ok: false, note: 'La modelo no tiene su soul enlazada todavía.' }); console.log(`· ${job.id} sin soul enlazada → skip`); return;
  } else if (job.prompt) {
    // RÉPLICA (visión): la edge escribió el prompt de la pose/outfit/escena (Anthropic) + soul. Sin image_references (perdería la pose).
    // Anclamos el pelo de la modelo para que su cara NO se despinte según la viral (rubia/negra) — su pelo es el fijo (castaño).
    const look = LOOKS[job.creator_id];
    const rprompt = look ? `${job.prompt} IMPORTANT: the woman has ${look} — this exact hair, regardless of the reference.` : job.prompt;
    args = ['generate', 'create', MODEL, '--custom_reference_id', job.character_id, '--prompt', rprompt, '--aspect_ratio', '3:4', '--quality', '2k', '--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json'];
    if (job.style_id) args.push('--style_id', job.style_id);
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

  const balBefore = getBalance();
  let rec;
  try {
    const stdout = execFileSync('higgsfield', args, { encoding: 'utf8', timeout: 6 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
    const out = JSON.parse(stdout); rec = Array.isArray(out) ? out[0] : out;
  } catch (e) {
    // Uso el stderr real del CLI (no e.message, que incluye los args con "--wait-timeout" y da falsos "timeout").
    const msg = String(e.stderr || e.stdout || e.message || e).replace(/\s+/g, ' ').trim();
    const note = /nsfw/i.test(msg) ? 'NSFW — la referencia es muy explícita para el motor.'
      : /timed?\s?out|deadline|wait.?timeout exceeded/i.test(msg) ? 'Tardó demasiado. Probá de nuevo.'
      : `Error del motor: ${msg.slice(0, 160) || 'desconocido'}`;
    await fn('cook_result', { generation_id: job.id, ok: false, note });
    console.log(`✗ ${job.id} falló: ${note}`);
    return;
  }
  const resultUrl = rec?.result_url || rec?.min_result_url || null;
  const prompt = (rec?.params?.prompt || '').slice(0, 800);
  // Costo REAL por diferencia de saldo (sirve para cualquier motor). Fallback al costo Soul si no se pudo medir.
  const balAfter = getBalance();
  let credits = CREDITS;
  if (typeof balBefore === 'number' && typeof balAfter === 'number' && balBefore > balAfter) credits = Math.round((balBefore - balAfter) * 1000) / 1000;
  const usd = Math.round(credits * 0.09 * 1000) / 1000;
  await fn('cook_result', { generation_id: job.id, ok: !!resultUrl, result_url: resultUrl, credits, usd, prompt });
  if (typeof balAfter === 'number') await fn('sync_balance', { credits: balAfter });
  console.log(resultUrl ? `✓ ${job.id} (${credits} créd) → ${resultUrl.slice(0, 60)}…` : `✗ ${job.id} sin resultado`);
}

// Sincroniza el saldo REAL de Higgsfield al servidor (para las finanzas).
async function syncBalance() {
  try {
    const out = execFileSync('higgsfield', ['account', 'status', '--json'], { encoding: 'utf8', timeout: 20000 });
    const bal = JSON.parse(out)?.credits;
    if (typeof bal === 'number') { await fn('sync_balance', { credits: bal }); console.log(`saldo real: ${bal} créd`); }
  } catch (e) { /* noop */ }
}

console.log(`[kitchen-worker] arriba · ${FN}`);
await syncBalance();
let idle = 0;
for (;;) {
  let res;
  try { res = await fn('cook_next'); } catch (e) { console.log('err cook_next:', String(e.message || e).slice(0, 120)); await sleep(5000); continue; }
  if (!res?.ok) { console.log('no autorizado / error:', res?.error); await sleep(8000); continue; }
  if (!res.job) { if (idle % 12 === 0) { console.log('cola vacía, esperando…'); await syncBalance(); } idle++; await sleep(5000); continue; }
  idle = 0;
  console.log(`→ cocinando ${res.job.id}`);
  await cookOne(res.job);
  await syncBalance();
}
