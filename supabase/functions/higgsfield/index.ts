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

// Corre el scraper de Apify (Instagram por hashtag) y guarda en creator_vault. Reusado por acción staff y worker.
async function runScrape(svc: any, creatorId: string, limit: number, override?: string[]) {
  if (!creatorId) return { ok: false, error: 'Falta la modelo.' };
  const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
  const apToken = clean((tk as any)?.value);
  if (!apToken) return { ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' };
  let tags: string[] = Array.isArray(override) && override.length ? override : [];
  if (!tags.length) {
    const { data: sp } = await svc.from('creator_search_profile').select('niches, hashtags').eq('creator_id', creatorId).maybeSingle();
    tags = [...(((sp as any)?.hashtags) || []), ...(((sp as any)?.niches) || [])];
  }
  tags = tags.map((h: string) => String(h).trim().replace(/^#/, '')).filter(Boolean).slice(0, 5);
  if (!tags.length) return { ok: false, error: 'Configurá al menos un nicho o hashtag para esta modelo.' };
  const runUrl = `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apToken)}`;
  let items: any = [];
  try {
    const ar = await fetch(runUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashtags: tags, resultsLimit: limit }) });
    items = await ar.json();
    if (!ar.ok) return { ok: false, error: `Apify devolvió ${ar.status}.`, detail: items };
  } catch (e) { return { ok: false, error: `No se pudo llamar al scraper: ${(e as Error)?.message}` }; }
  if (!Array.isArray(items)) return { ok: false, error: 'El scraper no devolvió una lista.', detail: items };
  let saved = 0;
  for (const it of items) {
    const imgUrl = it?.displayUrl || it?.imageUrl || (Array.isArray(it?.images) ? it.images[0] : null);
    if (!imgUrl) continue;
    const row: Record<string, unknown> = {
      creator_id: creatorId, kind: 'ref', url: imgUrl, source_platform: 'instagram',
      source_handle: it?.ownerUsername || null, source_url: it?.url || null,
      likes: Number(it?.likesCount) || null, views: Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null,
      vibe: tags[0] || null, caption: it?.caption ? String(it.caption).slice(0, 200) : null,
    };
    // ignoreDuplicates: si ya existe (aunque esté descartada), NO la pisa — tus descartes se respetan.
    const { error } = await svc.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true });
    if (!error) saved += 1;
  }
  // Filtro IA (visión): revisa las que están sin revisar y marca basura. Solo si hay llave de Anthropic.
  const reviewed = await aiReview(svc, creatorId);
  return { ok: true, found: items.length, saved, tags, reviewed };
}

// Trae los POSTS de las CUENTAS GUÍA (creadoras de referencia) de la modelo, vía Apify instagram-scraper.
// Es lo que el dueño pidió: apuntar a cuentas modelo y bajar exactamente lo que ellas postean.
async function runScrapeAccounts(svc: any, creatorId: string, limit: number, override?: string[]) {
  if (!creatorId) return { ok: false, error: 'Falta la modelo.' };
  const { data: tk } = await svc.from('app_config').select('value').eq('key', 'apify_token').maybeSingle();
  const apToken = clean((tk as any)?.value);
  if (!apToken) return { ok: false, error: 'Falta la llave de Apify. Pegala en /conexion.' };
  let accts: string[] = Array.isArray(override) && override.length ? override : [];
  if (!accts.length) {
    const { data: sp } = await svc.from('creator_search_profile').select('seed_accounts').eq('creator_id', creatorId).maybeSingle();
    accts = Array.isArray((sp as any)?.seed_accounts) ? (sp as any).seed_accounts : [];
  }
  accts = accts.map((a: string) => String(a).trim().replace(/^@/, '').replace(/\/+$/, '').split('/').pop() || '').filter(Boolean).slice(0, 8);
  if (!accts.length) return { ok: false, error: 'Agregá al menos una cuenta guía (ej: @creadora).' };
  const runUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apToken)}`;
  const directUrls = accts.map((u) => `https://www.instagram.com/${u}/`);
  let items: any = [];
  try {
    const ar = await fetch(runUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ directUrls, resultsType: 'posts', resultsLimit: limit, addParentData: false }) });
    items = await ar.json();
    if (!ar.ok) return { ok: false, error: `Apify devolvió ${ar.status}.`, detail: items };
  } catch (e) { return { ok: false, error: `No se pudo llamar al scraper: ${(e as Error)?.message}` }; }
  if (!Array.isArray(items)) return { ok: false, error: 'El scraper no devolvió una lista.', detail: items };
  let saved = 0;
  for (const it of items) {
    const imgUrl = it?.displayUrl || it?.imageUrl || (Array.isArray(it?.images) ? it.images[0] : null);
    if (!imgUrl) continue;
    const row: Record<string, unknown> = {
      creator_id: creatorId, kind: 'ref', url: imgUrl, source_platform: 'instagram',
      source_handle: it?.ownerUsername || null, source_url: it?.url || null,
      likes: Number(it?.likesCount) || null, views: Number(it?.videoViewCount || it?.videoPlayCount || it?.viewsCount) || null,
      vibe: null, caption: it?.caption ? String(it.caption).slice(0, 200) : null,
    };
    const { error } = await svc.from('creator_vault').upsert(row, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true });
    if (!error) saved += 1;
  }
  const reviewed = await aiReview(svc, creatorId);
  return { ok: true, found: items.length, saved, accounts: accts, reviewed };
}

// Revisa con visión (Anthropic) las scrapeadas sin revisar de una modelo: ¿sirve como referencia de creadora o es basura?
async function aiReview(svc: any, creatorId: string, limit = 20) {
  const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
  const key = clean((ak as any)?.value);
  if (!key) return 0;
  const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', creatorId).maybeSingle();
  const style = String((sp as any)?.style_desc || '').slice(0, 200);
  const { data: rows } = await svc.from('creator_vault').select('id, url')
    .eq('creator_id', creatorId).eq('kind', 'ref').eq('source_platform', 'instagram').is('ai_ok', null)
    .order('created_at', { ascending: false }).limit(limit);
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  let n = 0;
  await Promise.all(rows.map(async (r: any) => {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 120,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'url', url: r.url } },
            { type: 'text', text: `¿Sirve esta foto como referencia para recrear con una creadora de contenido mujer (UNA sola mujer, estilo influencer${style ? `; estilo buscado: ${style}` : ''})? Descartá: productos, ropa sola, hombres, paisajes, memes, collages, texto. Respondé SOLO JSON: {"ok":true|false,"reason":"motivo corto en español"}` },
          ] }],
        }),
      });
      const j = await res.json();
      const txt = (j as any)?.content?.[0]?.text || '';
      const m = txt.match(/\{[\s\S]*\}/);
      const v = m ? JSON.parse(m[0]) : null;
      if (v && typeof v.ok === 'boolean') {
        await svc.from('creator_vault').update({ ai_ok: v.ok, ai_reason: String(v.reason || '').slice(0, 140) }).eq('id', r.id);
        n += 1;
      }
    } catch { /* noop */ }
  }));
  return n;
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
    if (action === 'cook_next' || action === 'cook_result' || action === 'sync_balance' || action === 'scrape_run') {
      const { data: sc } = await svc.from('app_config').select('value').eq('key', 'kitchen_worker_secret').maybeSingle();
      const secret = clean((body as any)?.worker_secret);
      if (!secret || !(sc as any)?.value || secret !== clean((sc as any).value)) return reply({ ok: false, error: 'Worker no autorizado.' });
      if (action === 'scrape_run') {
        const r = await runScrape(svc, String((body as any)?.creator_id || ''), Math.min(Number((body as any)?.limit) || 24, 50), (body as any)?.niches);
        return reply(r);
      }
      if (action === 'sync_balance') {
        const bal = Number((body as any)?.credits);
        if (!isNaN(bal)) await svc.from('app_config').upsert({ key: 'higgsfield_balance', value: String(bal), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        return reply({ ok: true });
      }
      if (action === 'cook_next') {
        const { data: job } = await svc.from('generations').select('id, creator_id, reference_url, note').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (!job) return reply({ ok: true, job: null });
        const { data: idrow } = await svc.from('creator_identity').select('character_id, engine').eq('creator_id', (job as any).creator_id).maybeSingle();
        await svc.from('generations').update({ status: 'in_progress' }).eq('id', (job as any).id);
        const note = String((job as any)?.note || '');
        const isVar = note.startsWith('var:') || note.startsWith('varx:');
        // VARIACIÓN de carrusel — SIEMPRE con Soul 2.0 (único motor que mantiene la identidad real de la modelo).
        // Dos modos que elige el dueño: 'describe' (var:) = poses distintas: la IA describe outfit/lugar/luz + pose nueva
        // y Soul 2.0 genera SIN image-ref (cara garantizada + pose libre). 'copy' (varx:) = outfit/lugar idénticos vía
        // image-ref, pero copia la pose de la réplica.
        if (isVar && (job as any).reference_url) {
          const copyMode = note.startsWith('varx:');
          const pose = note.replace(/^varx?:/, '').trim();
          const charId = (idrow as any)?.character_id || null;
          if (copyMode) {
            const cp = `The SAME woman. Keep EXACTLY this photo: the same body pose, the same exact outfit, the same location and background, and the same lighting and framing. Do not change the composition or the garment. Photorealistic natural candid amateur phone photo, real skin texture, full natural body, correct hands.`;
            return reply({ ok: true, job: { ...(job as any), character_id: charId, soul_copy: true, image_ref: (job as any).reference_url, prompt: cp } });
          }
          let vprompt: string | null = null, vstyle: string | null = null;
          const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
          const akey = clean((ak as any)?.value);
          if (akey) {
            const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', (job as any).creator_id).maybeSingle();
            vprompt = await variationPrompt(akey, (job as any).reference_url, String((sp as any)?.style_desc || ''), pose);
            if (vprompt) vstyle = REALISTIC_STYLE;
          }
          return reply({ ok: true, job: { ...(job as any), character_id: charId, prompt: vprompt, style_id: vstyle } });
        }
        // RÉPLICA (foto 1): prompt de visión (Anthropic) que clava la pose exacta de la viral + soul real. Sin image_references (perdería la pose).
        let vprompt: string | null = null, vstyle: string | null = null;
        const { data: ak } = await svc.from('app_config').select('value').eq('key', 'anthropic_api_key').maybeSingle();
        const akey = clean((ak as any)?.value);
        if (akey && (job as any).reference_url) {
          const { data: sp } = await svc.from('creator_search_profile').select('style_desc').eq('creator_id', (job as any).creator_id).maybeSingle();
          vprompt = await visionPrompt(akey, (job as any).reference_url, String((sp as any)?.style_desc || ''));
          if (vprompt) vstyle = REALISTIC_STYLE;
        }
        return reply({ ok: true, job: { ...(job as any), character_id: (idrow as any)?.character_id || null, prompt: vprompt, style_id: vstyle } });
      }
      const gid = String((body as any)?.generation_id || '');
      const rurl = (body as any)?.result_url || null;
      const good = (body as any)?.ok !== false && !!rurl;
      const { data: grow } = await svc.from('generations').select('creator_id, created_by, auto_carousel, carousel_of').eq('id', gid).maybeSingle();
      await svc.from('generations').update({ status: good ? 'done' : 'failed', result_url: rurl, credits: Number((body as any)?.credits) || null, usd: Number((body as any)?.usd) || null, prompt: (body as any)?.prompt || null, note: (body as any)?.note || null, engine_label: (body as any)?.engine || null }).eq('id', gid);
      // Auto-carrusel: si la réplica salió bien y venía marcada, encola sus variaciones (misma escena, otras poses).
      if (good && rurl && grow && Number((grow as any).auto_carousel) > 0 && !(grow as any).carousel_of) {
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
      const src = (g as any).result_url || (g as any).reference_url;
      if (!src) return reply({ ok: false, error: 'Esa foto no tiene imagen para variar.' });
      const method = String((body as any)?.method || 'describe');
      const prefix = method === 'copy' ? 'varx:' : 'var:';
      const rows = ideas.map((idea) => ({ creator_id: (g as any).creator_id, reference_url: src, status: 'queued', model: 'soul-v2', note: `${prefix}${idea}`, carousel_of: gid, created_by: user.id }));
      const { error } = await svc.from('generations').insert(rows);
      if (error) return reply({ ok: false, error: `No se pudo encolar: ${error.message}` });
      return reply({ ok: true, queued: rows.length });
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
        // Entrega LIMPIA: le saca la metadata (C2PA/EXIF/XMP) y la re-hospeda antes de mandarla al baúl.
        const cleanUrl = await cleanAndStore(svc, (g as any).creator_id, gid, (g as any).result_url);
        await svc.from('creator_vault').insert({ creator_id: (g as any).creator_id, kind: 'ia', url: cleanUrl, caption: 'Generada en /kitchen' });
        await svc.from('generations').update({ result_url: cleanUrl }).eq('id', gid);
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
      const r = await runScrape(svc, String(body?.creator_id || ''), Math.min(Number(body?.limit) || 24, 50), (body as any)?.niches);
      return reply(r);
    }
    // Traer los posts de las CUENTAS GUÍA (creadoras de referencia) de la modelo.
    if (action === 'scrape_accounts') {
      const r = await runScrapeAccounts(svc, String(body?.creator_id || ''), Math.min(Number(body?.limit) || 30, 60), (body as any)?.accounts);
      return reply(r);
    }

    return reply({ ok: false, error: `Acción desconocida: ${action || '(vacía)'}` });
  } catch (e) {
    return reply({ ok: false, error: (e as Error)?.message || 'Error inesperado.' }, 200);
  }
});
