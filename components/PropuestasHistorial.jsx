'use client';

// ─────────────────────────────────────────────────────────────────────────
// PropuestasHistorial — /trabajo › Propuestas (lo que le importa a la PR).
//
// El historial de TODAS las fotos de todas las propuestas que armó, de tres
// formas:
//   · «Por modelo» (la de entrada) → una tarjeta por MODELO (persona, misma
//     agrupación que el filtro): portada = su última foto aprobada, cuántas
//     propuestas / aprobadas en el período, su última propuesta y cuántas
//     esperan respuesta; lo que se movió último, primero. Tocarla abre SU
//     página (= pone el filtro de modelo): «Bajar sus aprobadas», «Crear
//     propuesta» y dos pestañas — «Sus propuestas» (las tarjetas de siempre) y
//     «Sus aprobadas» (la grilla de siempre, con elegir + bajar).
//   · «Por propuesta» → una tarjeta por propuesta (la más nueva arriba); al
//     abrirla, sus looks con el estado de cada uno (aprobada / cambio / sin
//     respuesta / le gustó pero no envió).
//   · «Aprobadas»     → UNA grilla con todo lo que las modelos aprobaron, de
//     todas las propuestas filtradas, lo último aprobado primero.
// «Mías» = las que armó la persona actual (en «Ver como», la persona mirada);
// «Todo el equipo» = todas.
//
// FUENTE: Supabase con la sesión del staff (RLS is_staff — la PR es staff).
// Solo LEE; nunca escribe. Tablas:
//   · photo_proposals          (la propuesta: looks, audios, autor, estado…)
//   · photo_proposal_feedback  (respuesta ENVIADA de la creadora)
//   · proposal_progress        (borrador de la creadora: marcó pero no envió)
//   · proposal_content         (lo aprobado que cayó a su cuenta + prod_state)
//   · photo_proposal_registrations (solo como señal de «abrió»)
//
// Semántica por look — la MISMA de AdminPropuestas / Almacén:
//   · proposal_content.decision = 'approved' → APROBADA (manda sobre todo).
//   · si no, el feedback final de la creadora: 'liked' → aprobada, 'rejected'
//     → cambio (con su nota).
//   · si NO envió nada, lo marcado en borrador (proposal_progress.items) se
//     muestra como «le gustó · sin enviar» — NO cuenta como aprobado.
//   · el feedback del EQUIPO (reviewer_kind 'internal') nunca es aprobación.
//     EXCEPCIÓN: en una propuesta INTERNA, la 0096 guarda como 'internal' TODA
//     respuesta del link — también la que manda la propia modelo. Si esa fila va
//     a SU nombre (recipient_name de la propuesta; el equipo firma con el suyo),
//     es su respuesta ENVIADA: cuenta como tal, marcada «vía link interno»
//     (no cayó sola a su cuenta — la 0096 no llena proposal_content).
// «Modelo» del filtro = una persona: se agrupa por recipient_user_id; sin cuenta,
// por nombre normalizado (y si ese nombre es de UNA sola cuenta, se suma a ella).
// Los datos normalizados quedan en caché de módulo (TTL corto) → volver a la
// pestaña es instantáneo; «Reintentar» fuerza.
//
// BAJAR FOTOS (también en «Ver como»: solo lee, no escribe nada):
//   · «Aprobadas»: elegir fotos (casilla arriba a la izquierda; con algo
//     elegido, tocar la foto la marca; Shift = rango) y «Bajar N», o «Bajar
//     todas (M)» = todo lo aprobado con los filtros actuales.
//   · «Por propuesta»: «Bajar aprobadas (N)» en cada propuesta abierta.
//   · Página de una modelo: «Bajar sus aprobadas (N)» (las del período) y, en
//     «Sus aprobadas», la misma grilla con elegir + «Bajar todas».
//   · El «Descargar» del visor grande pasa por lo mismo.
// Dos pasos (así iOS no lo bloquea): PREPARAR (baja cada foto, le saca la
// metadata con lib/strip-meta y arma el .zip con lib/zip) y después un botón
// con gesto fresco «Guardar .zip». Más de ~200 MB → por partes: cada una se
// guarda apenas se llena y recién ahí se arma la próxima (una en memoria a la
// vez). REGLA: nada que llega a una modelo lleva metadata (EXIF/XMP/IPTC/C2PA
// «hecho con IA»/texto) — cada foto se re-chequea después de limpiarla; si
// quedó algo, plan B (canvas) o no va.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Pencil,
  Check, X, Download, Play, ImageOff, Images, Music, Inbox, Clock, RotateCcw, Share2, Users,
} from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { getSupabase } from '@/lib/supabase/client';
import { buildZip } from '@/lib/zip';
import { stripImageMeta, detectFormat, scanMeta } from '@/lib/strip-meta';

// ── Fechas ────────────────────────────────────────────────────────────────
const MES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const base = `${d.getDate()} ${MES_ES[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
function tsOf(iso) {
  if (!iso) return 0;
  const m = new Date(iso).getTime();
  return Number.isNaN(m) ? 0 : m;
}

// Resumen del feedback ENVIADO (idéntico a AdminPropuestas).
function feedbackSummary(fb) {
  const items = Array.isArray(fb?.items) ? fb.items : [];
  return {
    liked: items.filter((i) => i.status === 'liked').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    comments: items.filter((i) => (i.note || '').trim()).length,
    total: items.length,
  };
}

// stateOf de AdminPropuestas sobre la fila cruda: borrador · vencida · publicada.
function baseState(row) {
  if (row?.status === 'draft') return 'borrador';
  if (row?.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'vencida';
  return 'publicada';
}

// La píldora de estado de la tarjeta (mismas palabras que /admin › Propuestas).
function chipOf(p) {
  if (p.deliveredAt) return { label: 'Entregada', tone: 'ok' };
  if (p.fbTotal > 0) return { label: p.viaInterna ? 'Respondió (vía interna)' : 'Respondió', tone: 'ok' };
  if (p.approval?.status === 'rejected') return { label: 'Rechazada', tone: 'bad' };
  if (p.approval?.status === 'pending') return { label: p.internal ? 'En revisión' : 'Pend. aprobación', tone: 'warn' };
  if (p.progress && p.progress.decided > 0) return { label: `A medias · va ${p.progress.decided}/${p.progress.total || '?'}`, tone: 'warn' };
  if (p.state === 'vencida') return { label: 'Vencida', tone: 'bad' };
  if (p.state === 'borrador') return { label: 'Borrador', tone: 'zinc' };
  if (p.openedAt) return { label: 'Abrió', tone: 'brand' };
  return { label: 'Enviada', tone: 'zinc' };
}

// ¿Espera a la modelo? = salió (publicada, sin revisión pendiente ni rechazada,
// no vencida) y ella todavía NO envió nada — puede estar «a medias» (marcó sin
// apretar Enviar): eso también es «sin responder».
// INTERNA: no sale en el panel de la modelo (solo le llega por el correo de
// invitación, y muchas aprobadas quedaron sin enviar) → espera a la modelo
// solo si hay señal de que le llegó (la abrió / se registró / empezó a marcar).
function isWaiting(p) {
  if (p.status === 'archived' || p.state !== 'publicada') return false;
  if (p.deliveredAt || p.fbTotal > 0) return false;
  if (p.approval?.status === 'pending' || p.approval?.status === 'rejected') return false;
  if (p.internal && !p.openedAt) return false;
  return !(p.counts.aprobadas > 0 || p.counts.cambios > 0);
}

// Iniciales para la tarjeta sin foto («Celia Lora» → «CL»).
function initialsOf(s) {
  const w = String(s || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  const first = (x) => Array.from(x)[0] || '';
  return (first(w[0]) + (w.length > 1 ? first(w[w.length - 1]) : '')).toUpperCase();
}

const PERIOD_TXT = { mes: 'Este mes', pasado: 'El mes pasado', todo: 'En total' };

// ── Media (tolerante a datos viejos: data: base64, rutas, URLs) ──────────
// Devuelve '' si no es algo que se pueda mostrar (nunca revienta).
function cleanSrc(src) {
  if (typeof src !== 'string') return '';
  const s = src.trim();
  if (!s) return '';
  if (s.startsWith('data:')) return /^data:(image|video)\//i.test(s) ? s : '';
  if (/^(https?:|blob:)/i.test(s) || s.startsWith('/')) return s;
  return '';
}
function cleanAudio(src) {
  if (typeof src !== 'string') return '';
  const s = src.trim();
  if (!s) return '';
  if (s.startsWith('data:')) return /^data:audio\//i.test(s) ? s : '';
  if (/^(https?:|blob:)/i.test(s) || s.startsWith('/')) return s;
  return '';
}
function isVideoSrc(s) {
  if (!s) return false;
  if (s.startsWith('data:')) return /^data:video\//i.test(s);
  return /\.(mp4|mov|webm|m4v|ogv)$/i.test(s.split(/[?#]/)[0]);
}
// #t=0.1 → el navegador pinta el primer cuadro como miniatura (iOS incluido).
function posterSrc(s) { return s.startsWith('data:') || s.includes('#') ? s : `${s}#t=0.1`; }
function extOf(s) {
  if (!s) return 'jpg';
  if (s.startsWith('data:')) {
    const m = /^data:[a-z]+\/([a-z0-9.+-]+)/i.exec(s);
    const e = (m?.[1] || 'jpg').split('+')[0].toLowerCase().replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
    return (e || 'jpg').slice(0, 4);
  }
  const e = (s.split(/[?#]/)[0].split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return e && e.length <= 4 ? e : 'jpg';
}
function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'foto';
}
const normName = (s) => String(s || '').trim().toLowerCase();

// ── Bajar fotos en lote ───────────────────────────────────────────────────
const ZIP_PART_MAX = 200 * 1024 * 1024; // pasado ~200 MB se abre otra parte (memoria del teléfono)
const SHARE_MAX = 30;                   // hoja de compartir del teléfono: hasta 30 archivos
const DL_CONCURRENCY = 4;               // fotos bajando a la vez
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const ymdOf = (iso) => { const t = tsOf(iso); return t ? ymd(new Date(t)) : ''; };
// Nombre de carpeta legible (la modelo como se llama), sin caracteres que
// rompen en Windows/Mac. Solo ASCII: lib/zip no marca los nombres como UTF-8,
// así que «María José» saldría «Mar+¡a Jos+®» al descomprimir → «Maria Jose».
function folderName(s) {
  const f = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]+/g, ' ').replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 60).trim();
  return f || 'Sin modelo';
}
const EXT_BY_FMT = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', avif: 'avif', heic: 'heic', mov: 'mov', mp4: 'mp4', webm: 'webm' };
const EXT_BY_TYPE = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/avif': 'avif', 'image/heic': 'heic', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};
const TYPE_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  heic: 'image/heic', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};
const fmtMB = (n) => `${Math.max(0.1, n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

// ¿Le queda metadata? La REGLA no depende de que strip-meta entienda el
// archivo: cada foto se re-chequea después de limpiarla.
const STRIP_FMTS = new Set(['jpeg', 'png', 'webp']);
const hasMeta = (u8) => Object.values(scanMeta(u8)).some(Boolean);
// Plan B cuando strip-meta no pudo (devolvió el original) o el chequeo ve algo:
// se re-dibuja en un canvas (no copia metadata), se re-codifica, se re-limpia y
// se re-chequea. null = no hubo forma → esa foto NO se entrega.
async function reencodeClean(raw, fmt) {
  let c = null;
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
    const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    const bmp = await createImageBitmap(new Blob([raw], { type: mime }));
    c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    if (!ctx) { bmp.close?.(); return null; }
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();
    const blob = await new Promise((res) => { try { c.toBlob(res, mime, 0.95); } catch { res(null); } });
    if (!blob) return null;
    const out = await stripImageMeta(new Uint8Array(await blob.arrayBuffer()), blob.type);
    return STRIP_FMTS.has(detectFormat(out)) && !hasMeta(out) ? out : null;
  } catch {
    return null;
  } finally {
    if (c) { c.width = 0; c.height = 0; } // suelta la memoria del canvas (iOS)
  }
}

// ¿Teléfono/tablet con hoja de compartir de archivos? (en la compu, el .zip).
function phoneShareCapable() {
  try {
    if (typeof navigator === 'undefined' || typeof window === 'undefined' || !navigator.canShare || !navigator.share) return false;
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    const ua = navigator.userAgent || '';
    const mobile = /iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return coarse && mobile;
  } catch { return false; }
}

// Arma la lista de archivos: carpeta por modelo + nombre estable y sin choques.
//   «Celia/celia-contenido-para-tus-redes-2026-09-29-01.webp»
// El número es la posición de la foto entre las APROBADAS de su propuesta (en
// el orden de los looks) → la misma foto siempre se llama igual. La extensión
// se pone después, con los bytes reales en la mano.
function planDownload(items, labelOf) {
  const numBy = {};
  const seenP = new Set();
  items.forEach(({ p }) => {
    if (!p || seenP.has(p.id)) return;
    seenP.add(p.id);
    let a = 0;
    let all = 0;
    p.items.forEach((x) => {
      if (x.kind !== 'photo') return;
      all += 1;
      if (x.status === 'aprobada') { a += 1; numBy[x.key] = a; } else if (numBy[x.key] == null) numBy[x.key] = all;
    });
  });
  const folderBy = {};
  const folderOwner = new Map(); // carpeta (minúsculas) → modelo dueña
  const used = new Set();
  return items.map((it) => {
    const p = it.p || {};
    const label = labelOf(p);
    const mk = p.modelKey || `n:${normName(label)}`;
    let folder = folderBy[mk];
    if (!folder) {
      const base = folderName(label);
      folder = base;
      for (let n = 2; folderOwner.has(folder.toLowerCase()) && folderOwner.get(folder.toLowerCase()) !== mk; n++) folder = `${base} (${n})`;
      folderOwner.set(folder.toLowerCase(), mk);
      folderBy[mk] = folder;
    }
    const stem = [slug(label || 'modelo'), slug(p.name || 'propuesta'), ymdOf(p.createdAt)].filter(Boolean).join('-');
    const num = pad2(numBy[it.key] || 1);
    let file = `${stem}-${num}`;
    for (let n = 2; used.has(`${folder}/${file}`.toLowerCase()); n++) file = `${stem}-${num}-${n}`;
    used.add(`${folder}/${file}`.toLowerCase());
    return { key: it.key, src: cleanSrc(it.src), folder, file };
  });
}

// Normaliza una propuesta + sus respuestas a { …, items: [look con estado] }.
function normalize(row, creatorFb, prog, contentMap, reg, fbInt) {
  const type = ['visual', 'audio', 'both'].includes(row.proposal_type) ? row.proposal_type : 'visual';
  const looks = type !== 'audio' && Array.isArray(row.looks) ? row.looks.filter((l) => l && l.id != null && l.result) : [];
  const audios = (type === 'audio' || type === 'both') && Array.isArray(row.audios) ? row.audios.filter((a) => a && a.id != null && a.src) : [];

  // Propuesta INTERNA respondida por la MODELO: la 0096 manda al bucket 'internal'
  // toda respuesta del link, aunque la envíe ella. La reconocemos porque va a SU
  // nombre (el equipo firma con el propio) → es su respuesta ENVIADA.
  let fb = creatorFb;
  let via = '';
  const hasCreatorItems = Array.isArray(creatorFb?.items) && creatorFb.items.length > 0;
  if (!hasCreatorItems && row.recipient_kind === 'internal') {
    const who = normName(row.recipient_name);
    const own = who
      ? (Array.isArray(fbInt) ? fbInt : []).find((f) => normName(f?.recipient_name) === who && Array.isArray(f.items) && f.items.length > 0)
      : null;
    if (own) { fb = own; via = 'interna'; }
  }

  // Feedback ENVIADO de la creadora, por id de look.
  const submitted = Array.isArray(fb?.items) ? fb.items : [];
  const subBy = {};
  submitted.forEach((i) => { if (i && i.id != null) subBy[String(i.id)] = i; });
  // Borrador (proposal_progress): SOLO si no envió nada — igual que PropDetail.
  const draftBy = {};
  if (submitted.length === 0) {
    (Array.isArray(prog?.items) ? prog.items : []).forEach((i) => {
      if (i && i.id != null && (i.status === 'liked' || i.status === 'rejected' || (i.note || '').trim())) draftBy[String(i.id)] = i;
    });
  }

  const created = row.created_at || null;
  const resolve = (id) => {
    const c = contentMap[id];
    const s = subBy[id];
    const d = draftBy[id];
    const note = String(s?.note || d?.note || '').trim();
    if (c && c.decision === 'approved') {
      return { status: 'aprobada', note, prodState: (c.prod_state === 'delivered' || c.delivered_at) ? 'delivered' : 'to_produce', decidedAt: c.created_at || fb?.updated_at || created };
    }
    if (c && c.decision === 'rejected') return { status: 'cambio', note, prodState: null, decidedAt: c.created_at || fb?.updated_at || created };
    if (s?.status === 'liked') return { status: 'aprobada', note, prodState: row.delivered_at ? 'delivered' : null, via, decidedAt: fb?.updated_at || created };
    if (s?.status === 'rejected') return { status: 'cambio', note, prodState: null, via, decidedAt: fb?.updated_at || created };
    if (d?.status === 'liked') return { status: 'gusto_borrador', note, prodState: null, decidedAt: prog?.updated_at || null };
    if (d?.status === 'rejected') return { status: 'cambio_borrador', note, prodState: null, decidedAt: prog?.updated_at || null };
    return { status: 'sin', note, prodState: null, decidedAt: null };
  };

  const items = [];
  const seen = new Set();
  looks.forEach((l) => {
    const id = String(l.id);
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ key: `${row.id}:${id}`, id, kind: 'photo', caption: l.caption || '', src: l.result, ...resolve(id) });
  });
  audios.forEach((a) => {
    const id = String(a.id);
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ key: `${row.id}:${id}`, id, kind: 'audio', caption: a.label || '', src: a.src, ...resolve(id) });
  });
  // Lo que cayó a la cuenta aunque el look ya no esté en la propuesta (se editó
  // después) — no se pierde del historial.
  Object.keys(contentMap).forEach((id) => {
    if (seen.has(id)) return;
    const c = contentMap[id];
    if (!c?.src) return;
    seen.add(id);
    items.push({ key: `${row.id}:${id}`, id, kind: c.kind === 'audio' ? 'audio' : 'photo', caption: c.label || '', src: c.src, ...resolve(id) });
  });

  const counts = { aprobadas: 0, cambios: 0, sin: 0, borrador: 0 };
  items.forEach((it) => {
    if (it.status === 'aprobada') counts.aprobadas += 1;
    else if (it.status === 'cambio') counts.cambios += 1;
    else if (it.status === 'gusto_borrador' || it.status === 'cambio_borrador') counts.borrador += 1;
    else counts.sin += 1;
  });

  return {
    id: row.id,
    code: row.link_id || '',
    lang: row.lang || 'es',
    name: row.name || '',
    type,
    status: row.status || 'published',
    state: baseState(row),
    internal: row.recipient_kind === 'internal',
    createdAt: created,
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || '',
    // La «modelo» de la propuesta es su destinataria (en la interna, la modelo
    // sobre la que se arma). model_name queda de respaldo para filas viejas.
    model: (row.recipient_name || row.model_name || '').trim(),
    modelUid: row.recipient_user_id || null,
    modelKey: '', // lo asigna assignModelKeys (agrupa a la misma persona)
    viaInterna: via === 'interna',
    deliveredAt: row.delivered_at || null,
    openedAt: row.first_opened_at || reg?.created_at || prog?.updated_at || null,
    approval: row.approval_required ? { status: row.approval_status || 'pending' } : null,
    fbTotal: feedbackSummary(fb).total,
    progress: prog ? { decided: Number(prog.decided) || 0, total: Number(prog.total) || 0 } : null,
    items,
    counts,
  };
}

// Una modelo = una persona: por su cuenta (recipient_user_id); sin cuenta, por
// nombre normalizado — y si ese nombre es de UNA sola cuenta, se suma a ella.
// Así «Celia» y «CELIA LORA» (misma cuenta) son una sola opción del filtro.
function assignModelKeys(list) {
  const uidsByName = {};
  list.forEach((p) => {
    const n = normName(p.model);
    if (p.modelUid && n) (uidsByName[n] = uidsByName[n] || new Set()).add(p.modelUid);
  });
  list.forEach((p) => {
    const n = normName(p.model);
    if (p.modelUid) p.modelKey = `u:${p.modelUid}`;
    else if (n && uidsByName[n]?.size === 1) p.modelKey = `u:${[...uidsByName[n]][0]}`;
    else p.modelKey = n ? `n:${n}` : '';
  });
  return list;
}

// Solo las columnas que se usan (sin portada/cierre/intro/logos).
const PROPOSAL_COLS = 'id, proposal_type, looks, audios, created_at, link_id, lang, name, status, expires_at, recipient_kind, recipient_user_id, recipient_name, model_name, created_by, created_by_name, delivered_at, first_opened_at, approval_required, approval_status';

async function fetchAndNormalize() {
  const sb = getSupabase();
  const [propsRes, fbRes, progRes, contentRes, regRes] = await Promise.all([
    sb.from('photo_proposals').select(PROPOSAL_COLS).order('created_at', { ascending: false }),
    sb.from('photo_proposal_feedback').select('proposal_id, items, recipient_name, updated_at, reviewer_kind').order('updated_at', { ascending: false }),
    sb.from('proposal_progress').select('proposal_id, decided, liked, total, updated_at, reviewer_kind, items').order('updated_at', { ascending: false }),
    sb.from('proposal_content').select('proposal_id, item_id, kind, label, src, decision, prod_state, delivered_at, created_at').order('created_at', { ascending: true }),
    sb.from('photo_proposal_registrations').select('proposal_id, created_at').order('created_at', { ascending: false }),
  ]);
  if (propsRes.error) throw propsRes.error;
  const props = Array.isArray(propsRes.data) ? propsRes.data : [];

  // Respuesta de la CREADORA aparte; las del bucket 'internal' se guardan por
  // propuesta (en las internas, la de la modelo cae ahí — ver normalize).
  const fbBy = {};
  const fbIntBy = {};
  (Array.isArray(fbRes.data) ? fbRes.data : []).forEach((f) => {
    if (!f?.proposal_id) return;
    if (f.reviewer_kind === 'internal') { (fbIntBy[f.proposal_id] = fbIntBy[f.proposal_id] || []).push(f); return; }
    if (!fbBy[f.proposal_id]) fbBy[f.proposal_id] = f;
  });
  const progBy = {};
  (Array.isArray(progRes.data) ? progRes.data : []).forEach((pr) => {
    if (pr?.proposal_id && pr.reviewer_kind !== 'internal' && !progBy[pr.proposal_id]) progBy[pr.proposal_id] = pr;
  });
  const contentBy = {};
  (Array.isArray(contentRes.data) ? contentRes.data : []).forEach((c) => {
    if (!c?.proposal_id || c.item_id == null) return;
    if (!contentBy[c.proposal_id]) contentBy[c.proposal_id] = {};
    contentBy[c.proposal_id][String(c.item_id)] = c;
  });
  const regBy = {};
  (Array.isArray(regRes.data) ? regRes.data : []).forEach((r) => {
    if (r?.proposal_id && !regBy[r.proposal_id]) regBy[r.proposal_id] = r;
  });

  const out = [];
  props.forEach((row) => {
    if (!row?.id) return;
    try { out.push(normalize(row, fbBy[row.id], progBy[row.id], contentBy[row.id] || {}, regBy[row.id], fbIntBy[row.id])); } catch { /* fila rota: se salta, no rompe la vista */ }
  });
  return assignModelKeys(out);
}

// Caché de módulo por usuario de SESIÓN (en «Ver como» es la del dueño: los
// mismos datos; «Mías» se filtra acá). Volver a la pestaña = instantáneo; si
// pasó el TTL, se muestra lo guardado y se refresca por detrás. Un solo pedido
// en vuelo a la vez.
const CACHE_TTL = 2 * 60 * 1000;
let CACHE = null;    // { uid, at, rows }
let INFLIGHT = null; // { uid, promise }
function fetchRows(uid) {
  if (INFLIGHT && INFLIGHT.uid === uid) return INFLIGHT.promise;
  const promise = fetchAndNormalize()
    .then((rows) => { CACHE = { uid, at: Date.now(), rows }; return rows; })
    .finally(() => { if (INFLIGHT && INFLIGHT.promise === promise) INFLIGHT = null; });
  INFLIGHT = { uid, promise };
  return promise;
}

const PAGE_PROPS = 30;
const PAGE_PHOTOS = 60;
const PAGE_MODELS = 24;

export default function PropuestasHistorial({ me, viewAs = null, readOnly = false }) {
  const person = viewAs || me || null; // en «Ver como», la persona mirada
  // Con caché de esta sesión arranca ya pintado (sin el «Cargando…» de un cuadro).
  const cached = CACHE && CACHE.uid === (me?.id || '') ? CACHE.rows : null;
  const [rows, setRows] = useState(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [err, setErr] = useState('');
  const [scope, setScope] = useState(null);        // 'mias' | 'equipo' (null = todavía sin decidir)
  const scopeTouched = useRef(false);
  const [view, setView] = useState('modelo');      // 'modelo' | 'propuesta' | 'aprobadas'
  // En «Por modelo», `model` (el filtro de modelo) = la página de ESA modelo;
  // vacío = la grilla de modelos. Así filtro y página nunca se contradicen.
  const [model, setModel] = useState('');
  const [modelTab, setModelTab] = useState('propuestas'); // su página: 'propuestas' | 'aprobadas'
  const [modelIn, setModelIn] = useState('');      // el filtro de modelo que ya traía al entrar a «Por modelo» (ver pickView)
  const stashedModel = useRef('');                 // su página, al salir a una vista global (vuelve con «Por modelo»)
  const [modelLimit, setModelLimit] = useState(PAGE_MODELS);
  const contentRef = useRef(null);                 // arriba del contenido (para volver al abrir/cerrar una modelo)
  const gridScroll = useRef(null);                 // dónde estaba la grilla al abrir una modelo (← vuelve ahí)
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('mes'); // 'mes' (este mes) | 'pasado' (mes anterior) | 'todo'
  const [withArchived, setWithArchived] = useState(false);
  const [open, setOpen] = useState({});            // tarjetas abiertas por id
  const [propLimit, setPropLimit] = useState(PAGE_PROPS);
  const [photoLimit, setPhotoLimit] = useState(PAGE_PHOTOS);
  const [preview, setPreview] = useState(null);    // { list, i }
  const [sel, setSel] = useState(() => new Set()); // fotos elegidas (keys) en «Aprobadas»
  const [pickMode, setPickMode] = useState(false); // «Elegir» sin nada marcado todavía
  const lastPick = useRef(null);                   // clave del último tocado (Shift = rango)
  const [dl, setDl] = useState(null);              // la bajada en curso / lista (ver startDownload)
  const dlJob = useRef(null);                      // { id, ctrl } — para cancelar
  const alive = useRef(true);

  // force = ignora la caché (Reintentar). Con caché vigente no pide nada; con
  // caché vieja la muestra ya y refresca en silencio (si falla, queda lo guardado).
  const load = async (force = false) => {
    const uid = me?.id || '';
    let silent = false;
    if (!force && CACHE && CACHE.uid === uid) {
      setRows(CACHE.rows);
      setErr('');
      setLoading(false);
      if (Date.now() - CACHE.at < CACHE_TTL) return;
      silent = true;
    }
    if (!silent) { setLoading(true); setErr(''); }
    try {
      const out = await fetchRows(uid);
      if (alive.current) { setRows(out); setErr(''); }
    } catch {
      if (alive.current && !silent) { setRows([]); setErr('No pude cargar las propuestas.'); }
    } finally {
      if (alive.current && !silent) setLoading(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      const job = dlJob.current;
      dlJob.current = null;
      try { job?.ctrl?.abort(); } catch { /* nada */ }
      job?.resume?.(); // si una parte esperaba que la guarden, la suelta (y se corta)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ¿La armó la persona actual? Por id; las filas viejas sin created_by caen
  // al nombre del autor.
  const isMine = (p) => {
    if (!person?.id) return false;
    if (p.createdBy) return p.createdBy === person.id;
    const n = normName(person.full_name);
    return !!n && normName(p.createdByName) === n;
  };

  // Base: fuera archivadas (salvo que se pidan) y borradores.
  const base = useMemo(
    () => rows.filter((p) => p.status !== 'draft' && (withArchived || p.status !== 'archived')),
    [rows, withArchived],
  );
  const mineCount = useMemo(
    () => rows.filter((p) => p.status !== 'draft' && p.status !== 'archived' && isMine(p)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, person?.id],
  );

  // Arranca en «Todo el equipo»: la PR ve TODO lo del equipo (decisión del dueño). «Mías» queda como opción.
  useEffect(() => {
    if (loading || scopeTouched.current) return;
    setScope('equipo');
  }, [loading, mineCount]);
  const effScope = scope || 'equipo';

  // Rango del período elegido (inicio inclusive, fin exclusivo, hora local).
  const periodRange = useMemo(() => {
    if (period === 'todo') return null;
    const d = new Date(); const y = d.getFullYear(); const m = d.getMonth();
    return period === 'pasado'
      ? [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]
      : [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
  }, [period]);
  const inPeriod = (iso) => { if (!periodRange) return true; const t = tsOf(iso); return t >= periodRange[0] && t < periodRange[1]; };

  const scoped = useMemo(
    () => (effScope === 'mias' ? base.filter(isMine) : base),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, effScope, person?.id],
  );

  // Una opción por PERSONA (modelKey), con el nombre que más usa (a igualdad,
  // el más reciente). `model` guarda la clave, no el texto.
  const models = useMemo(() => {
    const g = {};
    scoped.forEach((p) => {
      if (!p.modelKey || !p.model) return;
      const e = g[p.modelKey] || (g[p.modelKey] = {});
      const nm = e[p.model] || (e[p.model] = { n: 0, at: 0 });
      nm.n += 1;
      nm.at = Math.max(nm.at, tsOf(p.createdAt));
    });
    return Object.keys(g)
      .map((key) => {
        const best = Object.entries(g[key]).sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)[0];
        return { key, label: best ? best[0] : '' };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [scoped]);
  // Si la modelo elegida no está en este alcance, se suelta el filtro.
  useEffect(() => { if (model && !models.some((m) => m.key === model)) setModel(''); }, [models, model]);

  const matched = useMemo(() => {
    const query = q.trim().toLowerCase();
    return scoped
      .filter((p) => {
        if (model && p.modelKey !== model) return false;
        if (query) {
          const hay = `${p.name} ${p.model} ${p.createdByName} ${p.code}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => tsOf(b.createdAt) - tsOf(a.createdAt));
  }, [scoped, model, q]);
  const filtered = useMemo(() => matched.filter((p) => inPeriod(p.createdAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matched, periodRange]);

  // TODAS las fotos aprobadas de las propuestas filtradas (en el período según CUÁNDO se aprobó), lo último primero.
  const approved = useMemo(() => {
    const out = [];
    matched.forEach((p) => {
      p.items.forEach((it) => {
        if (it.kind === 'photo' && it.status === 'aprobada' && inPeriod(it.decidedAt || p.createdAt)) out.push({ ...it, p });
      });
    });
    return out.sort((a, b) =>
      tsOf(b.decidedAt || b.p.createdAt) - tsOf(a.decidedAt || a.p.createdAt) || tsOf(b.p.createdAt) - tsOf(a.p.createdAt));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, periodRange]);
  // Las aprobadas SIN el filtro de modelo (lo que muestra «Aprobadas» al salir de su página).
  const approvedAllCount = useMemo(() => {
    const query = q.trim().toLowerCase();
    let n = 0;
    scoped.forEach((p) => {
      if (query && !`${p.name} ${p.model} ${p.createdByName} ${p.code}`.toLowerCase().includes(query)) return;
      p.items.forEach((it) => { if (it.kind === 'photo' && it.status === 'aprobada' && inPeriod(it.decidedAt || p.createdAt)) n += 1; });
    });
    return n;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, q, periodRange]);

  // Al cambiar filtros, vuelve a la primera página.
  useEffect(() => { setPropLimit(PAGE_PROPS); setPhotoLimit(PAGE_PHOTOS); }, [effScope, model, q, withArchived, view, period, modelTab]);
  // La grilla de modelos NO vuelve a la primera página al abrir/cerrar una
  // modelo (así «← Todas las modelos» vuelve adonde estaba).
  useEffect(() => { setModelLimit(PAGE_MODELS); }, [effScope, q, withArchived, view, period]);

  const pickScope = (s) => { scopeTouched.current = true; setScope(s); };
  const toggleOpen = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const hasFilters = !!(model || q.trim());
  const clearFilters = () => { setModel(''); setQ(''); };

  const linkFor = (p) => `/p/${encodeURIComponent(p.code)}?lang=${encodeURIComponent(p.lang || 'es')}&preview=1`;

  // Lista para el visor grande (se arma al abrir, así navega con ← →).
  // `item` = el look con su propuesta (para «Descargar» limpio).
  const openFromProposal = (p, photos, i) => setPreview({
    i,
    list: photos.map((it, k) => ({
      key: it.key, src: it.src, status: it.status, note: it.note, prodState: it.prodState, via: it.via,
      title: it.caption || `Look ${k + 1}`,
      sub: [p.model || 'Sin modelo', p.name || 'Sin título'].join(' · '),
      item: { ...it, p },
    })),
  });
  const openFromApproved = (i) => setPreview({
    i,
    list: approved.map((it, k) => ({
      key: it.key, src: it.src, status: it.status, note: it.note, prodState: it.prodState, via: it.via,
      title: it.p.model || 'Sin modelo',
      sub: [it.caption, it.p.name || 'Sin título', fmtFecha(it.decidedAt || it.p.createdAt)].filter(Boolean).join(' · '),
      item: it,
    })),
  });

  // ── Elegir fotos («picking and choosing») ──────────────────────────────
  // Los filtros NO tocan la selección (un typo en el buscador no borra lo
  // elegido a mano): se cuenta y se baja solo lo elegido que se VE con los
  // filtros actuales (así «N seleccionadas» = lo que se va a bajar), y al
  // sacar el filtro vuelve el resto. Se suelta solo con «Limpiar» / Esc.
  const selItems = useMemo(() => approved.filter((it) => sel.has(it.key)), [approved, sel]);
  const selCount = selItems.length;
  const selecting = pickMode || selCount > 0;
  const togglePick = (i, e) => {
    const it = approved[i];
    if (!it) return;
    const on = !sel.has(it.key);
    // El ancla del rango va por clave (no por posición): con otro filtro la
    // posición es de otra foto.
    const from = lastPick.current ? approved.findIndex((x) => x.key === lastPick.current) : -1;
    setSel((s) => {
      const nx = new Set(s);
      if (e?.shiftKey && from >= 0 && from !== i) {
        const [a, b] = from < i ? [from, i] : [i, from];
        for (let k = a; k <= b; k++) { const key = approved[k]?.key; if (key) { if (on) nx.add(key); else nx.delete(key); } }
      } else if (on) nx.add(it.key);
      else nx.delete(it.key);
      return nx;
    });
    lastPick.current = it.key;
  };
  const selectAll = () => setSel((s) => { const nx = new Set(s); approved.forEach((it) => nx.add(it.key)); return nx; });
  const clearPick = () => { setSel(new Set()); setPickMode(false); lastPick.current = null; };
  // Esc suelta la selección (si no hay visor ni bajada abiertos).
  useEffect(() => {
    if (!selecting || preview || dl) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setSel(new Set()); setPickMode(false); lastPick.current = null; } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting, preview, dl]);

  // ── Bajar (PASO 1: preparar) ────────────────────────────────────────────
  // Una persona = un nombre (el que más usa), para la carpeta y el archivo.
  const labelByKey = useMemo(() => {
    const m = {};
    models.forEach((x) => { m[x.key] = x.label; });
    return m;
  }, [models]);
  const labelOf = (p) => (p?.modelKey && labelByKey[p.modelKey]) || p?.model || '';
  const dlBusy = dl?.phase === 'preparing' || dl?.phase === 'part';

  // ── «Por modelo» ────────────────────────────────────────────────────────
  // Por persona, sobre TODO su historial en este alcance (sin período ni
  // buscador): la fecha de su última propuesta y la portada — su última foto
  // aprobada; si no aprobó nada, la primera foto de su propuesta más nueva;
  // un video solo si no hay foto. covers = candidatas en orden (si una no
  // carga, la tarjeta prueba la siguiente; sin ninguna, iniciales).
  const modelInfo = useMemo(() => {
    const m = {};
    scoped.forEach((p) => {
      const k = p.modelKey;
      if (!k) return;
      const e = m[k] || (m[k] = { lastAt: 0, aprImg: '', aprImgAt: -1, aprVid: '', aprVidAt: -1, look: '', lookAt: -1 });
      const pt = tsOf(p.createdAt);
      if (pt > e.lastAt) e.lastAt = pt;
      p.items.forEach((it) => {
        if (it.kind !== 'photo') return;
        const s = cleanSrc(it.src);
        if (!s) return;
        const vid = isVideoSrc(s);
        if (it.status === 'aprobada') {
          const t = tsOf(it.decidedAt || p.createdAt);
          if (!vid && t > e.aprImgAt) { e.aprImg = s; e.aprImgAt = t; }
          if (vid && t > e.aprVidAt) { e.aprVid = s; e.aprVidAt = t; }
        }
        if (!vid && pt > e.lookAt) { e.look = s; e.lookAt = pt; }
      });
    });
    Object.values(m).forEach((e) => {
      e.covers = [...new Set([e.aprImg, e.look, e.aprVid].filter(Boolean))];
    });
    return m;
  }, [scoped]);

  // Las tarjetas (con período + alcance + buscador): cuántas propuestas armadas
  // y cuántas fotos aprobadas en el período (lo mismo que cuentan «Por
  // propuesta» y «Aprobadas»), cuántas esperan respuesta, y la última actividad
  // (propuesta nueva o aprobación) para ordenar.
  const modelCards = useMemo(() => {
    const g = new Map();
    const get = (key) => {
      let e = g.get(key);
      if (!e) { e = { key, label: labelByKey[key], props: 0, apr: 0, waiting: 0, activity: 0 }; g.set(key, e); }
      return e;
    };
    filtered.forEach((p) => {
      if (!p.modelKey || !labelByKey[p.modelKey]) return;
      const e = get(p.modelKey);
      e.props += 1;
      e.activity = Math.max(e.activity, tsOf(p.createdAt));
    });
    // «Sin responder» es el estado de HOY (no del período): una propuesta de
    // septiembre que sigue sin respuesta cuenta igual en octubre. Y toda modelo
    // del alcance/buscador tiene tarjeta aunque este mes no haya movimiento
    // (sale apagada, al final) → la grilla nunca queda vacía al cambiar de mes.
    matched.forEach((p) => {
      if (!p.modelKey || !labelByKey[p.modelKey]) return;
      const e = get(p.modelKey);
      if (isWaiting(p)) e.waiting += 1;
    });
    approved.forEach((it) => {
      const k = it.p?.modelKey;
      if (!k || !labelByKey[k]) return;
      const e = get(k);
      e.apr += 1;
      e.activity = Math.max(e.activity, tsOf(it.decidedAt || it.p.createdAt));
    });
    return [...g.values()].sort((a, b) =>
      b.activity - a.activity || b.waiting - a.waiting
      || (modelInfo[b.key]?.lastAt || 0) - (modelInfo[a.key]?.lastAt || 0) || a.label.localeCompare(b.label, 'es'));
  }, [filtered, matched, approved, labelByKey, modelInfo]);
  // Propuestas sin modelo (sin destinataria ni nombre): no tienen tarjeta.
  const orphanCount = useMemo(
    () => filtered.filter((p) => !p.modelKey || !labelByKey[p.modelKey]).length,
    [filtered, labelByKey],
  );
  // Con una modelo abierta, `matched` ya es solo de ella (estado de hoy, sin período).
  const waitingCount = useMemo(() => matched.filter(isWaiting).length, [matched]);

  // Sube hasta el contenido si quedó arriba de la pantalla (una tarjeta de
  // abajo de todo abre su página arriba).
  const scrollToContent = () => {
    try {
      const el = contentRef.current;
      if (!el || typeof window === 'undefined') return;
      const top = el.getBoundingClientRect().top;
      if (top < 64) window.scrollTo({ top: Math.max(0, window.scrollY + top - 88), behavior: 'smooth' });
    } catch { /* nada */ }
  };
  const openModel = (key) => {
    try { gridScroll.current = typeof window !== 'undefined' ? { key, y: window.scrollY } : null; } catch { gridScroll.current = null; }
    setModelIn('');
    setModel(key);
    // Cada modelo arranca sin selección; y si este mes solo tiene aprobadas
    // (sin propuestas nuevas), abre directo en «Sus aprobadas».
    clearPick();
    const c = modelCards.find((x) => x.key === key);
    setModelTab(c && c.props === 0 && c.apr > 0 ? 'aprobadas' : 'propuestas');
    scrollToContent();
  };
  const backToModels = () => {
    // Solo si esta página se abrió desde su tarjeta (no desde el selector).
    const y = gridScroll.current?.key === model ? gridScroll.current.y : null;
    gridScroll.current = null;
    clearPick();
    setModelIn('');
    setModel('');
    if (y == null) { scrollToContent(); return; }
    try { requestAnimationFrame(() => window.scrollTo({ top: y })); } catch { /* nada */ }
  };
  // Tocar «Por modelo» estando en la página de una modelo = volver a la grilla.
  // «Por propuesta» y «Aprobadas» son las vistas de TODO: salir de su página
  // (abierta acá en «Por modelo») suelta el filtro de modelo y lo recuerda para
  // volver a su página con «Por modelo». Si el filtro ya venía puesto desde una
  // vista global (el selector), se respeta.
  const pickView = (v) => {
    if (v === view) { if (v === 'modelo' && model) backToModels(); return; }
    if (view === 'modelo') {
      if (model && model !== modelIn) { stashedModel.current = model; setModel(''); }
      else stashedModel.current = '';
    } else if (v === 'modelo') {
      const back = !model ? stashedModel.current : '';
      stashedModel.current = '';
      setModelIn(model);
      if (back) { setModel(back); setModelTab('propuestas'); }
    }
    setView(v);
  };
  // ¿Está abierta la página de una modelo (no un filtro traído de otra vista)?
  const modelPageOpen = view === 'modelo' && !!model && model !== modelIn;

  // list: [look con .p]. Baja cada archivo (4 a la vez), le saca la metadata,
  // y lo mete en el .zip; pasado ~200 MB abre otra parte. Una foto que falla
  // (CORS/404/borrada) NO corta las demás — se cuenta y se avisa al final.
  // MEMORIA: cada parte se ofrece APENAS se llena («Guardar parte N», gesto
  // fresco) y la preparación ESPERA a que la guarden; al guardarla se suelta su
  // Blob y recién ahí se arma la próxima → en memoria hay UNA parte a la vez
  // (+ las ≤ 3 fotos que ya venían bajando). Excepción: con la hoja de
  // compartir (≤ 30 fotos, que igual quedan en memoria como File) las partes se
  // juntan y se ofrecen al final.
  const startDownload = async (list, { title = 'Fotos', extra = '' } = {}) => {
    if (!list?.length || dlBusy) return;
    const id = `${Date.now()}-${Math.random()}`;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const job = { id, ctrl, resume: null };
    dlJob.current = job;
    const live = () => alive.current && dlJob.current?.id === id;

    const plan = planDownload(list, labelOf);
    const total = plan.length;
    const who = new Set(list.map((it) => it.p?.modelKey || normName(labelOf(it.p)))).size === 1
      ? slug(labelOf(list[0].p) || 'modelo') : 'equipo';
    const zipBase = ['letshoot-aprobadas', who, extra, ymd(new Date())].filter(Boolean).join('-');
    const wantShare = total <= SHARE_MAX && phoneShareCapable();
    const pauseParts = !wantShare;
    const partName = (no, many) => (many ? `${zipBase}-parte-${no}.zip` : `${zipBase}.zip`);
    setDl({ phase: 'preparing', title, total, done: 0, failed: 0, dirty: 0, savedParts: 0 });

    const parts = [];         // partes que se ofrecen al final (sin pausa: todas; con pausa: la última)
    let partNo = 0;
    let cur = [];
    let curBytes = 0;
    let done = 0;
    let failed = 0;
    let dirty = 0;            // no se pudo sacarles la metadata → NO se entregan
    let ok = 0;
    let last = null;          // el único archivo, si al final es uno solo (se guarda la foto, sin .zip)
    let hold = null;          // Promise mientras una parte espera que la guarden
    const shareFiles = wantShare ? [] : null;
    const shareNames = new Set();
    // Cierra la parte en armado. more = todavía quedan fotos: con pausa se
    // ofrece ya y se espera el «Guardar parte N» (savePausedPart → resume).
    const closePart = async (more) => {
      if (!cur.length) return;
      let files = cur;
      const count = cur.length;
      const bytes = curBytes;
      cur = [];
      curBytes = 0;
      partNo += 1;
      const no = partNo;
      let blob = buildZip(files);
      files = null;           // los bytes sueltos se liberan: ya están en el Blob
      if (!pauseParts || !more) { parts.push({ blob, count, bytes, no }); return; }
      const part = { blob, count, bytes, no, name: partName(no, true) };
      blob = null;
      const d0 = done; const f0 = failed; const x0 = dirty;
      await new Promise((resolve) => {
        job.resume = resolve;
        setDl((d) => (d ? { ...d, phase: 'part', done: d0, failed: f0, dirty: x0, part, err: '' } : d));
      });
      job.resume = null;
    };
    const one = async (f) => {
      try {
        if (!f.src) throw new Error('src');
        const res = await fetch(f.src, ctrl ? { signal: ctrl.signal } : undefined);
        if (!res.ok) throw new Error(`http ${res.status}`);
        const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const raw = new Uint8Array(await res.arrayBuffer());
        if (!live()) return;
        if (!raw.length) throw new Error('vacío');
        const fmt = detectFormat(raw);
        // Fotos (JPEG/PNG/WebP) → sin EXIF/XMP/IPTC/C2PA/texto, píxeles intactos.
        // Videos (mp4/mov/webm) y formatos raros van TAL CUAL: strip-meta no los toca.
        let data = await stripImageMeta(raw, type || EXT_BY_FMT[fmt] || extOf(f.src));
        // Re-chequeo: si no se pudo limpiar (devolvió el original) o todavía se
        // ve metadata → plan B (canvas); si tampoco, esa foto no va.
        if (STRIP_FMTS.has(fmt) && (data === raw || hasMeta(data))) {
          data = await reencodeClean(raw, fmt);
          if (!data) throw Object.assign(new Error('metadata'), { dirty: true });
        }
        if (!live()) return;
        const ext = EXT_BY_FMT[detectFormat(data)] || EXT_BY_TYPE[type] || extOf(f.src);
        const name = `${f.folder}/${f.file}.${ext}`;
        const mime = TYPE_BY_EXT[ext] || type || 'application/octet-stream';
        while (hold) await hold; // una parte espera que la guarden
        if (!live()) return;
        if (cur.length && curBytes + data.length > ZIP_PART_MAX) {
          hold = closePart(true).finally(() => { hold = null; });
          await hold;
          if (!live()) return;
        }
        cur.push({ name, data });
        curBytes += data.length;
        ok += 1;
        last = { name: `${f.file}.${ext}`, data, mime };
        if (shareFiles) {
          let nm = `${f.file}.${ext}`;
          for (let n = 2; shareNames.has(nm.toLowerCase()); n++) nm = `${f.file}-${n}.${ext}`;
          shareNames.add(nm.toLowerCase());
          try { shareFiles.push(new File([data], nm, { type: mime })); } catch { /* sin File → solo .zip */ }
        }
      } catch (e) {
        if (e?.name === 'AbortError' || !live()) return;
        if (e?.dirty) dirty += 1; else failed += 1;
      } finally {
        if (live()) {
          done += 1;
          const d0 = done; const f0 = failed; const x0 = dirty;
          setDl((d) => (d && d.phase === 'preparing' ? { ...d, done: d0, failed: f0, dirty: x0 } : d));
        }
      }
    };

    let next = 0;
    const runner = async () => {
      while (next < total && live()) {
        while (hold) await hold; // pausa: no se empieza otra foto hasta que guarden la parte
        if (next >= total || !live()) return;
        const f = plan[next++];
        await one(f);
      }
    };
    await Promise.all(Array.from({ length: Math.min(DL_CONCURRENCY, total) }, runner));
    if (!live()) return;

    if (!ok) {
      const why = [
        failed ? `${failed} no se ${failed === 1 ? 'pudo' : 'pudieron'} bajar` : '',
        dirty ? `${dirty} no se ${dirty === 1 ? 'pudo' : 'pudieron'} limpiar` : '',
      ].filter(Boolean).join(' · ');
      setDl({
        phase: 'error', title, total, done, failed, dirty,
        err: total === 1
          ? (dirty ? 'No se le pudo sacar la metadata, así que no se entrega.' : 'No se pudo bajar la foto. Reintentá.')
          : `No salió ninguna (${why}). Reintentá.`,
      });
      dlJob.current = null;
      return;
    }
    let single = null;
    if (ok === 1 && last) { single = { blob: new Blob([last.data], { type: last.mime }), name: last.name, bytes: last.data.length }; cur = []; }
    else await closePart(false);
    last = null;
    if (!live()) return;
    let share = null;
    if (shareFiles && shareFiles.length === ok) {
      try { if (navigator.canShare({ files: shareFiles })) share = shareFiles; } catch { share = null; }
    }
    const many = partNo > 1;
    const partList = parts.map((pt) => ({ ...pt, saved: false, name: partName(pt.no, many) }));
    setDl({
      phase: 'ready', title, total, done, failed, dirty, ok, parts: partList, partCount: partNo,
      savedParts: partNo - parts.length, // con pausa: las anteriores ya se guardaron
      single, share, shared: false, err: '',
    });
    dlJob.current = null;
  };

  // ── Bajar (PASO 2: guardar, con gesto fresco → iOS no lo bloquea) ────────
  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const savePart = (k) => {
    const pt = dl?.parts?.[k];
    if (!pt) return;
    try {
      saveBlob(pt.blob, pt.name);
      setDl((d) => (d ? { ...d, err: '', parts: d.parts.map((x, j) => (j === k ? { ...x, saved: true } : x)) } : d));
    } catch { setDl((d) => (d ? { ...d, err: 'No se pudo guardar. Reintentá.' } : d)); }
  };
  // Parte llena a mitad de camino: se guarda (gesto fresco), se suelta su Blob
  // del estado y la preparación sigue con la próxima.
  const savePausedPart = () => {
    const pt = dl?.phase === 'part' ? dl.part : null;
    const job = dlJob.current;
    if (!pt?.blob || !job?.resume) return;
    try {
      saveBlob(pt.blob, pt.name);
    } catch {
      setDl((d) => (d ? { ...d, err: 'No se pudo guardar. Reintentá.' } : d));
      return;
    }
    setDl((d) => (d ? { ...d, phase: 'preparing', part: null, err: '', savedParts: (d.savedParts || 0) + 1 } : d));
    job.resume();
  };
  const saveSingle = () => {
    if (!dl?.single) return;
    try {
      saveBlob(dl.single.blob, dl.single.name);
      setDl((d) => (d?.single ? { ...d, err: '', single: { ...d.single, saved: true } } : d));
    } catch { setDl((d) => (d ? { ...d, err: 'No se pudo guardar. Reintentá.' } : d)); }
  };
  const shareNow = async () => {
    if (!dl?.share) return;
    try {
      await navigator.share({ files: dl.share, title: 'Fotos LetShoot' });
      setDl((d) => (d ? { ...d, shared: true, err: '' } : d));
    } catch (e) {
      if (e?.name === 'AbortError') return; // cerró la hoja: puede volver a intentar
      setDl((d) => (d ? { ...d, share: null, err: 'No se pudo abrir «Compartir» — guardá el .zip.' } : d));
    }
  };
  // Cerrar = soltar todo (Blobs incluidos). Si estaba preparando (o esperando
  // que guarden una parte), cancela el resto.
  const closeDl = () => {
    const job = dlJob.current;
    dlJob.current = null;
    try { job?.ctrl?.abort(); } catch { /* nada */ }
    job?.resume?.();
    setDl(null);
  };

  const downloadProposal = (p) => {
    const list = p.items.filter((it) => it.kind === 'photo' && it.status === 'aprobada').map((it) => ({ ...it, p }));
    startDownload(list, { title: `Aprobadas · ${p.name || 'Sin título'}`, extra: slug(p.name || 'propuesta') });
  };
  const downloadOne = (item) => {
    if (item) startDownload([item], { title: 'Descargar foto' });
  };

  const showHint = !loading && effScope === 'equipo' && mineCount === 0;

  const periodTxt = period === 'mes' ? 'este mes' : period === 'pasado' ? 'el mes pasado' : '';
  // Si lo único que recorta es el período, la salida es ver todo el historial.
  const periodAction = period !== 'todo' ? { label: 'Ver todo el historial', onClick: () => setPeriod('todo') } : null;
  const qOn = !!q.trim();
  const noMatch = (
    <Empty icon={Search} title="Nada coincide con ese filtro."
      sub={hasFilters ? 'Probá con otra modelo u otro nombre.' : periodTxt ? `No hay propuestas ${periodTxt}.` : null}
      action={hasFilters ? { label: 'Limpiar filtros', onClick: clearFilters } : periodAction} />
  );

  // Las tarjetas por propuesta («Por propuesta» y «Sus propuestas»).
  const renderProposals = () => (
    <div className="space-y-2.5">
      {filtered.slice(0, propLimit).map((p) => (
        <ProposalCard key={p.id} p={p} opened={!!open[p.id]} onToggle={() => toggleOpen(p.id)}
          readOnly={readOnly} link={linkFor(p)} onOpenPhoto={openFromProposal}
          onDownloadApproved={downloadProposal} dlBusy={dlBusy} />
      ))}
      {filtered.length > propLimit && (
        <MoreButton onClick={() => setPropLimit((n) => n + PAGE_PROPS)}>
          Ver más propuestas ({filtered.length - propLimit})
        </MoreButton>
      )}
    </div>
  );

  // La grilla de aprobadas con elegir + bajar («Aprobadas» y «Sus aprobadas»).
  // allTitle = el título de la bajada de «Bajar todas».
  const renderApproved = (allTitle) => (
    <div className={selecting ? 'pb-28 sm:pb-0' : ''}>
      {/* Cabecera de «Aprobadas»: siempre a mano «Bajar todas». */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-[12.5px] text-paper-mute">
          {approved.length} {approved.length === 1 ? 'foto aprobada' : 'fotos aprobadas'}
          <span className="text-paper-dim"> · se bajan sin metadata</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => (selecting ? clearPick() : setPickMode(true))} aria-pressed={selecting}
            className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold">
            {selecting ? <><X size={13} /> Salir de elegir</> : <><Check size={13} /> Elegir</>}
          </button>
          <button type="button" disabled={dlBusy}
            onClick={() => startDownload(approved, { title: allTitle })}
            className={`${selCount > 0 ? 'btn3d-ghost font-semibold' : 'btn3d font-bold'} inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12.5px]`}>
            <Download size={14} /> Bajar todas ({approved.length})
          </button>
        </div>
      </div>

      {/* Barra de selección: abajo fija en el teléfono (no ocupa lugar; sale al
          elegir), pegada arriba de la grilla en la compu. En la compu su lugar
          está SIEMPRE reservado (misma altura con o sin selección; sin nada
          elegido lleva la ayuda) → la grilla no salta con la primera foto. */}
      <div className={`${selecting ? '' : 'hidden sm:block'} fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:bottom-auto sm:mb-3 ${
        selCount > 0 ? 'sm:sticky sm:top-[72px] sm:z-20' : 'sm:static'}`}>
        {selCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-brand/50 bg-ink/95 px-3.5 py-2.5 shadow-soft backdrop-blur sm:h-[54px] sm:flex-nowrap sm:rounded-xl sm:py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap sm:overflow-hidden">
              <span className="whitespace-nowrap text-sm font-semibold text-brand">{selCount} {selCount === 1 ? 'seleccionada' : 'seleccionadas'}</span>
              {selCount < approved.length && (
                <button type="button" onClick={selectAll} className="whitespace-nowrap py-1 text-[12px] font-semibold text-paper-mute transition-colors hover:text-paper">
                  Seleccionar todas ({approved.length})
                </button>
              )}
              <button type="button" onClick={clearPick} className="whitespace-nowrap py-1 text-[12px] font-semibold text-paper-mute transition-colors hover:text-paper">
                Limpiar
              </button>
            </div>
            <button type="button" disabled={dlBusy}
              onClick={() => startDownload(selItems, { title: `${selCount} ${selCount === 1 ? 'seleccionada' : 'seleccionadas'}` })}
              className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold">
              <Download size={15} /> {selCount === 1 ? 'Bajar 1 foto' : `Bajar ${selCount} (.zip)`}
            </button>
          </div>
        ) : (
          <div className={`flex items-center rounded-2xl border px-3.5 py-2.5 text-[12px] sm:h-[54px] sm:rounded-xl sm:border-dashed sm:bg-transparent sm:py-2 sm:shadow-none sm:backdrop-blur-none ${
            pickMode ? 'border-brand/40 bg-ink/95 text-paper-mute shadow-soft backdrop-blur' : 'border-line text-paper-dim'}`}>
            <span className="min-w-0 truncate">
              {pickMode
                ? <>Tocá las fotos que querés bajar.<span className="hidden sm:inline"> Con Shift elegís un rango.</span></>
                : 'Marcá la casilla de una foto (arriba a la izquierda) para elegir varias. Con Shift elegís un rango.'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {approved.slice(0, photoLimit).map((it, i) => {
          const on = sel.has(it.key);
          return (
            <figure key={it.key} className="min-w-0">
              <div className="group relative">
                <button type="button"
                  onClick={(e) => (selecting ? togglePick(i, e) : openFromApproved(i))}
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                  aria-pressed={selecting ? on : undefined}
                  title={selecting ? (on ? 'Quitar de la selección' : 'Agregar a la selección') : (it.note || it.caption || 'Ver grande')}
                  className={`relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#0a0d11] ring-inset transition ${
                    on ? 'ring-2 ring-brand' : 'ring-1 ring-white/5 hover:ring-brand/60'}`}>
                  <Media src={it.src} />
                  <VideoMark src={it.src} />
                  {on && <span className="pointer-events-none absolute inset-0 bg-brand/15" />}
                </button>
                <PickBox on={on} visible={selecting} onClick={(e) => togglePick(i, e)} />
              </div>
              <figcaption className="mt-1.5 min-w-0 px-0.5">
                <span className="block truncate text-[12px] font-medium text-paper">{it.p.model || 'Sin modelo'}</span>
                <span className="block truncate text-[11px] text-paper-dim">
                  {it.p.name || 'Sin título'}{fmtFecha(it.decidedAt || it.p.createdAt) ? ` · ${fmtFecha(it.decidedAt || it.p.createdAt)}` : ''}
                </span>
                <span className="mt-1 block"><ProdChip state={it.prodState} via={it.via} /></span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {approved.length > photoLimit && (
        <div className="mt-3">
          <MoreButton onClick={() => setPhotoLimit((n) => n + PAGE_PHOTOS)}>
            Ver más fotos ({approved.length - photoLimit})
          </MoreButton>
        </div>
      )}
    </div>
  );

  // Aviso de las propuestas que no tienen tarjeta (sin modelo asignada).
  const orphanNote = orphanCount > 0 ? (
    <p className="mt-3 text-[12px] text-paper-dim">
      {orphanCount} {orphanCount === 1 ? 'propuesta no tiene' : 'propuestas no tienen'} modelo asignada —{' '}
      <button type="button" onClick={() => setView('propuesta')}
        className="font-semibold text-paper-mute underline-offset-2 transition-colors hover:text-paper hover:underline">
        verlas en «Por propuesta»
      </button>
    </p>
  ) : null;

  // «Por modelo»: una tarjeta por persona.
  const renderModelGrid = () => {
    if (modelCards.length === 0) {
      return (
        <>
          <Empty icon={qOn ? Search : Users}
            title={qOn ? 'Nada coincide con ese filtro.' : periodTxt ? `Ninguna modelo con movimiento ${periodTxt}.` : 'Todavía no hay modelos con propuestas.'}
            sub={qOn ? 'Probá con otra modelo u otro nombre.' : periodTxt ? 'Cuenta cada propuesta armada y cada foto aprobada en el período.' : null}
            action={qOn ? { label: 'Limpiar filtros', onClick: clearFilters } : periodAction} />
          {orphanNote}
        </>
      );
    }
    return (
      <div>
        <p className="mb-3 text-[12.5px] text-paper-mute">
          {modelCards.length} {modelCards.length === 1 ? 'modelo' : 'modelos'}
          <span className="text-paper-dim"> · lo último que se movió, primero</span>
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {modelCards.slice(0, modelLimit).map((c) => (
            <ModelCard key={c.key} c={c} covers={modelInfo[c.key]?.covers} lastAt={modelInfo[c.key]?.lastAt || 0}
              onOpen={() => openModel(c.key)} />
          ))}
        </div>
        {modelCards.length > modelLimit && (
          <div className="mt-3">
            <MoreButton onClick={() => setModelLimit((n) => n + PAGE_MODELS)}>
              Ver más modelos ({modelCards.length - modelLimit})
            </MoreButton>
          </div>
        )}
        {orphanNote}
      </div>
    );
  };

  // La página de UNA modelo (con el filtro de modelo puesto: `filtered` y
  // `approved` ya son solo de ella, con el período / alcance / buscador).
  const renderModelPage = () => {
    const label = labelByKey[model] || 'Sin modelo';
    const info = modelInfo[model];
    const nProps = filtered.length;
    const nApr = approved.length;
    return (
      <div>
        <button type="button" onClick={backToModels}
          className="-ml-1 inline-flex items-center gap-1 rounded-lg py-1 pl-0.5 pr-2 text-[12.5px] font-semibold text-paper-mute transition-colors hover:text-paper">
          <ChevronLeft size={15} /> Todas las modelos
        </button>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-card p-3.5 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-[#0a0d11] ring-1 ring-inset ring-white/5">
              <ModelCover srcs={info?.covers} label={label} small />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold text-paper">{label}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px]">
                <span className="text-paper-dim">{PERIOD_TXT[period]}</span>
                <span className="text-paper-mute">{nProps} {nProps === 1 ? 'propuesta' : 'propuestas'}</span>
                <span className={`inline-flex items-center gap-1 font-medium ${nApr > 0 ? 'text-emerald-300' : 'text-paper-dim'}`}>
                  <Check size={12} /> {nApr} {nApr === 1 ? 'aprobada' : 'aprobadas'}
                </span>
                {waitingCount > 0 && <StatusDot tone="warn">{waitingCount} sin responder</StatusDot>}
              </p>
              {info?.lastAt ? <p className="mt-0.5 text-[11.5px] text-paper-dim">Última propuesta {fmtFecha(info.lastAt)}</p> : null}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button type="button" disabled={dlBusy || nApr === 0}
              onClick={() => startDownload(approved, { title: `Aprobadas · ${label}` })}
              title={nApr === 0 ? 'Todavía no hay aprobadas en este período' : 'Baja sus aprobadas del período, sin metadata'}
              className="btn3d inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-bold">
              <Download size={14} /> Bajar sus aprobadas ({nApr})
            </button>
            {!readOnly && (
              <a href="/propuestas" className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold">
                <Plus size={14} /> Crear propuesta
              </a>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Segmented label={`Historial de ${label}`} value={modelTab} onChange={setModelTab}
            options={[
              { value: 'propuestas', label: `Sus propuestas (${nProps})` },
              { value: 'aprobadas', label: `Sus aprobadas (${nApr})` },
            ]} />
        </div>

        <div className="mt-3">
          {modelTab === 'propuestas' ? (
            nProps === 0 ? (
              <Empty icon={Inbox}
                title={qOn ? 'Ninguna propuesta suya coincide con la búsqueda.' : periodTxt ? `No tiene propuestas ${periodTxt}.` : 'Todavía no tiene propuestas.'}
                sub={!qOn && nApr > 0 ? `Igual aprobó ${nApr} ${nApr === 1 ? 'foto' : 'fotos'} de propuestas anteriores — están en «Sus aprobadas».` : null}
                action={qOn ? { label: 'Limpiar búsqueda', onClick: () => setQ('') } : periodAction} />
            ) : renderProposals()
          ) : nApr === 0 ? (
            <Empty icon={Images}
              title={qOn ? 'Ninguna foto aprobada coincide con la búsqueda.' : periodTxt ? `No aprobó fotos ${periodTxt}.` : 'Todavía no aprobó fotos.'}
              sub="Cuando apruebe una foto, cae acá sola. Lo que marcó sin enviar no cuenta hasta que lo envíe."
              action={qOn ? { label: 'Limpiar búsqueda', onClick: () => setQ('') } : periodAction} />
          ) : renderApproved(`Aprobadas · ${label}`)}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-3">
      {/* Bajada + crear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-paper-mute">El historial de tus propuestas y todo lo que las modelos aprobaron.</p>
        {!readOnly && (
          <a href="/propuestas" className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold">
            <Plus size={15} /> Crear propuesta
          </a>
        )}
      </div>

      {/* Alcance + vista */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented label="De quién" value={effScope} onChange={pickScope}
          options={[{ value: 'mias', label: 'Mías' }, { value: 'equipo', label: 'Todo el equipo' }]} />
        <Segmented label="Cuándo" value={period} onChange={setPeriod}
          options={[{ value: 'mes', label: 'Este mes' }, { value: 'pasado', label: 'Mes pasado' }, { value: 'todo', label: 'Todo' }]} />
        <Segmented label="Vista" value={view} onChange={pickView}
          options={[
            { value: 'modelo', label: <><span className="sm:hidden">Modelos</span><span className="hidden sm:inline">Por modelo</span></> },
            { value: 'propuesta', label: <><span className="sm:hidden">Propuestas</span><span className="hidden sm:inline">Por propuesta</span></> },
            { value: 'aprobadas', label: `Aprobadas (${loading ? '·' : modelPageOpen ? approvedAllCount : approved.length})` },
          ]} />
      </div>
      {showHint && <p className="mt-2 text-[12px] text-paper-dim">Todavía no armaste propuestas — te muestro las del equipo.</p>}

      {/* Filtros */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar propuesta o modelo…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select value={model} onChange={(e) => { if (view === 'modelo') setModelIn(''); setModel(e.target.value); }} aria-label="Filtrar por modelo"
            className="w-full appearance-none rounded-full border border-line bg-card py-2.5 pl-3.5 pr-9 text-sm text-paper-mute outline-none transition-colors hover:border-brand/40 focus:border-brand/60 sm:w-auto sm:min-w-[190px]">
            <option value="" className="bg-ink text-paper">Todas las modelos</option>
            {models.map((m) => <option key={m.key} value={m.key} className="bg-ink text-paper">{m.label}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        </div>
        <button type="button" onClick={() => setWithArchived((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] font-semibold transition-colors ${
            withArchived ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
          {withArchived && <Check size={13} />} Incluir archivadas
        </button>
      </div>

      <div ref={contentRef} className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-card px-5 py-12 text-sm text-paper-dim">
            <Clock size={15} className="animate-pulse" /> Cargando las propuestas…
          </div>
        ) : err ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] px-5 py-10 text-center">
            <p className="text-sm text-rose-200">{err}</p>
            <button type="button" onClick={() => load(true)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12.5px] font-semibold">
              <RotateCcw size={13} /> Reintentar
            </button>
          </div>
        ) : scoped.length === 0 ? (
          <Empty icon={Inbox}
            title={effScope === 'mias' ? 'Todavía no armaste propuestas.' : 'Todavía no hay propuestas del equipo.'}
            sub={readOnly ? 'Cuando se publique la primera, aparece acá.' : 'Armá la primera con «Crear propuesta» y acá vas a ver todo lo que responda la modelo.'}
            action={effScope === 'mias' ? { label: 'Ver las del equipo', onClick: () => pickScope('equipo') } : null} />
        ) : view === 'modelo' ? (
          model ? renderModelPage() : renderModelGrid()
        ) : view === 'propuesta' ? (
          filtered.length === 0 ? noMatch : renderProposals()
        ) : approved.length === 0 ? (
          hasFilters ? noMatch : (
            <Empty icon={Images} title={periodTxt ? `No hay fotos aprobadas ${periodTxt}.` : 'Todavía no hay fotos aprobadas.'}
              sub="Cuando una modelo apruebe una foto de estas propuestas, cae acá sola. Lo que marcó sin enviar no cuenta hasta que lo envíe."
              action={periodAction} />
          )
        ) : renderApproved(`Todas las aprobadas (${approved.length})`)}
      </div>

      {preview && (
        <Preview list={preview.list} index={preview.i}
          onClose={() => setPreview(null)}
          onDownload={(cur) => downloadOne(cur?.item)} dlBusy={dlBusy} keysOff={!!dl}
          onStep={(d) => setPreview((pv) => (pv ? { ...pv, i: (pv.i + d + pv.list.length) % pv.list.length } : pv))} />
      )}

      {dl && (
        <DownloadSheet dl={dl} onClose={closeDl} onSavePart={savePart} onSavePaused={savePausedPart} onSaveSingle={saveSingle} onShare={shareNow} />
      )}
    </div>
  );
}

// ── Tarjeta de una propuesta (se abre y muestra sus looks) ────────────────
function ProposalCard({ p, opened, onToggle, readOnly, link, onOpenPhoto, onDownloadApproved, dlBusy }) {
  const chip = chipOf(p);
  const photos = p.items.filter((it) => it.kind === 'photo');
  const nApproved = photos.filter((it) => it.status === 'aprobada').length;
  const audios = p.items.filter((it) => it.kind === 'audio');
  const rankOf = (s) => (s === 'aprobada' ? 0 : s === 'cambio' ? 1 : s === 'gusto_borrador' || s === 'cambio_borrador' ? 2 : 3);
  const thumbs = [...photos].sort((a, b) => rankOf(a.status) - rankOf(b.status)).slice(0, 4);
  const c = p.counts;
  const fecha = fmtFecha(p.createdAt);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <button type="button" onClick={onToggle} aria-expanded={opened}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hair/[0.03] sm:items-center sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="min-w-0 truncate font-semibold text-paper">{p.name || 'Sin título'}</span>
            <StatusDot tone={chip.tone}>{chip.label}</StatusDot>
            {p.internal && <span className="rounded-full bg-hair/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-mute">Interna</span>}
            {p.status === 'archived' && <span className="rounded-full bg-hair/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">Archivada</span>}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-paper-mute">
            {p.model || 'Sin modelo'}{fecha ? ` · ${fecha}` : ''}{p.createdByName ? ` · por ${p.createdByName}` : ''}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-300"><Check size={12} /> {c.aprobadas} {c.aprobadas === 1 ? 'aprobada' : 'aprobadas'}</span>
            <span className="inline-flex items-center gap-1 font-medium text-amber-300"><Pencil size={11} /> {c.cambios} {c.cambios === 1 ? 'cambio' : 'cambios'}</span>
            <span className="text-paper-dim">{c.sin} sin respuesta</span>
            {c.borrador > 0 && <span className="text-amber-200/80">{c.borrador} sin enviar</span>}
            <span className="text-paper-dim">
              · {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}{audios.length > 0 ? ` · ${audios.length} ${audios.length === 1 ? 'audio' : 'audios'}` : ''}
            </span>
          </span>
        </span>
        {thumbs.length > 0 && (
          <span className="hidden shrink-0 items-center gap-1 sm:flex" aria-hidden="true">
            {thumbs.map((it) => (
              <span key={it.key} className="relative h-12 w-9 overflow-hidden rounded-md bg-[#0a0d11] ring-1 ring-inset ring-white/5">
                <Media src={it.src} />
                {it.status === 'aprobada' && <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </span>
            ))}
          </span>
        )}
        <ChevronDown size={18} className={`mt-0.5 shrink-0 text-paper-dim transition-transform sm:mt-0 ${opened ? 'rotate-180' : ''}`} />
      </button>

      {opened && (
        <div className="border-t border-line px-3 pb-4 pt-3 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {p.code && (
              <a href={link} target="_blank" rel="noopener noreferrer"
                className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold">
                <ExternalLink size={13} /> Abrir
              </a>
            )}
            {!readOnly && p.code && (
              <a href={`/propuestas?edit=${encodeURIComponent(p.code)}`}
                className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold">
                <Pencil size={13} /> Editar
              </a>
            )}
            {nApproved > 0 && onDownloadApproved && (
              <button type="button" onClick={() => onDownloadApproved(p)} disabled={dlBusy}
                title="Baja las aprobadas de esta propuesta, sin metadata"
                className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold">
                <Download size={13} /> Bajar aprobadas ({nApproved})
              </button>
            )}
            {c.borrador > 0 && (
              <span className="text-[11.5px] text-amber-200/80">La modelo marcó {c.borrador} pero todavía no apretó Enviar.</span>
            )}
            {p.viaInterna && (
              <span className="text-[11.5px] text-amber-200/80">Respondió por el link interno: lo que aprobó no cayó solo a su cuenta.</span>
            )}
          </div>

          {photos.length === 0 && audios.length === 0 && (
            <p className="rounded-xl border border-dashed border-line bg-card/40 px-4 py-6 text-center text-sm text-paper-dim">Esta propuesta no tiene fotos ni audios.</p>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {photos.map((it, i) => (
                <figure key={it.key} className="min-w-0">
                  <button type="button" onClick={() => onOpenPhoto(p, photos, i)} title={it.note || it.caption || 'Ver grande'}
                    className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#0a0d11] ring-1 ring-inset ring-white/5 transition hover:ring-brand/60">
                    <Media src={it.src} />
                    <VideoMark src={it.src} />
                    <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)]"><StatusBadge status={it.status} overlay /></span>
                  </button>
                  <figcaption className="mt-1 min-w-0 px-0.5">
                    <span className="block truncate text-[11.5px] text-paper-mute">{it.caption || `Look ${i + 1}`}</span>
                    {it.note && (it.status === 'cambio' || it.status === 'cambio_borrador') && (
                      <span className="line-clamp-2 text-[11px] italic text-amber-200/80">&ldquo;{it.note}&rdquo;</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {audios.length > 0 && (
            <div className={photos.length > 0 ? 'mt-4' : ''}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
                <Music size={12} /> Audios · {audios.length}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {audios.map((it, i) => {
                  const src = cleanAudio(it.src);
                  return (
                    <div key={it.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-ink-2/40 p-2.5">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[12.5px] text-paper">{it.caption || `Audio ${i + 1}`}</span>
                        <StatusBadge status={it.status} />
                      </div>
                      {src
                        ? <audio controls preload="none" src={src} className="h-8 w-full" />
                        : <span className="text-[11px] text-paper-dim">No se puede reproducir este audio.</span>}
                      {it.note && <span className="line-clamp-2 text-[11px] italic text-amber-200/80">&ldquo;{it.note}&rdquo;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de una modelo («Por modelo») ──────────────────────────────────
function ModelCard({ c, covers, lastAt, onOpen }) {
  const fecha = lastAt ? fmtFecha(lastAt) : null;
  // Sin movimiento en el período (ni propuestas nuevas ni aprobadas): apagada.
  const quiet = c.props === 0 && c.apr === 0 && c.waiting === 0;
  return (
    <button type="button" onClick={onOpen} title={`Ver todo de ${c.label}`}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-card text-left transition-[border-color,opacity] hover:border-brand/50 hover:opacity-100 focus-visible:border-brand/60 focus-visible:opacity-100 focus-visible:outline-none ${quiet ? 'opacity-55' : ''}`}>
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-[#0a0d11]">
        <ModelCover srcs={covers} label={c.label} />
        {c.waiting > 0 && (
          <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-[#2a1a00]">
            <Clock size={10} strokeWidth={2.75} className="shrink-0" />
            <span className="truncate">{c.waiting} sin responder</span>
          </span>
        )}
      </span>
      <span className="block min-w-0 px-3 pb-3 pt-2.5">
        <span className="block truncate text-sm font-semibold text-paper transition-colors group-hover:text-brand">{c.label}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
          <span className="text-paper-mute">{c.props} {c.props === 1 ? 'propuesta' : 'propuestas'}</span>
          <span className={`inline-flex items-center gap-1 font-medium ${c.apr > 0 ? 'text-emerald-300' : 'text-paper-dim'}`}>
            <Check size={11} className="shrink-0" /> {c.apr} {c.apr === 1 ? 'aprobada' : 'aprobadas'}
          </span>
        </span>
        {fecha && <span className="mt-0.5 block text-[11px] text-paper-dim">Última propuesta {fecha}</span>}
      </span>
    </button>
  );
}

// Portada de la modelo: prueba las candidatas en orden (si una no carga, la
// siguiente); sin ninguna, sus iniciales. Vertical, object-contain.
function ModelCover({ srcs, label, small = false }) {
  const list = Array.isArray(srcs) ? srcs : [];
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [srcs]);
  const s = list[i] || '';
  if (!s) {
    return (
      <span className={`grid h-full w-full place-items-center font-display font-semibold text-paper-mute ${small ? 'text-base' : 'text-3xl'}`} aria-hidden="true">
        {initialsOf(label)}
      </span>
    );
  }
  const next = () => setI((k) => k + 1);
  if (isVideoSrc(s)) {
    return <video key={s} src={posterSrc(s)} muted playsInline preload="metadata" onError={next} className="h-full w-full object-contain" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img key={s} src={s} alt="" loading="lazy" decoding="async" draggable={false} onError={next} className="h-full w-full object-contain" />;
}

// ── Piezas chicas ─────────────────────────────────────────────────────────
const STATUS_META = {
  aprobada:        { label: 'Aprobada',             icon: Check,  overlay: 'bg-emerald-500 text-white',                                   inline: 'bg-emerald-500/15 text-emerald-300' },
  cambio:          { label: 'Cambio',               icon: Pencil, overlay: 'bg-amber-400 text-[#2a1a00]',                                 inline: 'bg-amber-500/15 text-amber-300' },
  gusto_borrador:  { label: 'Le gustó · sin enviar', icon: Clock, overlay: 'bg-black/70 text-amber-200 ring-1 ring-inset ring-amber-400/50', inline: 'bg-amber-500/10 text-amber-200' },
  cambio_borrador: { label: 'Cambio · sin enviar',  icon: Clock,  overlay: 'bg-black/70 text-amber-200 ring-1 ring-inset ring-amber-400/50', inline: 'bg-amber-500/10 text-amber-200' },
  sin:             { label: 'Sin respuesta',        icon: null,   overlay: 'bg-black/55 text-white/70',                                   inline: 'bg-hair/10 text-paper-dim' },
};
function StatusBadge({ status, overlay = false }) {
  const m = STATUS_META[status] || STATUS_META.sin;
  const Icon = m.icon;
  return (
    <span className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${overlay ? `${m.overlay} backdrop-blur-sm` : m.inline}`}>
      {Icon && <Icon size={10} strokeWidth={2.75} className="shrink-0" />}
      <span className="truncate">{m.label}</span>
    </span>
  );
}

function ProdChip({ state, via }) {
  if (state === 'delivered') return <StatusDot tone="ok">Entregada</StatusDot>;
  if (state === 'to_produce') return <StatusDot tone="brand">Por producir</StatusDot>;
  if (via === 'interna') {
    return (
      <span title="La modelo respondió por el link interno: lo que aprobó no cayó solo a su cuenta.">
        <StatusDot tone="warn">Vía link interno</StatusDot>
      </span>
    );
  }
  return null;
}

// Foto o video en su caja (vertical, object-contain: la cara siempre se ve).
function Media({ src }) {
  const s = cleanSrc(src);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [s]);
  if (!s || broken) {
    return <span className="grid h-full w-full place-items-center text-paper-dim"><ImageOff size={18} /></span>;
  }
  if (isVideoSrc(s)) {
    return <video src={posterSrc(s)} muted playsInline preload="metadata" onError={() => setBroken(true)} className="h-full w-full object-contain" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} className="h-full w-full object-contain" />;
}

function VideoMark({ src }) {
  if (!isVideoSrc(cleanSrc(src))) return null;
  return (
    <span className="pointer-events-none absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
      <Play size={12} fill="currentColor" className="translate-x-[1px]" />
    </span>
  );
}

// Casilla de «elegir» arriba a la izquierda de la foto. Zona de toque de 44px
// (teléfono); en la compu aparece al pasar el mouse, y siempre una vez que hay
// algo elegido. En pantallas táctiles (sin hover) se ve siempre.
function PickBox({ on, visible, onClick }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={on ? 'Quitar de la selección' : 'Elegir esta foto'}
      onClick={onClick} onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
      // SIEMPRE visible (el dueño: "que venga el cuadrito ahí solo para que uno entienda y lo marque") y más chico.
      // El área tocable (36px) es más grande que el cuadrito para que en el teléfono se pegue fácil.
      className="absolute left-0 top-0 z-[1] grid h-9 w-9 place-items-center rounded-tl-xl">
      <span className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] shadow-sm transition-colors ${
        on ? 'border-brand bg-brand text-[#04222f]' : 'border-white/90 bg-black/40 text-transparent hover:bg-black/60'}`}>
        <Check size={11} strokeWidth={3.5} />
      </span>
    </button>
  );
}

// ── La bajada: preparando (con progreso) → lista para guardar ─────────────
function DownloadSheet({ dl, onClose, onSavePart, onSavePaused, onSaveSingle, onShare }) {
  const preparing = dl.phase === 'preparing';
  const paused = dl.phase === 'part' && !!dl.part; // parte llena: se guarda y sigue
  const busy = preparing || paused;
  const ready = dl.phase === 'ready';
  const parts = ready && Array.isArray(dl.parts) ? dl.parts : [];
  const pct = dl.total ? Math.round((dl.done / dl.total) * 100) : 0;
  const allSaved = ready && (dl.shared || (dl.single ? dl.single.saved : parts.length > 0 && parts.every((pt) => pt.saved)));
  const saved = dl.savedParts || 0;
  const many = (dl.partCount || 0) > 1;
  const stop = (e) => e.stopPropagation();
  // Esc cierra (salvo mientras prepara o espera una parte: ahí se cancela con el botón).
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busyRef.current) closeRef.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const lost = (
    <>
      {dl.failed > 0 && <p className="mt-1 text-[11.5px] text-amber-200/80">{dl.failed} no se {dl.failed === 1 ? 'pudo' : 'pudieron'} bajar (sigo con las demás)</p>}
      {dl.dirty > 0 && <p className="mt-1 text-[11.5px] text-amber-200/80">{dl.dirty} no se {dl.dirty === 1 ? 'pudo' : 'pudieron'} limpiar de metadata (no van)</p>}
    </>
  );
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-5 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div onClick={stop} role="dialog" aria-modal="true" aria-label="Bajar fotos"
        className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 text-center">
        <div className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${
          allSaved ? 'bg-emerald-500/15 text-emerald-300' : dl.phase === 'error' ? 'bg-rose-500/15 text-rose-300' : 'bg-brand/15 text-brand'}`}>
          {allSaved ? <Check size={22} /> : preparing ? <Clock size={20} className="animate-pulse" /> : <Download size={20} />}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold text-paper">{dl.title}</h3>

        {preparing && (
          <>
            <p className="mt-1 text-[13px] text-paper-mute" aria-live="polite">Preparando {dl.done} / {dl.total}…</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hair/10">
              <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[11.5px] text-paper-dim">Se les saca la metadata a todas. No cierres esta pestaña.</p>
            {saved > 0 && <p className="mt-1 text-[11.5px] text-emerald-300/90">{saved === 1 ? 'Parte 1 guardada' : `Partes 1–${saved} guardadas`} · sigo con la {saved + 1}</p>}
            {lost}
            <button type="button" onClick={onClose}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-paper-mute transition-colors hover:border-hair hover:text-paper">
              Cancelar
            </button>
          </>
        )}

        {paused && (
          <>
            <p className="mt-1 text-[13px] text-paper-mute" aria-live="polite">Parte {dl.part.no} lista · van {dl.done} / {dl.total}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hair/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[11.5px] text-paper-dim">Pasa de ~200 MB, así que va en partes. Guardá esta y sigo con la próxima.</p>
            {lost}
            <button type="button" onClick={onSavePaused}
              className="btn3d mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">
              <Download size={15} /> Guardar parte {dl.part.no}
              <span className="text-[11.5px] font-medium opacity-75">· {dl.part.count} · {fmtMB(dl.part.bytes)}</span>
            </button>
            <button type="button" onClick={onClose}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-paper-mute transition-colors hover:border-hair hover:text-paper">
              Cancelar el resto
            </button>
          </>
        )}

        {ready && (
          <>
            <p className="mt-1 text-[13px] leading-relaxed text-paper-mute">
              {dl.shared
                ? <>Listo. Revisá tu <b className="text-paper">galería / Fotos</b> (o el chat donde las mandaste).</>
                : <>{dl.ok} {dl.ok === 1 ? 'lista' : 'listas'}, sin metadata. {dl.share ? <>En el teléfono se guardan en <b className="text-paper">Fotos</b>.</> : dl.single ? null : <>Bajan en un <b className="text-paper">.zip</b>, una carpeta por modelo.</>}</>}
            </p>
            {dl.failed > 0 && (
              <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200">
                {dl.failed} no se {dl.failed === 1 ? 'pudo' : 'pudieron'} bajar
              </p>
            )}
            {dl.dirty > 0 && (
              <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200">
                {dl.dirty} no se {dl.dirty === 1 ? 'pudo' : 'pudieron'} limpiar de metadata, así que no {dl.dirty === 1 ? 'va' : 'van'}
              </p>
            )}
            {!dl.shared && saved > 0 && (
              <p className="mt-2 text-[12px] text-emerald-300/90">
                <Check size={12} className="-mt-0.5 mr-1 inline" />{saved === 1 ? 'Parte 1 ya guardada.' : `Partes 1–${saved} ya guardadas.`}
              </p>
            )}
            <div className="mt-5 space-y-2.5">
              {dl.share && !dl.shared && (
                <button type="button" onClick={onShare}
                  className="btn3d flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold">
                  <Share2 size={16} /> Guardar en el teléfono · {dl.share.length}
                </button>
              )}
              {!dl.shared && dl.single && (
                <button type="button" onClick={onSaveSingle}
                  className={`${dl.share ? 'btn3d-ghost font-semibold' : 'btn3d font-bold'} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm`}>
                  {dl.single.saved ? <Check size={15} /> : <Download size={15} />} {dl.single.saved ? 'Guardada · otra vez' : 'Guardar foto'}
                </button>
              )}
              {!dl.shared && !dl.single && parts.map((pt, k) => (
                <button key={pt.name} type="button" onClick={() => onSavePart(k)}
                  className={`${dl.share || pt.saved ? 'btn3d-ghost font-semibold' : 'btn3d font-bold'} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm`}>
                  {pt.saved ? <Check size={15} /> : <Download size={15} />}
                  {many ? `Guardar parte ${pt.no}` : 'Guardar .zip'}
                  <span className="text-[11.5px] font-medium opacity-75">· {pt.count} · {fmtMB(pt.bytes)}</span>
                </button>
              ))}
              {!dl.shared && parts.length > 1 && (
                <p className="text-[11.5px] text-paper-dim">Pasa de ~200 MB, así que va en {parts.length} partes. Guardá cada una.</p>
              )}
            </div>
          </>
        )}

        {dl.phase === 'error' && (
          <p className="mt-1 text-[13px] text-rose-300">{dl.err}</p>
        )}
        {(ready || paused) && dl.err && <p className="mt-3 text-[12px] text-rose-300">{dl.err}</p>}

        {!busy && (
          <button type="button" onClick={onClose} className="mt-4 text-[12px] font-medium text-paper-dim hover:text-paper">
            {allSaved ? 'Listo' : 'Cerrar'}
          </button>
        )}
      </div>
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    // overflow-x-auto = red de seguridad: si en un teléfono chico no entra, se
    // desliza adentro (nunca empuja la página de costado).
    <div role="tablist" aria-label={label}
      className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-ink-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === o.value ? 'bg-brand text-[#04222f]' : 'text-paper-mute hover:text-paper'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Empty({ icon: Icon, title, sub, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-card/40 px-5 py-14 text-center">
      {Icon && <Icon size={22} className="text-paper-mute" />}
      <p className="text-sm text-paper-mute">{title}</p>
      {sub && <p className="max-w-md text-[12px] text-paper-dim">{sub}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="btn3d-ghost mt-1 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12.5px] font-semibold">
          {action.label}
        </button>
      )}
    </div>
  );
}

function MoreButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="btn3d-ghost flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold">
      <ChevronDown size={14} /> {children}
    </button>
  );
}

// ── Visor grande: Esc o click afuera cierra; ← → navega; «Descargar» (limpia,
// sin metadata — pasa por la misma bajada que el .zip). ─────────────────────
function Preview({ list, index, onClose, onStep, onDownload, dlBusy, keysOff = false }) {
  const cur = list[index];
  const closeRef = useRef(onClose);
  const stepRef = useRef(onStep);
  const keysOffRef = useRef(keysOff); // con la bajada abierta encima, las teclas no mueven el visor
  closeRef.current = onClose;
  stepRef.current = onStep;
  keysOffRef.current = keysOff;
  const [broken, setBroken] = useState(false);
  const s = cleanSrc(cur?.src);
  useEffect(() => { setBroken(false); }, [s]);

  useEffect(() => {
    const onKey = (e) => {
      if (keysOffRef.current) return;
      if (e.key === 'Escape') closeRef.current?.();
      else if (e.key === 'ArrowRight') stepRef.current?.(1);
      else if (e.key === 'ArrowLeft') stepRef.current?.(-1);
    };
    window.addEventListener('keydown', onKey);
    let prevOverflow = '';
    try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch {}
    return () => {
      window.removeEventListener('keydown', onKey);
      try { document.body.style.overflow = prevOverflow; } catch {}
    };
  }, []);

  if (!cur) return null;
  const stop = (e) => e.stopPropagation();
  const video = isVideoSrc(s);
  const isChange = cur.status === 'cambio' || cur.status === 'cambio_borrador';
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink/95 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Foto grande">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5" onClick={stop}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <StatusBadge status={cur.status} />
            <ProdChip state={cur.prodState} via={cur.via} />
            {list.length > 1 && <span className="shrink-0 text-[11px] text-paper-dim">{index + 1}/{list.length}</span>}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-paper">{cur.title}</p>
          <p className="truncate text-[11.5px] text-paper-dim">{cur.sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {s && onDownload && cur.item && (
            <button type="button" onClick={() => onDownload(cur)} disabled={dlBusy}
              className="btn3d-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold">
              <Download size={14} /> Descargar
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-16">
        {list.length > 1 && (
          <button type="button" onClick={(e) => { stop(e); onStep(-1); }} aria-label="Anterior"
            className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-line bg-ink/70 text-paper-mute transition-colors hover:text-paper sm:left-3 sm:h-11 sm:w-11">
            <ChevronLeft size={20} />
          </button>
        )}
        {!s || broken ? (
          <span onClick={stop} className="grid h-40 w-32 place-items-center rounded-xl bg-[#0a0d11] text-paper-dim"><ImageOff size={22} /></span>
        ) : video ? (
          <video key={s} src={posterSrc(s)} controls autoPlay muted playsInline preload="metadata" onClick={stop} onError={() => setBroken(true)}
            className="max-h-full max-w-full rounded-xl bg-[#0a0d11]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s} src={s} alt="" onClick={stop} onError={() => setBroken(true)} draggable={false}
            className="max-h-full max-w-full rounded-xl object-contain" />
        )}
        {list.length > 1 && (
          <button type="button" onClick={(e) => { stop(e); onStep(1); }} aria-label="Siguiente"
            className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-line bg-ink/70 text-paper-mute transition-colors hover:text-paper sm:right-3 sm:h-11 sm:w-11">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      {cur.note ? (
        <div className="px-4 pb-4 pt-1 sm:px-5" onClick={stop}>
          <p className={`mx-auto max-w-xl rounded-xl border bg-card px-4 py-2.5 text-sm ${isChange ? 'border-amber-500/40 text-amber-100' : 'border-line text-paper-mute'}`}>
            {isChange ? 'Pidió: ' : 'Nota: '}&ldquo;{cur.note}&rdquo;
          </p>
        </div>
      ) : <div className="pb-2" />}
    </div>
  );
}
