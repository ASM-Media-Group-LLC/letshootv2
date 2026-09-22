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

function envFromFile(path) {
  const out = {};
  try { for (const line of readFileSync(path, 'utf8').split('\n')) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim(); } } catch { /* noop */ }
  return out;
}
const fe = envFromFile(new URL('../.env.local', import.meta.url).pathname);
const we = envFromFile(new URL('./.worker.env', import.meta.url).pathname); // secreto local (gitignored)
const SB_URL = process.env.SB_URL || fe.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = process.env.SB_ANON || fe.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.WORKER_SECRET || we.WORKER_SECRET;
const MODEL = 'text2image_soul_v2';
const CREDITS = 0.12, USD = 0.011;
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

async function cookOne(job) {
  if (!job.character_id) { await fn('cook_result', { generation_id: job.id, ok: false }); console.log(`· ${job.id} sin soul enlazada → skip`); return; }
  const dir = join(tmpdir(), 'kitchen-worker'); mkdirSync(dir, { recursive: true });
  const ext = (String(job.reference_url).split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const refPath = join(dir, `${job.id}.${ext}`);
  try {
    const r = await fetch(job.reference_url);
    writeFileSync(refPath, Buffer.from(await r.arrayBuffer()));
  } catch (e) { await fn('cook_result', { generation_id: job.id, ok: false }); console.log(`· ${job.id} no se pudo bajar la ref`); return; }

  let rec;
  try {
    const stdout = execFileSync('higgsfield', [
      'generate', 'create', MODEL,
      '--custom_reference_id', job.character_id,
      '--image-references', refPath,
      '--prompt', 'recreate this photo faithfully — same pose, body position, outfit, setting, framing and lighting; realistic, high detail',
      '--aspect_ratio', '3:4', '--quality', '2k',
      '--wait', '--wait-timeout', '5m', '--wait-interval', '5s', '--json',
    ], { encoding: 'utf8', timeout: 6 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
    const out = JSON.parse(stdout); rec = Array.isArray(out) ? out[0] : out;
  } catch (e) {
    await fn('cook_result', { generation_id: job.id, ok: false });
    console.log(`✗ ${job.id} falló el CLI: ${String(e.message || e).slice(0, 160)}`);
    return;
  }
  const resultUrl = rec?.result_url || rec?.min_result_url || null;
  const prompt = (rec?.params?.prompt || '').slice(0, 800);
  await fn('cook_result', { generation_id: job.id, ok: !!resultUrl, result_url: resultUrl, credits: CREDITS, usd: USD, prompt });
  console.log(resultUrl ? `✓ ${job.id} → ${resultUrl.slice(0, 70)}…` : `✗ ${job.id} sin resultado`);
}

console.log(`[kitchen-worker] arriba · ${FN}`);
let idle = 0;
for (;;) {
  let res;
  try { res = await fn('cook_next'); } catch (e) { console.log('err cook_next:', String(e.message || e).slice(0, 120)); await sleep(5000); continue; }
  if (!res?.ok) { console.log('no autorizado / error:', res?.error); await sleep(8000); continue; }
  if (!res.job) { if (idle++ % 12 === 0) console.log('cola vacía, esperando…'); await sleep(5000); continue; }
  idle = 0;
  console.log(`→ cocinando ${res.job.id}`);
  await cookOne(res.job);
}
