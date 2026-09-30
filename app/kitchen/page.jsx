'use client';

// /kitchen — "La cocina" (dashboard high-level, CENTRADO EN LA MODELO).
// Flujo lineal: 1) Elegí la modelo (fácil, con buscador) → 2) su cocina: elegís virales
// (Cocinar = biblioteca de guías COMPARTIDA · Buscar en IG aparte) → cola → 3) sus Resultados
// (Antes/Después → Aprobar → baúl IA). El gasto se ve POR MODELO en su cabecera.
// Motor real = Soul 2.0 de la cuenta Higgsfield (soul entrenada), vía CLI oficial.
// /kitchen encola (generations queued); el "worker" (CLI logueado) las cocina.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, Sparkles, IdCard, Coins, RefreshCw,
  Heart, Trash2, Flame, Images, ArrowRight, AlertTriangle, X, Search,
  FolderHeart, Compass, Upload, Check, ChefHat as Pot, LayoutGrid, Plus, Clock, ChevronDown, Star, Play, Download, Info,
  AudioLines, Wand2, Mic, Pencil,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  // El navegador dejó de esperar (504 del servidor o se cortó la conexión): la función puede seguir trabajando allá.
  const st = Number(error?.context?.status) || 0;
  if (error && (st === 504 || st === 546 || error?.name === 'FunctionsFetchError' || /timeout|timed out/i.test(String(error?.message || '')))) out = { ...(out || {}), ok: false, timeout: true };
  return out || {};
}
// Motor de VOZ (ElevenLabs): misma forma que callFn, contra la edge function `voice`.
async function callVoice(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('voice', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}

const VIBES = ['Todos', 'Casual', 'Sensual', 'Editorial', 'Playa', 'Fitness', 'Fiesta'];
// Voz: etiquetas (con su dot de color) e idiomas de los audios — mismos que el mock /preview/voz-admin.
const VOICE_TYPES = [
  { id: 'bienvenida',    label: 'Bienvenida',    dot: 'bg-brand' },
  { id: 'ppv',           label: 'PPV',           dot: 'bg-emerald-400' },
  { id: 'coqueto',       label: 'Coqueto',       dot: 'bg-amber-400' },
  { id: 'explicito',     label: 'Explícito',     dot: 'bg-rose-500' },
  { id: 'personalizado', label: 'Personalizado', dot: 'bg-paper-mute' },
];
const VOICE_LANGS = [
  { id: 'es', flag: '🇪🇸', label: 'ES' }, { id: 'en', flag: '🇺🇸', label: 'EN' }, { id: 'pt', flag: '🇧🇷', label: 'PT' },
  { id: 'fr', flag: '🇫🇷', label: 'FR' }, { id: 'de', flag: '🇩🇪', label: 'DE' }, { id: 'it', flag: '🇮🇹', label: 'IT' },
];
const VOICE_TYPE_MAP = Object.fromEntries(VOICE_TYPES.map((t) => [t.id, t]));
const VOICE_MAX_CHARS = 5000;
const voiceType = (g) => VOICE_TYPE_MAP[g?.params?.type] || VOICE_TYPE_MAP.personalizado;
const voiceLang = (g) => VOICE_LANGS.find((l) => l.id === g?.params?.lang) || { id: g?.params?.lang || '', flag: '🌐', label: String(g?.params?.lang || '—').toUpperCase() };
// Tipo de una generación: audio (ElevenLabs) · video (Genjutsu) · foto (media_type 'image' o vacío, las viejas).
const isAudioGen = (g) => g?.media_type === 'audio';
const isPhotoGen = (g) => !g?.media_type || g.media_type === 'image';
const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// La misma foto de IG llega con URL firmada distinta cada scrape → se duplica.
// Dedup por su ID de media estable (del path .../<a>_<mediaid>_<b>_n) o ig_cache_key.
const mediaKey = (r) => {
  const u = r?.url || '';
  let m = u.match(/\/\d+_(\d{6,})_\d+_n/);
  if (m) return 'm:' + m[1];
  m = u.match(/[?&]ig_cache_key=([^&%.]+)/);
  if (m) return 'c:' + m[1];
  return 'u:' + u.split('?')[0];
};
// Con el TIPO: el motor guarda a propósito la foto Y el video del mismo post (son dos cosas distintas) → no se funden.
const mediaKeyT = (r) => (r?.media_type === 'video' ? 'v|' : 'p|') + mediaKey(r);
const dedupeByMedia = (rows) => {
  const seen = new Set(); const out = [];
  for (const r of rows) { const k = mediaKeyT(r); if (seen.has(k)) continue; seen.add(k); out.push(r); }
  return out;
};
// Momentos de la vida real para el carrusel "Sorpréndeme": actividad + expresión + ENCUADRE + prop DISTINTOS en cada foto. Se barajan.
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
const shuffle = (arr) => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Valor aprox del crédito Higgsfield (Soul 2.0 ≈ 0.12 créd ≈ US$0.011/foto). Ajustable.
const USD_PER_CREDIT = 0.09;
const money = (credits) => `US$${(Number(credits || 0) * USD_PER_CREDIT).toFixed(2)}`;
// Un video Genjutsu cuesta ~7 créd/seg (8s ≈ 56). Abajo de esto avisamos y NO dejamos cocinar video (evita el fallo `not_enough_credits`).
const VIDEO_MIN_CREDITS = 50;
// Cuentas de Higgsfield: cada modelo cocina (y gasta) en SU cuenta. Julia queda fija en la Cuenta 1 (el login de siempre).
const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933';
const usd = (n) => `US$${(Number(n) || 0).toFixed(2)}`;
// Montos chicos del scraper (centavos): con 3 decimales para que no aparezca "US$0.00" cuando sí hubo gasto.
const usdS = (n) => { const x = Number(n) || 0; return x > 0 && x < 0.1 ? `US$${x.toFixed(3)}` : usd(x); };

// ── NÚMEROS DEL SCRAPER DE INSTAGRAM: UNA sola definición para TODAS las vistas ──
// (cabecera de «Buscar en IG», página «Cuentas guía» de una modelo y de «Todas las modelos», tarjetas y ficha de cada cuenta).
// Fotos/videos — fuente: creator_vault kind='ref' con origen de IG (source_handle/source_platform), TODAS las filas
// (también las que la IA sacó), sin repetidas (la misma foto de IG llega con otra URL → se cuenta una vez, ver mediaKey):
//   · bajadas      = todo lo que el scraper guardó (fotos + videos), aunque después se haya sacado.
//   · en la mesa   = bajadas que siguen usables: ni la IA la sacó (ai_ok=false) ni se descartó a mano (interest='descartada').
//   · la IA sacó   = ai_ok=false.   · descartadas = sacadas a mano (y la IA no las había sacado).
//   · cuentas guía = creator_search_profile.seed_accounts (las activas del panel). «Todas» = suma de todas las modelos.
//   · fuera de las cuentas guía = bajadas cuyo @ no es una cuenta guía (temas/hashtags, reels por link, cuentas quitadas).
// Gasto — fuente: scrape_runs (una fila por búsqueda), partido en Fotos (Apify) · Videos (Apify) · Filtro IA:
//   · real (Apify) = lo que Apify cobró por ESA corrida (usageTotalUsd leído por su run id → cost_breakdown.*.usd).
//   · estimado     = corrida sin costo verificado (las de antes de la migración 0131, o Apify no respondió):
//                    resultados que trajo Apify × US$2.30/1000. El cost_real viejo NO se usa (salía de "la última corrida").
//                    Si la corrida arrancó y no se llegó a leer nada → «falta el costo real» (nunca US$0 «real»).
//   · videos       = las búsquedas viejas de cuentas guía corrían el actor de reels sin registrarlo → «sin dato».
//   · filtro IA    = tokens reales de Anthropic × precio público de Haiku 4.5. Las corridas viejas no lo tienen (sin dato).
//                    Cada búsqueda paga SOLO la revisión de sus fotos; las pendientes de antes van en su propio renglón.
//   · una búsqueda por TEMA trae fotos y videos juntos: su costo va a «Fotos».
//   · lo bajado antes del 28 sep no tiene corrida registrada → no suma gasto (sí aparece en la factura de Apify del mes).
const SCRAPER_USD_PER_RESULT = 0.0023;
const normH = (h) => String(h || '').trim().replace(/^@/, '').toLowerCase();
const EMPTY_STAT = Object.freeze({ bajadas: 0, fotos: 0, videos: 0, enMesa: 0, mesaFotos: 0, mesaVideos: 0, iaSaco: 0, descartadas: 0, lastAt: 0, days: {} });
const newStat = () => ({ bajadas: 0, fotos: 0, videos: 0, enMesa: 0, mesaFotos: 0, mesaVideos: 0, iaSaco: 0, descartadas: 0, lastAt: 0, days: {} });
// Estado de una foto con copias repetidas: si CUALQUIER copia se descartó a mano → descartada (manda lo que hizo el
// dueño); si no, alcanza con UNA copia usable → en la mesa; si todas las sacó la IA → la IA sacó.
const STATE_RANK = { descartada: 3, mesa: 2, ia: 1 };
const rowState = (r) => (r.ai_ok === false ? 'ia' : r.interest === 'descartada' ? 'descartada' : 'mesa');
// Lo que está EN LA MESA, sin repetidas por (modelo, foto) y con la misma regla de estado que los números → las grillas,
// las miniaturas y «en la mesa» cuentan lo mismo. Devuelve una copia usable por foto (la primera, en el orden recibido).
const mesaMedia = (rows) => {
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.creator_id}|${mediaKeyT(r)}`; const st = rowState(r);
    const g = groups.get(k);
    if (!g) { groups.set(k, { st, rep: st === 'mesa' ? r : null }); continue; }
    if (STATE_RANK[st] > STATE_RANK[g.st]) g.st = st;
    if (!g.rep && st === 'mesa') g.rep = r;
  }
  const out = []; groups.forEach((g) => { if (g.st === 'mesa' && g.rep) out.push(g.rep); });
  return out;
};
const addMedia = (s, m) => {
  s.bajadas += 1; if (m.video) s.videos += 1; else s.fotos += 1;
  if (m.st === 'mesa') { s.enMesa += 1; if (m.video) s.mesaVideos += 1; else s.mesaFotos += 1; } else if (m.st === 'ia') s.iaSaco += 1; else s.descartadas += 1;
  if (m.tLast > s.lastAt) s.lastAt = m.tLast;
  if (m.day) s.days[m.day] = (s.days[m.day] || 0) + 1;
};
// Costo de UNA corrida (scrape_runs), partido. Cada parte de Apify (fotos / videos) es:
//   · real → Apify dio el costo de ESA corrida (usd leído por su run id).
//   · est  → sin costo verificado: corrida vieja, o la corrida arrancó y su costo todavía no se leyó (se muestra el
//            estimado; si ni eso hay, «falta el costo real» — NUNCA un US$0 «real»).
// La etiqueta sale de CUÁNTAS partes son reales o no (no de los montos). Videos: las corridas viejas de cuentas guía
// también corrían el actor de reels y no lo registraban → «sin dato», no US$0.
const runCostOf = (r) => {
  const b = r && r.cost_breakdown && typeof r.cost_breakdown === 'object' ? r.cost_breakdown : null;
  const part = (p) => {
    if (!p) return { usd: 0, real: 0, est: 0, n: 0, r: 0 };
    const u = p.usd != null && Number.isFinite(Number(p.usd)) ? Number(p.usd) : null;
    const e = Number(p.est) || 0;
    return u != null ? { usd: u, real: u, est: 0, n: 1, r: 1 } : { usd: e, real: 0, est: e, n: 1, r: 0 };
  };
  const est0 = Number(r?.cost_est) || 0;
  const noApify = r?.kind === 'ia_pendientes'; // pasada aparte del filtro IA: no usa Apify
  const ph = noApify ? part(null) : b ? part(b.photos) : { usd: est0, real: 0, est: est0, n: 1, r: 0 }; // corrida vieja: solo el estimado (aunque sea 0)
  const vi = noApify ? part(null) : b ? part(b.videos) : { usd: 0, real: 0, est: 0, n: 0, r: 0 };
  const aiKnown = !!(b && b.ai && b.ai.usd != null);
  const ai = aiKnown ? Number(b.ai.usd) || 0 : 0;
  // ¿Se sabe cuánto costaron los videos? Tema/reel por link: sí (van en su parte). Cuenta guía: solo si la corrida es
  // nueva, o si al completarla se encontró su corrida de reels (o se comprobó que no hubo).
  const videosKnown = r?.kind !== 'account' || !!(b && (b.videos || !b.backfill || b.videos_checked));
  const status = String(r?.status || '');
  const t = r?.run_at ? Date.parse(r.run_at) || 0 : 0;
  // Búsqueda en segundo plano (requested ≠ null): en curso = en cola / corriendo y con un paso hace < 3 min; si no, en
  // pausa (nadie la está manejando: sigue cuando se abre la cocina o se prende el cocinero). Nunca «se cortó».
  const isJob = !!(r && r.requested);
  const jobAct = isJob && (status === 'queued' || status === 'running');
  const jobStale = jobAct && Date.now() - (Date.parse(r.updated_at || r.created_at || r.run_at) || 0) > 3 * 60 * 1000;
  const running = isJob ? jobAct && !jobStale : status === 'running' && Date.now() - t < 10 * 60 * 1000;
  const paused = jobStale;
  const cut = isJob ? false : status === 'running' && !running;
  return {
    fotos: ph.usd, videos: vi.usd, ai, real: ph.real + vi.real, est: ph.est + vi.est,
    realParts: ph.r + vi.r, estParts: (ph.n - ph.r) + (vi.n - vi.r), vidPend: vi.n - vi.r,
    found: Number(r?.found) || 0, saved: Number(r?.saved) || 0, savedVideos: Number(r?.videos) || 0,
    aiKnown, videosKnown, search: r?.kind !== 'ia_pendientes', running, paused, cut,
  };
};
// ── BÚSQUEDAS EN SEGUNDO PLANO (motor nuevo: scrape_start / scrape_step / scrape_jobs) ──
// Cada búsqueda es una fila del servidor que avanza sola de a pasos cortos: la mueve esta página (mientras esté abierta,
// aunque la pestaña quede de fondo) y/o el cocinero de la Mac. Estas funciones arman lo que se ve en tarjetas y avisos.
const JOB_ACTIVE = new Set(['queued', 'running']);
const isActiveJob = (j) => !!j && JOB_ACTIVE.has(String(j.status));
const APIFY_END = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT', 'NOT_STARTED']);
const jobGood = (j) => Math.max(0, (Number(j?.got?.photos) || 0) - (Number(j?.got?.ai_rejected) || 0)); // fotos que quedan (la IA no las sacó)
const jobWho = (j) => (j?.handle ? `@${j.handle}` : j?.kind === 'tema' ? String(j?.query || '').split(',').filter(Boolean).map((t) => `#${t}`).join(' ') : 'El reel');
const jobCounts = (j) => {
  const w = j?.want || {}; const g = j?.got || {};
  return [w.photos ? `fotos ${Math.min(jobGood(j), w.photos)}/${w.photos}` : '', w.videos ? `videos ${Math.min(Number(g.videos) || 0, w.videos)}/${w.videos}` : ''].filter(Boolean).join(' · ');
};
const jobPct = (j) => {
  const w = j?.want || {}; const tp = Number(w.photos) || 0, tv = Number(w.videos) || 0;
  if (!tp && !tv) return 0;
  const got = Math.min(jobGood(j), tp) + Math.min(Number(j?.got?.videos) || 0, tv);
  const pct = Math.round((got / (tp + tv)) * 100);
  return pct > 0 ? Math.max(4, Math.min(100, pct)) : j?.status === 'running' ? 8 : 3;
};
const jobPhaseText = (j) => {
  if (!j) return '';
  if (j.cancel_requested) return 'Cancelando…';
  if (j.stale) return 'En pausa · sigue cuando abras la cocina o prendas el cocinero';
  if (j.status === 'queued') {
    if (j.wait_reason === 'apify_memory' || j.wait_reason === 'apify_busy') return 'En cola · Apify ocupado, reintento en unos segundos';
    return j.queue_pos ? `En cola · hay ${j.queue_pos} búsqueda${j.queue_pos === 1 ? '' : 's'} antes` : 'En cola · arranca enseguida';
  }
  const L = j.progress?.lanes || {};
  const runP = j.apify?.photos && !APIFY_END.has(j.apify.photos.status); const runV = j.apify?.videos && !APIFY_END.has(j.apify.videos.status);
  if (j.wait_reason === 'apify_memory' || j.wait_reason === 'apify_busy') return 'Apify ocupado, reintento en unos segundos';
  if (L.videos && !L.videos.done && !runV && (Number(L.videos.pending_video_items) || 0) > 0) return `Bajando videos ${Number(j.got?.videos) || 0}/${j.want?.videos || 0}`;
  if (L.photos && !L.photos.done && !runP) return 'Guardando fotos · la IA filtra';
  if (L.videos && !L.videos.done && !runV) return j.kind === 'reel_link' ? 'Bajando el reel' : `Filtrando videos «sola» · ${Number(j.got?.videos) || 0}/${j.want?.videos || 0} listos`;
  const n = Math.max(Number(j.apify?.photos?.items) || 0, Number(j.apify?.videos?.items) || 0);
  return `Apify trayendo posts…${n ? ` (${n})` : ''}`;
};
// Aviso al terminar UNA búsqueda (el gasto sale de runCostOf: la única definición de costo de la página).
const jobDoneText = (j) => {
  const c = runCostOf(j); const who = jobWho(j);
  const money = `gasto ${usdS(c.fotos + c.videos + c.ai)} (fotos ${usdS(c.fotos)} · videos ${usdS(c.videos)} · IA ${usdS(c.ai)})`;
  const g = jobGood(j), v = Number(j?.got?.videos) || 0;
  if (j.kind === 'reel_link') {
    if (j.status === 'ok') return `Reel traído${j.progress?.cook?.cooking ? ' y mandado a cocinar' : ''}. ${j.note ? `${j.note} ` : ''}Está en «Videos».`;
    return `${j.note || j.error || 'No se pudo traer el reel.'}`;
  }
  if (j.status === 'canceled') return `${who}: búsqueda cancelada (no se guardó nada nuevo) · ${money}.`;
  const got = [j.want?.photos ? `${g} foto${g === 1 ? '' : 's'}` : '', j.want?.videos ? `${v} video${v === 1 ? '' : 's'}` : ''].filter(Boolean).join(' y ');
  if (j.status === 'ok') return `${who} listo: ${got} nuevo${g + v === 1 ? '' : 's'} · ${money}.`;
  if (j.note) return `${j.note} · ${money}.`;
  if (j.status === 'error') return `${who}: ${j.error || 'la búsqueda falló'} · ${money}.`;
  return `${who}: ${got ? `${got} nuevo${g + v === 1 ? '' : 's'}` : 'nada nuevo usable por ahora'} · ${money}.`;
};
// Un aviso para todo un «Buscar en todas» cuando termina la última: totales + las que quedaron cortas.
const batchDoneText = (all) => {
  let fotos = 0, vids = 0, money = 0; const short = [];
  all.forEach((j) => {
    const c = runCostOf(j); money += c.fotos + c.videos + c.ai; fotos += jobGood(j); vids += Number(j.got?.videos) || 0;
    if (j.status === 'ok') return;
    short.push(j.issue === 'private' ? `${jobWho(j)} privada` : j.issue === 'not_found' ? `${jobWho(j)} no existe` : j.issue ? `${jobWho(j)} sin posts usables` : j.status === 'canceled' ? `${jobWho(j)} cancelada` : `${jobWho(j)} (${jobCounts(j)})`);
  });
  return `Listas las ${all.length} cuentas: ${fotos} foto${fotos === 1 ? '' : 's'} y ${vids} video${vids === 1 ? '' : 's'} nuevos · gasto ${usdS(money)}.${short.length ? ` Quedaron cortas: ${short.join(', ')}.` : ''}`;
};
const ISSUE_CARD = { private: 'Privada — Instagram no la deja ver sin login.', not_found: 'No existe o mal escrita — revisá el @.', no_posts: 'Sin posts públicos usables.', blocked: 'Instagram la bloqueó o la restringió.' };
const newCost = () => ({ fotos: 0, videos: 0, ai: 0, total: 0, real: 0, est: 0, realParts: 0, estParts: 0, vidPend: 0, runs: 0, searches: 0, found: 0, saved: 0, savedVideos: 0, aiRuns: 0, videosRuns: 0 });
const EMPTY_COST = Object.freeze(newCost());
const addCost = (acc, c) => {
  acc.fotos += c.fotos; acc.videos += c.videos; acc.ai += c.ai; acc.total += c.fotos + c.videos + c.ai;
  acc.real += c.real; acc.est += c.est; acc.realParts += c.realParts; acc.estParts += c.estParts; acc.vidPend += c.vidPend;
  acc.runs += 1; if (c.search) acc.searches += 1;
  acc.found += c.found; acc.saved += c.saved; acc.savedVideos += c.savedVideos;
  if (c.aiKnown) acc.aiRuns += 1;
  if (c.videosKnown) acc.videosRuns += 1;
};
// Etiqueta del gasto de Apify: real · estimado · mezcla (con cuánto de cada uno). Por conteo de partes, no por montos.
const costTag = (c) => {
  if (!c || c.runs === 0) return { t: 'sin corridas registradas', cls: 'text-paper-dim' };
  if (c.realParts + c.estParts === 0) return { t: 'sin cobro de Apify', cls: 'text-paper-dim' };
  if (c.estParts === 0) return c.videosRuns < c.runs ? { t: 'real (Apify) · videos viejos sin dato', cls: 'bg-amber-500/10 text-amber-200' } : { t: 'real (Apify)', cls: 'bg-emerald-500/15 text-emerald-300' };
  if (c.realParts === 0) return c.est > 0.000001 ? { t: 'estimado', cls: 'bg-amber-500/15 text-amber-300' } : { t: 'falta el costo real', cls: 'bg-amber-500/15 text-amber-300' };
  return { t: c.est > 0.000001 ? `${usdS(c.real)} real · ${usdS(c.est)} estimado` : `${usdS(c.real)} real · falta el costo de ${c.estParts}`, cls: 'bg-amber-500/10 text-amber-200' };
};
// Videos de un bucket: '—' si ninguna corrida lo sabe; nota si algunas viejas no lo tienen o si falta leer su costo.
const videosCell = (c) => (c.runs && (!c.videosRuns || (c.videosRuns < c.runs && c.videos <= 0.000001)) ? '—' : c.vidPend && c.videos <= 0.000001 ? 'pendiente' : usdS(c.videos));
const videosNote = (c) => [
  c.runs && !c.videosRuns ? ' · sin dato (viejas)' : c.videosRuns && c.runs > c.videosRuns ? ` · ${c.runs - c.videosRuns} viejas sin dato` : '',
  c.vidPend ? (c.videos <= 0.000001 ? ' · Apify todavía no dio el costo' : ` · falta el costo real de ${c.vidPend}`) : '',
].join('');
const fmtDay = (d) => { try { return new Date(String(d) + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short' }); } catch { return String(d); } };
// Agrupa filas (ya cortadas) por DÍA: Hoy · Ayer · fecha.
const dayGroups = (rows) => {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOf(new Date());
  const label = (ts) => { if (!ts) return 'Sin fecha'; const d = new Date(ts); const diff = Math.round((today - startOf(d)) / 86400000); if (diff === 0) return 'Hoy'; if (diff === 1) return 'Ayer'; return d.toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const groups = []; let cur = null;
  rows.forEach((r) => { const lbl = label(r.created_at); if (!cur || cur.label !== lbl) { cur = { label: lbl, rows: [] }; groups.push(cur); } cur.rows.push(r); });
  return groups;
};
// Acepta LINK COMPLETO de Instagram o solo @cuenta y devuelve el usuario limpio.
// instagram.com/skylar_tisdale/... → skylar_tisdale · @skylar_tisdale → skylar_tisdale
const parseHandle = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/instagram\.com\/(?:p\/|reel\/|tv\/)?@?([A-Za-z0-9._]+)/i);
  if (m && !/^(p|reel|tv|explore|stories)$/i.test(m[1])) return m[1].replace(/^@/, '');
  return s.replace(/^@/, '').replace(/\/+$/, '').split(/[/?#]/)[0];
};
const fmtLikes = (n) => { const x = Math.max(0, Number(n || 0)); return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : `${x}`; };

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  // A dónde vuelve cada rol: la PR (supervisor) NO entra a /admin → su casa es /trabajo.
  const [myRole, setMyRole] = useState('');
  const homeHref = myRole === 'supervisor' ? '/trabajo' : '/admin';
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setMyRole(p?.role || ''); setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');              // modelo elegida (si vacío → pantalla de elegir modelo)
  const [subtab, setSubtab] = useState('todo'); // dentro de la modelo: cocinar | buscar | resultados | aprobadas | todo
  const [reviewFlat, setReviewFlat] = useState(true); // Resultados: true = TODAS sueltas (rollo de cámara, default) · false = agrupadas por carrusel
  const [resTab, setResTab] = useState('revisar'); // dentro de Resultados: revisar | aprobadas | nosalieron | todas
  const [tick, setTick] = useState(() => Date.now()); // reloj para el contador de "cocinándose"
  const [visN, setVisN] = useState(30); // cuántas fotos se muestran (scroll por tandas)
  const [ident, setIdent] = useState({});
  const [realCount, setRealCount] = useState({});
  const [vault, setVault] = useState([]);
  const [gens, setGens] = useState([]);
  const [msg, setMsg] = useState(null);
  const [compare, setCompare] = useState(null);
  const [detail, setDetail] = useState(null);      // ficha de una foto de la mesa
  const [lightbox, setLightbox] = useState(null);  // ver una foto en grande (URL)
  const [q, setQ] = useState('');                  // buscador de modelos

  // Cocinar
  const [vibe, setVibe] = useState('Todos'); // filtro de vibe en la pestaña Buscar en IG
  // Biblioteca de guías (Cocinar): filtro + modelo + buscador + orden
  const [baulFilter, setBaulFilter] = useState('guias'); // guias | reales | favoritas
  const [baulModel, setBaulModel] = useState('');        // '' = todas las modelos (solo aplica a Guías)
  const [showUpload, setShowUpload] = useState(false);   // dropzone de "Subir fotos"
  const [baulSearch, setBaulSearch] = useState('');
  const [baulSort, setBaulSort] = useState('recientes'); // recientes (última primero) | likes
  const [queue, setQueue] = useState([]);
  const [enq, setEnq] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Perfil de búsqueda por modelo (nichos) + scraper
  const [niches, setNiches] = useState([]);
  const [newNiche, setNewNiche] = useState('');
  const [styleDesc, setStyleDesc] = useState('');
  const [scraping, setScraping] = useState(false);
  const [accounts, setAccounts] = useState([]);   // cuentas guía (IG) de referencia de la modelo
  const [newAccount, setNewAccount] = useState('');
  const [scrapingAcc, setScrapingAcc] = useState(false);
  const [checkingAcct, setCheckingAcct] = useState(null); // handle que se está re-chequeando (una sola)
  const [privateAccts, setPrivateAccts] = useState(() => new Set()); // cuentas detectadas privadas (aviso)
  const [acctView, setAcctView] = useState(false); // página «Cuentas guía» (pantalla completa): una modelo o «Todas las modelos»
  const [acctBack, setAcctBack] = useState(null); // de dónde se abrió la página → «Volver» deja todo como estaba { sel, subtab, scrapView }
  const [acctsFor, setAcctsFor] = useState(''); // modelo cuyas cuentas guía ya se leyeron (hasta entonces NO se guarda → no pisa la lista)
  const [acctsErr, setAcctsErr] = useState(''); // no se pudieron leer las cuentas guía de la modelo abierta (con «Reintentar»)
  const [seedsReload, setSeedsReload] = useState(0); // «Reintentar» → vuelve a leerlas
  const [allSeeds, setAllSeeds] = useState({}); // creator_id → cuentas guía (seed_accounts) de TODAS las modelos
  const [addFor, setAddFor] = useState(''); // «Todas las modelos» → a qué modelo se le agrega la cuenta
  const [bulkProg, setBulkProg] = useState(null); // «Buscar en todas»: { i, n } (una cuenta por vez)
  const [apifyBill, setApifyBill] = useState(null); // factura real de Apify del mes (acción apify_usage)
  const [backfilling, setBackfilling] = useState(false); // completando el costo real de corridas viejas
  const [videoEnq, setVideoEnq] = useState(null); // id del reel que se está encolando a video (Genjutsu)
  const [reelLink, setReelLink] = useState(''); // link de un reel puntual para traerlo por URL
  const [reelBusy, setReelBusy] = useState(false);
  const [resMedia, setResMedia] = useState('todo'); // filtro Fotos/Videos/Audios en Resultados: todo | fotos | videos | audios
  const [balance, setBalance] = useState(null); // saldo real de Higgsfield (créditos) — global de siempre (Cuenta 1)
  const [hfAccts, setHfAccts] = useState({}); // id → { label, balance, balance_at, legacy, cli, cli_error } (saldo y login POR cuenta)
  const [wiz, setWiz] = useState(null); // pop-up "agregar fuente": null | { step: 0..4, mode: 'cuenta'|'tema'|null }
  const [wizType, setWizType] = useState('fotos'); // en el wizard: fotos | videos | ambos
  const [acctDetail, setAcctDetail] = useState(null); // handle abierto en el panel de cuentas → ver TODAS sus fotos
  const [acctIssue, setAcctIssue] = useState({}); // handle -> motivo por el que NO jaló (privada, no existe, bloqueada…)
  const [libView, setLibView] = useState(false); // Biblioteca global (guías de todas) desde el selector, sin entrar a una modelo
  const [acctSearch, setAcctSearch] = useState(''); // buscar cuenta guía por nombre en el panel
  const [acctDate, setAcctDate] = useState('todas'); // filtro por actividad: todas | hoy | ayer | semana
  const [scrapView, setScrapView] = useState(false); // desde el selector: TODO lo scrapeado de IG (todas las modelos)
  const [scrapedGlobal, setScrapedGlobal] = useState([]); // TODO lo scrapeado de IG de todas las modelos (también lo que la IA sacó) → números únicos
  const [qtyPhotos, setQtyPhotos] = useState(10); // cuántas FOTOS traer por búsqueda (las mejores 10 por default)
  const [qtyVideos, setQtyVideos] = useState(0);  // cuántos VIDEOS traer (se bajan a nuestro storage)
  const [mediaFilter, setMediaFilter] = useState('todo'); // grilla de scraping/ficha: todo | fotos | videos
  const [videoPlay, setVideoPlay] = useState(null); // {url, poster} para reproducir un video en grande
  const [redoNote, setRedoNote] = useState(''); // ajuste opcional que se mete al prompt al Rehacer (ej: "más glúteo")
  const [spendOpen, setSpendOpen] = useState(false); // pop-up de detalle de gasto/saldo de la modelo
  const [scrapeRuns, setScrapeRuns] = useState([]); // corridas registradas del scraper (TODAS las modelos) → gasto real/estimado
  // Búsquedas en segundo plano (motor nuevo): id → vista que manda el servidor. asyncMode: null = todavía no se sabe ·
  // true = el motor las tiene · false = motor viejo o sin la migración → se busca como antes (una request larga).
  const [jobs, setJobs] = useState(() => new Map());
  const jobsRef = useRef(new Map());
  const [asyncMode, setAsyncMode] = useState(null);
  const asyncRef = useRef(null);
  const [workerOnline, setWorkerOnline] = useState(null); // ¿el cocinero de la Mac está dando pasos? (sigue aunque cierres)
  const mineRef = useRef(new Set());   // búsquedas que arrancó ESTA pestaña (para avisar aunque terminen enseguida)
  const driverRef = useRef(false);     // un solo «motor de pasos» por pestaña
  const aliveRef = useRef(true);
  const selRef = useRef('');
  const endedRef = useRef(() => {});   // qué hacer cuando una búsqueda termina (se actualiza en cada render)
  const doneQRef = useRef({ list: [], timer: null });
  const reloadTRef = useRef(null);
  // Voz (ElevenLabs): cada modelo tiene UNA voz fija → guion → audio → revisar → aprobar (cae al baúl "Cocina").
  const [voiceSum, setVoiceSum] = useState(null);       // { configured, voices, consent, error? } (acción 'summary')
  const [voiceStatus, setVoiceStatus] = useState(null); // { configured, model_label, sub } (acción 'status')
  const [vType, setVType] = useState('bienvenida');
  const [vText, setVText] = useState('');
  const [vLang, setVLang] = useState('es');
  const [vBusy, setVBusy] = useState(false);
  const [vMsg, setVMsg] = useState(null);     // aviso del compositor { kind, text, needsKey?, needsConsent?, needsVoice? }
  const [vRow, setVRow] = useState({});       // id -> 'regen' mientras se rehace ese audio (spinner en su tarjeta)
  const [vRowErr, setVRowErr] = useState({}); // id -> error visible en la tarjeta de ese audio
  const [vFocus, setVFocus] = useState(null); // audio a resaltar/scrollear al venir desde Resultados
  const vComposerRef = useRef(null);
  const vTextRef = useRef(null);
  // APROBAR/DESCARTAR OPTIMISTA: la tarjeta cambia al instante y el server confirma de fondo.
  const [deciding, setDeciding] = useState({}); // id -> 'approve' | 'reject' mientras el server confirma
  const decideRef = useRef({});                 // id -> status optimista (loadGens lo respeta hasta que el server confirme)
  const [decideErr, setDecideErr] = useState({}); // id -> error del aprobar/descartar, visible JUNTO a esa foto/audio (pop-up y grillas)
  const genSeqRef = useRef(0);                  // descarta respuestas viejas de loadGens que lleguen tarde

  const sb = getSupabase();

  // Aviso "cuando terminan de cocinarse" — para no estar adivinando.
  const seenCookingRef = useRef(new Set()); // ids que estaban cocinándose en el ciclo anterior
  const askNotify = () => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch { /* noop */ } };

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) { const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m); setBalance(out.balance ?? null); setHfAccts(out.accounts && typeof out.accounts === 'object' ? out.accounts : {}); }
  }, []);
  const loadGens = useCallback(async () => {
    const seq = ++genSeqRef.current;
    const base = 'id, creator_id, reference_url, result_url, status, credits, note, created_at, done_at, carousel_of, engine_label, media_type';
    let { data, error } = await sb.from('generations').select(`${base}, prompt, params`).order('created_at', { ascending: false }).limit(200);
    // Si la columna params todavía no existe (migración de voz sin aplicar) no rompemos la cocina: traemos lo de siempre.
    if (error) { const r2 = await sb.from('generations').select(base).order('created_at', { ascending: false }).limit(200); data = r2.data; }
    if (seq !== genSeqRef.current) return; // llegó tarde una respuesta vieja (ya hay una más nueva en camino) → ignorar
    const ov = decideRef.current; // aprobaciones/descartes optimistas que el server todavía no confirmó
    setGens(Array.isArray(data) ? data.map((g) => (ov[g.id] ? { ...g, status: ov[g.id] } : g)) : []);
  }, [sb]);
  // Voz: estado de la conexión ElevenLabs + voces asignadas + consentimientos (se carga al entrar a la pestaña Voz).
  const loadVoice = useCallback(async () => {
    const [s, st] = await Promise.all([callVoice('summary'), callVoice('status')]);
    setVoiceSum(s?.ok
      ? { configured: !!s.configured, voices: Array.isArray(s.voices) ? s.voices : [], consent: s.consent || {}, error: null }
      : { configured: s?.needsKey ? false : null, voices: [], consent: {}, error: s?.needsKey ? null : (s?.error || 'No se pudo leer el motor de voz.') });
    setVoiceStatus(st?.ok ? st : null);
  }, []);
  const loadVoiceStatus = useCallback(async () => { const st = await callVoice('status'); if (st?.ok) setVoiceStatus(st); }, []);
  const loadVault = useCallback(async () => {
    // La BIBLIOTECA DE GUÍAS es COMPARTIDA: las fotos subidas a mano (sin scraping) de
    // TODAS las modelos forman un solo pool del que se elige para cualquier modelo.
    // Aparte, de la modelo abierta traemos sus fotos REALES y su SCRAPING (pestaña Buscar).
    // No traemos la basura del scraping (ai_ok=false). Fusionamos por id (una guía subida
    // a la propia modelo aparece en ambos lados → dedup).
    const cols = 'id, url, caption, creator_id, kind, vibe, likes, views, comments, source_handle, source_url, source_platform, interest, ai_ok, ai_reason, media_type, video_url, duration, created_at';
    const [g, mineRows] = await Promise.all([
      sb.from('creator_vault').select(cols).eq('kind', 'ref').is('source_handle', null).is('source_platform', null).or('ai_ok.is.null,ai_ok.eq.true').order('created_at', { ascending: false }).limit(6000),
      sel ? sb.from('creator_vault').select(cols).eq('creator_id', sel).or('ai_ok.is.null,ai_ok.eq.true').order('created_at', { ascending: false }).limit(4000) : Promise.resolve({ data: [] }),
    ]);
    const byId = new Map();
    (g.data || []).forEach((r) => byId.set(r.id, r));
    (mineRows.data || []).forEach((r) => byId.set(r.id, r));
    setVault([...byId.values()]);
  }, [sb, sel]);
  // Conteo de fotos reales por modelo (liviano) para el selector de modelos.
  const loadRealCounts = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('creator_id').eq('kind', 'real');
    const rc = {}; (data || []).forEach((r) => { if (r.creator_id) rc[r.creator_id] = (rc[r.creator_id] || 0) + 1; }); setRealCount(rc);
  }, [sb]);
  // Lee TODAS las filas de una consulta de a 1000 (el servidor corta cada respuesta en 1000 filas, aunque se pida más).
  const fetchAll = useCallback(async (build, max = 20000) => {
    const out = [];
    for (let from = 0; from < max; from += 1000) {
      const { data, error } = await build().range(from, from + 999);
      if (error) return { data: out, error };
      const rows = Array.isArray(data) ? data : [];
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return { data: out, error: null };
  }, []);
  // TODO lo scrapeado de Instagram de TODAS las modelos, TAMBIÉN lo que la IA sacó: de acá salen TODOS los números
  // del scraper (ver «NÚMEROS DEL SCRAPER» arriba) y la grilla global de «Buscar en IG» (que muestra solo lo de la mesa).
  const loadScrapedGlobal = useCallback(async () => {
    const cols = 'id, url, caption, creator_id, kind, vibe, likes, views, source_handle, source_url, source_platform, interest, ai_ok, media_type, video_url, created_at';
    const { data } = await fetchAll(() => sb.from('creator_vault').select(cols).eq('kind', 'ref').or('source_handle.not.is.null,source_platform.not.is.null').order('created_at', { ascending: false }).order('id', { ascending: true }));
    setScrapedGlobal(Array.isArray(data) ? data : []);
  }, [sb, fetchAll]);
  // Corridas registradas del scraper (TODAS las modelos): gasto real de Apify + filtro IA por corrida.
  // Sin la migración 0131 las columnas nuevas no existen → se leen las de siempre (y todo se muestra como estimado).
  const runsLegacyRef = useRef(false); // true = la base todavía no tiene las columnas de 0131 (no reintentar en cada apertura)
  const loadScrapeRuns = useCallback(async () => {
    const base = 'id, creator_id, account_id, kind, query, run_at, found, saved, kept, cost_est, status, error';
    const q = (cols) => fetchAll(() => sb.from('scrape_runs').select(cols).order('run_at', { ascending: false }).order('id', { ascending: true }));
    // Solo se pasa a las columnas viejas si FALTA una columna (migración sin aplicar). Cualquier otro error (red, sesión)
    // deja los números que ya había, sin marcar nada (si no, todo quedaba «estimado» hasta recargar).
    const missingCol = (e) => !!e && (String(e.code) === '42703' || /column .* does not exist/i.test(String(e.message || '')));
    const c0131 = `${base}, videos, cost_apify, cost_ai, cost_breakdown, cost_source, apify_run_ids`;
    // + columnas de las búsquedas en segundo plano (el motivo de una cuenta que no jaló va liviano: solo progress->>issue).
    let r = runsLegacyRef.current ? { error: { code: '42703' } } : await q(`${c0131}, requested, updated_at, created_at, finished_at, note, progress_issue:progress->>issue`);
    if (r.error && !runsLegacyRef.current && missingCol(r.error)) r = await q(c0131);
    if (r.error) {
      if (!missingCol(r.error)) return;
      runsLegacyRef.current = true; r = await q(base);
      if (r.error) return;
    }
    setScrapeRuns(Array.isArray(r.data) ? r.data : []);
  }, [sb, fetchAll]);
  // Cuentas guía de TODAS las modelos (para «Todas las modelos» y el total global de cuentas guía).
  const loadAllSeeds = useCallback(async () => {
    const { data, error } = await sb.from('creator_search_profile').select('creator_id, seed_accounts');
    if (error) return;
    const m = {}; (data || []).forEach((r) => { if (r?.creator_id) m[r.creator_id] = Array.isArray(r.seed_accounts) ? r.seed_accounts : []; });
    setAllSeeds(m);
  }, [sb]);
  // Lo que Apify cobró DE VERDAD este mes (factura del ciclo). Nunca pasa por el navegador el token.
  const loadApifyBill = useCallback(async () => {
    const out = await callFn('apify_usage');
    setApifyBill(out?.ok ? out : { error: /desconocida/i.test(String(out?.error || '')) ? 'Falta actualizar el motor (función higgsfield) para leer la factura de Apify.' : (out?.error || 'No se pudo leer Apify.') });
  }, []);

  // ── Búsquedas en segundo plano: estado, avisos, «motor de pasos» ──
  const setAsync = useCallback((v) => { asyncRef.current = v; setAsyncMode(v); }, []);
  // ¿El motor no tiene búsquedas en segundo plano? (edge viejo: «Acción desconocida» · sin la migración: needs_migration)
  const noJobs = (out) => !!(out?.needs_migration || /desconocida/i.test(String(out?.error || '')));
  const mergeJobs = useCallback((list) => {
    if (!Array.isArray(list) || !list.length) return;
    const prev = jobsRef.current; const next = new Map(prev); const ended = [];
    for (const j of list) {
      if (!j || !j.id) continue;
      const old = prev.get(j.id);
      if (!isActiveJob(j) && ((old && isActiveJob(old)) || (!old && mineRef.current.has(j.id)))) { ended.push(j); mineRef.current.delete(j.id); }
      next.set(j.id, j);
    }
    jobsRef.current = next; setJobs(next);
    if (ended.length) endedRef.current(ended);
  }, []);
  const refreshJobs = useCallback(async () => {
    if (asyncRef.current === false) return;
    const out = await callFn('scrape_jobs', { since_ms: 600000 });
    if (noJobs(out)) { setAsync(false); return; }
    if (!out?.ok) return;
    if (asyncRef.current == null) setAsync(true);
    if (typeof out.worker_online === 'boolean') setWorkerOnline(out.worker_online);
    const list = Array.isArray(out.jobs) ? out.jobs : [];
    mergeJobs(list);
    // Activas que ya no vienen (terminaron hace más de 10 min, ej. la compu durmió): se piden por id para cerrarlas bien.
    const got = new Set(list.map((j) => j.id));
    const missing = [...jobsRef.current.values()].filter((j) => isActiveJob(j) && !got.has(j.id)).map((j) => j.id).slice(0, 100);
    if (missing.length) { const o2 = await callFn('scrape_jobs', { ids: missing }); if (o2?.ok) mergeJobs(o2.jobs || []); }
  }, [mergeJobs, setAsync]);
  const hasActiveJobs = useMemo(() => [...jobs.values()].some(isActiveJob), [jobs]);
  const activeJobFor = useCallback((cid, h) => { const k = normH(h); for (const j of jobs.values()) if (isActiveJob(j) && j.creator_id === cid && j.kind === 'account' && normH(j.handle) === k) return j; return null; }, [jobs]);
  // Un solo loop por pestaña: pide pasos mientras haya búsquedas activas (sigue con la pestaña de fondo; nunca arranca
  // búsquedas nuevas). Con el cocinero de la Mac prendido, cada uno toma búsquedas distintas (el candado del servidor).
  const runDriver = useCallback(async () => {
    if (driverRef.current) return;
    driverRef.current = true;
    try {
      while (aliveRef.current && asyncRef.current !== false && [...jobsRef.current.values()].some(isActiveJob)) {
        const out = await callFn('scrape_step', { prefer_creator_id: selRef.current || null, budget_ms: 90000 });
        if (!aliveRef.current) break;
        if (noJobs(out)) { setAsync(false); break; }
        if (Array.isArray(out?.jobs)) mergeJobs(out.jobs); else if (out?.job) mergeJobs([out.job]);
        if (typeof out?.worker_online === 'boolean') setWorkerOnline(out.worker_online);
        const wait = !out?.ok ? 10000 : (out.stepped || out.more_due) ? 1500 : Math.max(3000, Math.min(15000, Number(out.next_in_ms) || 5000));
        await new Promise((r) => setTimeout(r, wait));
      }
    } finally { driverRef.current = false; }
  }, [mergeJobs, setAsync]);
  const workerLine = (on) => (on ? 'Podés cerrar la página: el cocinero de la Mac lo termina.' : 'Dejá la cocina abierta hasta que termine: el cocinero de la Mac está apagado.');
  // Arranca búsquedas en el servidor. { legacy:true } = el motor no las tiene → la función que llamó busca como antes.
  const startSearch = useCallback(async (payload) => {
    if (asyncRef.current === false) return { legacy: true };
    const out = await callFn('scrape_start', payload);
    if (noJobs(out)) { setAsync(false); return { legacy: true }; }
    if (!out?.ok) return { ok: false, error: out?.error || (out?.timeout ? 'El servidor no respondió: probá de nuevo en un momento.' : 'No se pudo empezar la búsqueda.') };
    setAsync(true);
    (out.jobs || []).forEach((x) => { if (x?.job_id && !x.dedup && !x.skipped) mineRef.current.add(x.job_id); });
    mergeJobs((out.jobs || []).map((x) => x?.job).filter(Boolean));
    if (typeof out.worker_online === 'boolean') setWorkerOnline(out.worker_online);
    return { ok: true, out };
  }, [mergeJobs, setAsync]);
  const cancelJob = async (j) => {
    const out = await callFn('scrape_cancel', { job_id: j.id });
    if (out?.job) mergeJobs([out.job]);
    else if (!out?.ok) setMsg({ kind: 'err', text: out?.error || 'No se pudo cancelar la búsqueda.' });
  };

  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      try { const { data } = await sb.rpc('team_creators'); if (Array.isArray(data)) setCreators(data.filter((c) => c?.id && c?.full_name && c.onboarding_status === 'active')); } catch {}
      loadRealCounts(); loadSummary(); loadGens();
    })();
  }, [access, sb, loadRealCounts, loadSummary, loadGens]);
  // El baúl se recarga solo cada vez que cambia la modelo abierta (sel).
  useEffect(() => { if (access === 'ok') loadVault(); }, [access, loadVault]);
  // Números del scraper: se leen al abrir «Buscar en IG» (de una modelo o global) o la página «Cuentas guía».
  const scrapeOpen = access === 'ok' && ((!!sel && subtab === 'buscar') || acctView || scrapView);
  useEffect(() => { if (scrapeOpen) { loadScrapedGlobal(); loadScrapeRuns(); } }, [scrapeOpen, loadScrapedGlobal, loadScrapeRuns]);
  // Búsquedas en segundo plano: al entrar se descubren las de otras pestañas / de antes de recargar; mientras haya alguna
  // activa se mira cada 5 s (si no, cada 60 s) y el «motor de pasos» de esta pestaña las va avanzando.
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  useEffect(() => { selRef.current = sel; }, [sel]);
  const jobsOff = asyncMode === false;
  useEffect(() => {
    if (access !== 'ok' || jobsOff) return undefined;
    let alive = true; let t = null;
    const loop = async () => {
      if (!alive) return;
      await refreshJobs();
      if (!alive || asyncRef.current === false) return;
      t = setTimeout(loop, [...jobsRef.current.values()].some(isActiveJob) ? 5000 : 60000);
    };
    loop();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [access, jobsOff, hasActiveJobs, refreshJobs]);
  useEffect(() => { if (access === 'ok' && hasActiveJobs && !jobsOff) runDriver(); }, [access, hasActiveJobs, jobsOff, runDriver]);
  // Cuando una búsqueda termina: aviso (juntando las que terminen en 3 s; un lote avisa una vez, al final) + recargar lo bajado.
  const loadersRef = useRef({});
  loadersRef.current = { loadVault, loadScrapedGlobal, loadScrapeRuns, loadGens };
  endedRef.current = (ended) => {
    const q = doneQRef.current; q.list.push(...ended);
    if (q.timer) clearTimeout(q.timer);
    q.timer = setTimeout(() => {
      q.timer = null;
      const list = q.list.splice(0); if (!list.length) return;
      const texts = []; const batches = new Set();
      list.forEach((j) => { if (j.batch_id) batches.add(j.batch_id); else texts.push(jobDoneText(j)); });
      batches.forEach((bid) => {
        const all = [...jobsRef.current.values()].filter((x) => x.batch_id === bid);
        if (all.length && !all.some(isActiveJob)) texts.push(batchDoneText(all)); // el lote sigue → avisa al final
      });
      if (!texts.length) return;
      setMsg({ kind: texts.length === 1 && list.length === 1 && list[0].status === 'error' ? 'err' : 'ok', text: texts.join(' ') });
    }, 3000);
    if (reloadTRef.current) clearTimeout(reloadTRef.current);
    reloadTRef.current = setTimeout(() => { reloadTRef.current = null; const L = loadersRef.current; L.loadVault?.(); L.loadScrapedGlobal?.(); L.loadScrapeRuns?.(); L.loadGens?.(); }, 1500);
  };
  useEffect(() => { if (access === 'ok' && acctView) { loadAllSeeds(); loadApifyBill(); } }, [access, acctView, loadAllSeeds, loadApifyBill]);
  // Voz: se lee al entrar a la pestaña Voz (y al cambiar de modelo estando ahí).
  useEffect(() => { if (access === 'ok' && sel && subtab === 'voz') loadVoice(); }, [access, sel, subtab, loadVoice]);
  // Al venir desde Resultados (tocaste un audio): scrollear a ese clip en el catálogo y resaltarlo un rato.
  useEffect(() => {
    if (subtab !== 'voz' || !vFocus) return;
    const t = setTimeout(() => { try { document.getElementById(`voz-clip-${vFocus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* noop */ } }, 80);
    const t2 = setTimeout(() => setVFocus(null), 3500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [subtab, vFocus]);

  // Auto-refresco: mientras haya algo cocinándose, recargar solo cada 6s (para que el resultado aparezca sin apretar nada).
  useEffect(() => {
    if (access !== 'ok') return;
    if (!gens.some((g) => ['queued', 'in_progress'].includes(g.status))) return;
    const t = setInterval(() => { loadGens(); }, 6000);
    return () => clearInterval(t);
  }, [access, gens, loadGens]);

  // Reloj para el contador de "cocinándose" (se actualiza solo).
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 20000); return () => clearInterval(t); }, []);

  // Scroll por tandas: reset a 30 al cambiar de pestaña/modelo/fuente; observer que suma de a 30.
  const sentinelRef = useRef(null);
  useEffect(() => { setVisN(30); }, [subtab, sel, baulFilter, baulModel, resTab]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setVisN((v) => v + 30); }, { rootMargin: '700px' });
    io.observe(el);
    return () => io.disconnect();
  }, [subtab, sel, baulFilter, baulModel, resTab]);

  // Detecta la transición cocinándose → LISTA y AVISA: toast + notificación del navegador (aunque estés en otra pestaña).
  useEffect(() => {
    if (access !== 'ok') return;
    const cookingNow = new Set(gens.filter((g) => ['queued', 'in_progress'].includes(g.status)).map((g) => g.id));
    const prev = seenCookingRef.current;
    seenCookingRef.current = cookingNow;
    if (prev.size === 0) return; // primer ciclo: no avisar por lo que ya estaba hecho antes de abrir
    const justDone = gens.filter((g) => g.status === 'done' && prev.has(g.id));
    const justFailed = gens.filter((g) => g.status === 'failed' && prev.has(g.id));
    const nameOf = (id) => (creators.find((c) => c.id === id)?.full_name) || 'una modelo';
    if (justDone.length > 0) {
      const nVid = justDone.filter((g) => g.media_type === 'video').length;
      const allVid = nVid === justDone.length; // todo lo que terminó fueron videos
      const byC = {}; justDone.forEach((g) => { byC[g.creator_id] = (byC[g.creator_id] || 0) + 1; });
      const parts = Object.entries(byC).map(([cid, n]) => `${n} de ${nameOf(cid)}`);
      const text = allVid
        ? `¡${nVid > 1 ? `${nVid} videos listos` : 'Video listo'}! Ya se cocinó: ${parts.join(', ')}.${justFailed.length ? ` (${justFailed.length} no salieron)` : ''} Entrá a Resultados a verlo${nVid > 1 ? 's' : ''}.`
        : `Listas para revisar: ${parts.join(', ')}.${nVid ? ` (incluye ${nVid} video${nVid > 1 ? 's' : ''})` : ''}${justFailed.length ? ` (${justFailed.length} no salieron)` : ''} Entrá a Resultados a verlas.`;
      setMsg({ kind: 'ok', text });
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification(allVid ? 'Kitchen — video listo 🎬' : 'Kitchen — listas 🍳', { body: text, tag: 'kitchen-ready', renotify: true });
          n.onclick = () => { try { window.focus(); } catch { /* noop */ } };
        }
      } catch { /* noop */ }
    } else if (justFailed.length > 0) {
      const nVid = justFailed.filter((g) => g.media_type === 'video').length;
      setMsg({ kind: 'info', text: `${justFailed.length} ${nVid === justFailed.length ? `video(s)` : 'cosa(s)'} no salieron al cocinarse. Mirá "No salieron" para reintentar.` });
    }
  }, [gens, access, creators]);

  // El TÍTULO de la pestaña como identificador (lo ves aunque estés en otra pestaña del navegador).
  useEffect(() => {
    if (access !== 'ok') { document.title = 'Kitchen · LetShoot'; return; }
    const cooking = gens.filter((g) => ['queued', 'in_progress'].includes(g.status)).length;
    const ready = gens.filter((g) => g.status === 'done' && !g.carousel_of).length;
    document.title = cooking ? `🍳 Cocinando ${cooking}… · Kitchen` : ready ? `(${ready}) listas ✅ · Kitchen` : 'Kitchen · LetShoot';
    return () => { document.title = 'LetShoot'; };
  }, [gens, access]);

  const selCreator = creators.find((c) => c.id === sel) || null;
  const selReady = ident[sel]?.status === 'ready';
  // ── Cuenta de Higgsfield de cada modelo (su saldo y si su login anda en la Mac del cocinero) ──
  const hasAcctInfo = Object.keys(hfAccts).length > 0; // false = servidor viejo → todo como antes (saldo global)
  const acctOf = (cid) => {
    const id = cid === JULIA_ID ? LEGACY_HF_ACCOUNT : ident[cid]?.account_id;
    return id ? (hfAccts[id] || null) : null;
  };
  // Saldo de la cuenta de ESA modelo (Julia / servidor viejo → el global de siempre). null = sin dato / sin cuenta.
  const balFor = (cid) => {
    if (!hasAcctInfo) return balance;
    const a = acctOf(cid);
    if (!a) return cid === JULIA_ID ? balance : null;
    return a.balance ?? null;
  };
  // Motivo por el que NO se puede cocinar a esta modelo por su cuenta ('' = se puede). Julia nunca se frena acá.
  const acctBlock = (cid) => {
    if (!hasAcctInfo || !cid || cid === JULIA_ID) return '';
    const who = creators.find((c) => c.id === cid)?.full_name || 'Esta modelo';
    const a = acctOf(cid);
    if (!a) return `${who} no tiene cuenta de Higgsfield asignada. Asignala en /conexion → «Modelos → cuenta» (las modelos van a la cuenta nueva).`;
    if (a.legacy) return `La Cuenta 1 es solo de Julia: pasá a ${who} a la cuenta nueva en /conexion → «Modelos → cuenta».`;
    if (a.cli === 'missing') return `La cuenta «${a.label}» de ${who} todavía no está conectada en la Mac del cocinero. Conectala desde /conexion (en la Mac: node scripts/hf-login.mjs ${a.id}).`;
    if (a.cli === 'error') return `La cuenta «${a.label}» de ${who} no anda en la Mac del cocinero: ${a.cli_error || 'revisalo en /conexion'}`;
    return '';
  };
  const selAcct = sel ? acctOf(sel) : null;
  const selBal = sel ? balFor(sel) : balance;
  const selBlock = sel ? acctBlock(sel) : '';

  // Métricas por modelo (de las generaciones cargadas).
  const statsFor = useCallback((cid) => {
    const rows = gens.filter((g) => g.creator_id === cid);
    return {
      // Créditos = SOLO Higgsfield (fotos/videos). Los audios se cobran en créditos de ElevenLabs (params.chars), no suman acá.
      credits: rows.filter((g) => g.status !== 'failed' && !isAudioGen(g)).reduce((a, g) => a + Number(g.credits || 0), 0),
      review: rows.filter((g) => g.status === 'done').length,
      approved: rows.filter((g) => g.status === 'approved').length,
      pending: rows.filter((g) => ['queued', 'in_progress'].includes(g.status)).length,
      total: rows.filter((g) => g.status !== 'failed').length,
      photos: rows.filter((g) => g.status !== 'failed' && isPhotoGen(g)).length,
      videos: rows.filter((g) => g.status !== 'failed' && g.media_type === 'video').length,
      audios: rows.filter((g) => g.status !== 'failed' && isAudioGen(g)).length,
    };
  }, [gens]);
  const mine = statsFor(sel);

  // Es del scraper si tiene origen de red social (source_platform/handle). Si no, la subió un humano.
  const isScraped = (r) => !!(r.source_platform || r.source_handle);
  // Nombre de la modelo dueña de cada guía (para el buscador y el filtro "por modelo").
  const nameById = useMemo(() => { const m = {}; creators.forEach((c) => { m[c.id] = c.stage_name || c.full_name || 'Modelo'; }); return m; }, [creators]);
  // BIBLIOTECA DE GUÍAS = subidas a mano, de TODAS las modelos (pool compartido). Elegís de acá para cualquier modelo.
  const guideRows = useMemo(() => dedupeByMedia(vault.filter((r) => r.kind === 'ref' && !isScraped(r) && r.ai_ok !== false)), [vault]);
  // Fotos REALES de la modelo abierta (su identidad).
  const realRows = useMemo(() => vault.filter((r) => r.kind === 'real' && r.creator_id === sel), [vault, sel]);
  // Scraping (IG) de la modelo abierta — vive en su propia pestaña.
  // (lo de la MESA: sin lo que la IA sacó ni lo descartado, sin repetidas → mismo número que «en la mesa»)
  // Primero se juntan las copias de la misma foto y DESPUÉS se deja lo de la mesa: si una copia se descartó, la foto no vuelve.
  const scrapedRows = useMemo(() => mesaMedia(vault.filter((r) => r.kind === 'ref' && isScraped(r) && r.creator_id === sel)), [vault, sel]);
  // Vibes que realmente tienen fotos etiquetadas (para no mostrar chips que dan grilla vacía).
  const vibeCounts = useMemo(() => {
    const m = {}; scrapedRows.forEach((r) => { const v = (r.vibe || '').trim(); if (v) m[v] = (m[v] || 0) + 1; }); return m;
  }, [scrapedRows]);
  // ── Números del scraper (UNA definición, ver «NÚMEROS DEL SCRAPER» arriba) ──
  const acctsReady = !!sel && acctsFor === sel; // ya se leyeron las cuentas guía de la modelo abierta (recién ahí se puede guardar)
  // Cuentas guía de una modelo: la abierta = su lista viva; las demás = lo leído de creator_search_profile.
  const seedsFor = useCallback((cid) => (cid && cid === sel && acctsReady ? accounts : (allSeeds[cid] || [])), [sel, acctsReady, accounts, allSeeds]);
  const scrapeStats = useMemo(() => {
    // 1) sin repetidas: una entrada por (modelo, foto o video de IG — con su tipo). Estado de sus copias: ver STATE_RANK.
    const media = new Map();
    for (const r of scrapedGlobal) {
      const cid = r.creator_id; if (!cid) continue;
      const k = `${cid}|${mediaKeyT(r)}`;
      const st = rowState(r);
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      const cur = media.get(k);
      if (!cur) { media.set(k, { cid, h: normH(r.source_handle), st, video: r.media_type === 'video', t0: t, tLast: t, day: String(r.created_at || '').slice(0, 10) }); continue; }
      if (STATE_RANK[st] > STATE_RANK[cur.st]) cur.st = st;
      if (!cur.h && r.source_handle) cur.h = normH(r.source_handle);
      if (t && (!cur.t0 || t < cur.t0)) { cur.t0 = t; cur.day = String(r.created_at || '').slice(0, 10); }
      if (t > cur.tLast) cur.tLast = t;
    }
    // 2) sumas: todas · por modelo · por cuenta guía · fuera de las cuentas guía (temas, reels por link, cuentas quitadas)
    const seedSets = {};
    const seedSet = (cid) => seedSets[cid] || (seedSets[cid] = new Set(seedsFor(cid).map(normH)));
    // rest = modelos que NO están en la lista (inactivas / de prueba): siguen en el total → se muestran aparte para que sume.
    const active = new Set(creators.map((c) => c.id));
    const all = newStat(); const byModel = {}; const byAcct = {}; const other = {}; const rest = newStat();
    for (const m of media.values()) {
      addMedia(all, m);
      if (creators.length && !active.has(m.cid)) addMedia(rest, m);
      addMedia(byModel[m.cid] || (byModel[m.cid] = newStat()), m);
      if (m.h && seedSet(m.cid).has(m.h)) { const ba = byAcct[m.cid] || (byAcct[m.cid] = {}); addMedia(ba[m.h] || (ba[m.h] = newStat()), m); }
      else addMedia(other[m.cid] || (other[m.cid] = newStat()), m);
    }
    return { all, byModel, byAcct, other, rest };
  }, [scrapedGlobal, seedsFor, creators]);
  // Gasto por corrida → todas · por modelo · por cuenta guía · búsquedas viejas en varias cuentas a la vez · fuera de las cuentas guía.
  const costStats = useMemo(() => {
    const all = newCost(); const byModel = {}; const byAcct = {}; const multi = {}; const other = {}; const rest = newCost();
    const active = new Set(creators.map((c) => c.id));
    const seedSets = {};
    const seedSet = (cid) => seedSets[cid] || (seedSets[cid] = new Set(seedsFor(cid).map(normH)));
    const bucket = (map, cid) => map[cid] || (map[cid] = newCost());
    for (const r of scrapeRuns) {
      const cid = r.creator_id; if (!cid) continue;
      const c = runCostOf(r);
      addCost(all, c); addCost(bucket(byModel, cid), c);
      if (creators.length && !active.has(cid)) addCost(rest, c);
      const hs = String(r.query || '').split(',').map(normH).filter(Boolean);
      if (r.kind === 'account' && hs.length > 1) addCost(bucket(multi, cid), c);
      else if (r.kind === 'account' && hs.length === 1 && seedSet(cid).has(hs[0])) { const ba = byAcct[cid] || (byAcct[cid] = {}); addCost(ba[hs[0]] || (ba[hs[0]] = newCost()), c); }
      else addCost(bucket(other, cid), c);
    }
    return { all, byModel, byAcct, multi, other, rest };
  }, [scrapeRuns, seedsFor, creators]);
  // Corridas de UNA cuenta guía (para la ficha): encontrados vs guardados + costo de cada búsqueda.
  const runsOfAcct = useCallback((cid, h) => scrapeRuns.filter((r) => r.creator_id === cid && r.kind === 'account' && normH(r.query) === normH(h)), [scrapeRuns]);
  // Mejores 5 de la mesa (por likes) de cada cuenta — miniaturas de las tarjetas (de cualquier modelo).
  const acctTops = useMemo(() => {
    const m = {};
    mesaMedia(scrapedGlobal).filter((r) => r.source_handle && r.url).forEach((r) => {
      const k = `${r.creator_id}|${normH(r.source_handle)}`; (m[k] || (m[k] = [])).push(r);
    });
    Object.keys(m).forEach((k) => { m[k] = m[k].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0)).slice(0, 5); });
    return m;
  }, [scrapedGlobal]);
  const agoLabel = (ms) => {
    if (!ms) return 'nunca';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 90) return 'recién';
    const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`;
    return `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}`;
  };
  // BIBLIOTECA (Cocinar): Guías · Reales · Favoritas + filtro por modelo + buscador + orden.
  const libPhotos = useMemo(() => {
    let rows;
    if (baulFilter === 'reales') rows = realRows;
    else if (baulFilter === 'favoritas') rows = [...guideRows, ...realRows].filter((r) => r.interest === 'favorita');
    else rows = guideRows; // guias (por defecto)
    if (baulFilter === 'guias' && baulModel) rows = rows.filter((r) => r.creator_id === baulModel);
    rows = rows.filter((r) => r.interest !== 'descartada');
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${nameById[r.creator_id] || ''} ${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [guideRows, realRows, baulFilter, baulModel, baulSearch, baulSort, nameById]);

  // Scraping (pestaña Buscar en IG): éxitos (más likes) arriba, filtrable por vibe.
  const scrapedPhotos = useMemo(() => {
    let rows = scrapedRows.filter((r) => r.interest !== 'descartada');
    // Filtro efectivo: si esta vista no tiene videos, ignoramos el chip (así no queda trabada en 'videos' con la grilla vacía).
    const eff = rows.some((r) => r.media_type === 'video') ? mediaFilter : 'todo';
    if (eff === 'fotos') rows = rows.filter((r) => r.media_type !== 'video');
    else if (eff === 'videos') rows = rows.filter((r) => r.media_type === 'video');
    if (vibe !== 'Todos' && vibeCounts[vibe]) rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [scrapedRows, vibe, vibeCounts, mediaFilter, baulSearch, baulSort]);
  const scrapedGroups = useMemo(() => dayGroups(scrapedPhotos.slice(0, visN)), [scrapedPhotos, visN]);
  // Cuántos videos hay scrapeados para esta modelo (para mostrar el chip solo si tiene sentido).
  const scrapedVideoCount = useMemo(() => scrapedRows.filter((r) => r.media_type === 'video' && r.interest !== 'descartada').length, [scrapedRows]);

  // Contadores de los chips (Guías respeta el filtro por modelo).
  const baulCounts = useMemo(() => ({
    guias: (baulModel ? guideRows.filter((r) => r.creator_id === baulModel) : guideRows).filter((r) => r.interest !== 'descartada').length,
    reales: realRows.filter((r) => r.interest !== 'descartada').length,
    favoritas: [...guideRows, ...realRows].filter((r) => r.interest === 'favorita').length,
  }), [guideRows, realRows, baulModel]);

  // Modelos que tienen guías (para el filtro "por modelo").
  const guideModels = useMemo(() => {
    const m = new Map(); guideRows.forEach((r) => { if (r.creator_id) m.set(r.creator_id, (m.get(r.creator_id) || 0) + 1); });
    return [...m.entries()].map(([id, n]) => ({ id, n, name: nameById[id] || 'Modelo' })).sort((a, b) => b.n - a.n);
  }, [guideRows, nameById]);

  // TODO lo scrapeado de IG (todas las modelos) — para el botón global "Buscar en IG" del selector.
  // Grilla global = lo de la MESA (sin lo que la IA sacó ni lo descartado), sin repetidas → mismo número que «en la mesa».
  // Sin repetidas POR MODELO (misma regla que «en la mesa»): si dos modelos comparten una foto, cuenta en las dos.
  const scrapGlobalDeduped = useMemo(() => mesaMedia(scrapedGlobal), [scrapedGlobal]);
  const scrapGlobalVideoCount = useMemo(() => scrapGlobalDeduped.filter((r) => r.media_type === 'video').length, [scrapGlobalDeduped]);
  const scrapGlobalModels = useMemo(() => {
    const m = new Map(); scrapGlobalDeduped.forEach((r) => { if (r.creator_id) m.set(r.creator_id, (m.get(r.creator_id) || 0) + 1); });
    return [...m.entries()].map(([id, n]) => ({ id, n, name: nameById[id] || 'Modelo' })).sort((a, b) => b.n - a.n);
  }, [scrapGlobalDeduped, nameById]);
  const scrapGlobalRows = useMemo(() => {
    let rows = scrapGlobalDeduped;
    const eff = rows.some((r) => r.media_type === 'video') ? mediaFilter : 'todo';
    if (eff === 'fotos') rows = rows.filter((r) => r.media_type !== 'video');
    else if (eff === 'videos') rows = rows.filter((r) => r.media_type === 'video');
    if (baulModel) rows = rows.filter((r) => r.creator_id === baulModel);
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${nameById[r.creator_id] || ''} ${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [scrapGlobalDeduped, mediaFilter, baulModel, baulSearch, baulSort, nameById]);
  const scrapGlobalGroups = useMemo(() => dayGroups(scrapGlobalRows.slice(0, visN)), [scrapGlobalRows, visN]);
  // Agrupado por DÍA (Hoy · Ayer · fecha) para la biblioteca.
  const pickGroups = useMemo(() => {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = startOf(new Date());
    const label = (ts) => {
      if (!ts) return 'Sin fecha';
      const d = new Date(ts);
      const diff = Math.round((today - startOf(d)) / 86400000);
      if (diff === 0) return 'Hoy';
      if (diff === 1) return 'Ayer';
      return d.toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    const groups = []; let cur = null;
    libPhotos.slice(0, visN).forEach((r) => {
      const lbl = label(r.created_at);
      if (!cur || cur.label !== lbl) { cur = { label: lbl, rows: [] }; groups.push(cur); }
      cur.rows.push(r);
    });
    return groups;
  }, [libPhotos, visN]);

  // Tarjeta de foto del baúl (vista "Todas"): mismos gestos + estrella de favorita.
  const renderTodaCard = (r) => {
    const on = queue.includes(r.url);
    const fav = r.interest === 'favorita';
    const isVid = r.media_type === 'video' && r.video_url;
    return (
      <div key={r.id} onClick={() => (isVid ? setVideoPlay({ url: r.video_url, poster: r.url }) : setDetail(r))}
        className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-ink-2 transition-all ${on ? 'border-brand ring-2 ring-brand/50' : 'border-line hover:border-brand/40'}`}>
        <img src={r.url} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" />
        {isVid && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play size={18} className="fill-current" /></span></span>}
        <button type="button" title="Seleccionar" onClick={(e) => { e.stopPropagation(); toggleQueue(r.url); }}
          className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${on ? 'border-brand bg-brand text-on-accent' : 'border-white/60 bg-black/50 text-white/80 hover:bg-black/70'}`}><Check size={13} /></button>
        <button type="button" title={fav ? 'Quitar de favoritas' : 'Marcar favorita'} onClick={(e) => { e.stopPropagation(); markInterest(r, fav ? null : 'favorita'); }}
          className={`absolute right-9 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${fav ? 'border-amber-400 bg-amber-400 text-[#2a1a00]' : 'border-white/50 bg-black/50 text-white/80 opacity-0 hover:bg-black/70 group-hover:opacity-100'}`}><Star size={12} className={fav ? 'fill-current' : ''} /></button>
        <button type="button" title="Sacar (basura)" onClick={(e) => { e.stopPropagation(); markInterest(r, 'descartada'); }}
          className="absolute right-16 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-white/50 bg-black/50 text-white/80 opacity-0 transition-opacity hover:border-rose-400 hover:bg-rose-500 hover:text-white group-hover:opacity-100"><X size={13} /></button>
        <button type="button" title="Info y por qué la elegí" onClick={(e) => { e.stopPropagation(); setDetail(r); }}
          className="absolute bottom-1.5 left-1.5 z-10 grid h-6 w-6 place-items-center rounded-full border border-white/40 bg-black/55 text-white/90 hover:bg-black/80"><Info size={13} /></button>
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {(r.source_platform || r.source_handle)
            ? <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Search size={10} /> Scraping</span>
            : r.kind === 'real'
              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><FolderHeart size={10} /> Real</span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Upload size={10} /> Subida</span>}
          {isVid && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Play size={9} className="fill-current" /> Video</span>}
          {cookingRefs.has(r.url)
            ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Loader2 size={10} className="animate-spin" /> Cocinando…</span>
            : cookedRefs.has(r.url) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-2 py-0.5 text-[10px] font-bold text-white"><Check size={10} /> Hecha</span>}
        </div>
        <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isVid ? (
            <>
              {sel && (r.source_platform || r.source_handle) && (
                <button type="button" title="Hacer este video con la cara de la modelo (Genjutsu)" onClick={(e) => { e.stopPropagation(); cookVideo(r); }} disabled={videoEnq === r.id}
                  className="btn3d inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50">
                  {videoEnq === r.id ? <Loader2 size={12} className="animate-spin" /> : <Flame size={12} />} Cocinar
                </button>
              )}
              <a href={r.video_url} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black/80"><Download size={12} /> Descargar</a>
            </>
          ) : (
            <>
              <button type="button" title="Cocinar réplica (Soul 2.0)" onClick={(e) => { e.stopPropagation(); cookDetail(r, 1); }}
                className="btn3d inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"><Flame size={12} /> Cocinar</button>
              <button type="button" title="Cocinar en carrusel" onClick={(e) => { e.stopPropagation(); setDetailN(4); setDetail(r); }}
                className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black/80"><LayoutGrid size={12} /> Carrusel</button>
            </>
          )}
        </div>
        {(r.likes || r.views || r.source_handle) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">
            <span className="inline-flex items-center gap-1.5">
              {r.views ? <span className="inline-flex items-center gap-0.5 text-sky-300">▶ {fmtLikes(r.views)}</span> : null}
              {r.likes ? <span className="inline-flex items-center gap-0.5"><Heart size={10} className="fill-rose-400 text-rose-400" /> {fmtLikes(r.likes)}</span> : null}
            </span>
            {r.source_handle && <span className="truncate opacity-90">@{r.source_handle}</span>}
          </div>
        )}
      </div>
    );
  };

  // Cargar el perfil de búsqueda (nichos) de la modelo elegida.
  // acctsFor marca de QUÉ modelo es la lista cargada: hasta que llega, agregar/quitar cuentas queda frenado
  // (si no, se guardaría una lista vacía o la de otra modelo encima de sus cuentas guía).
  useEffect(() => {
    let alive = true;
    setAcctsFor(''); setAcctsErr('');
    if (!sel) { setNiches([]); setStyleDesc(''); setAccounts([]); return undefined; }
    (async () => {
      let res;
      try { res = await sb.from('creator_search_profile').select('niches, style_desc, seed_accounts').eq('creator_id', sel).maybeSingle(); } catch (e) { res = { error: { message: e?.message || String(e) } }; }
      if (!alive) return;
      // Si falla la lectura NO se guarda nada (seguimos frenados), pero se avisa con «Reintentar» en vez de girar para siempre.
      if (res.error) { setAcctsErr(res.error.message || 'error de conexión'); return; }
      const data = res.data;
      const seeds = Array.isArray(data?.seed_accounts) ? data.seed_accounts : [];
      setNiches(Array.isArray(data?.niches) ? data.niches : []); setStyleDesc(data?.style_desc || ''); setAccounts(seeds);
      setAllSeeds((m) => ({ ...m, [sel]: seeds })); setAcctsFor(sel);
    })();
    return () => { alive = false; };
  }, [sel, sb, seedsReload]);

  const saveNiches = async (list) => {
    setNiches(list);
    await sb.from('creator_search_profile').upsert({ creator_id: sel, niches: list, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' });
  };
  const saveStyle = async () => { await sb.from('creator_search_profile').upsert({ creator_id: sel, style_desc: styleDesc, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' }); };
  const addNiche = () => { const v = newNiche.trim(); if (!v) return; if (!niches.includes(v)) saveNiches([...niches, v].slice(0, 8)); setNewNiche(''); };
  const doScrape = async () => {
    if (niches.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos un nicho (ej: gótica, playa) para buscar.' }); return; }
    if (asyncRef.current !== false) {
      setScraping(true);
      const r = await startSearch({ kind: 'tema', creator_id: sel, photos: qtyPhotos, videos: qtyVideos });
      setScraping(false);
      if (!r.legacy) {
        if (!r.ok) { setMsg({ kind: 'err', text: r.error }); return; }
        const x = (r.out.jobs || [])[0] || {};
        const who = x.job ? jobWho(x.job) : niches.map((n) => `#${n}`).join(' ');
        setMsg({ kind: 'info', text: x.dedup ? `Ya se está buscando ${who}${x.job ? ` (${jobCounts(x.job)})` : ''}.` : `Lo busco en el servidor: ${who}${x.job ? ` (${jobCounts(x.job)})` : ''}. ${workerLine(r.out.worker_online)}` });
        return;
      }
    }
    return doScrapeLegacy();
  };
  const doScrapeLegacy = async () => {
    setScraping(true); setMsg({ kind: 'info', text: 'Buscando virales en Instagram… (puede tardar 1-2 min)' });
    const out = await callFn('scrape', { creator_id: sel, photos: qtyPhotos, videos: qtyVideos });
    setScraping(false);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || 'No se pudo buscar.' }); return; }
    await loadVault(); loadScrapedGlobal(); loadScrapeRuns();
    setMsg({ kind: 'ok', text: `Encontré ${out.saved} virales para ${selCreator?.full_name}.${out.reviewed ? ` La IA revisó ${out.reviewed} y sacó la basura.` : ''} Aparecen abajo, éxitos arriba.` });
  };

  // Cuentas guía (creadoras de referencia de IG): guardar + traer sus posts.
  const saveAccounts = async (list) => {
    if (!sel || acctsFor !== sel) { setMsg({ kind: 'info', text: 'Esperá un segundo: todavía estoy leyendo las cuentas guía de esta modelo.' }); return false; }
    setAccounts(list); setAllSeeds((m) => ({ ...m, [sel]: list }));
    await sb.from('creator_search_profile').upsert({ creator_id: sel, seed_accounts: list, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' });
    return true;
  };
  // Quitar una cuenta guía de CUALQUIER modelo (también desde «Todas las modelos»). Para otra modelo se relee su lista
  // actual antes de guardar (así no se pisa con una copia vieja).
  const removeAccount = async (cid, h) => {
    if (cid === sel) { if (!acctsReady) return; await saveAccounts(accounts.filter((x) => x !== h)); }
    else {
      const { data, error } = await sb.from('creator_search_profile').select('seed_accounts').eq('creator_id', cid).maybeSingle();
      if (error) { setMsg({ kind: 'err', text: `No se pudo quitar @${h}: ${error.message}` }); return; }
      const list = (Array.isArray(data?.seed_accounts) ? data.seed_accounts : []).filter((x) => normH(x) !== normH(h));
      const { error: e2 } = await sb.from('creator_search_profile').upsert({ creator_id: cid, seed_accounts: list, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' });
      if (e2) { setMsg({ kind: 'err', text: `No se pudo quitar @${h}: ${e2.message}` }); return; }
      setAllSeeds((m) => ({ ...m, [cid]: list }));
    }
    setPrivateAccts((p) => { const q2 = new Set(p); q2.delete(h); return q2; });
  };
  // Acepta pegar VARIAS de una (separadas por coma, espacio o salto de línea). Limpia @ y URLs.
  const addAccount = () => {
    const parts = newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean);
    if (!parts.length) return;
    const merged = [...new Set([...accounts, ...parts])].slice(0, 20);
    saveAccounts(merged); setNewAccount('');
  };
  // Marca/desmarca privadas según lo que devolvió Apify (error_items trae el handle que falló por privada/vacía).
  const flagPrivate = (out, checked) => {
    const bad = new Set((out?.error_items || [])
      .filter((e) => /private|empty|not found|restrict/i.test(`${e?.desc || ''}${e?.error || ''}`))
      .map((e) => String(e?.input || '').replace(/^@/, '').replace(/\/+$/, '').split('/').pop())
      .filter(Boolean));
    setPrivateAccts((prev) => {
      const next = new Set(prev);
      // las que chequeamos y NO fallaron: dejan de estar marcadas como privadas
      checked.forEach((h) => { if (bad.has(h)) next.add(h); else next.delete(h); });
      return next;
    });
    return bad;
  };
  // Guarda POR QUÉ no jaló cada cuenta chequeada (para mostrarlo en su tarjeta). Si jaló, limpia el aviso.
  const noteIssues = (out, checked) => {
    const errByHandle = {};
    (out?.error_items || []).forEach((e) => {
      const h = parseHandle(e?.input || '');
      if (h) errByHandle[h] = `${e?.desc || ''} ${e?.error || ''} ${(Array.isArray(e?.msgs) ? e.msgs.join(' ') : '')}`.toLowerCase();
    });
    setAcctIssue((prev) => {
      const next = { ...prev };
      checked.forEach((h) => {
        const t = errByHandle[h];
        if (t == null) { delete next[h]; return; }
        if (/priv|restrict|login/.test(t)) next[h] = 'Privada — Instagram no la deja ver sin login.';
        else if (/not.?found|no.?exist|doesn|invalid|404/.test(t)) next[h] = 'No existe o mal escrita — revisá el @.';
        else if (/empty|no.?post|sin/.test(t)) next[h] = 'Sin posts públicos usables.';
        else next[h] = 'Instagram la bloqueó o la restringió.';
      });
      return next;
    });
  };
  // UNA búsqueda de UNA cuenta. Fotos y videos van en llamadas SEPARADAS: cada una entra en el tiempo del servidor
  // (juntas se cortaban) y el costo de los videos queda en su propio renglón, a la vista.
  // (camino VIEJO) ¿una búsqueda sincrónica de esta cuenta sigue en el servidor? Las del motor nuevo se ven por activeJobFor.
  const recentRunning = (cid, h) => runsOfAcct(cid, h).some((r) => !r.requested && r.status === 'running' && Date.now() - (Date.parse(r.run_at) || 0) < 10 * 60 * 1000);
  const refreshLater = () => { setTimeout(() => { loadVault(); loadScrapeRuns(); loadScrapedGlobal(); }, 120000); };
  const scrapeOne = async (cid, h) => {
    const calls = [];
    if (qtyPhotos > 0) calls.push({ photos: qtyPhotos, videos: 0 });
    if (qtyVideos > 0) calls.push({ photos: 0, videos: qtyVideos });
    const agg = { ok: false, saved: 0, savedVideos: 0, reviewed: 0, cost: 0, error_items: [], errors: [], timeout: false, videosSkipped: false };
    for (const p of calls) {
      const out = await callFn('scrape_accounts', { creator_id: cid, accounts: [h], ...p });
      if (out.timeout) { agg.timeout = true; continue; }
      if (!out.ok) { agg.errors.push(out.error || 'error'); continue; }
      agg.ok = true;
      agg.saved += Number(out.saved) || 0; agg.savedVideos += Number(out.savedVideos) || 0; agg.reviewed += Number(out.reviewed) || 0;
      agg.cost += (Number(out.cost_real ?? out.cost_est) || 0) + (Number(out.cost_ai) || 0);
      (Array.isArray(out.error_items) ? out.error_items : []).forEach((e) => agg.error_items.push(e));
      if (out.videos_skipped) agg.videosSkipped = true;
    }
    return agg;
  };
  const timeoutText = (h) => `@${h}: el navegador dejó de esperar, pero la búsqueda puede seguir en el servidor (Apify ya la está cobrando). En 2-3 min aparece sola: no la vuelvas a buscar todavía.`;
  // Motor nuevo: UNA llamada crea una búsqueda por cuenta (fotos y videos juntos, cada una con su gasto real) y el
  // servidor las corre de a pocas (cupo de Apify) aunque cierres la página. { legacy:true } = hay que buscar como antes.
  const startAccounts = async (cid, handles) => {
    const busyNow = handles.filter((h) => activeJobFor(cid, h));
    const list = handles.filter((h) => !activeJobFor(cid, h));
    if (!list.length) { setMsg({ kind: 'info', text: `Ya se está buscando ${busyNow.map((h) => { const j = activeJobFor(cid, h); return `@${h}${j ? ` (${jobCounts(j)})` : ''}`; }).join(', ')}.` }); return { ok: true }; }
    setCheckingAcct(list.length === 1 ? list[0] : null);
    const r = await startSearch({ kind: 'account', creator_id: cid, accounts: list, photos: qtyPhotos, videos: qtyVideos });
    setCheckingAcct(null);
    if (r.legacy) return r;
    if (!r.ok) { setMsg({ kind: 'err', text: r.error }); return r; }
    const js = r.out.jobs || [];
    const fresh = js.filter((x) => x.job_id && !x.dedup && !x.skipped);
    const dups = js.filter((x) => x.dedup); const skipped = js.filter((x) => x.skipped);
    const parts = [];
    if (fresh.length === 1) { const x = fresh[0]; parts.push(`Lo busco en el servidor: @${x.handle}${x.job ? ` (${jobCounts(x.job)})` : ''}.`); }
    else if (fresh.length > 1) { const run = fresh.filter((x) => x.status === 'running').length; parts.push(`Busco ${fresh.length} cuentas en el servidor (${run} a la vez, ${fresh.length - run} en cola). Ves el avance en cada tarjeta.`); }
    if (dups.length || busyNow.length) parts.push(`Ya se estaban buscando: ${[...dups.map((x) => '@' + x.handle), ...busyNow.map((h) => '@' + h)].join(', ')} (no las repetí).`);
    if (skipped.length) parts.push(`Salteé ${skipped.map((x) => '@' + x.handle).join(', ')}: ${skipped.length === 1 ? 'está marcada' : 'están marcadas'} como privada${skipped.length === 1 ? '' : 's'} o inexistente${skipped.length === 1 ? '' : 's'}.`);
    if (fresh.length) parts.push(workerLine(r.out.worker_online));
    setMsg({ kind: fresh.length ? 'info' : skipped.length ? 'err' : 'info', text: parts.join(' ') });
    return r;
  };
  // «Buscar en todas»: motor nuevo → todas de una (el servidor respeta el cupo) · motor viejo → una cuenta por vez.
  const doScrapeAccounts = async () => {
    if (!acctsReady) { setMsg({ kind: 'info', text: 'Esperá un segundo: todavía estoy leyendo las cuentas guía de esta modelo.' }); return; }
    const cid = sel;
    // Si escribió una cuenta y no la agregó con Enter, la tomamos igual (no lo hacemos renegar).
    const pending = parseHandle(newAccount);
    let list = accounts;
    if (pending && !accounts.includes(pending)) { list = [...new Set([...accounts, pending])].slice(0, 20); if (!(await saveAccounts(list))) return; setNewAccount(''); }
    if (list.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos una cuenta guía (ej: @creadora) arriba.' }); return; }
    if (qtyPhotos + qtyVideos <= 0) { setMsg({ kind: 'info', text: 'Pedí al menos 1 foto o 1 video.' }); return; }
    if (asyncRef.current !== false) { const r = await startAccounts(cid, list); if (!r.legacy) return; }
    return doScrapeAccountsLegacy(cid, list);
  };
  // (camino VIEJO) UNA cuenta por vez (así el gasto real de cada búsqueda queda en SU tarjeta, y no se salta ninguna:
  // el motor corta en 8 cuentas por llamada).
  const doScrapeAccountsLegacy = async (cid, list) => {
    setScrapingAcc(true);
    let savedP = 0, savedV = 0, cost = 0, okN = 0; const failed = []; const privs = []; const slow = []; const busyNow = [];
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      if (recentRunning(cid, h)) { busyNow.push(h); continue; } // ya se está buscando en el servidor → no pagar dos veces
      setBulkProg({ i: i + 1, n: list.length }); setCheckingAcct(h);
      setMsg({ kind: 'info', text: `Buscando @${h} (${i + 1} de ${list.length})… una cuenta por vez${qtyPhotos > 0 && qtyVideos > 0 ? ', primero fotos y después videos' : ''}. Puede tardar varios minutos, no cierres.` });
      const out = await scrapeOne(cid, h);
      if (out.timeout) slow.push(h);
      if (!out.ok) { if (!out.timeout) failed.push(h); continue; }
      okN += 1; savedP += out.saved; savedV += out.savedVideos; cost += out.cost;
      const bad = flagPrivate(out, [h]); noteIssues(out, [h]); if (bad.has(h)) privs.push(h);
    }
    setCheckingAcct(null); setBulkProg(null); setScrapingAcc(false);
    await loadVault(); loadScrapeRuns(); loadScrapedGlobal();
    if (slow.length) refreshLater();
    const parts = [`Listo: ${okN} de ${list.length} cuentas. Traje ${savedP} foto${savedP === 1 ? '' : 's'}${savedV ? ` y ${savedV} video${savedV === 1 ? '' : 's'}` : ''} (gasto ≈ ${usdS(cost)}).`];
    if (privs.length) parts.push(`Privadas/vacías: ${privs.map((h) => '@' + h).join(', ')}.`);
    if (slow.length) parts.push(`Siguen en el servidor: ${slow.map((h) => '@' + h).join(', ')} — aparecen en 2-3 min, no las vuelvas a buscar todavía.`);
    if (busyNow.length) parts.push(`Ya se estaban buscando: ${busyNow.map((h) => '@' + h).join(', ')} (no las repetí).`);
    if (failed.length) parts.push(`No se pudo: ${failed.map((h) => '@' + h).join(', ')} — probá «Buscar más» en esa tarjeta.`);
    setMsg({ kind: savedP + savedV ? 'ok' : 'info', text: parts.join(' ') });
  };
  // Re-chequear UNA sola cuenta (traer su último contenido) sin tocar las demás.
  const checkOneAccount = async (handle) => {
    if (qtyPhotos + qtyVideos <= 0) { setMsg({ kind: 'info', text: 'Pedí al menos 1 foto o 1 video.' }); return; }
    if (asyncRef.current !== false) { const r = await startAccounts(sel, [handle]); if (!r.legacy) return; }
    return checkOneAccountLegacy(handle);
  };
  const checkOneAccountLegacy = async (handle) => {
    if (recentRunning(sel, handle)) { setMsg({ kind: 'info', text: `@${handle} ya se está buscando en el servidor. Esperá 2-3 min antes de volver a buscarla (si no, Apify cobra dos veces).` }); return; }
    if (qtyPhotos + qtyVideos <= 0) { setMsg({ kind: 'info', text: 'Pedí al menos 1 foto o 1 video.' }); return; }
    setCheckingAcct(handle); setMsg({ kind: 'info', text: `Chequeando @${handle}…${qtyPhotos > 0 && qtyVideos > 0 ? ' primero fotos y después videos,' : ''} (puede tardar 1-3 min)` });
    const out = await scrapeOne(sel, handle);
    setCheckingAcct(null);
    if (out.timeout) refreshLater();
    if (!out.ok) { setMsg(out.timeout ? { kind: 'info', text: timeoutText(handle) } : { kind: 'err', text: out.errors[0] || `No se pudo chequear @${handle}.` }); loadScrapeRuns(); return; }
    await loadVault();
    const bad = flagPrivate(out, [handle]); noteIssues(out, [handle]); loadScrapeRuns(); loadScrapedGlobal();
    const got = [out.saved ? `${out.saved} foto${out.saved === 1 ? '' : 's'} nueva${out.saved === 1 ? '' : 's'}` : '', out.savedVideos ? `${out.savedVideos} video${out.savedVideos === 1 ? '' : 's'} nuevo${out.savedVideos === 1 ? '' : 's'}` : ''].filter(Boolean).join(' y ');
    const extra = [out.reviewed ? ` (la IA revisó ${out.reviewed})` : '', out.timeout ? ` Una parte sigue en el servidor: aparece en 2-3 min.` : '', out.errors.length ? ` No se pudo una parte: ${out.errors[0]}` : '', out.videosSkipped ? ' No alcanzó el tiempo para los videos: buscalos aparte.' : ''].join('');
    setMsg({ kind: got ? 'ok' : 'info', text: got ? `@${handle}: ${got}.${extra}` : bad.has(handle) ? `@${handle} es privada o está vacía: Instagram no la deja ver. Quitala y probá otra pública.` : `@${handle}: sin nada nuevo usable por ahora.${extra}` });
  };

  // Curación de la mesa
  // Una foto de IG puede estar repetida (la misma foto con otra URL): el cambio va a TODAS sus copias de esa modelo,
  // así la copia de al lado no «vuelve» a la mesa y los números bajan de verdad.
  const copyIdsOf = (rows) => {
    const ids = new Set(rows.map((r) => r.id));
    const keys = new Set(rows.filter(isScraped).map((r) => `${r.creator_id}|${mediaKeyT(r)}`));
    if (keys.size) [...vault, ...scrapedGlobal].forEach((r) => { if (isScraped(r) && keys.has(`${r.creator_id}|${mediaKeyT(r)}`)) ids.add(r.id); });
    return [...ids];
  };
  const markInterest = async (row, val) => {
    const ids = copyIdsOf([row]); const idSet = new Set(ids);
    await sb.from('creator_vault').update({ interest: val }).in('id', ids);
    setVault((v) => v.map((r) => (idSet.has(r.id) ? { ...r, interest: val } : r)));
    setScrapedGlobal((v) => v.map((r) => (idSet.has(r.id) ? { ...r, interest: val } : r)));
    if (val === 'descartada') { setDetail(null); setQueue((k) => k.filter((u) => u !== row.url)); }
  };
  // Sacar la basura EN LOTE: descarta todas las seleccionadas (desaparecen de la mesa) de una.
  const bulkDiscard = async () => {
    const picked = vault.filter((r) => queue.includes(r.url));
    if (!picked.length) { setMsg({ kind: 'info', text: 'No hay fotos seleccionadas.' }); return; }
    const ids = copyIdsOf(picked); const idSet = new Set(ids);
    await sb.from('creator_vault').update({ interest: 'descartada' }).in('id', ids);
    setVault((v) => v.map((r) => (idSet.has(r.id) ? { ...r, interest: 'descartada' } : r)));
    setScrapedGlobal((v) => v.map((r) => (idSet.has(r.id) ? { ...r, interest: 'descartada' } : r)));
    setQueue([]);
    setMsg({ kind: 'ok', text: `${picked.length} foto(s) fuera de la mesa (basura).` });
  };
  const moreLikeThis = async (row) => {
    const niche = row.vibe || '';
    if (!niche) { setMsg({ kind: 'info', text: 'Esta foto no tiene nicho para buscar similares.' }); return; }
    setDetail(null);
    if (asyncRef.current !== false) {
      setScraping(true);
      const r = await startSearch({ kind: 'tema', creator_id: sel, niches: [niche], photos: 24, videos: 0 });
      setScraping(false);
      if (!r.legacy) {
        if (!r.ok) { setMsg({ kind: 'err', text: r.error }); return; }
        const x = (r.out.jobs || [])[0] || {};
        setMsg({ kind: 'info', text: x.dedup ? `Ya se está buscando #${niche}.` : `Busco más como esta en el servidor (#${niche}, fotos 0/24). ${workerLine(r.out.worker_online)}` });
        return;
      }
    }
    setScraping(true); setMsg({ kind: 'info', text: `Buscando más como esta (#${niche})…` });
    const out = await callFn('scrape', { creator_id: sel, niches: [niche] });
    setScraping(false);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || 'No se pudo buscar.' }); return; }
    await loadVault(); loadScrapedGlobal(); loadScrapeRuns();
    setMsg({ kind: 'ok', text: `Traje ${out.saved} similares a "#${niche}".` });
  };
  const cookFromDetail = (row) => { if (!queue.includes(row.url)) setQueue((k) => [...k, row.url]); setDetail(null); setMsg({ kind: 'info', text: 'Agregada a la selección. Dale "Cocinar" abajo (o elegí más).' }); };
  // Cocina directo desde la ficha. Si total>1: cocina la réplica + (total-1) variaciones automáticas (mismo lugar/outfit, otras poses).
  const cookDetail = async (row, total) => {
    if (!selReady) { setMsg({ kind: 'err', text: `${selCreator?.full_name || 'Esta modelo'} todavía no tiene su soul enlazada. Avisame y la enlazo.` }); return; }
    if (selBlock) { setMsg({ kind: 'err', text: selBlock }); return; }
    askNotify();
    setEnq(true);
    const { error } = await sb.from('generations').insert({ creator_id: sel, reference_url: row.url, status: 'queued', engine: 'soul2', model: 'text2image_soul_v2', auto_carousel: Math.max(0, total - 1) });
    setEnq(false);
    if (error) { setMsg({ kind: 'err', text: `No se pudo encolar: ${error.message}` }); return; }
    setDetail(null); setDetailN(1); loadGens();
    setMsg({ kind: 'ok', text: total > 1 ? `🍳 Cocinando carrusel (réplica + ${total - 1} variaciones). Seguí eligiendo — mirá «Cocinando» abajo a la derecha.` : '🍳 Cocinando. Seguí eligiendo las que quieras — mirá «Cocinando» abajo a la derecha; tocalo cuando quieras ir a verlas.' });
  };

  // Cocinar un REEL con la cara de la modelo (video, Genjutsu motion transfer). Encola un job de video.
  const cookVideo = async (row) => {
    const ref = row.video_url || row.url;
    if (!sel) { setMsg({ kind: 'err', text: 'Entrá a una modelo primero.' }); return; }
    if (!ref) { setMsg({ kind: 'err', text: 'Ese video no tiene archivo para cocinar.' }); return; }
    if (selBlock) { setMsg({ kind: 'err', text: selBlock }); return; }
    if (selBal != null && selBal < VIDEO_MIN_CREDITS) { setMsg({ kind: 'err', text: `Higgsfield casi sin créditos${selAcct?.label ? ` en «${selAcct.label}»` : ''}: quedan ${selBal.toFixed(1)} y un video necesita ~${VIDEO_MIN_CREDITS}. Recargá créditos antes de cocinar video.` }); return; }
    askNotify();
    setVideoEnq(row.id);
    const out = await callFn('make_video', { creator_id: sel, reference_url: ref });
    setVideoEnq(null);
    if (!out?.ok) { setMsg({ kind: 'err', text: out?.error || 'No se pudo encolar el video.' }); return; }
    loadGens();
    setMsg({ kind: 'ok', text: `🎬 Cocinando el video con ${selCreator?.stage_name || selCreator?.full_name || 'la modelo'} (Genjutsu). Tarda unos minutos — seguí acá; mirá «Cocinando» abajo a la derecha y te aviso al terminar.` });
  };
  // Traer un REEL puntual por su LINK (no por cuenta). cook=true lo cocina de una con la modelo.
  const fetchReelLink = async (cook) => {
    if (!sel) { setMsg({ kind: 'err', text: 'Entrá a una modelo primero.' }); return; }
    const link = reelLink.trim();
    if (!/instagram\.com/i.test(link)) { setMsg({ kind: 'err', text: 'Pegá el link de un reel de Instagram.' }); return; }
    setReelBusy(true);
    const out = await callFn('fetch_reel', { creator_id: sel, url: link, cook: !!cook });
    setReelBusy(false);
    if (!out?.ok) { setMsg({ kind: 'err', text: out?.error || 'No se pudo traer el reel.' }); return; }
    setReelLink('');
    // Apify tardó más que lo que espera el servidor: la búsqueda sigue sola (y lo cocina si se pidió).
    if (out.pending) {
      if (out.job_id && !out.dedup) mineRef.current.add(out.job_id);
      if (asyncRef.current == null) setAsync(true);
      refreshJobs();
      setMsg({ kind: 'info', text: `Apify sigue bajando el reel. Aparece solo en «Videos»${cook ? ' y se manda a cocinar solo' : ''}.` });
      return;
    }
    await loadVault(); loadGens(); loadScrapedGlobal(); loadScrapeRuns();
    if (cook && out.cooking) { setMsg({ kind: 'ok', text: `🎬 Reel traído y cocinando con ${selCreator?.stage_name || selCreator?.full_name || 'la modelo'} (Genjutsu). Seguí acá; mirá «Cocinando» abajo a la derecha y te aviso al terminar.` }); }
    else { setMediaFilter('videos'); setMsg({ kind: out.warn ? 'info' : 'ok', text: out.warn || 'Reel traído. Está en Videos, tocá «Cocinar».' }); }
  };
  // Miniatura que sirve para FOTO o VIDEO: si es video, muestra su PRIMER FRAME (no un <img> negro).
  // El `#t=0.1` fuerza al navegador a pintar el frame de 0.1s como portada aunque no esté corriendo.
  const isVidUrl = (u) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u || '') || /\/video\//.test(u || '');
  const mediaTile = (url, cls) => (
    !url ? <div className={`${cls} bg-hair/10`} />
      : isVidUrl(url) ? <video src={`${String(url).split('#')[0]}#t=0.1`} muted playsInline preload="metadata" className={cls} />
        : <img src={url} alt="" loading="lazy" decoding="async" className={cls} />
  );
  // Tarjeta de AUDIO (voz) para las grillas de Resultados: etiqueta + guion corto + reproductor.
  // Los clicks del <audio> NO suben a la tarjeta (si no, al darle play te abriría la pestaña Voz).
  const audioTile = (g, cls) => {
    const t = voiceType(g);
    return (
      <div className={`${cls} relative flex flex-col gap-1.5 bg-gradient-to-b from-brand/[0.08] to-transparent p-2.5 pb-7 text-left`}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-paper">
          <AudioLines size={14} className="shrink-0 text-brand" />
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
          <span className="truncate">{t.label}</span>
          <span className="ml-auto shrink-0 font-mono text-[9px] text-paper-dim">{voiceLang(g).flag} {voiceLang(g).label}</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-paper-mute">{g.prompt || 'Audio de voz'}</p>
        <div className="grid flex-1 place-items-center">
          {vRow[g.id] === 'regen'
            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200"><Loader2 size={14} className="animate-spin" /> Generando…</span>
            : <AudioLines size={34} className="text-brand/25" />}
        </div>
        {g.result_url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls preload="none" src={g.result_url} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="h-8 w-full" />
        )}
      </div>
    );
  };
  // Media de una generación (foto, video o audio) para las tarjetas de Resultados.
  const genMedia = (g, cls) => (
    isAudioGen(g) ? audioTile(g, cls)
      : !g.result_url ? <div className={`${cls} bg-hair/10`} />
        : g.media_type === 'video' ? <video src={`${String(g.result_url).split('#')[0]}#t=0.1`} muted playsInline preload="metadata" className={cls} />
          : <img src={g.result_url} alt="" loading="lazy" decoding="async" className={cls} />
  );
  // Audio → no hay Antes/Después: te llevo a la pestaña Voz, a ESE clip.
  const openGen = (g) => {
    if (isAudioGen(g)) { setSubtab('voz'); setVFocus(g.id); return; }
    if (g.media_type === 'video' && g.result_url) setVideoPlay({ url: g.result_url, poster: null, refUrl: (g.reference_url && /\.mp4|video/i.test(g.reference_url)) ? g.reference_url : null }); else setCompare({ root: rootOf(g), creator_id: g.creator_id });
  };

  const enterModel = (id) => { setSel(id); setSubtab('cocinar'); setQueue([]); setMsg(null); setBaulFilter('guias'); setBaulModel(''); setShowUpload(false); setVibe('Todos'); setVMsg(null); setVFocus(null); };

  // ── Página «Cuentas guía» (UNA sola, para las dos entradas: el selector de modelos y «Buscar en IG» de una modelo) ──
  // opts.model: '' = «Todas las modelos» · id = esa modelo · undefined = la que esté abierta. «Volver» deja todo como estaba.
  const openAcctPage = (opts = {}) => {
    setAcctBack({ sel, subtab, scrapView });
    setAcctDetail(opts.detail || null); setAcctSearch(''); setAcctDate('todas');
    if (opts.model !== undefined && opts.model !== sel) { setSel(opts.model); if (opts.model) setSubtab('buscar'); }
    setAcctView(true);
  };
  const closeAcctPage = () => {
    const b = acctBack;
    setAcctView(false); setAcctDetail(null); setAcctBack(null);
    if (!b) return;
    if (b.sel !== sel) setSel(b.sel);
    if (b.sel) setSubtab(b.subtab || 'buscar');
    setScrapView(!!b.scrapView);
  };
  // Selector de arriba: «Todas las modelos» o una modelo (la misma página, con sus cuentas, agregar, buscar e historial).
  const pickAcctModel = (id) => { setAcctDetail(null); setAcctSearch(''); if (id !== sel) { setSel(id); if (id) setSubtab('buscar'); if (!scrapingAcc && !checkingAcct && !backfilling) setMsg(null); } };
  const openAcctDetail = (cid, h) => { if (cid !== sel) pickAcctModel(cid); setAcctDetail(h); };
  // «Buscar más» de una tarjeta: abre el paso de cantidades (fotos/videos) para ESA cuenta (y esa modelo).
  const buscarMas = (cid, h) => { if (cid !== sel) pickAcctModel(cid); setNewAccount(h); setWiz({ step: 3, mode: 'cuenta' }); };
  // Admin: completar el costo REAL de corridas viejas desde la lista de corridas de Apify (acción scrape_cost_backfill).
  const runBackfill = async () => {
    setBackfilling(true); setMsg({ kind: 'info', text: 'Buscando en Apify el costo real de cada búsqueda registrada…' });
    const out = await callFn('scrape_cost_backfill');
    setBackfilling(false);
    if (!out.ok) { setMsg({ kind: 'err', text: /desconocida/i.test(String(out.error || '')) ? 'Falta actualizar el motor (función higgsfield) para traer el costo real.' : (out.error || 'No se pudo traer el costo real.') }); return; }
    runsLegacyRef.current = false; // la migración ya está (el motor la usó) → volver a leer las columnas de costo real
    loadScrapeRuns(); loadApifyBill();
    const t = [`Listo: ${out.matched || 0} búsqueda${out.matched === 1 ? '' : 's'} vieja${out.matched === 1 ? '' : 's'} con su costo real de Apify (${usdS(out.matched_usd)}).`];
    if (out.rechecked) t.push(`${out.rechecked} corrida(s) nueva(s) completada(s).`);
    if (out.unmatched_rows?.length) t.push(`${out.unmatched_rows.length} no se pudieron atar con seguridad a su corrida de Apify (misma cuenta y hora): siguen como estimado.`);
    if (out.unclaimed_count) t.push(`Apify tiene ${out.unclaimed_count} corrida(s) que la app no registró (${usdS(out.unclaimed_usd)}): pruebas, lo de antes del 28 sep o búsquedas cortadas.`);
    setMsg({ kind: 'ok', text: t.join(' ') });
  };
  const toggleQueue = (url) => setQueue((k) => k.includes(url) ? k.filter((u) => u !== url) : [...k, url]);

  const enqueue = async () => {
    if (!selReady) { setMsg({ kind: 'err', text: `${selCreator?.full_name || 'Esta modelo'} todavía no tiene su soul enlazada. Avisame y la enlazo.` }); return; }
    if (selBlock) { setMsg({ kind: 'err', text: selBlock }); return; }
    if (queue.length === 0) { setMsg({ kind: 'info', text: 'Tocá al menos una foto para seleccionarla.' }); return; }
    askNotify();
    setEnq(true);
    const rows = queue.map((u) => ({ creator_id: sel, reference_url: u, status: 'queued', engine: 'soul2', model: 'text2image_soul_v2' }));
    const { error } = await sb.from('generations').insert(rows);
    setEnq(false);
    if (error) { setMsg({ kind: 'err', text: `No se pudo encolar: ${error.message}` }); return; }
    const n = queue.length;
    setQueue([]); loadGens();
    setMsg({ kind: 'ok', text: `🍳 ${n} foto(s) a cocinar con la soul de ${selCreator?.full_name || 'la modelo'}. Seguí eligiendo — mirá «Cocinando» abajo a la derecha; tocalo cuando quieras verlas.` });
  };

  const onUpload = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, 60);
    if (list.length === 0) return;
    setUploading(true); setMsg(null);
    try {
      for (const file of list) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `vault/${sel}/ref/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from('proposal-photos').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from('proposal-photos').getPublicUrl(path);
        await sb.from('creator_vault').insert({ creator_id: sel, kind: 'ref', url: pub.publicUrl, caption: file.name });
      }
      await loadVault();
      setShowUpload(false); setBaulFilter('guias'); setBaulModel('');
      setMsg({ kind: 'ok', text: `${list.length} guía(s) al baúl. Ya están arriba de todo, listas para elegir.` });
    } catch (e) { setMsg({ kind: 'err', text: `No se pudo subir: ${e?.message || e}` }); }
    setUploading(false);
  };

  // APROBAR / DESCARTAR — OPTIMISTA: la tarjeta (y el pop-up) cambian AL INSTANTE; el server (que tarda:
  // limpia metadata y re-hospeda) confirma de fondo. Si falla, vuelvo esa fila a como estaba y aviso.
  // Audio → motor de voz (approve_audio), NUNCA approve_gen.
  const dropDecideErr = (id) => setDecideErr((m) => { if (!m[id]) return m; const n = { ...m }; delete n[id]; return n; });
  const decide = (g, approve, keepOpen = false) => {
    if (!g?.id || decideRef.current[g.id]) return; // ya se está aprobando/descartando: ignoro el doble clic
    if (isAudioGen(g) && vRow[g.id]) return;       // ese audio se está rehaciendo: esperá la toma nueva
    const prevStatus = g.status;
    const nextStatus = approve ? 'approved' : 'rejected';
    const isAud = isAudioGen(g);
    decideRef.current = { ...decideRef.current, [g.id]: nextStatus };
    setDeciding((d) => ({ ...d, [g.id]: approve ? 'approve' : 'reject' }));
    setGens((list) => list.map((x) => (x.id === g.id ? { ...x, status: nextStatus } : x)));
    if (isAud) setVRowErr((m) => { if (!m[g.id]) return m; const n = { ...m }; delete n[g.id]; return n; });
    dropDecideErr(g.id);
    if (!keepOpen) setCompare(null);
    setMsg({ kind: approve ? 'ok' : 'info', text: approve ? (isAud ? 'Aprobado — audio limpio (sin metadata) al baúl ✓' : 'Aprobada — foto limpia (sin metadata) al baúl ✓') : (isAud ? 'Audio descartado.' : 'Descartada.') });
    (async () => {
      let out;
      try {
        out = isAud
          ? await callVoice('approve_audio', { generation_id: g.id, approve })
          : await callFn('approve_gen', { generation_id: g.id, approve });
      } catch (e) { out = { ok: false, error: e?.message || String(e) }; }
      const clear = () => {
        const n = { ...decideRef.current }; delete n[g.id]; decideRef.current = n;
        setDeciding((d) => { const m = { ...d }; delete m[g.id]; return m; });
      };
      if (!out?.ok) {
        clear();
        setGens((list) => list.map((x) => (x.id === g.id ? { ...x, status: prevStatus } : x)));
        const err = `No se pudo ${approve ? 'aprobar' : 'descartar'}: ${out?.error || 'error del servidor'}. La dejé como estaba.`;
        if (isAud) setVRowErr((m) => ({ ...m, [g.id]: err }));
        setDecideErr((m) => ({ ...m, [g.id]: err })); // también junto a la foto: el banner de arriba queda tapado por el pop-up / fuera de pantalla
        setMsg({ kind: 'err', text: err });
        loadGens(); // releo la verdad del server por si llegó a aplicar algo a medias
        return;
      }
      try { await loadGens(); } catch { /* noop */ } finally { clear(); } // refresco callado (la fila ya muestra el estado nuevo; el override la cubre hasta acá)
    })();
  };

  // AUDIO: rehacer / reintentar = nueva toma EN EL LUGAR (mismo id) con el motor de voz. Nunca a la cola del worker.
  const mergeGen = (row) => {
    if (!row?.id) return;
    setGens((list) => (list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? { ...x, ...row } : x)) : [row, ...list]));
  };
  const regenRef = useRef(new Set()); // ids que se están rehaciendo (guard contra doble clic antes del re-render)
  const regenAudio = async (g) => {
    if (!g?.id || regenRef.current.has(g.id) || decideRef.current[g.id]) return;
    regenRef.current.add(g.id);
    setVRow((m) => ({ ...m, [g.id]: 'regen' }));
    setVRowErr((m) => { if (!m[g.id]) return m; const n = { ...m }; delete n[g.id]; return n; });
    dropDecideErr(g.id);
    let out;
    try { out = await callVoice('make_audio', { regen_of: g.id, creator_id: g.creator_id }); } catch (e) { out = { ok: false, error: e?.message || String(e) }; }
    regenRef.current.delete(g.id);
    setVRow((m) => { const n = { ...m }; delete n[g.id]; return n; });
    if (out?.generation) mergeGen(out.generation);
    if (!out?.ok) {
      const err = out?.error || 'No se pudo rehacer el audio.';
      setVRowErr((m) => ({ ...m, [g.id]: err }));
      setMsg({ kind: 'err', text: `Audio: ${err}` });
      return;
    }
    setMsg({ kind: 'ok', text: '🔄 Audio rehecho — nueva toma lista para escuchar y aprobar.' });
    loadVoiceStatus();
  };

  // Reintentar una rechazada: la vuelve a la cola. (Audio → nueva toma con el motor de voz, NO a la cola.)
  const retry = async (g) => {
    if (isAudioGen(g)) { regenAudio(g); return; }
    const rb = acctBlock(g.creator_id); if (rb) { setMsg({ kind: 'err', text: rb }); return; }
    dropDecideErr(g.id);
    await sb.from('generations').update({ status: 'queued', note: null, result_url: null }).eq('id', g.id);
    loadGens();
    setMsg({ kind: 'info', text: 'La mandé de nuevo a la cola.' });
  };
  // REHACER: cocina de nuevo ESTA misma (mismo viral de referencia) → sale otra versión y reemplaza la actual.
  // tweak = ajuste opcional en palabras (ej: "más glúteo", "más sonrisa"); viaja como note='tweak:...' y el worker lo mete al prompt.
  // Audio: el ajuste se ignora (para cambiar el guion está «Editar» en la pestaña Voz).
  const redo = async (g, tweak = '') => {
    if (isAudioGen(g)) { regenAudio(g); return; }
    const isVid = g.media_type === 'video';
    const rb = acctBlock(g.creator_id); if (rb) { setMsg({ kind: 'err', text: rb }); return; }
    const gBal = balFor(g.creator_id);
    if (isVid && gBal != null && gBal < VIDEO_MIN_CREDITS) { setMsg({ kind: 'err', text: `Sin créditos para rehacer el video${acctOf(g.creator_id)?.label ? ` en «${acctOf(g.creator_id).label}»` : ''} (quedan ${gBal.toFixed(1)}, se necesitan ~${VIDEO_MIN_CREDITS}). Recargá.` }); return; }
    const t = String(tweak || '').trim().slice(0, 200);
    const note = t ? `tweak:${t}` : null;
    dropDecideErr(g.id);
    await sb.from('generations').update({ status: 'queued', note, result_url: null }).eq('id', g.id);
    setCompare(null); setDetail(null); setLightbox(null); setRedoNote('');
    loadGens();
    setMsg({ kind: 'ok', text: `🔄 Rehaciendo ${isVid ? 'este video' : 'esta foto'}${t ? ` con tu ajuste: “${t}”` : ''} — aparece cocinándose (mirá «Cocinando» abajo) y cae lista al terminar.` });
  };

  // VOZ — generar un audio con la voz fija de la modelo (sincrónico: tarda unos segundos).
  const genAudio = async () => {
    const text = vText.trim();
    const hasVoice = !!(voiceSum?.voices || []).find((v) => v.creator_id === sel);
    if (!sel || vBusy || !voiceSum?.configured || !hasVoice || !voiceSum?.consent?.[sel] || !text || text.length > VOICE_MAX_CHARS) return;
    setVBusy(true); setVMsg(null);
    let out;
    try { out = await callVoice('make_audio', { creator_id: sel, text, type: vType, lang: vLang }); } catch (e) { out = { ok: false, error: e?.message || String(e) }; }
    setVBusy(false);
    if (out?.generation) mergeGen(out.generation); // aunque falle, si vino la fila (status failed) la muestro con su motivo
    if (!out?.ok) {
      setVMsg({ kind: 'err', text: out?.error || 'No se pudo generar el audio.', needsKey: !!out?.needsKey, needsConsent: !!out?.needsConsent, needsVoice: !!out?.needsVoice });
      if (out?.needsKey || out?.needsConsent || out?.needsVoice) loadVoice();
      return;
    }
    setVText('');
    setVMsg({ kind: 'ok', text: 'Audio listo ✓ — escuchalo abajo y aprobalo si va (cae al baúl de la modelo, carpeta Cocina).' });
    loadVoiceStatus();
  };
  // Editar: devuelve guion/etiqueta/idioma de un audio al compositor (sale como toma nueva al generar).
  const editAudio = (g) => {
    setVText(g?.prompt || '');
    if (g?.params?.type && VOICE_TYPE_MAP[g.params.type]) setVType(g.params.type);
    if (g?.params?.lang && VOICE_LANGS.some((l) => l.id === g.params.lang)) setVLang(g.params.lang);
    setVMsg({ kind: 'info', text: 'Guion cargado arriba. Cambiá lo que quieras y tocá «Generar audio» (sale como una toma nueva).' });
    try { vComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* noop */ }
    setTimeout(() => { try { vTextRef.current?.focus({ preventScroll: true }); } catch { /* noop */ } }, 350);
  };

  // Carrusel: variaciones (mismo lugar + mismo outfit, otras poses) sobre la foto raíz.
  // Dos modos: 'auto' (sorpréndeme: N fotos, la IA elige cada pose) o 'custom' (una idea por foto).
  const [varMode, setVarMode] = useState('carrusel'); // 'carrusel' (set coherente) | 'suelta' (fotos variadas) | 'custom' (yo prompteo)
  const [varEngine, setVarEngine] = useState('describe'); // Soul 2.0 DEFAULT = 'describe' (poses distintas) | 'copy' (escena exacta) | 'mixed' (mitad y mitad)
  const [varN, setVarN] = useState(3);
  const [varIdeas, setVarIdeas] = useState(['', '']); // modo custom: una idea por foto
  const [varBusy, setVarBusy] = useState(false);
  const [detailN, setDetailN] = useState(1); // ficha: 1 = normal, >1 = carrusel al cocinar
  const makeVariations = async (rootId) => {
    if (!rootId) return;
    // Mismo candado de cuenta que cocinar/reintentar/rehacer (Julia nunca se frena acá).
    const vb = acctBlock(gens.find((x) => x.id === rootId)?.creator_id || sel);
    if (vb) { setMsg({ kind: 'err', text: vb }); return; }
    askNotify();
    // 3 modos (todo Soul 2.0 con su soul = se parece a ella):
    //  · 'carrusel' (describe): MISMO lugar + outfit, otras poses → set coherente para UN post.
    //  · 'suelta'   (free):     fotos NUEVAS variadas (otros lugares/outfits) → contenido suelto, no atado a esta foto.
    //  · 'custom'   (describe): vos escribís cada pose (mismo lugar/outfit).
    const method = varMode === 'suelta' ? 'free' : 'describe';
    let ideas;
    if (varMode === 'custom') {
      ideas = varIdeas.map((s) => s.trim()).slice(0, 8);
      if (ideas.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos una foto.' }); return; }
    } else {
      // Carrusel/Sueltas: cada foto una situación DISTINTA (pool barajado) → variedad garantizada, natural.
      const poses = shuffle(POSE_POOL);
      ideas = Array.from({ length: varN }, (_, i) => poses[i % poses.length]);
    }
    setVarBusy(true);
    const r = await callFn('make_variations', { generation_id: rootId, ideas, method });
    setVarBusy(false);
    if (r?.ok) {
      if (varMode === 'custom') setVarIdeas(['', '']);
      setMsg({ kind: 'ok', text: `🍳 ${r.queued} variación(es) cocinándose — aparecen acá abajo al terminar.` });
      loadGens();
    } else setMsg({ kind: 'err', text: r?.error || 'No se pudo.' });
  };

  // Referencias que esta modelo YA cocinó (para marcarlas en el selector).
  const cookedRefs = useMemo(() => new Set(gens.filter((g) => g.creator_id === sel && g.reference_url && g.status !== 'failed').map((g) => g.reference_url)), [gens, sel]);
  // Fotos que se están cocinando AHORA (para el indicador "Cocinando…" en la tarjeta).
  const cookingRefs = useMemo(() => new Set(gens.filter((g) => g.creator_id === sel && g.reference_url && ['queued', 'in_progress'].includes(g.status)).map((g) => g.reference_url)), [gens, sel]);

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
        <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold text-paper">Solo admin o supervisor</h1>
          <Link href={homeHref} className="btn3d-ghost mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><ArrowLeft size={15} /> Volver</Link>
        </div>
      </div>
    );
  }

  const filteredCreators = creators.filter((c) => c.full_name.toLowerCase().includes(q.trim().toLowerCase()));
  const totalCredits = gens.filter((g) => g.status !== 'failed' && !isAudioGen(g)).reduce((a, g) => a + Number(g.credits || 0), 0); // solo Higgsfield (el audio no suma)
  const doneTs = (g) => new Date(g.done_at || g.created_at).getTime();
  const mineGens = gens.filter((g) => g.creator_id === sel);
  const isRoot = (g) => !g.carousel_of; // réplica (no es variación de carrusel)
  // Filtro Fotos/Videos/Audios de Resultados: el chip solo aparece si esta modelo tiene videos o audios; si el tipo elegido no existe, cae a 'todo'.
  const resHasVideo = mineGens.some((g) => g.media_type === 'video');
  const resHasAudio = mineGens.some(isAudioGen);
  const resEff = (resMedia === 'videos' && !resHasVideo) || (resMedia === 'audios' && !resHasAudio) || (!resHasVideo && !resHasAudio) ? 'todo' : resMedia;
  const mediaOk = (g) => resEff === 'todo' || (resEff === 'videos' ? g.media_type === 'video' : resEff === 'audios' ? isAudioGen(g) : isPhotoGen(g));
  // VOZ de la modelo abierta: su voz fija (si tiene), consentimiento y su catálogo de audios (la última primero).
  const selVoice = (voiceSum?.voices || []).find((v) => v.creator_id === sel) || null;
  const selConsent = !!voiceSum?.consent?.[sel];
  const audioRows = mineGens.filter(isAudioGen).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const audioReviewN = audioRows.filter((g) => g.status === 'done').length;
  // Grid principal: solo réplicas. Las variaciones se ven/aprueban dentro del pop-up del carrusel.
  const reviewRows = mineGens.filter((g) => g.status === 'done' && mediaOk(g) && (reviewFlat || isRoot(g))).sort((a, b) => doneTs(b) - doneTs(a));
  const approvedRows = mineGens.filter((g) => g.status === 'approved' && mediaOk(g)).sort((a, b) => doneTs(b) - doneTs(a)); // baúl: réplicas + variaciones
  const pendingRows = mineGens.filter((g) => ['queued', 'in_progress'].includes(g.status) && isRoot(g));
  const failedRows = mineGens.filter((g) => g.status === 'failed' && mediaOk(g) && isRoot(g));
  // Hijos de un carrusel (todas las fotos cuya raíz es rootId, sin la raíz), ordenadas por cocinado.
  const rootOf = (g) => g.carousel_of || g.id;
  const carouselKids = (rootId) => mineGens.filter((g) => g.carousel_of === rootId).sort((a, b) => doneTs(b) - doneTs(a)); // más nuevas ARRIBA (las que se están creando primero)
  const carouselCount = (rootId) => mineGens.filter((g) => g.carousel_of === rootId && g.status !== 'failed' && g.status !== 'rejected').length;
  // Datos del pop-up del carrusel (se recalculan vivos con el polling de gens).
  const cmpRoot = compare ? mineGens.find((x) => x.id === compare.root) : null;
  const cmpKids = compare ? carouselKids(compare.root) : [];
  // Motor real de una foto (honesto): lo que reportó el worker; si es viejo sin dato, la réplica fue Soul 2.0 y la variación fue Nano.
  const engineOf = (g) => (g?.engine_label ? g.engine_label : isAudioGen(g) ? 'ElevenLabs' : (g?.carousel_of ? 'Nano' : 'Soul 2.0'));
  // Costo de un audio = créditos de ElevenLabs (header character-cost) (NO créditos Higgsfield).
  const charsOf = (g) => { const n = Number(g?.params?.chars ?? (g?.prompt ? String(g.prompt).length : 0)); return Number.isFinite(n) ? n : 0; };

  // Listas para las pestañas nuevas.
  const cookingRows = mineGens.filter((g) => ['queued', 'in_progress'].includes(g.status)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // cocinándose (réplicas + carrusel) TODAS juntas de esta modelo
  const allRows = mineGens.filter((g) => g.status !== 'failed' && mediaOk(g)).sort((a, b) => doneTs(b) - doneTs(a)); // "Todo": todas menos rechazadas, la última primero
  // Contador de tiempo de una foto cocinándose (+ marca "trabada" si pasa mucho).
  const fmtElapsed = (g) => {
    const min = Math.max(0, Math.floor((tick - new Date(g.created_at).getTime()) / 60000));
    if (min < 60) return { txt: `${min} min`, stuck: min >= 15 };
    const h = Math.floor(min / 60), m = min % 60;
    return { txt: `${h} h${m ? ` ${m}m` : ''}`, stuck: true };
  };
  // Motor + precio por foto (créditos + US$), desplegable con una flechita.
  // Motor + PRECIO visible de una vez (foto o video): "Motor: X · N créd · US$Y". El costo real lo reporta el worker.
  const motorLine = (g) => {
    if (isAudioGen(g)) {
      const eng = g.engine_label || 'ElevenLabs';
      const chTxt = `${charsOf(g).toLocaleString('es')} créditos ElevenLabs`;
      return (
        <div className="flex w-full items-center gap-1.5 px-2 pt-1 text-[10px] text-paper-dim" title={`Motor: ${eng} · ${chTxt}`}>
          <span className="truncate">Motor: <span className="font-semibold text-brand">{eng}</span></span>
          <span className="ml-auto shrink-0 font-semibold text-paper-mute">{chTxt}</span>
        </div>
      );
    }
    const cr = Number(g.credits || 0);
    const eng = engineOf(g);
    const engCls = eng === 'Nano' ? 'text-rose-300' : eng === 'Genjutsu' ? 'text-violet-300' : 'text-brand';
    const crTxt = cr > 0 ? `${cr % 1 === 0 ? cr : cr.toFixed(2)} créd · ${money(cr)}` : 'sin costo';
    return (
      <div className="flex w-full items-center gap-1.5 px-2 pt-1 text-[10px] text-paper-dim" title={`Motor y precio: ${eng} · ${crTxt}`}>
        <span>Motor: <span className={`font-semibold ${engCls}`}>{eng}</span></span>
        <span className="ml-auto shrink-0 font-semibold text-amber-300">{crTxt}</span>
      </div>
    );
  };
  const cookingTile = (g) => {
    const e = fmtElapsed(g);
    return (
      <div key={g.id} className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-ink-2">
        {mediaTile(g.reference_url, "aspect-[3/4] w-full scale-105 object-cover blur-md brightness-[0.4]")}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
          <Loader2 size={24} className="animate-spin text-amber-300" />
          <span className="text-[11px] font-semibold tracking-wide">cocinándose…</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${e.stuck ? 'bg-rose-500/90 text-white' : 'bg-black/50 text-amber-200'}`}><Clock size={10} /> {e.txt}{e.stuck ? ' · ¿trabada?' : ''}</span>
        </div>
      </div>
    );
  };

  // Estado GLOBAL de la cocina (todas las modelos) — para la ruedita flotante que se ve en cualquier pantalla.
  const cookingAll = gens.filter((g) => ['queued', 'in_progress'].includes(g.status));
  const readyAll = gens.filter((g) => g.status === 'done' && !g.carousel_of);
  const queueBarShown = !!(selCreator && (['cocinar', 'buscar'].includes(subtab) || acctView) && queue.length > 0);
  const goToCooking = () => {
    const t = cookingAll[0] || readyAll[0];
    if (!t) return;
    setSel(t.creator_id); setSubtab('resultados'); setCompare(null); setDetail(null); setLightbox(null);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
  };

  // Aviso de la cocina. Se dibuja en la página Y dentro de las pantallas completas («Cuentas guía», «Buscar en IG»):
  // si no, esas pantallas lo tapaban y nada de lo que se hacía ahí mostraba respuesta.
  const msgBanner = (cls = '') => (msg ? (
    <div className={`${cls} flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${msg.kind === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : msg.kind === 'err' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-line bg-card text-paper-mute'}`}>
      {msg.kind === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : msg.kind === 'err' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Sparkles size={16} className="mt-0.5 shrink-0" />}
      <span className="min-w-0 flex-1 break-words">{msg.text}</span>
      <button type="button" onClick={() => setMsg(null)} className="shrink-0 opacity-70 hover:opacity-100" title="Cerrar aviso"><X size={14} /></button>
    </div>
  ) : null);

  // Avance de UNA búsqueda en segundo plano (tarjeta de cuenta, ficha y «Búsquedas en curso»): línea + barra plana + fase.
  const jobProgress = (j, withWho = false) => (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 font-bold ${j.stale ? 'text-paper-mute' : 'text-amber-300'}`}>
          {j.stale ? <Clock size={11} /> : <Loader2 size={11} className="animate-spin" />} {withWho ? `${jobWho(j)} · ` : ''}Buscando… {jobCounts(j)}
        </span>
        <button type="button" onClick={(e) => { e.stopPropagation(); cancelJob(j); }} disabled={!!j.cancel_requested}
          className="ml-auto rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-mute hover:border-rose-400 hover:text-rose-300 active:translate-y-px disabled:opacity-40">Cancelar</button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-2"><div className="h-full rounded-full bg-fuchsia-400 transition-[width] duration-500" style={{ width: `${jobPct(j)}%` }} /></div>
      <div className="text-[10px] text-paper-dim">{jobPhaseText(j)}</div>
    </div>
  );
  // Por qué NO jaló una cuenta según su última búsqueda terminada del motor nuevo (queda aunque recargues la página).
  // undefined = no hay búsqueda nueva terminada de esa cuenta (se usa el aviso de antes, si hay).
  const lastJobIssue = (cid, h) => {
    const k = normH(h); let best = null;
    const see = (r, issue) => {
      if (!r || r.creator_id !== cid || !r.requested || JOB_ACTIVE.has(String(r.status)) || r.kind !== 'account' || normH(r.handle || r.query) !== k) return;
      const t = Date.parse(r.finished_at || r.run_at) || 0; if (!best || t > best.t) best = { t, issue: issue || null };
    };
    scrapeRuns.forEach((r) => see(r, r.progress_issue));
    jobs.forEach((j) => see(j, j.issue));
    return best ? best.issue : undefined;
  };
  // «Buscar en todas» en curso de una modelo (el lote más nuevo con alguna activa): { n, done } o null.
  const activeBatchOf = (cid) => {
    let bid = null, bt = 0;
    jobs.forEach((j) => { if (j.creator_id === cid && j.batch_id && isActiveJob(j)) { const t = Date.parse(j.created_at) || 0; if (t >= bt) { bt = t; bid = j.batch_id; } } });
    if (!bid) return null;
    const all = [...jobs.values()].filter((j) => j.batch_id === bid);
    return { n: all.length, done: all.filter((j) => !isActiveJob(j)).length };
  };
  const selActiveJobs = sel ? [...jobs.values()].filter((j) => j.creator_id === sel && isActiveJob(j)) : [];

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={homeHref} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title={myRole === 'supervisor' ? 'Volver a mi trabajo' : 'Volver al admin'}><ArrowLeft size={17} /></Link>
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute"><ChefHat size={13} className="text-brand" /> Kitchen</div>
          </div>
          {selCreator && (
            <button type="button" onClick={() => setSel('')} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:text-paper">
              <ArrowLeft size={13} /> Cambiar modelo
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        {msgBanner('mb-4')}

        {/* AVISO: créditos bajos → no alcanza para cocinar VIDEO. Con una modelo abierta: SU cuenta; en el selector: cualquier cuenta baja. */}
        {(() => {
          const low = sel
            ? (selBal != null && selBal < VIDEO_MIN_CREDITS ? [{ label: selAcct?.label || '', balance: selBal }] : [])
            : hasAcctInfo
              ? Object.values(hfAccts).filter((a) => a && a.balance != null && a.balance < VIDEO_MIN_CREDITS).map((a) => ({ label: a.label, balance: a.balance }))
              : (balance != null && balance < VIDEO_MIN_CREDITS ? [{ label: '', balance }] : []);
          if (!low.length) return null;
          return (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1 break-words">
                <b>Higgsfield casi sin créditos: {low.map((x) => `${x.label ? `«${x.label}» ` : ''}quedan ${Number(x.balance).toFixed(1)}`).join(' · ')}.</b> Un video necesita ~{VIDEO_MIN_CREDITS} créditos → <b>no vas a poder cocinar video</b>{hasAcctInfo ? ' con esa cuenta' : ''} hasta recargar. (Las fotos sí funcionan con menos.)
              </span>
            </div>
          );
        })()}

        {/* ══════════ PASO 1 — ELEGÍ LA MODELO ══════════ */}
        {!sel && (
          <div>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-paper">Elegí la modelo</h1>
                <p className="mt-1 text-sm text-paper-mute">Tocá una modelo para entrar a su cocina.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="rounded-xl border border-line bg-card px-3.5 py-2 text-center" title={`${totalCredits.toFixed(2)} créditos gastados en la app`}>
                  <div className="text-base font-bold tabular-nums text-amber-300">{money(totalCredits)}</div>
                  <div className="text-[10px] text-paper-dim">gastado (app)</div>
                </div>
                {hasAcctInfo
                  ? Object.values(hfAccts).filter((a) => a && a.balance != null).map((a) => (
                    <div key={a.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-center" title={`Saldo real de «${a.label}» en Higgsfield${a.balance_at ? ` (actualizado ${new Date(a.balance_at).toLocaleString('es-US')})` : ''}`}>
                      <div className={`text-base font-bold tabular-nums ${a.balance < VIDEO_MIN_CREDITS ? 'text-rose-300' : 'text-emerald-300'}`}>{Number(a.balance).toFixed(1)}</div>
                      <div className="max-w-[120px] truncate text-[10px] text-paper-dim">{a.label}</div>
                    </div>
                  ))
                  : balance != null && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-center" title="Saldo real de tu cuenta Higgsfield (en vivo)">
                    <div className="text-base font-bold tabular-nums text-emerald-300">{balance.toFixed(1)}</div>
                    <div className="text-[10px] text-paper-dim">saldo real (créd)</div>
                  </div>
                )}
              </div>
            </div>
            <div className="relative mb-5 max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo…" className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            {/* Atajos globales — sin entrar a una modelo */}
            <div className="mb-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setBaulFilter('guias'); setBaulModel(''); setLibView(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-paper-mute hover:text-paper">
                <LayoutGrid size={15} /> Biblioteca <span className="text-paper-dim">{guideRows.length}</span>
              </button>
              {/* Misma página «Cuentas guía» que adentro de una modelo, arrancando en «Todas las modelos» (con selector de modelo) */}
              <button type="button" onClick={() => openAcctPage({ model: '' })}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90">
                <Search size={15} /> Buscar en IG
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCreators.map((c) => {
                const ready = ident[c.id]?.status === 'ready'; const s = statsFor(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => enterModel(c.id)}
                    className="card3d group flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-brand/50">
                    <div className="flex w-full items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-sm font-bold text-brand">
                        {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.full_name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-paper">{c.full_name}</div>
                        {ready
                          ? <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300"><CheckCircle2 size={11} /> Soul lista</div>
                          : <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-paper-dim"><AlertTriangle size={11} className="text-amber-400" /> Sin soul</div>}
                        {hasAcctInfo && <div className={`truncate text-[10px] ${acctOf(c.id) ? 'text-paper-dim' : 'text-amber-300/80'}`}>{acctOf(c.id)?.label || 'sin cuenta Higgsfield'}</div>}
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-3 text-[11px] text-paper-dim">
                      <span className="inline-flex items-center gap-1" title={`${s.credits.toFixed(2)} créditos`}><Coins size={11} className="text-amber-300" /> {money(s.credits)}</span>
                      {s.review > 0 && <span className="inline-flex items-center gap-1 text-rose-300"><Flame size={11} /> {s.review} p/ revisar</span>}
                      {s.pending > 0 && <span className="inline-flex items-center gap-1 text-amber-300"><Loader2 size={11} className="animate-spin" /> {s.pending}</span>}
                      <ArrowRight size={13} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredCreators.length === 0 && <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">No hay modelos con ese nombre.</p>}
          </div>
        )}

        {/* ══════════ COCINA DE LA MODELO ══════════ */}
        {selCreator && (
          <div>
            {/* Cabecera de la modelo (con su gasto) */}
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-base font-bold text-brand">
                {selCreator.avatar_url ? <img src={selCreator.avatar_url} alt="" className="h-full w-full object-cover" /> : (selCreator.full_name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold text-paper">{selCreator.full_name}</div>
                {selReady
                  ? <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><IdCard size={13} /> Soul real enlazada</div>
                  : <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300"><AlertTriangle size={12} /> Sin soul — avisame y la enlazo</div>}
                {selBlock && <div className="mt-0.5 flex max-w-md items-start gap-1.5 text-[11px] text-rose-300"><AlertTriangle size={11} className="mt-0.5 shrink-0" /><span className="break-words">{selBlock}</span></div>}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => setSpendOpen(true)} className="group flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-left transition-colors hover:border-brand/40" title="Ver el detalle: saldo, gasto y cuántas hiciste">
                  <div>
                    <div className={`text-base font-bold tabular-nums ${selBal != null && selBal < VIDEO_MIN_CREDITS ? 'text-rose-300' : 'text-emerald-300'}`}>{selBal != null ? selBal.toFixed(0) : '—'} <span className="text-[11px] opacity-60">créd</span></div>
                    <div className="text-[10px] text-paper-dim">te quedan{selBal != null ? ` · ${money(selBal)}` : ''}</div>
                    {hasAcctInfo && <div className={`max-w-[150px] truncate text-[10px] font-semibold ${selAcct ? 'text-brand' : 'text-amber-300'}`} title={selAcct ? `Cuenta de Higgsfield de esta modelo: ${selAcct.label}` : 'Esta modelo no tiene cuenta de Higgsfield asignada'}>{selAcct?.label || 'sin cuenta'}</div>}
                  </div>
                  <div className="h-8 w-px bg-line" />
                  <div>
                    <div className="text-base font-bold tabular-nums text-amber-300">{money(mine.credits)}</div>
                    <div className="text-[10px] text-paper-dim">gastado acá</div>
                  </div>
                  <ChevronDown size={15} className="ml-1 text-paper-dim transition-transform group-hover:translate-y-0.5" />
                </button>
                <button type="button" onClick={() => { loadGens(); loadVault(); loadSummary(); }} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-paper-mute hover:text-paper" title="Actualizar"><RefreshCw size={15} /></button>
              </div>
            </div>

            {/* Sub-pestañas de la modelo */}
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
              {[
                { id: 'cocinar', label: 'Cocinar', icon: Flame },
                { id: 'voz', label: 'Voz', icon: AudioLines, badge: audioReviewN || null },
                { id: 'resultados', label: 'Resultados', icon: Images, badge: cookingRows.length || null, spin: cookingRows.length > 0 },
              ].map((t) => {
                const Icon = t.icon; const on = subtab === t.id || (t.id === 'cocinar' && subtab === 'buscar');
                return (
                  <button key={t.id} type="button" onClick={() => setSubtab(t.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${on ? 'border-brand text-brand' : 'border-transparent text-paper-mute hover:text-paper'}`}>
                    <Icon size={15} className={t.spin ? 'animate-spin text-amber-300' : ''} /> {t.label}
                    {t.badge ? <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${t.spin ? 'bg-amber-500/25 text-amber-200' : on ? 'bg-brand text-on-accent' : 'bg-hair/20 text-paper-mute'}`}>{t.badge}</span> : null}
                  </button>
                );
              })}
            </div>

            {/* Chips de biblioteca (compartidos entre Cocinar y Buscar en IG): Guías · Buscar en IG · Favoritas */}
            {(subtab === 'cocinar' || subtab === 'buscar') && (
              <div className="mb-3 inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-card p-1 text-xs font-semibold">
                <button type="button" onClick={() => { setSubtab('cocinar'); setBaulFilter('guias'); }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${subtab === 'cocinar' && baulFilter === 'guias' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                  Guías <span className="opacity-70">{baulCounts.guias || 0}</span>
                </button>
                <button type="button" onClick={() => setSubtab('buscar')}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${subtab === 'buscar' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                  <Search size={11} /> Buscar en IG
                </button>
                <button type="button" onClick={() => { setSubtab('cocinar'); setBaulFilter('favoritas'); }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${subtab === 'cocinar' && baulFilter === 'favoritas' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                  <Star size={11} /> Favoritas <span className="opacity-70">{baulCounts.favoritas || 0}</span>
                </button>
              </div>
            )}

            {/* ── COCINAR — biblioteca de guías (pool compartido) ── */}
            {subtab === 'cocinar' && (
              <div className="pb-24">
                {/* Filtro por modelo · orden · agregar (los chips Guías/Buscar/Favoritas están compartidos arriba) */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {baulFilter === 'guias' && guideModels.length > 1 && (
                    <div className="relative">
                      <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)}
                        className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                        <option value="">Todas las modelos</option>
                        {guideModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                    </div>
                  )}
                  <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                    {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button type="button" onClick={() => setShowUpload((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${showUpload ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
                      <Upload size={14} /> Subir fotos
                    </button>
                  </div>
                </div>

                {/* Buscador de la biblioteca */}
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                  <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar en la biblioteca (modelo, @cuenta, tema…)"
                    className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                </div>

                {/* Subir fotos (se abre con el botón) */}
                {showUpload && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
                    className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-brand bg-brand/10' : 'border-line bg-card/40 hover:border-brand/40'}`}>
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => onUpload(e.target.files)} />
                    {uploading ? <Loader2 size={26} className="animate-spin text-brand" /> : <Upload size={26} className="text-paper-dim" />}
                    <div className="text-sm font-semibold text-paper">{uploading ? 'Subiendo…' : 'Arrastrá tus fotos acá (o tocá para elegir)'}</div>
                    <div className="text-xs text-paper-dim">Muchas de una (hasta 60). Entran como guías a la biblioteca — quedan arriba de todo.</div>
                  </label>
                )}

                {/* Grilla agrupada por día (última subida primero) */}
                {libPhotos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">
                    {baulFilter === 'reales'
                      ? `${selCreator.full_name} no tiene fotos reales cargadas todavía.`
                      : baulFilter === 'favoritas'
                        ? 'Todavía no marcaste favoritas. Tocá la ⭐ en cualquier foto para guardarla acá.'
                        : baulModel
                          ? 'Esta modelo no tiene guías. Probá «Todas las modelos» o subí fotos.'
                          : 'La biblioteca está vacía. Subí fotos o traé de Instagram.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {(pickGroups || []).map((g) => (
                      <div key={g.label} className="space-y-2">
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span>
                          <span className="text-[10px] text-paper-dim/70">{g.rows.length}</span>
                          <span className="h-px flex-1 bg-line/60" />
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                          {g.rows.map(renderTodaCard)}
                        </div>
                      </div>
                    ))}
                    {visN < libPhotos.length && <div ref={sentinelRef} className="h-8" />}
                  </div>
                )}
              </div>
            )}

            {/* ── BUSCAR EN IG — scraping, aparte de la biblioteca ── */}
            {subtab === 'buscar' && (
              <div className="pb-24 space-y-2.5">
                {/* Header limpio: resumen + agregar (wizard) + panel de cuentas */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
                  <div className="min-w-0 flex-1">
                    {(() => {
                      const S = scrapeStats.byModel[sel] || EMPTY_STAT; const C = costStats.byModel[sel] || EMPTY_COST; const tag = costTag(C);
                      return (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="font-bold text-paper">{seedsFor(sel).length} cuenta{seedsFor(sel).length === 1 ? '' : 's'} guía</span>
                          <span className="text-paper-dim"><b className="text-paper">{S.bajadas}</b> bajadas</span>
                          <span className="text-paper-dim"><b className="text-paper">{S.enMesa}</b> en la mesa</span>
                          <span className="text-paper-dim">gasto <b className="text-amber-300">{usdS(C.total)}</b> <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tag.cls}`}>{tag.t}</span></span>
                        </div>
                      );
                    })()}
                    <div className="mt-0.5 text-[11px] text-paper-dim">De Instagram, filtrado solo (mujeres/cuerpo, sin hombres ni basura). Lo que traés aparece abajo.</div>
                  </div>
                  <button type="button" onClick={() => { setWiz({ step: 1, mode: null }); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90">
                    <Plus size={15} /> Agregar (cuenta o tema)
                  </button>
                  <button type="button" onClick={() => openAcctPage()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/[0.06] px-3.5 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/[0.12]">
                    <Compass size={15} /> Cuentas guía
                  </button>
                </div>

                {/* Búsquedas en curso de esta modelo (cuentas, temas y reels por link): siguen en el servidor aunque cierres */}
                {selActiveJobs.length > 0 && (
                  <div className="rounded-2xl border border-line bg-card p-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Búsquedas en curso · {selActiveJobs.length}</span>
                      <span className="text-[10px] text-paper-dim/80">{workerOnline ? 'el cocinero de la Mac las termina aunque cierres' : 'dejá la cocina abierta: el cocinero de la Mac está apagado'}</span>
                    </div>
                    <div className="space-y-3">{selActiveJobs.map((j) => <div key={j.id}>{jobProgress(j, true)}</div>)}</div>
                  </div>
                )}

                {/* Filtros — MISMO layout que la vista global "Buscar en IG" (chips media + vibe + orden + buscador en una fila) */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {scrapedVideoCount > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                      {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setMediaFilter(k)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${mediaFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{k === 'videos' && <Play size={10} className="fill-current" />}{label}{k === 'videos' && <span className="opacity-70">{scrapedVideoCount}</span>}</button>
                      ))}
                    </div>
                  )}
                  {Object.keys(vibeCounts).length > 0 && ['Todos', ...VIBES.filter((v) => v !== 'Todos' && vibeCounts[v])].map((v) => (
                    <button key={v} type="button" onClick={() => setVibe(v)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${vibe === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:text-paper'}`}>{v}{v !== 'Todos' && <span className="text-[10px] opacity-70">{vibeCounts[v]}</span>}</button>
                  ))}
                  <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">{baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}</button>
                  <div className="relative min-w-[180px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                    <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar en lo scrapeado (@cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                  </div>
                </div>

                {/* Resultados del scraping de ESTA modelo, agrupados por día (últimas primero) */}
                {scrapedPhotos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no traés nada de IG para {selCreator.full_name}. Agregá una cuenta o un tema y tocá Buscar.</p>
                ) : (
                  <div className="space-y-4">
                    {scrapedGroups.map((g) => (
                      <div key={g.label} className="space-y-2">
                        <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                      </div>
                    ))}
                    {visN < scrapedPhotos.length && <div ref={sentinelRef} className="h-8" />}
                  </div>
                )}
              </div>
            )}

            {/* ── VOZ — audios con la voz FIJA de la modelo (ElevenLabs): guion → audio → revisar → aprobar (baúl, carpeta Cocina) ── */}
            {subtab === 'voz' && (() => {
              const vLen = vText.trim().length;
              const vOver = vLen > VOICE_MAX_CHARS;
              const canGen = !!(voiceSum?.configured && selVoice && selConsent && vLen > 0 && !vOver && !vBusy);
              const firstName = (selCreator.stage_name || selCreator.full_name || '').split(' ')[0];
              const chip = (on) => `inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-transparent bg-brand text-on-accent' : 'border-line text-paper-mute hover:border-hair hover:text-paper'}`;
              const why = !voiceSum ? null
                : !voiceSum.configured ? 'Falta conectar ElevenLabs'
                  : !selVoice ? 'Esta modelo todavía no tiene voz'
                    : !selConsent ? 'Falta el consentimiento de voz'
                      : vOver ? `El guion pasa los ${VOICE_MAX_CHARS} caracteres — acortalo`
                        : vLen === 0 ? 'Pegá el guion para generar' : null;
              const actBtn = 'inline-flex items-center justify-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-paper-mute transition active:scale-95 hover:border-brand/40 disabled:pointer-events-none disabled:opacity-40';
              return (
                <div className="pb-24 space-y-4">
                  {/* Estado de la voz: cargando · falta ElevenLabs · error · sin voz · cabecera con su voz */}
                  {!voiceSum ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-paper-mute"><Loader2 size={15} className="animate-spin text-brand" /> Leyendo la voz de {selCreator.full_name}…</div>
                  ) : voiceSum.configured === false ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1"><b>Falta conectar ElevenLabs</b> — sin la llave no se pueden generar audios.</span>
                      <Link href="/conexion" className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold">Conectar <ArrowRight size={12} /></Link>
                    </div>
                  ) : voiceSum.error ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1 break-words">No pude leer el motor de voz: {voiceSum.error}</span>
                      <button type="button" onClick={loadVoice} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"><RefreshCw size={12} /> Reintentar</button>
                    </div>
                  ) : !selVoice ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-paper-dim"><Mic size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-paper">Esta modelo todavía no tiene voz</div>
                        <div className="mt-0.5 text-[12px] text-paper-mute">Configurala en su cartilla: Admin → Creadoras → {selCreator.full_name} → Voz</div>
                      </div>
                      {myRole === 'supervisor'
                        ? <span className="text-xs text-paper-mute">Pedile a un admin que se la configure en la cartilla.</span>
                        : <Link href={`/admin?tab=registros&creator=${encodeURIComponent(selCreator.id)}&ctab=voz`} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold">Ir a Admin <ArrowRight size={12} /></Link>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Mic size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-display text-base font-bold text-paper">{selVoice.voice_name || 'Voz de la modelo'}</span>
                          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-mute">{selVoice.source === 'cloned' ? 'Clonada en LetShoot' : 'De tu biblioteca ElevenLabs'}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-paper-dim">
                          <span>Motor: <b className="font-semibold text-brand">{voiceStatus?.model_label || 'ElevenLabs'}</b></span>
                          {voiceStatus?.sub && <span>Te quedan <b className="font-semibold text-emerald-300">{Number(voiceStatus.sub.remaining || 0).toLocaleString('es')}</b> créditos de ElevenLabs</span>}
                        </div>
                      </div>
                      {selVoice.preview_url && (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <audio controls preload="none" src={selVoice.preview_url} className="h-9 w-full sm:w-64" />
                      )}
                    </div>
                  )}
                  {voiceSum?.configured && selVoice && !selConsent && (
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      <AlertTriangle size={16} className="shrink-0" /> Falta el consentimiento de voz (se marca en la cartilla)
                    </div>
                  )}

                  <div className="grid items-start gap-4 lg:grid-cols-5">
                    {/* Compositor: etiqueta · guion · idioma → Generar audio */}
                    <section ref={vComposerRef} className="card3d scroll-mt-24 rounded-3xl border border-line bg-card p-5 lg:col-span-2">
                      <h3 className="mb-4 inline-flex items-center gap-2 font-display text-base font-bold text-paper"><Wand2 size={16} className="text-brand" /> Generar audio</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Etiqueta</div>
                          <div className="flex flex-wrap gap-1.5">
                            {VOICE_TYPES.map((t) => (
                              <button key={t.id} type="button" onClick={() => setVType(t.id)} className={chip(vType === t.id)}>
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot} ${vType === t.id ? 'ring-1 ring-white/80' : ''}`} /> {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
                            <span>Guion</span>
                            <span className={`tabular-nums tracking-normal ${vOver ? 'text-rose-300' : 'text-paper-dim'}`}>{vLen} / {VOICE_MAX_CHARS}</span>
                          </div>
                          <textarea ref={vTextRef} value={vText} onChange={(e) => setVText(e.target.value)} rows={6}
                            placeholder="Pegá el párrafo que va a decir con su voz…"
                            className={`w-full resize-y rounded-xl border bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none ${vOver ? 'border-rose-500/60 focus:border-rose-500' : 'border-line focus:border-brand/60'}`} />
                        </div>
                        <div>
                          <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Idioma del audio</div>
                          <div className="flex flex-wrap gap-1.5">
                            {VOICE_LANGS.map((l) => (
                              <button key={l.id} type="button" onClick={() => setVLang(l.id)} className={chip(vLang === l.id)}>{l.flag} {l.label}</button>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={genAudio} disabled={!canGen}
                          className="btn3d inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold disabled:pointer-events-none disabled:opacity-40">
                          {vBusy ? <><Loader2 size={16} className="animate-spin" /> Generando…</> : <><Wand2 size={16} /> Generar audio</>}
                        </button>
                        {why && !vBusy && (
                          <div className="flex items-center gap-1.5 text-[11px] text-paper-mute"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> {why}</div>
                        )}
                        {vMsg && (
                          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] ${vMsg.kind === 'err' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : vMsg.kind === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-line bg-ink-2 text-paper-mute'}`}>
                            {vMsg.kind === 'err' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : vMsg.kind === 'ok' ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <Sparkles size={14} className="mt-0.5 shrink-0" />}
                            <span className="min-w-0 flex-1 break-words">
                              {vMsg.text}
                              {vMsg.needsKey && <> <Link href="/conexion" className="font-semibold underline">Conectar ElevenLabs</Link></>}
                              {(vMsg.needsVoice || vMsg.needsConsent) && (myRole === 'supervisor' ? <> Pedile a un admin que lo marque en la cartilla.</> : <> <Link href={`/admin?tab=registros&creator=${encodeURIComponent(selCreator.id)}&ctab=voz`} className="font-semibold underline">Abrir la cartilla en Admin</Link></>)}
                            </span>
                            <button type="button" onClick={() => setVMsg(null)} className="shrink-0 opacity-70 hover:opacity-100"><X size={13} /></button>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Catálogo de audios de ESTA modelo (el último primero) */}
                    <section className="card3d rounded-3xl border border-line bg-card p-5 lg:col-span-3">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="min-w-0 truncate font-display text-base font-bold text-paper">Audios de {firstName}</h3>
                        <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{audioRows.length} audio{audioRows.length === 1 ? '' : 's'}{audioReviewN ? ` · ${audioReviewN} por revisar` : ''}</span>
                      </div>
                      {audioRows.length === 0 ? (
                        <div className="grid place-items-center rounded-2xl border border-line bg-ink-2 px-4 py-12 text-center">
                          <AudioLines size={26} className="mb-2 text-paper-dim" />
                          <div className="text-sm font-semibold text-paper">Todavía no hay audios</div>
                          <div className="mt-1 text-[12px] text-paper-mute">Pegá un guion y generá el primero.</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {audioRows.map((g) => {
                            const t = voiceType(g); const l = voiceLang(g);
                            const busy = vRow[g.id] === 'regen'; const pend = deciding[g.id];
                            const st = g.status;
                            const [bLabel, bCls] = st === 'approved' ? ['Aprobado', 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200']
                              : st === 'rejected' ? ['Descartado', 'border-line bg-hair/10 text-paper-dim']
                                : st === 'failed' ? ['No salió', 'border-rose-500/30 bg-rose-500/15 text-rose-200']
                                  : ['Por revisar', 'border-amber-500/30 bg-amber-500/15 text-amber-200'];
                            return (
                              <article key={g.id} id={`voz-clip-${g.id}`}
                                className={`scroll-mt-24 rounded-2xl border bg-ink-2 p-3.5 transition-shadow ${vFocus === g.id ? 'border-brand ring-2 ring-brand/50' : st === 'approved' ? 'border-emerald-500/30' : st === 'failed' ? 'border-rose-500/30' : 'border-line'} ${st === 'rejected' && vFocus !== g.id ? 'opacity-60' : ''}`}>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} /> {t.label}</span>
                                  <span className="text-paper-dim">·</span>
                                  <span className="font-mono text-[11px] text-paper-mute">{l.flag} {l.label}</span>
                                  <span className="text-paper-dim">·</span>
                                  <span className="font-mono text-[10px] text-paper-dim">{fmtWhen(g.created_at)}</span>
                                  <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${bCls}`}>{pend ? <Loader2 size={10} className="animate-spin" /> : null}{bLabel}</span>
                                </div>
                                {st === 'failed' && <p className="mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[12px] leading-snug text-rose-200">{g.note || 'El motor de voz no pudo generarlo.'}</p>}
                                <p className="mb-2.5 line-clamp-3 text-[13px] leading-relaxed text-paper-mute">{g.prompt}</p>
                                {busy ? (
                                  <div className="mb-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 text-xs font-semibold text-amber-200"><Loader2 size={14} className="animate-spin" /> Generando otra toma…</div>
                                ) : g.result_url ? (
                                  // eslint-disable-next-line jsx-a11y/media-has-caption
                                  <audio key={g.result_url} controls preload="none" src={g.result_url} className="mb-2.5 h-9 w-full" />
                                ) : null}
                                <div className="mb-2.5 text-[10px] text-paper-dim">Motor: <span className="font-semibold text-brand">{g.engine_label || 'ElevenLabs'}</span> · {charsOf(g).toLocaleString('es')} créditos ElevenLabs</div>
                                {vRowErr[g.id] && <p className="mb-2 text-[11px] leading-snug text-rose-300">{vRowErr[g.id]}</p>}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {st === 'failed' ? (
                                    <button type="button" onClick={() => regenAudio(g)} disabled={busy} className={`${actBtn} flex-1 hover:text-paper`}><RefreshCw size={12} /> Reintentar</button>
                                  ) : st === 'approved' ? (
                                    <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200">En el baúl ✓</span>
                                  ) : (
                                    <button type="button" onClick={() => decide(g, true, true)} disabled={busy || !!pend}
                                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 transition active:scale-95 hover:bg-emerald-500/30 disabled:pointer-events-none disabled:opacity-50"><Heart size={12} /> Aprobar</button>
                                  )}
                                  {st !== 'failed' && <button type="button" onClick={() => regenAudio(g)} disabled={busy || !!pend} className={`${actBtn} hover:text-amber-300`} title="Otra toma con el mismo guion"><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Rehacer</button>}
                                  <button type="button" onClick={() => editAudio(g)} className={`${actBtn} hover:text-paper`} title="Cargar el guion arriba para cambiarlo"><Pencil size={12} /> Editar</button>
                                  {st === 'done' && <button type="button" onClick={() => decide(g, false, true)} disabled={busy || !!pend} className={`${actBtn} hover:text-rose-300`} title="No va — descartar"><Trash2 size={12} /> Descartar</button>}
                                  {g.result_url && !busy && (
                                    <a href={g.result_url} download target="_blank" rel="noreferrer" className={`${actBtn} hover:text-paper`}><Download size={12} /> Descargar</a>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              );
            })()}

            {/* ── RESULTADOS — todo lo cocinado en un solo lugar (chips) ── */}
            {subtab === 'resultados' && (
              <div className="pb-24">
                {/* Barra de Resultados — UNA sola fila: estado a la izquierda, filtros chicos a la derecha */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {/* Estado: un solo control segmentado (las que se cocinan salen inline en Para revisar y Todas) */}
                  <div className="inline-flex items-center rounded-full border border-line bg-card p-1 text-xs font-semibold">
                    {[
                      ['revisar', 'Para revisar', reviewRows.length],
                      ['aprobadas', 'Aprobadas', approvedRows.length],
                      ['nosalieron', 'No salieron', failedRows.length],
                      ['todas', 'Todas', allRows.length],
                    ].map(([k, label, n]) => {
                      const on = resTab === k;
                      const danger = k === 'nosalieron';
                      return (
                        <button key={k} type="button" onClick={() => setResTab(k)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${on ? (danger ? 'bg-rose-500 text-white' : 'bg-brand text-on-accent') : (danger && n > 0 ? 'text-rose-300 hover:text-rose-200' : 'text-paper-mute hover:text-paper')}`}>
                          {label} <span className="opacity-70">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Filtros secundarios, chicos, a la derecha */}
                  <div className="ml-auto flex items-center gap-2">
                    {(resHasVideo || resHasAudio) && (
                      <div className="inline-flex items-center rounded-full border border-line bg-card p-0.5 text-[11px] font-semibold" role="group" aria-label="Tipo">
                        {[['todo', 'Todo', null], ['fotos', 'Fotos', null], resHasVideo && ['videos', 'Videos', Play], resHasAudio && ['audios', 'Audios', AudioLines]].filter(Boolean).map(([k, label, Ic]) => (
                          <button key={k} type="button" title={label} onClick={() => setResMedia(k)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${resEff === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{Ic ? <Ic size={11} className={k === 'videos' ? 'fill-current' : ''} /> : null}{label}</button>
                        ))}
                      </div>
                    )}
                    {(resTab === 'revisar' || resTab === 'todas') && (reviewRows.length + allRows.length) > 0 && (
                      <div className="inline-flex items-center rounded-full border border-line bg-card p-0.5 text-[11px] font-semibold" role="group" aria-label="Vista">
                        <button type="button" title="Sueltas (cada una por separado)" onClick={() => setReviewFlat(true)} className={`inline-flex items-center rounded-full px-2.5 py-1.5 transition-colors ${reviewFlat ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><LayoutGrid size={13} /></button>
                        <button type="button" title="Agrupadas (por carrusel)" onClick={() => setReviewFlat(false)} className={`inline-flex items-center rounded-full px-2.5 py-1.5 transition-colors ${!reviewFlat ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Images size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PARA REVISAR — aprobar/descartar. Las que se están cocinando salen INLINE arriba (con su reloj). */}
                {resTab === 'revisar' && (
                  (reviewRows.length === 0 && cookingRows.length === 0) ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">No hay nada esperando tu OK. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-paper-dim">{cookingRows.length > 0 ? <><span className="font-semibold text-amber-300">{cookingRows.length} cocinándose</span> arriba (con su reloj). </> : null}{reviewFlat ? 'Cada foto por separado, la última primero. Tocá una para verla grande y aprobarla.' : 'Agrupadas por carrusel. Tocá una para ver el grupo, aprobar y armar más.'}</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {cookingRows.map((g) => cookingTile(g))}
                        {reviewRows.slice(0, visN).map((g) => {
                          const aud = isAudioGen(g);
                          const kids = reviewFlat || aud ? 0 : carouselCount(g.id);
                          const Tap = aud ? 'div' : 'button'; // audio: <div> (un <audio controls> no puede ir dentro de un <button>)
                          const busy = aud && vRow[g.id] === 'regen';
                          return (
                          <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                            <Tap {...(aud ? { role: 'button', tabIndex: 0, title: 'Abrir en Voz', onKeyDown: (e) => { if (e.key === 'Enter') openGen(g); } } : { type: 'button' })} onClick={() => openGen(g)} className={`relative block w-full ${aud ? 'cursor-pointer' : ''}`}>
                              {genMedia(g, 'aspect-[3/4] w-full object-cover')}{g.media_type === 'video' && g.result_url && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play size={16} className="fill-current" /></span></span>}
                              {kids > 0 && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-on-accent"><LayoutGrid size={10} /> {kids + 1}</span>}
                            </Tap>
                            {motorLine(g)}
                            <div className="flex items-center gap-1 p-2 pt-1">
                              <button type="button" onClick={() => decide(g, true)} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[11px] font-bold text-emerald-200 transition active:scale-95 hover:bg-emerald-500/30 disabled:opacity-50"><Heart size={12} /> Aprobar</button>
                              {!aud && <button type="button" onClick={() => setCompare({ root: g.id, creator_id: g.creator_id })} className="inline-flex items-center justify-center gap-1 rounded-full border border-brand/40 px-2 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/10" title="Armar carrusel"><LayoutGrid size={12} /></button>}
                              <button type="button" onClick={() => redo(g)} disabled={busy} className="inline-flex items-center justify-center rounded-full border border-line px-2 py-1.5 text-paper-mute transition active:scale-95 hover:text-amber-300 disabled:opacity-50" title={aud ? 'Rehacer (otra toma del audio)' : 'Rehacer (otra versión)'}><RefreshCw size={12} className={busy ? 'animate-spin' : ''} /></button>
                              <button type="button" onClick={() => decide(g, false)} disabled={busy} className="inline-flex items-center justify-center rounded-full border border-line px-2 py-1.5 text-paper-mute transition active:scale-95 hover:text-rose-300 disabled:opacity-50" title="Descartar"><Trash2 size={12} /></button>
                            </div>
                            {decideErr[g.id] && <p title={decideErr[g.id]} className="line-clamp-3 px-2 pb-2 text-[10px] leading-snug text-rose-300">{decideErr[g.id]}</p>}
                          </div>
                          );
                        })}
                      </div>
                      {visN < reviewRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* APROBADAS — el baúl limpio */}
                {resTab === 'aprobadas' && (
                  approvedRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no aprobaste ninguna. En <button onClick={() => setResTab('revisar')} className="font-semibold text-brand hover:underline">Para revisar</button> tocá ❤️ Aprobar.</p>
                  ) : (
                    <>
                      <p className="mb-2 inline-flex items-center gap-1 text-xs text-emerald-300/80"><Check size={12} /> Limpias (sin metadata) en el baúl. Tocá una réplica para hacerle más carrusel.</p>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                        {approvedRows.slice(0, visN).map((g) => (isAudioGen(g) ? (
                          // Audio aprobado: <div> (el reproductor no puede ir dentro de un <button>); tocarlo te lleva a Voz.
                          <div key={g.id} role="button" tabIndex={0} title="Abrir en Voz" onClick={() => openGen(g)} onKeyDown={(e) => { if (e.key === 'Enter') openGen(g); }} className="group relative block cursor-pointer overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                            {genMedia(g, 'aspect-[3/4] w-full object-cover')}
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-semibold text-white"><Check size={10} /> en el baúl</span>
                          </div>
                        ) : (
                          <button type="button" key={g.id} onClick={() => openGen(g)} className="group relative block overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                            {genMedia(g, 'aspect-[3/4] w-full object-cover')}{g.media_type === 'video' && g.result_url && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play size={16} className="fill-current" /></span></span>}
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><LayoutGrid size={10} /> carrusel</span>
                          </button>
                        )))}
                      </div>
                      {visN < approvedRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* NO SALIERON — motivo + reintentar */}
                {resTab === 'nosalieron' && (
                  failedRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Ninguna falló. Todo lo que cocinaste salió. 🎉</p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-paper-dim">Estas no se lograron cocinar. La foto es la referencia que mandaste; abajo <b className="text-paper-mute">el porqué</b>. Podés reintentar.</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {failedRows.slice(0, visN).map((g) => {
                          const aud = isAudioGen(g);
                          const busy = aud && vRow[g.id] === 'regen';
                          return (
                          <div key={g.id} className="overflow-hidden rounded-xl border border-rose-500/30 bg-ink-2">
                            <div className="relative">
                              {aud ? <div className="opacity-60">{audioTile(g, 'aspect-[3/4] w-full pt-8')}</div> : mediaTile(g.reference_url, "aspect-[3/4] w-full object-cover opacity-50")}
                              <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] font-bold text-white"><AlertTriangle size={10} /> No salió</div>
                            </div>
                            <div className="p-2">
                              <p className="mb-1.5 text-[11px] leading-snug text-rose-200">{g.note || (aud ? 'No salió — el motor de voz no pudo generarlo.' : 'No salió — el motor la rechazó (suele ser por contenido +18 o un error).')}</p>
                              <p className="mb-1.5 text-[10px] font-semibold text-amber-300/90">{aud ? `Motor: ${g.engine_label || 'ElevenLabs'} · ${charsOf(g).toLocaleString('es')} créditos ElevenLabs` : Number(g.credits) > 0 ? `Costó ${money(Number(g.credits))} · ${Number(g.credits).toFixed(1)} créd (el motor cobró igual)` : 'Sin costo (el motor rechazó gratis)'}</p>
                              <button type="button" onClick={() => retry(g)} disabled={busy} className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-line px-2 py-1.5 text-[11px] font-semibold text-paper-mute transition active:scale-95 hover:border-brand/40 hover:text-paper disabled:opacity-50">{busy ? <><Loader2 size={11} className="animate-spin" /> Generando…</> : <><RefreshCw size={11} /> Reintentar</>}</button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      {visN < failedRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* TODAS — el rollo completo (menos las que no salieron) */}
                {resTab === 'todas' && (
                  allRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no cocinaste nada para {selCreator.full_name}. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {allRows.slice(0, visN).map((g) => {
                          if (['queued', 'in_progress'].includes(g.status)) return cookingTile(g);
                          const isApproved = g.status === 'approved';
                          const isRejected = g.status === 'rejected';
                          const aud = isAudioGen(g);
                          const busy = aud && vRow[g.id] === 'regen';
                          const kids = isRoot(g) && !aud ? carouselCount(g.id) : 0;
                          const Tap = aud ? 'div' : 'button'; // audio: <div> (el reproductor no puede ir dentro de un <button>)
                          return (
                            <div key={g.id} className={`group relative overflow-hidden rounded-xl border bg-ink-2 transition-opacity ${isApproved ? 'border-emerald-500/30' : 'border-line'} ${isRejected ? 'opacity-50' : ''}`}>
                              <Tap {...(aud ? { role: 'button', tabIndex: 0, title: 'Abrir en Voz', onKeyDown: (e) => { if (e.key === 'Enter') openGen(g); } } : { type: 'button' })} onClick={() => openGen(g)} className={`relative block w-full ${aud ? 'cursor-pointer' : ''}`}>
                                {genMedia(g, 'aspect-[3/4] w-full object-cover')}{g.media_type === 'video' && g.result_url && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play size={16} className="fill-current" /></span></span>}
                                {isApproved && <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white transition-opacity group-hover:opacity-0"><Check size={11} /></span>}
                                {kids > 0 && <span className="absolute left-1.5 bottom-6 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-on-accent"><LayoutGrid size={10} /> {kids + 1}</span>}
                                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">{isApproved ? (aud ? 'aprobado' : 'aprobada') : isRejected ? (aud ? 'descartado' : 'descartada') : 'para revisar'} · {engineOf(g)}{aud ? ` · ${charsOf(g)} car.` : Number(g.credits) > 0 ? ` · ${money(Number(g.credits))}` : ''}</span>
                              </Tap>
                              {/* Acciones rápidas al pasar el mouse — para la que NO te gusta, sin abrir */}
                              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!isApproved && <button type="button" onClick={(e) => { e.stopPropagation(); decide(g, true); }} disabled={busy} title="Aprobar" className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/90 text-white shadow transition active:scale-90 hover:bg-emerald-500 disabled:opacity-50"><Heart size={13} /></button>}
                                <button type="button" onClick={(e) => { e.stopPropagation(); redo(g); }} disabled={busy} title={aud ? 'Rehacer (otra toma del audio)' : 'Rehacer (otra versión)'} className="grid h-7 w-7 place-items-center rounded-full bg-black/65 text-amber-200 shadow backdrop-blur transition active:scale-90 hover:bg-black/85 disabled:opacity-50"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /></button>
                                {!isRejected && !(aud && isApproved) && <button type="button" onClick={(e) => { e.stopPropagation(); decide(g, false); }} disabled={busy} title={isApproved ? 'Sacar del baúl' : 'No me gusta — descartar'} className="grid h-7 w-7 place-items-center rounded-full bg-black/65 text-rose-200 shadow backdrop-blur transition active:scale-90 hover:bg-black/85 disabled:opacity-50"><Trash2 size={13} /></button>}
                              </div>
                              {decideErr[g.id] && <p title={decideErr[g.id]} className="line-clamp-3 px-1.5 py-1 text-[9px] leading-snug text-rose-300">{decideErr[g.id]}</p>}
                            </div>
                          );
                        })}
                      </div>
                      {visN < allRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── BIBLIOTECA GLOBAL (guías de todas, desde el selector) ── */}
      {libView && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
              <button type="button" onClick={() => setLibView(false)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver</button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><LayoutGrid size={16} className="text-brand" /> Biblioteca de guías <span className="text-paper-dim">· {guideRows.length}</span></div>
                <div className="truncate text-[11px] text-paper-dim">Las guías de todas las modelos. Para cocinar, entrá a una modelo.</div>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {guideModels.length > 1 && (
                <div className="relative">
                  <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)} className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                    <option value="">Todas las modelos</option>
                    {guideModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              )}
              <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
              </button>
              <div className="relative min-w-[180px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar (modelo, @cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              </div>
            </div>
            {libPhotos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">La biblioteca está vacía todavía.</p>
            ) : (
              <div className="space-y-4">
                {(pickGroups || []).map((g) => (
                  <div key={g.label} className="space-y-2">
                    <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                  </div>
                ))}
                {visN < libPhotos.length && <div ref={sentinelRef} className="h-8" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUSCAR EN IG GLOBAL (todo lo scrapeado de todas, desde el selector) ── */}
      {scrapView && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
              <button type="button" onClick={() => setScrapView(false)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver</button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><Search size={16} className="text-fuchsia-300" /> Buscar en IG <span className="text-paper-dim">· {scrapGlobalDeduped.length}</span></div>
                <div className="truncate text-[11px] text-paper-dim">Todo lo traído de Instagram, de todas las modelos. Para traer más, entrá a una modelo.</div>
              </div>
            </div>
            {msg && <div className="mx-auto max-w-6xl px-4 pb-3 lg:px-6">{msgBanner()}</div>}
          </div>
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
            {/* Header como la pestaña: resumen + Agregar + Cuentas guía */}
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-bold text-paper">{scrapGlobalModels.length} modelo{scrapGlobalModels.length === 1 ? '' : 's'}</span>
                  <span className="text-paper-dim"><b className="text-paper">{scrapeStats.all.bajadas}</b> bajadas</span>
                  <span className="text-paper-dim"><b className="text-paper">{scrapeStats.all.enMesa}</b> en la mesa</span>
                  <span className="text-paper-dim"><b className="text-paper">{scrapeStats.all.mesaVideos}</b> videos</span>
                </div>
                <div className="mt-0.5 text-[11px] text-paper-dim">De Instagram, filtrado solo (mujeres/cuerpo). Lo mejor de lo mejor.</div>
              </div>
              <button type="button" onClick={() => setWiz({ step: 0, mode: null })} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90"><Plus size={15} /> Agregar (cuenta o tema)</button>
              <button type="button" onClick={() => openAcctPage({ model: '' })} className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/[0.06] px-3.5 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/[0.12]"><Compass size={15} /> Cuentas guía</button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {scrapGlobalVideoCount > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                  {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setMediaFilter(k)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${mediaFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{k === 'videos' && <Play size={10} className="fill-current" />}{label}{k === 'videos' && <span className="opacity-70">{scrapGlobalVideoCount}</span>}</button>
                  ))}
                </div>
              )}
              {scrapGlobalModels.length > 1 && (
                <div className="relative">
                  <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)} className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                    <option value="">Todas las modelos</option>
                    {scrapGlobalModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              )}
              <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
              </button>
              <div className="relative min-w-[180px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar (modelo, @cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              </div>
            </div>
            {scrapGlobalRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no trajiste nada de Instagram. Entrá a una modelo y tocá «Buscar en IG».</p>
            ) : (
              <div className="space-y-4">
                {scrapGlobalGroups.map((g) => (
                  <div key={g.label} className="space-y-2">
                    <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                  </div>
                ))}
                {visN < scrapGlobalRows.length && <div ref={sentinelRef} className="h-8" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETALLE DE GASTO / SALDO (pop-up) ── */}
      {spendOpen && selCreator && (() => {
        const spentPhotos = mineGens.filter((g) => g.status !== 'failed' && isPhotoGen(g)).reduce((a, g) => a + Number(g.credits || 0), 0);
        const spentVideos = mineGens.filter((g) => g.status !== 'failed' && g.media_type === 'video').reduce((a, g) => a + Number(g.credits || 0), 0);
        const spentFailed = mineGens.filter((g) => g.status === 'failed' && !isAudioGen(g)).reduce((a, g) => a + Number(g.credits || 0), 0);
        const Row = ({ label, cred, sub, tone }) => (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div><div className="text-sm text-paper">{label}</div>{sub && <div className="text-[11px] text-paper-dim">{sub}</div>}</div>
            <div className="text-right"><div className={`text-sm font-bold tabular-nums ${tone || 'text-paper'}`}>{money(cred)}</div><div className="text-[10px] text-paper-dim tabular-nums">{cred.toFixed(1)} créd</div></div>
          </div>
        );
        const low = selBal != null && selBal < VIDEO_MIN_CREDITS;
        return (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={() => setSpendOpen(false)}>
            <div className="w-full max-w-md rounded-3xl border border-line bg-card p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-paper">Plata · {selCreator.full_name}</h3>
                <button type="button" onClick={() => setSpendOpen(false)} className="text-paper-dim hover:text-paper"><X size={18} /></button>
              </div>
              <div className={`mb-3 rounded-2xl border p-4 ${low ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <div className="text-[11px] uppercase tracking-wide text-paper-dim">Te queda en Higgsfield{selAcct?.label ? ` · ${selAcct.label}` : hasAcctInfo ? ' · sin cuenta asignada' : ''}</div>
                <div className={`text-3xl font-bold tabular-nums ${low ? 'text-rose-300' : 'text-emerald-300'}`}>{selBal != null ? selBal.toFixed(1) : '—'} <span className="text-lg opacity-60">créd</span></div>
                <div className="text-sm text-paper-mute">{selBal != null ? `≈ ${money(selBal)} · alcanza para ~${Math.floor(selBal / 56)} video(s)` : 'sin dato — actualizá'}</div>
              </div>
              <div className="divide-y divide-line rounded-2xl border border-line bg-ink-2 px-4">
                <Row label="Gastado en fotos" cred={spentPhotos} sub={`${mine.photos} foto${mine.photos === 1 ? '' : 's'}`} tone="text-amber-300" />
                <Row label="Gastado en videos" cred={spentVideos} sub={`${mine.videos} video${mine.videos === 1 ? '' : 's'}`} tone="text-amber-300" />
                {spentFailed > 0 && <Row label="Perdido en las que no salieron" cred={spentFailed} sub="el motor cobró y falló igual" tone="text-rose-300" />}
                <Row label={`Total con ${selCreator.full_name}`} cred={mine.credits} sub={`${mine.photos + mine.videos} hechas`} tone="text-paper" />
              </div>
              {mine.audios > 0 && <p className="mt-2 text-center text-[11px] text-paper-dim"><AudioLines size={11} className="mr-1 inline text-brand" />{mine.audios} audio{mine.audios === 1 ? '' : 's'} de voz — se cobran en créditos de ElevenLabs, no suman a Higgsfield.</p>}
              <p className="mt-3 text-center text-[11px] text-paper-dim">Gastado en TODA la app: <b className="text-paper">{money(totalCredits)}</b> · {totalCredits.toFixed(0)} créd</p>
            </div>
          </div>
        );
      })()}

      {/* ── REPRODUCTOR DE VIDEO ── */}
      {videoPlay && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={() => setVideoPlay(null)}>
          <div className={`relative w-full ${videoPlay.refUrl ? 'max-w-3xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
            {videoPlay.refUrl ? (
              // Comparativo: el reel ORIGINAL vs la versión de la modelo (como el "versus" de las fotos). Ambos en silencio.
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Original</div>
                  <video src={videoPlay.refUrl} muted loop autoPlay playsInline controls className="max-h-[72vh] w-full rounded-2xl border border-line bg-black" />
                </div>
                <div>
                  <div className="mb-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">{selCreator?.stage_name || selCreator?.full_name || 'La modelo'}</div>
                  <video src={videoPlay.url} muted loop autoPlay playsInline controls className="max-h-[72vh] w-full rounded-2xl border border-brand/40 bg-black" />
                </div>
              </div>
            ) : (
              <video src={videoPlay.url} poster={videoPlay.poster} muted controls autoPlay playsInline className="max-h-[80vh] w-full rounded-2xl border border-line bg-black" />
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <a href={videoPlay.url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black hover:bg-white"><Download size={14} /> Descargar</a>
              <button type="button" onClick={() => setVideoPlay(null)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-paper-mute hover:text-paper"><X size={14} /> Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIZARD: agregar una fuente (cuenta o tema) en 3 pasos ── */}
      {wiz && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setWiz(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="text-sm font-bold text-paper">{wiz.step === 0 ? 'Buscar en Instagram' : <>Agregar a {selCreator?.full_name || 'la modelo'} <span className="font-normal text-paper-dim">· paso {wiz.step} de 3</span></>}</div>
              <button type="button" onClick={() => setWiz(null)} className="grid h-7 w-7 place-items-center rounded-full text-paper-mute hover:text-paper"><X size={16} /></button>
            </div>
            <div className="p-4">
              {wiz.step === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">¿Para qué modelo traigo las fotos?</p>
                  <select autoFocus defaultValue="" onChange={(e) => { if (e.target.value) { setSel(e.target.value); setScrapView(false); setSubtab('buscar'); setWiz({ step: 1, mode: null }); } }}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
                    <option value="">Elegí una modelo…</option>
                    {creators.map((c) => <option key={c.id} value={c.id}>{c.stage_name || c.full_name}</option>)}
                  </select>
                  <p className="text-[11px] text-paper-dim">Lo que traigas queda en el baúl de esa modelo.</p>
                </div>
              )}
              {wiz.step === 1 && (
                <div className="space-y-2.5">
                  <p className="text-xs text-paper-dim">¿De dónde traigo las fotos?</p>
                  <button type="button" onClick={() => setWiz({ step: 2, mode: 'cuenta' })}
                    className="flex w-full items-center gap-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/[0.06] p-3 text-left hover:bg-fuchsia-500/[0.12]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fuchsia-500/20 text-fuchsia-300"><Compass size={17} /></span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold text-paper">Una cuenta de Instagram</div><div className="text-[11px] text-paper-dim">Pegás @lacuenta y traigo sus mejores fotos</div></div>
                    <ArrowRight size={15} className="shrink-0 text-paper-dim" />
                  </button>
                  <button type="button" onClick={() => setWiz({ step: 2, mode: 'tema' })}
                    className="flex w-full items-center gap-3 rounded-xl border border-brand/40 bg-brand/[0.05] p-3 text-left hover:bg-brand/10">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/20 text-brand"><Search size={17} /></span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold text-paper">Un tema</div><div className="text-[11px] text-paper-dim">bikini, fitness, playa… sin cuenta</div></div>
                    <ArrowRight size={15} className="shrink-0 text-paper-dim" />
                  </button>
                </div>
              )}
              {wiz.step === 2 && wiz.mode === 'cuenta' && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">Pegá la cuenta pública (o varias separadas por coma).</p>
                  <input autoFocus value={newAccount} onChange={(e) => setNewAccount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setWiz({ ...wiz, step: 3 }); } }}
                    placeholder="@cuenta" className="w-full rounded-full border border-line bg-ink-2 px-4 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-fuchsia-400/60" />
                  {accounts.length > 0 && <p className="text-[11px] text-paper-dim">Ya tenés: {accounts.map((a) => '@' + a).join(', ')}. La nueva se suma.</p>}
                  <p className="text-[11px] text-paper-dim">Solo <b className="text-paper-mute">públicas</b>. Las privadas/+18 Instagram no las deja ver.</p>
                </div>
              )}
              {wiz.step === 2 && wiz.mode === 'tema' && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">Escribí uno o más temas y agregalos.</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {niches.map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                        {n}<button type="button" onClick={() => saveNiches(niches.filter((x) => x !== n))} className="opacity-70 hover:opacity-100"><X size={12} /></button>
                      </span>
                    ))}
                    <input autoFocus value={newNiche} onChange={(e) => setNewNiche(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNiche(); } }}
                      placeholder="bikini, fitness…" className="min-w-[120px] flex-1 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                    <button type="button" onClick={addNiche} disabled={!newNiche.trim()} className="inline-flex items-center gap-1 rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-40"><Plus size={13} /> Agregar</button>
                  </div>
                </div>
              )}
              {wiz.step === 3 && (
                <div className="space-y-3">
                  {(wiz.mode === 'cuenta' ? newAccount.trim() : (niches.length || newNiche.trim())) && (
                    <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] px-3 py-2 text-sm font-bold text-paper">
                      {wiz.mode === 'cuenta'
                        ? newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean).map((h) => '@' + h).join(', ')
                        : (niches.length ? niches.join(' · ') : newNiche.trim())}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs text-paper-dim">¿Qué traigo? <span className="text-paper-dim/70">(los mejores éxitos)</span></p>
                    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                      {[['fotos', 'Fotos'], ['videos', 'Videos'], ['ambos', 'Ambos']].map(([k, label]) => (
                        <button key={k} type="button"
                          onClick={() => { setWizType(k); if (k === 'fotos') { setQtyVideos(0); setQtyPhotos((v) => v || 10); } else if (k === 'videos') { setQtyPhotos(0); setQtyVideos((v) => v || 5); } else { setQtyPhotos((v) => v || 10); setQtyVideos((v) => v || 5); } }}
                          className={`rounded-full px-3 py-1 transition-colors ${wizType === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {wizType !== 'videos' && <label className="flex items-center gap-2 text-sm text-paper"><span className="text-paper-dim">Fotos</span>
                      <input type="number" min="0" max="60" value={qtyPhotos} onFocus={(e) => e.target.select()} onChange={(e) => setQtyPhotos(Math.max(0, Math.min(60, Number(e.target.value) || 0)))} className="w-16 rounded-lg border border-line bg-ink-2 px-2 py-1 text-sm text-paper outline-none focus:border-brand/60" /></label>}
                    {wizType !== 'fotos' && <label className="flex items-center gap-2 text-sm text-paper"><span className="text-paper-dim">Videos</span>
                      <input type="number" min="0" max="12" value={qtyVideos} onFocus={(e) => e.target.select()} onChange={(e) => setQtyVideos(Math.max(0, Math.min(12, Number(e.target.value) || 0)))} className="w-16 rounded-lg border border-line bg-ink-2 px-2 py-1 text-sm text-paper outline-none focus:border-brand/60" /></label>}
                  </div>
                  <p className="text-[11px] text-paper-dim">Traigo los de más likes/views (la «i» te dice por qué). Solo nuevos, no repite. {jobsOff ? 'Tarda 1-2 min.' : 'Lo busco en el servidor: ves el avance en la tarjeta de la cuenta.'}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <button type="button" onClick={() => (wiz.step <= 1 ? setWiz(null) : setWiz({ ...wiz, step: wiz.step - 1 }))}
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper">
                {wiz.step <= 1 ? 'Cancelar' : <><ArrowLeft size={14} /> Atrás</>}
              </button>
              {wiz.step === 2 && (
                <button type="button"
                  disabled={(wiz.mode === 'cuenta' && !newAccount.trim()) || (wiz.mode === 'tema' && niches.length === 0 && !newNiche.trim())}
                  onClick={() => { if (wiz.mode === 'tema' && newNiche.trim()) addNiche(); setWiz({ ...wiz, step: 3 }); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-40">Siguiente <ArrowRight size={14} /></button>
              )}
              {wiz.step === 3 && (
                // Paso final: cantidad + Buscar (fusionado — antes había un paso 4 redundante de "confirmar cuenta").
                <button type="button" disabled={qtyPhotos + qtyVideos <= 0 || scraping || scrapingAcc || !!checkingAcct || (wiz.mode === 'cuenta' && !acctsReady)}
                  onClick={async () => {
                    const m = wiz.mode; setWiz(null);
                    if (m === 'cuenta') {
                      const handles = newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean);
                      if (!handles.length) return;
                      const merged = [...new Set([...accounts, ...handles])].slice(0, 20); if (!(await saveAccounts(merged))) return; setNewAccount('');
                      // Motor nuevo: UNA llamada, una búsqueda por cuenta (fotos + videos juntos). Viejo: SOLO las que agregaste, una por una.
                      const r = asyncRef.current !== false && qtyPhotos + qtyVideos > 0 ? await startAccounts(sel, handles) : { legacy: true };
                      if (r.legacy) { for (const h of handles) { await checkOneAccountLegacy(h); } }
                    } else { await doScrape(); }
                    loadScrapeRuns(); loadScrapedGlobal();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-1.5 text-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-50">
                  {(scraping || scrapingAcc || checkingAcct) ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUENTAS GUÍA (pantalla completa): UNA sola página para las dos entradas ──
          Desde el selector de modelos («Buscar en IG») arranca en «Todas las modelos»; desde «Buscar en IG → Cuentas guía» de una
          modelo, en esa modelo. Arriba se elige la modelo. Mismos números (ver «NÚMEROS DEL SCRAPER») y mismas tarjetas en los dos modos. */}
      {acctView && (() => {
        const cid = selCreator ? sel : '';
        const allMode = !cid;
        const S = allMode ? scrapeStats.all : (scrapeStats.byModel[cid] || EMPTY_STAT);
        const C = allMode ? costStats.all : (costStats.byModel[cid] || EMPTY_COST);
        // Cuentas guía de TODAS las modelos (también las que no están en la lista: inactivas / de prueba), igual que bajadas y gasto.
        const seedIds = [...new Set([...creators.map((c) => c.id), ...Object.keys(allSeeds)])];
        const totalSeeds = seedIds.reduce((n, id) => n + seedsFor(id).length, 0);
        const activeIds = new Set(creators.map((c) => c.id));
        const restSeeds = seedIds.filter((id) => !activeIds.has(id)).reduce((n, id) => n + seedsFor(id).length, 0);
        const busyAny = scrapingAcc || !!checkingAcct;
        const term = acctSearch.trim().toLowerCase();
        const filterAcct = (cidX, h) => {
          if (term && !String(h).toLowerCase().includes(term) && !(allMode && String(nameById[cidX] || '').toLowerCase().includes(term))) return false;
          if (acctDate !== 'todas') {
            const t = scrapeStats.byAcct[cidX]?.[normH(h)]?.lastAt || 0; if (!t) return false;
            const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
            const diff = Math.round((startOf(new Date()) - startOf(new Date(t))) / 86400000);
            if (acctDate === 'hoy' && diff !== 0) return false;
            if (acctDate === 'ayer' && diff !== 1) return false;
            if (acctDate === 'semana' && diff > 6) return false;
          }
          return true;
        };
        const statBox = (n, label, sub, tone) => (
          <div><div className={`text-xl font-bold tabular-nums ${tone || 'text-paper'}`}>{n}</div><div className="text-[10px] text-paper-dim">{label}{sub ? <span className="text-paper-dim/70"> · {sub}</span> : null}</div></div>
        );
        const costRow = (c) => {
          const tag = costTag(c);
          return (
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1.5">
              <div><div className="text-sm font-bold tabular-nums text-amber-300">{usdS(c.fotos)}</div><div className="text-[10px] text-paper-dim">fotos (Apify)</div></div>
              <div><div className="text-sm font-bold tabular-nums text-amber-300">{videosCell(c)}</div><div className="text-[10px] text-paper-dim">videos (Apify){videosNote(c)}</div></div>
              <div><div className="text-sm font-bold tabular-nums text-amber-300">{c.aiRuns ? usdS(c.ai) : '—'}</div><div className="text-[10px] text-paper-dim">filtro IA{c.aiRuns && c.runs > c.aiRuns ? ` · ${c.runs - c.aiRuns} viejas sin dato` : !c.aiRuns && c.runs ? ' · sin dato (viejas)' : ''}</div></div>
              <div><div className="text-lg font-bold tabular-nums text-amber-200">{usdS(c.total)}</div><div className="text-[10px] text-paper-dim">total</div></div>
              <span className={`mb-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${tag.cls}`}>{tag.t}</span>
              {c.searches > 0 && <span className="mb-0.5 text-[10px] text-paper-dim">Apify trajo {c.found} resultado{c.found === 1 ? '' : 's'} en {c.searches} búsqueda{c.searches === 1 ? '' : 's'}</span>}
            </div>
          );
        };
        const totalsCard = (title, st, c, nSeeds, accent) => (
          <div className={`rounded-2xl border p-4 ${accent ? 'border-fuchsia-500/30 bg-fuchsia-500/[0.05]' : 'border-line bg-card'}`}>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${accent ? 'text-fuchsia-200/80' : 'text-paper-dim'}`}>{title}</div>
            <div className="mt-1.5 flex flex-wrap items-end gap-x-5 gap-y-2">
              {statBox(nSeeds, 'cuentas guía')}
              {statBox(st.bajadas, 'bajadas', `${st.fotos} fotos · ${st.videos} videos`)}
              {statBox(st.enMesa, 'en la mesa')}
              {statBox(st.iaSaco, 'la IA sacó', null, 'text-paper-mute')}
              {statBox(st.descartadas, 'descartadas', null, 'text-paper-mute')}
            </div>
            <div className="mt-3 border-t border-line/60 pt-2.5">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">Gasto del scraper</div>
              {costRow(c)}
            </div>
          </div>
        );
        // Tarjeta de UNA cuenta guía — la misma en «Todas las modelos» y en una modelo.
        const acctCard = (cidX, h) => {
          const k = normH(h);
          const st = scrapeStats.byAcct[cidX]?.[k] || EMPTY_STAT;
          const c = costStats.byAcct[cidX]?.[k] || EMPTY_COST;
          const tag = costTag(c);
          const aj = activeJobFor(cidX, h); // búsqueda en segundo plano de ESTA cuenta (motor nuevo)
          const ji = lastJobIssue(cidX, h); // motivo de la última búsqueda nueva terminada (persiste al recargar)
          const issueTxt = ji !== undefined ? (ji ? ISSUE_CARD[ji] || ISSUE_CARD.blocked : null) : (acctIssue[h] || null);
          const priv = ji !== undefined ? ji === 'private' : privateAccts.has(h);
          const busy = !aj && cidX === sel && checkingAcct === h;
          const srvBusy = !aj && !busy && recentRunning(cidX, h); // (camino viejo) el navegador dejó de esperar pero el servidor sigue
          const tops = acctTops[`${cidX}|${k}`] || [];
          const dayList = Object.entries(st.days || {}).sort((x, y) => String(y[0]).localeCompare(String(x[0]))).slice(0, 8);
          return (
            <div key={`${cidX}|${h}`} className={`overflow-hidden rounded-2xl border ${priv && !aj ? 'border-rose-500/40 bg-rose-500/[0.05]' : 'border-line bg-card'}`}>
              <div className="flex items-start gap-2 p-3">
                <button type="button" onClick={() => openAcctDetail(cidX, h)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-bold text-paper hover:underline">@{h} <span className="text-[10px] font-semibold text-fuchsia-300">ver todas →</span></div>
                  {busy ? (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300"><Loader2 size={11} className="animate-spin" /> {jobsOff ? 'Buscando… (1-3 min)' : 'Empezando la búsqueda…'}</div>
                  ) : srvBusy ? (
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300"><Loader2 size={11} className="animate-spin" /> Sigue buscando en el servidor… aparece en 2-3 min</div>
                  ) : (!aj && (issueTxt || priv)) ? (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300"><AlertTriangle size={11} /> {issueTxt || 'Privada o +18 — Instagram no la deja ver.'}</div>
                  ) : (
                    <>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-paper-dim"><b className="text-paper">{st.bajadas}</b> bajadas</span>
                        <span className="text-paper-dim"><b className="text-paper">{st.enMesa}</b> en la mesa</span>
                        {st.videos > 0 && <span className="inline-flex items-center gap-1 text-sky-300"><Play size={9} className="fill-current" /> {st.videos}</span>}
                        {st.bajadas === 0 && !st.lastAt
                          ? <span className="font-semibold text-fuchsia-300">· nueva — tocá «Buscar más» para traerla</span>
                          : <span className="text-paper-dim/70">· última {agoLabel(st.lastAt)}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-paper-dim">
                        <span>gasto <b className="text-amber-300">{usdS(c.total)}</b></span>
                        {c.runs > 0 && <span>fotos {usdS(c.fotos)} · videos {videosCell(c)} · IA {c.aiRuns ? usdS(c.ai) : '—'}</span>}
                        <span className={`rounded-full px-1.5 py-0.5 font-semibold ${tag.cls}`}>{tag.t}</span>
                      </div>
                    </>
                  )}
                </button>
                <button type="button" onClick={() => buscarMas(cidX, h)} disabled={jobsOff ? busyAny : (!!aj || busy)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-fuchsia-400/40 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10 active:translate-y-px disabled:opacity-40" title="Traer sus últimas fotos/videos (solo nuevos)">
                  {busy || aj ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {busy || aj ? 'Buscando…' : 'Buscar más'}
                </button>
                <button type="button" onClick={() => removeAccount(cidX, h)} disabled={(jobsOff ? busyAny : busy) || (cidX === sel && !acctsReady)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:border-rose-400 hover:text-rose-300 disabled:opacity-40" title="Quitar cuenta"><X size={13} /></button>
              </div>
              {aj && <div className="border-t border-line/60 px-3 py-2">{jobProgress(aj)}</div>}
              {dayList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 border-t border-line/60 px-3 py-2">
                  <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim/70">Historial</span>
                  {dayList.map(([d, n]) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full bg-ink-2 px-2 py-0.5 text-[10px] font-semibold text-paper-mute">{fmtDay(d)} <span className="text-fuchsia-300">+{n}</span></span>
                  ))}
                </div>
              )}
              {tops.length > 0 && (
                <div className="grid grid-cols-5 gap-0.5 border-t border-line/60 bg-ink-2">
                  {tops.map((r) => (
                    <div key={r.id} className="relative aspect-square overflow-hidden">
                      <img src={r.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      {r.media_type === 'video' && <span className="absolute inset-0 grid place-items-center"><span className="grid h-6 w-6 place-items-center rounded-full bg-black/55"><Play size={11} className="fill-white text-white" /></span></span>}
                      {Number(r.likes) > 0 && <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[9px] font-bold text-white">{fmtLikes(r.likes)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        };
        // Lo que NO es de una cuenta guía: temas/hashtags, reels por link, cuentas quitadas y búsquedas viejas en varias cuentas a la vez.
        const extrasRow = (cidX) => {
          const so = scrapeStats.other[cidX]; const co = costStats.other[cidX]; const cm = costStats.multi[cidX];
          if (!(so?.bajadas || co?.runs || cm?.runs)) return null;
          return (
            <div className="mt-3 space-y-1 rounded-xl border border-dashed border-line bg-card/40 px-3 py-2 text-[11px] text-paper-dim">
              {(so?.bajadas || co?.runs) ? (
                <div><b className="text-paper-mute">Fuera de las cuentas guía</b> (temas, reels por link, cuentas quitadas y el filtro IA de fotos pendientes de antes): <b className="text-paper">{so?.bajadas || 0}</b> bajadas · <b className="text-paper">{so?.enMesa || 0}</b> en la mesa · gasto <b className="text-amber-300">{usdS(co?.total || 0)}</b>{co?.runs ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${costTag(co).cls}`}>{costTag(co).t}</span> : null}</div>
              ) : null}
              {cm?.runs ? (
                <div><b className="text-paper-mute">Búsquedas viejas en varias cuentas a la vez</b>: {cm.runs} · gasto <b className="text-amber-300">{usdS(cm.total)}</b><span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${costTag(cm).cls}`}>{costTag(cm).t}</span> — no se puede repartir por cuenta (ahora «Buscar en todas» va de a una).</div>
              ) : null}
            </div>
          );
        };
        // Factura real de Apify del ciclo vs lo que la app tiene registrado en ese ciclo.
        const billStrip = (() => {
          const b = apifyBill;
          let regReal = 0, regEst = 0;
          if (b && b.ok && b.cycle_start) {
            const t0 = Date.parse(b.cycle_start) || 0; const t1 = b.cycle_end ? (Date.parse(b.cycle_end) || Infinity) : Infinity;
            scrapeRuns.forEach((r) => { const t = Date.parse(r.run_at) || 0; if (t >= t0 && t <= t1) { const rc = runCostOf(r); regReal += rc.real; regEst += rc.est; } });
          }
          const gap = b && b.ok && b.month_usd != null ? b.month_usd - regReal - regEst : 0;
          const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short' }); } catch { return ''; } };
          return (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Apify este mes · lo que cobró Apify de verdad</div>
                {!b ? (
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-paper-dim"><Loader2 size={12} className="animate-spin" /> Leyendo la factura de Apify…</div>
                ) : b.error ? (
                  <div className="mt-1 text-xs text-paper-dim">{b.error}</div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-end gap-x-5 gap-y-1.5">
                    <div><div className="text-xl font-bold tabular-nums text-amber-300">{b.month_usd != null ? usd(b.month_usd) : '—'}</div><div className="text-[10px] text-paper-dim">factura de Apify{b.cycle_start ? ` · ${fmtD(b.cycle_start)} – ${fmtD(b.cycle_end)}` : ''}{b.limit_usd != null ? ` · tope ${usd(b.limit_usd)}` : ''}</div></div>
                    <div><div className="text-sm font-bold tabular-nums text-emerald-300">{usdS(regReal)}</div><div className="text-[10px] text-paper-dim">registrado real en la app</div></div>
                    {regEst > 0.0005 && <div><div className="text-sm font-bold tabular-nums text-amber-200">{usdS(regEst)}</div><div className="text-[10px] text-paper-dim">registrado estimado (sin verificar)</div></div>}
                    {gap > 0.01 && <div><div className="text-sm font-bold tabular-nums text-rose-300">{usdS(gap)}</div><div className="text-[10px] text-paper-dim">cobrado y sin registrar en la app</div></div>}
                  </div>
                )}
                <div className="mt-1 text-[10px] text-paper-dim/80">Es TODO lo que corrió en tu cuenta de Apify: todas las modelos, pruebas y lo de antes del 28 sep.</div>
              </div>
              {myRole === 'admin' && (
                <button type="button" onClick={runBackfill} disabled={backfilling} title="Busca en Apify el costo real de cada búsqueda vieja (las que hoy dicen «estimado»)"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3.5 py-2 text-xs font-semibold text-paper-mute hover:text-paper disabled:opacity-50">
                  {backfilling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Traer costo real de Apify
                </button>
              )}
            </div>
          );
        })();
        const startAdd = () => {
          if (!newAccount.trim()) return;
          if (allMode) { if (!addFor) { setMsg({ kind: 'info', text: 'Elegí primero a qué modelo le agregás la cuenta.' }); return; } pickAcctModel(addFor); }
          setWiz({ step: 2, mode: 'cuenta' });
        };
        const addBox = (
          <div className="mb-5 rounded-2xl border border-line bg-card p-4">
            <div className="mb-2 text-sm font-semibold text-paper">Agregar cuenta{allMode ? '' : ` a ${selCreator.full_name}`}</div>
            <div className="flex flex-wrap items-center gap-2">
              {allMode && (
                <div className="relative">
                  <select value={addFor} onChange={(e) => setAddFor(e.target.value)}
                    className="appearance-none rounded-full border border-line bg-ink-2 py-2 pl-3.5 pr-8 text-sm text-paper outline-none focus:border-fuchsia-400/60">
                    <option value="">¿A qué modelo?</option>
                    {creators.map((c) => <option key={c.id} value={c.id}>{c.stage_name || c.full_name}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              )}
              <input value={newAccount} onChange={(e) => setNewAccount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newAccount.trim()) { e.preventDefault(); startAdd(); } }}
                placeholder="@cuenta pública o link (o pegá varias separadas por coma)" className="min-w-[200px] flex-1 rounded-full border border-line bg-ink-2 px-4 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-fuchsia-400/60" />
              <button type="button" onClick={startAdd} disabled={!newAccount.trim() || busyAny || (allMode ? !addFor : !acctsReady)}
                className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white hover:bg-fuchsia-600 disabled:opacity-40">
                <Search size={15} /> Agregar y buscar
              </button>
            </div>
            <p className="mt-2 text-[11px] text-paper-dim">Te pregunto cuántas <b className="text-paper-mute">fotos</b> y cuántos <b className="text-paper-mute">videos</b> y traigo los mejores éxitos (solo nuevos). Solo cuentas <b className="text-paper-mute">públicas</b> (las privadas/+18 te las marco en rojo).</p>
          </div>
        );
        const filters = (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={acctSearch} onChange={(e) => setAcctSearch(e.target.value)} placeholder={allMode ? 'Buscar cuenta o modelo…' : 'Buscar cuenta…'} className="w-full rounded-full border border-line bg-ink-2 py-1.5 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
              {[['todas', 'Todas'], ['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', '7 días']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setAcctDate(k)} className={`rounded-full px-2.5 py-1 transition-colors ${acctDate === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{label}</button>
              ))}
            </div>
          </div>
        );
        // Ir a la grilla de TODO lo bajado (de esta modelo o de todas).
        const goToGrid = () => {
          setAcctView(false); setAcctDetail(null); setAcctBack(null);
          setMediaFilter('todo'); setBaulSearch('');
          if (allMode) { setBaulModel(''); setScrapView(true); } else { setScrapView(false); setSubtab('buscar'); }
        };

        // Ficha de UNA cuenta (solo con una modelo elegida).
        const detailView = (!allMode && acctDetail) ? (() => {
          const a = acctDetail; const k = normH(a);
          const ajD = activeJobFor(cid, a); const jiD = lastJobIssue(cid, a);
          const priv = !ajD && (jiD !== undefined ? jiD === 'private' : privateAccts.has(a));
          const st = scrapeStats.byAcct[cid]?.[k] || EMPTY_STAT;
          const c = costStats.byAcct[cid]?.[k] || EMPTY_COST;
          const runs = runsOfAcct(cid, a);
          const dayList = Object.entries(st.days || {}).sort((x, y) => String(y[0]).localeCompare(String(x[0])));
          const mesaRows = mesaMedia(vault.filter((r) => r.kind === 'ref' && r.creator_id === cid && isScraped(r))).filter((r) => normH(r.source_handle) === k);
          const vidCount = mesaRows.filter((r) => r.media_type === 'video').length;
          const effF = vidCount > 0 ? mediaFilter : 'todo';
          const photos = mesaRows.filter((r) => (effF === 'fotos' ? r.media_type !== 'video' : effF === 'videos' ? r.media_type === 'video' : true)).sort((x, y) => new Date(y.created_at || 0).getTime() - new Date(x.created_at || 0).getTime());
          return (
            <div>
              <button type="button" onClick={() => setAcctDetail(null)} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={15} /> Todas las cuentas</button>
              <div className="mb-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-bold text-paper">@{a}</div>
                  <button type="button" onClick={() => buscarMas(cid, a)} disabled={jobsOff ? busyAny : (!!ajD || checkingAcct === a)} className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-600 active:translate-y-px disabled:opacity-40" title="Traer sus fotos nuevas (no repite las que ya tenés)">{checkingAcct === a || ajD ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {ajD ? 'Buscando…' : 'Buscar más'}</button>
                </div>
                {ajD && <div className="mt-2 rounded-xl border border-line bg-ink-2/40 px-3 py-2">{jobProgress(ajD)}</div>}
                {!ajD && jiD && jiD !== 'private' && <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300"><AlertTriangle size={11} /> {ISSUE_CARD[jiD] || ISSUE_CARD.blocked}</div>}
                <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                  {statBox(st.bajadas, 'bajadas', `${st.fotos} fotos · ${st.videos} videos`)}
                  {statBox(st.enMesa, 'en la mesa')}
                  {statBox(st.iaSaco, 'la IA sacó', null, 'text-paper-mute')}
                  {statBox(st.descartadas, 'descartadas', null, 'text-paper-mute')}
                  <div><div className="text-sm font-bold tabular-nums text-paper">{agoLabel(st.lastAt)}</div><div className="text-[10px] text-paper-dim">última</div></div>
                </div>
                <div className="mt-3 border-t border-fuchsia-500/20 pt-2.5">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">Gasto de esta cuenta</div>
                  {costRow(c)}
                </div>
                {priv && <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300"><AlertTriangle size={11} /> privada o +18 — Instagram no la deja ver</div>}
              </div>
              {runs.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Búsquedas ({runs.length}) · lo que trajo Apify, lo nuevo que se guardó y lo que costó</div>
                  <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                    {runs.map((r) => {
                      const rc = runCostOf(r); const one = newCost(); addCost(one, rc); const tg = costTag(one);
                      return (
                        <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[11px]">
                          <span className="w-28 shrink-0 font-semibold text-paper-mute">{fmtWhen(r.run_at)}</span>
                          <span className="text-paper-dim">Apify trajo <b className="text-paper">{rc.found}</b></span>
                          <span className="text-paper-dim">guardó <b className="text-paper">{rc.saved}</b> foto{rc.saved === 1 ? '' : 's'}{r.videos != null ? <> · <b className="text-paper">{rc.savedVideos}</b> video{rc.savedVideos === 1 ? '' : 's'}</> : null}</span>
                          {r.status === 'error' && <span className="font-semibold text-rose-300" title={r.error || ''}>falló</span>}
                          {rc.running && <span className="inline-flex items-center gap-1 font-semibold text-amber-300"><Loader2 size={10} className="animate-spin" /> en curso en el servidor</span>}
                          {rc.paused && <span className="font-semibold text-paper-mute" title="Nadie la está manejando ahora: sigue sola cuando abras la cocina o prendas el cocinero de la Mac.">en pausa</span>}
                          {rc.cut && <span className="font-semibold text-rose-300" title="La función se cortó antes de terminar. Apify sí cobró: «Traer costo real de Apify» completa el costo.">se cortó</span>}
                          <span className="ml-auto text-paper-dim">fotos {usdS(rc.fotos)} · videos {!rc.videosKnown ? '— (sin dato)' : rc.vidPend ? (rc.videos > 0.000001 ? `${usdS(rc.videos)} estimado` : 'falta el costo') : usdS(rc.videos)} · IA {rc.aiKnown ? usdS(rc.ai) : '—'} · <b className="text-amber-300">{usdS(rc.fotos + rc.videos + rc.ai)}</b></span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tg.cls}`}>{tg.t}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {dayList.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Historial · bajadas por día</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dayList.map(([d, n]) => <span key={d} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold text-paper-mute">{fmtDay(d)} <span className="text-fuchsia-300">+{n}</span></span>)}
                  </div>
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">En la mesa · {photos.length}</span>
                {vidCount > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-[11px] font-semibold">
                    {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([kk, label]) => (
                      <button key={kk} type="button" onClick={() => setMediaFilter(kk)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors ${mediaFilter === kk ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                        {kk === 'videos' && <Play size={9} className="fill-current" />}{label}{kk === 'videos' && <span className="opacity-70">{vidCount}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {photos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Nada en la mesa con este filtro.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{photos.map(renderTodaCard)}</div>
              )}
            </div>
          );
        })() : null;

        // «Todas las modelos»: una sección por modelo con las MISMAS tarjetas.
        const modelsWith = allMode ? creators.filter((c) => seedsFor(c.id).length || scrapeStats.byModel[c.id]?.bajadas || costStats.byModel[c.id]?.runs) : [];

        return (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
            <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
                <button type="button" onClick={closeAcctPage} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver</button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><Compass size={16} className="text-fuchsia-300" /> Cuentas guía</div>
                  <div className="truncate text-[11px] text-paper-dim">{allMode ? 'Todas las modelos · elegí una para agregar cuentas y buscar' : `Influencers de ${selCreator.full_name} · sus fotos alimentan tu mesa`}</div>
                </div>
                <div className="relative">
                  <select value={cid} onChange={(e) => pickAcctModel(e.target.value)} disabled={busyAny} title="Elegí la modelo"
                    className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper outline-none hover:border-brand/40 focus:border-brand/60 disabled:opacity-50">
                    <option value="">Todas las modelos</option>
                    {creators.map((c) => <option key={c.id} value={c.id}>{c.stage_name || c.full_name} · {seedsFor(c.id).length} cuenta{seedsFor(c.id).length === 1 ? '' : 's'}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button type="button" onClick={goToGrid} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper" title="Ver la grilla de todo lo que está en la mesa"><LayoutGrid size={13} /> Ver lo bajado</button>
                  {!allMode && acctsReady && accounts.length > 0 && (() => {
                    const bt = jobsOff ? null : activeBatchOf(cid); // «Buscar en todas» del motor nuevo en curso
                    return (
                      <button type="button" onClick={doScrapeAccounts} disabled={busyAny || !acctsReady || !!bt}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white hover:bg-fuchsia-600 active:translate-y-px disabled:opacity-50">
                        {scrapingAcc || bt ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {bt ? `Buscando… ${bt.done}/${bt.n} listas` : scrapingAcc ? `Buscando${bulkProg ? ` ${bulkProg.i} de ${bulkProg.n}` : ''}…` : `Buscar en todas (${accounts.length})`}
                      </button>
                    );
                  })()}
                </div>
              </div>
              {msg && <div className="mx-auto max-w-5xl px-4 pb-3 lg:px-6">{msgBanner()}</div>}
            </div>
            <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
              {detailView || (<>
                {/* Totales: la modelo + el total del scraper (o solo el total en «Todas») — mismas definiciones */}
                <div className={`mb-4 grid gap-3 ${allMode ? '' : 'lg:grid-cols-2'}`}>
                  {!allMode && totalsCard(selCreator.full_name, S, C, seedsFor(cid).length, true)}
                  {totalsCard('Total del scraper · todas las modelos', scrapeStats.all, costStats.all, totalSeeds, allMode)}
                </div>
                {billStrip}
                <p className="mb-4 text-[11px] leading-relaxed text-paper-dim">
                  <b className="text-paper-mute">Bajadas</b> = todo lo que el scraper guardó (sin repetidas). <b className="text-paper-mute">En la mesa</b> = lo que sigue usable (ni la IA ni vos lo sacaron).
                  {' '}<b className="text-paper-mute">Real (Apify)</b> = lo que Apify cobró por esa búsqueda. <b className="text-paper-mute">Estimado</b> = búsquedas sin costo verificado todavía (≈US$2.30 por 1.000 resultados que trae Apify); «falta el costo real» = arrancó y Apify todavía no dio el número.
                  {' '}<b className="text-paper-mute">Videos</b> = el actor de reels, aparte de las fotos (en las búsquedas viejas no se registraba: «sin dato»). <b className="text-paper-mute">Filtro IA</b> = lo que cuesta la IA que revisa cada foto y cada video.
                </p>
                {addBox}
                {allMode ? (
                  <>
                    {filters}
                    {modelsWith.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line bg-card/40 p-10 text-center text-sm text-paper-dim">Todavía no hay cuentas guía. Elegí una modelo arriba y agregale influencers públicas.</p>
                    ) : modelsWith.map((c) => {
                      const seeds = seedsFor(c.id).filter((h) => filterAcct(c.id, h));
                      const nameHit = !!term && String(c.stage_name || c.full_name || '').toLowerCase().includes(term);
                      if ((term || acctDate !== 'todas') && !seeds.length && !nameHit) return null;
                      const Sm = scrapeStats.byModel[c.id] || EMPTY_STAT; const Cm = costStats.byModel[c.id] || EMPTY_COST; const tg = costTag(Cm);
                      return (
                        <div key={c.id} className="mb-6">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => pickAcctModel(c.id)} className="font-display text-sm font-bold text-paper hover:underline">{c.stage_name || c.full_name}</button>
                            <span className="text-[11px] text-paper-dim">{seedsFor(c.id).length} cuentas guía · {Sm.bajadas} bajadas · {Sm.enMesa} en la mesa · gasto <b className="text-amber-300">{usdS(Cm.total)}</b></span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tg.cls}`}>{tg.t}</span>
                            <span className="h-px flex-1 bg-line/60" />
                            <button type="button" onClick={() => pickAcctModel(c.id)} className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/40 px-3 py-1 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10">Abrir <ArrowRight size={12} /></button>
                          </div>
                          {seeds.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">{seeds.map((h) => acctCard(c.id, h))}</div>
                          ) : (
                            <p className="rounded-xl border border-dashed border-line bg-card/40 p-4 text-center text-xs text-paper-dim">Sin cuentas guía{term || acctDate !== 'todas' ? ' con este filtro' : ''}. Tocá «Abrir» para agregarle.</p>
                          )}
                          {extrasRow(c.id)}
                        </div>
                      );
                    })}
                    {/* Lo que suma el total y no tiene sección: modelos que no están en la lista (inactivas o de prueba). */}
                    {(scrapeStats.rest?.bajadas || costStats.rest?.runs || restSeeds) ? (
                      <div className="mb-6 rounded-xl border border-dashed border-line bg-card/40 px-3 py-2 text-[11px] text-paper-dim">
                        <b className="text-paper-mute">Otras modelos (inactivas o de prueba)</b>: <b className="text-paper">{restSeeds}</b> cuentas guía · <b className="text-paper">{scrapeStats.rest?.bajadas || 0}</b> bajadas · <b className="text-paper">{scrapeStats.rest?.enMesa || 0}</b> en la mesa · gasto <b className="text-amber-300">{usdS(costStats.rest?.total || 0)}</b>
                        {costStats.rest?.runs ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${costTag(costStats.rest).cls}`}>{costTag(costStats.rest).t}</span> : null}
                        <span className="text-paper-dim/80"> — están en el total de arriba; no aparecen en la lista de modelos.</span>
                      </div>
                    ) : null}
                  </>
                ) : !acctsReady && acctsErr ? (
                  <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/[0.05] p-8 text-sm text-rose-200">
                    <AlertTriangle size={15} className="shrink-0" /> No pude leer las cuentas guía de {selCreator.full_name}: {acctsErr}
                    <button type="button" onClick={() => { setAcctsErr(''); setSeedsReload((n) => n + 1); }} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper"><RefreshCw size={12} /> Reintentar</button>
                  </div>
                ) : !acctsReady ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-card/40 p-10 text-sm text-paper-dim"><Loader2 size={15} className="animate-spin" /> Leyendo las cuentas guía de {selCreator.full_name}…</div>
                ) : accounts.length === 0 ? (
                  <>
                    <div className="rounded-2xl border border-dashed border-line bg-card/40 p-10 text-center">
                      <Compass size={26} className="mx-auto mb-2 text-fuchsia-300/70" />
                      <p className="text-sm font-semibold text-paper">Todavía no tenés cuentas guía</p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-paper-dim">Agregá arriba las influencers públicas que te gustan. Traigo sus mejores fotos (por likes) y las dejo listas para cocinar.</p>
                    </div>
                    {extrasRow(cid)}
                  </>
                ) : (
                  <>
                    {filters}
                    <div className="grid gap-3 sm:grid-cols-2">{accounts.filter((h) => filterAcct(cid, h)).map((h) => acctCard(cid, h))}</div>
                    {extrasRow(cid)}
                  </>
                )}
              </>)}
            </div>
          </div>
        );
      })()}

      {/* ── RUEDITA FLOTANTE (identificador global): gira mientras cocina, se pone verde cuando hay listas ── */}
      {(cookingAll.length > 0 || readyAll.length > 0) && (
        <button type="button" onClick={goToCooking}
          className={`fixed right-4 z-30 inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-bold shadow-lg backdrop-blur transition-colors ${queueBarShown ? 'bottom-20' : 'bottom-4'} ${cookingAll.length > 0 ? 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'}`}
          title={cookingAll.length > 0 ? 'Se está cocinando — tocá para ver' : 'Hay cosas listas para revisar — tocá para verlas'}>
          {cookingAll.length > 0 ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Cocinando {cookingAll.length}…</span>
              {readyAll.length > 0 && <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-100">{readyAll.length} listas</span>}
            </>
          ) : (
            <>
              <CheckCircle2 size={17} />
              <span>{readyAll.length} lista{readyAll.length > 1 ? 's' : ''} para revisar</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      )}

      {/* Barra flotante de cola */}
      {selCreator && (['cocinar', 'buscar'].includes(subtab) || acctView) && queue.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-brand/30 bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2 text-sm text-paper">
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand px-2 text-xs font-bold text-on-accent">{queue.length}</span>
              <span className="font-semibold">seleccionada(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQueue([])} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">Quitar selección</button>
              <button type="button" onClick={bulkDiscard} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"><Trash2 size={14} /> Sacar la basura {queue.length}</button>
              <button type="button" onClick={enqueue} disabled={enq} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                {enq ? <Loader2 size={14} className="animate-spin" /> : <Pot size={14} />} Cocinar {queue.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FICHA de una viral de la mesa ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="card3d flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-card sm:flex-row" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 bg-ink-2 sm:w-1/2"><img src={detail.url} alt="" className="max-h-[42vh] w-full object-contain sm:max-h-[92vh]" /></div>
            <div className="flex min-w-0 flex-1 flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-bold text-paper">Info de la foto</h3>
                <button type="button" onClick={() => setDetail(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:text-paper"><X size={15} /></button>
              </div>
              <div className="space-y-2 text-sm">
                {detail.source_platform ? (
                  <>
                    <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Red social</span><span className="font-semibold capitalize text-paper">{detail.source_platform}</span></div>
                    {detail.source_handle && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Cuenta</span>{detail.source_url ? <a href={detail.source_url} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">@{detail.source_handle} ↗</a> : <span className="font-semibold text-paper">@{detail.source_handle}</span>}</div>}
                    {detail.likes != null && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Likes</span><span className="inline-flex items-center gap-1 font-semibold text-paper"><Heart size={13} className="fill-rose-400 text-rose-400" /> {fmtLikes(detail.likes)}</span></div>}
                    {detail.views != null ? <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Views (video)</span><span className="inline-flex items-center gap-1 font-semibold text-sky-300">▶ {fmtLikes(detail.views)}</span></div> : <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Views</span><span className="text-[11px] text-paper-dim">solo videos/reels</span></div>}
                    {detail.comments != null && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Comentarios</span><span className="font-semibold text-paper">💬 {fmtLikes(detail.comments)}</span></div>}
                    {detail.media_type === 'video' && detail.video_url && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Video</span><a href={detail.video_url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"><Download size={12} /> Descargar</a></div>}
                    {detail.vibe && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Nicho</span><span className="font-semibold text-paper">#{detail.vibe}</span></div>}
                    {detail.created_at && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Traída</span><span className="font-semibold text-paper">{fmtDay(String(detail.created_at).slice(0, 10))}</span></div>}
                    <div className="rounded-lg border border-brand/30 bg-brand/[0.06] p-2 text-[12px] text-paper"><b className="text-brand">Por qué es de las mejores:</b> la elegí por engagement — {fmtLikes(detail.likes || 0)} likes{detail.views ? ` + ${fmtLikes(detail.views)} views` : ''}{detail.comments ? ` + ${fmtLikes(detail.comments)} comentarios` : ''}. Traigo siempre las de números más altos.</div>
                  </>
                ) : (
                  <p className="text-paper-mute">Foto tuya (subida a mano). No tiene datos de origen.</p>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2"><span className="text-paper-dim">Cuesta recrearla</span><span className="font-semibold text-amber-300">~{money(0.12)} · 0.12 créd</span></div>
                {detail.ai_reason && <p className="rounded-lg border border-line bg-ink-2/40 p-2 text-[12px] text-paper-mute">🤖 {detail.ai_reason}</p>}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                {/* Elegir: normal (1 foto) o carrusel (réplica + N variaciones) */}
                <div className="col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-paper-mute">Cocinar como:</span>
                    <button type="button" onClick={() => setDetailN(1)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${detailN === 1 ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}>Normal</button>
                    {[2, 3, 4].map((n) => (
                      <button key={n} type="button" onClick={() => setDetailN(n)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${detailN === n ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}><LayoutGrid size={11} /> Carrusel {n}</button>
                    ))}
                  </div>
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px]"><ChefHat size={12} className="text-brand" /> Motor: <span className="font-bold text-brand">Soul 2.0</span> <span className="text-paper-dim">— el único aprobado (mantiene cara y cuerpo real)</span></div>
                  <button type="button" disabled={enq} onClick={() => cookDetail(detail, detailN)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                    {enq ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} />} {detailN > 1 ? `Cocinar carrusel de ${detailN}` : 'Cocinar'} con {(selCreator?.full_name || '').split(' ')[0]}
                  </button>
                </div>
                <button type="button" onClick={() => markInterest(detail, 'interesada')} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${detail.interest === 'interesada' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}><Heart size={13} /> Me interesa</button>
                <button type="button" onClick={() => markInterest(detail, 'descartada')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-rose-300"><X size={13} /> Fuera</button>
                {detail.vibe && <button type="button" onClick={() => moreLikeThis(detail)} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-paper"><Search size={13} /> Más como esta (#{detail.vibe})</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ANTES / DESPUÉS + CARRUSEL (todo dentro del pop-up) ── */}
      {compare && cmpRoot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setCompare(null)}>
          <div className="card3d flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-paper">Antes / Después {cmpKids.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"><LayoutGrid size={11} /> Carrusel · {carouselCount(compare.root) + 1}</span>}</h3>
              <button type="button" onClick={() => setCompare(null)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper-mute hover:text-paper"><X size={15} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* Réplica: viral vs su versión */}
              <div className="grid grid-cols-2 gap-3">
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Viral (referencia)</div><img src={cmpRoot.reference_url} alt="" onClick={() => setLightbox({ url: cmpRoot.reference_url, label: 'Viral (referencia)' })} className="w-full cursor-zoom-in rounded-xl border border-line object-cover" /></div>
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">Su versión · <span className={engineOf(cmpRoot) === 'Nano' ? 'text-rose-300' : 'text-brand'}>{engineOf(cmpRoot)}</span> {cmpRoot.status === 'approved' && <span className="text-emerald-300">· aprobada ✓</span>}</div><img src={cmpRoot.result_url} alt="" onClick={() => setLightbox({ url: cmpRoot.result_url, label: `Su versión · ${engineOf(cmpRoot)}` })} className="w-full cursor-zoom-in rounded-xl border border-brand/40 object-cover" /></div>
              </div>
              {cmpRoot.status === 'done' && (
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-semibold text-paper-dim">¿Algo para ajustar antes de rehacer? (opcional)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={redoNote} onChange={(e) => setRedoNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') redo(cmpRoot, redoNote); }}
                      placeholder="ej: más glúteo · más sonrisa · menos filtro · que se vea mejor la cara…"
                      className="min-w-[200px] flex-1 rounded-full border border-line bg-ink-2 px-4 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                    <button type="button" onClick={() => redo(cmpRoot, redoNote)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" title="Cocinar otra versión (con tu ajuste si escribiste algo)"><RefreshCw size={14} /> Rehacer</button>
                    <button type="button" onClick={() => decide(cmpRoot, false, false)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95"><Trash2 size={14} /> Descartar</button>
                    <button type="button" onClick={() => decide(cmpRoot, true, true)} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95"><Heart size={14} /> Aprobar → baúl</button>
                  </div>
                </div>
              )}
              {/* Aprobada: feedback INSTANTÁNEO (optimista) mientras el server limpia la metadata y la guarda en el baúl */}
              {cmpRoot.status === 'approved' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">
                  <CheckCircle2 size={16} className="shrink-0" /> Aprobada ✓ — va al baúl
                  {deciding[cmpRoot.id] && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-200/70"><Loader2 size={11} className="animate-spin" /> guardándola limpia (sin metadata)…</span>}
                </div>
              )}
              {/* Si el aprobar/descartar falló: la foto volvió a como estaba y el motivo se ve ACÁ (el banner de arriba queda tapado por el pop-up) */}
              {decideErr[cmpRoot.id] && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{decideErr[cmpRoot.id]}</span>
                  <button type="button" onClick={() => dropDecideErr(cmpRoot.id)} className="shrink-0 opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
              )}

              {/* Carrusel: mismo lugar + mismo outfit, otras poses */}
              <div className="mt-4 rounded-2xl border border-brand/25 bg-ink-2 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-paper"><Sparkles size={15} className="text-brand" /> Más fotos de {selCreator.full_name} <span className="text-[11px] font-normal text-paper-dim">— con su soul real, se parece a ELLA</span></div>
                {/* 3 modos claros: Carrusel (set coherente) · Sorpréndeme (fotos sueltas variadas) · Yo elijo (prompteo cada una). Todo Soul 2.0. */}
                <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
                  <button type="button" onClick={() => setVarMode('carrusel')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'carrusel' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><LayoutGrid size={12} /> Carrusel</button>
                  <button type="button" onClick={() => setVarMode('suelta')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'suelta' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Sparkles size={12} /> Sorpréndeme</button>
                  <button type="button" onClick={() => setVarMode('custom')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'custom' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Flame size={12} /> Yo elijo</button>
                </div>
                <p className="mb-3 text-[10px] leading-snug text-paper-dim">{varMode === 'carrusel' ? <><b className="text-paper-mute">Mismo lugar y outfit</b>, varias poses que van JUNTAS como UN post de Instagram (set coherente).</> : varMode === 'suelta' ? <><b className="text-paper-mute">Fotos nuevas y variadas</b> de ella (otros lugares/outfits) — contenido suelto, no atado a esta foto.</> : <>Vos escribís qué querés en cada foto (mismo lugar y outfit).</>}</p>

                {varMode !== 'custom' ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-paper-mute">¿Cuántas?</span>
                      {[2, 3, 4, 6].map((n) => (
                        <button key={n} type="button" onClick={() => setVarN(n)} className={`h-7 w-8 rounded-lg text-xs font-bold transition-colors ${varN === n ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}>{n}</button>
                      ))}
                    </div>
                    <button type="button" disabled={varBusy} onClick={() => makeVariations(compare.root)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                      {varBusy ? <Loader2 size={14} className="animate-spin" /> : varMode === 'carrusel' ? <LayoutGrid size={14} /> : <Sparkles size={14} />} {varMode === 'carrusel' ? `Hacer carrusel · ${varN} fotos` : `Sorpréndeme · ${varN} sueltas`}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[11px] text-paper-mute">Escribí qué querés en cada foto. La que dejes vacía, la IA la resuelve sola.</p>
                    <div className="mb-2 space-y-1.5">
                      {varIdeas.map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{i + 1}</span>
                          <input value={v} onChange={(e) => setVarIdeas((a) => a.map((x, j) => j === i ? e.target.value : x))} placeholder={`Foto ${i + 1} (ej: ${['con el teléfono, media sonrisa', 'riéndose mirando a un lado', 'tomando algo, relajada', 'de espaldas mirando atrás', 'selfie al espejo, coqueta'][i % 5]})`} className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-paper placeholder:text-paper-dim/60 focus:border-brand/50 focus:outline-none" />
                          {varIdeas.length > 1 && <button type="button" onClick={() => setVarIdeas((a) => a.filter((_, j) => j !== i))} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:text-rose-300"><X size={12} /></button>}
                        </div>
                      ))}
                    </div>
                    {varIdeas.length < 8 && <button type="button" onClick={() => setVarIdeas((a) => [...a, ''])} className="mb-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-paper-mute hover:text-paper"><Plus size={12} /> Agregar otra foto</button>}
                    <button type="button" disabled={varBusy} onClick={() => makeVariations(compare.root)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                      {varBusy ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />} Cocinar {varIdeas.length} con tus ideas
                    </button>
                  </>
                )}

                {/* Fotos del carrusel: cocinándose + listas */}
                {cmpKids.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {cmpKids.map((k) => (
                      <div key={k.id} className={`overflow-hidden rounded-lg border bg-card ${k.status === 'approved' ? 'border-emerald-500/40' : k.status === 'failed' ? 'border-rose-500/30' : 'border-line'}`}>
                        {['queued', 'in_progress'].includes(k.status) ? (
                          <div className="relative">
                            {mediaTile(k.reference_url, "aspect-[3/4] w-full scale-105 object-cover blur-md brightness-[0.4]")}
                            <div className="absolute inset-0 grid place-items-center"><Loader2 size={20} className="animate-spin text-amber-300" /></div>
                          </div>
                        ) : k.status === 'failed' ? (
                          <div className="relative">
                            {mediaTile(k.reference_url, "aspect-[3/4] w-full object-cover opacity-40")}
                            <button type="button" onClick={() => retry(k)} className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-rose-200"><RefreshCw size={16} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <img src={k.result_url} alt="" onClick={() => setLightbox({ url: k.result_url, label: `Motor: ${engineOf(k)}` })} className="aspect-[3/4] w-full cursor-zoom-in object-cover" />
                              {k.status === 'approved' && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={11} /></span>}
                            </div>
                            {motorLine(k)}
                            {k.status === 'done' && (
                              <div className="flex items-center gap-1 p-1.5">
                                <button type="button" onClick={() => decide(k, true, true)} className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-full bg-emerald-500/20 px-1 py-1 text-[10px] font-bold text-emerald-200 transition active:scale-90 hover:bg-emerald-500/30"><Heart size={10} /></button>
                                <button type="button" onClick={() => decide(k, false, true)} className="inline-flex items-center justify-center rounded-full border border-line px-1.5 py-1 text-paper-mute transition active:scale-90 hover:text-rose-300"><Trash2 size={10} /></button>
                              </div>
                            )}
                            {decideErr[k.id] && <p title={decideErr[k.id]} className="line-clamp-3 px-1.5 pb-1.5 text-[9px] leading-snug text-rose-300">{decideErr[k.id]}</p>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISOR EN GRANDE (lightbox) ── z-index inline alto para quedar SIEMPRE arriba del pop-up */}
      {lightbox && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" style={{ zIndex: 2147483000 }} onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 hover:bg-white/10"><X size={20} /></button>
          {lightbox.label && <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">{lightbox.label}</div>}
          <img src={lightbox.url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
