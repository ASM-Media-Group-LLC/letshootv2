'use client';

// ─────────────────────────────────────────────────────────────────────────
// AdminPropuestas — vista de SUPERVISIÓN del dueño (/admin › Propuestas).
//
// El dueño ve TODAS las propuestas de fotos que arma el equipo (de TODOS los
// empleados, ya no solo las de este navegador): a quién van, quién las armó,
// en qué estado están, cuándo vencen y qué respondió el receptor (le gustó /
// rechazó / comentó / abrió/registró).
//
// FUENTE DE DATOS: Supabase (backend real, migración 0062). El staff tiene
// sesión y su RLS (is_staff()) le da acceso completo con consultas normales
// a las tablas — NO hay service role:
//   · photo_proposals               → la propuesta (link_id, created_by_name,
//                                       model_name/agency, recipient_*, status,
//                                       expires_at, looks, …)
//   · photo_proposal_feedback       → feedback del receptor foto por foto
//   · photo_proposal_registrations  → quién se registró (nombre/email/teléfono)
//
// Si todavía no hay NINGUNA propuesta real, sembramos 1-2 ejemplos EN MEMORIA
// para que la vista no se vea vacía en la demo. En cuanto hay reales, se
// muestran SOLO las reales.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Send, Search, SlidersHorizontal, Copy, Check, Mail, Archive, ExternalLink, X, Heart, ThumbsDown, MessageSquare, UserCheck, ChevronDown, Inbox, Phone, Pencil, TrendingUp, Bell, AlertTriangle, Maximize2, ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { getSupabase } from '@/lib/supabase/client';

// Estado derivado de una propuesta: borrador (solo demo), vencida (expiró) o publicada.
// El archivado NO es un estado acá — es un flag aparte (status === 'archived').
function stateOf(p) {
  if (p._draft || p._status === 'draft') return 'borrador';
  if (p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()) return 'vencida';
  return 'publicada';
}
const STATE_META = {
  borrador:  { label: 'Borrador',  tone: 'zinc' },
  publicada: { label: 'Publicada', tone: 'brand' },
  vencida:   { label: 'Vencida',   tone: 'bad' },
};

// Días restantes hasta el vencimiento (null si no hay fecha).
function daysLeft(p) {
  if (!p.expiresAt) return null;
  return Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000);
}

// Fecha de creación, corta y en español ("14 sep"; agrega el año si no es el
// actual). Devuelve null si no hay fecha válida.
const MES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const base = `${d.getDate()} ${MES_ES[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// Inicio del día de HOY (medianoche local) en ms — para el "movimiento del día".
function startOfToday() { const x = new Date(); x.setHours(0, 0, 0, 0); return x.getTime(); }
// Helpers de rango para el calendario (día · semana lunes-domingo · mes).
function startOfDayMs(ms) { const x = new Date(ms); x.setHours(0, 0, 0, 0); return x.getTime(); }
function startOfWeekMs(ms) { const x = new Date(startOfDayMs(ms)); const wd = (x.getDay() + 6) % 7; return x.getTime() - wd * 86400000; }
function startOfMonthMs(ms) { const x = new Date(ms); return new Date(x.getFullYear(), x.getMonth(), 1).getTime(); }
function endOfMonthMs(ms) { const x = new Date(ms); return new Date(x.getFullYear(), x.getMonth() + 1, 1).getTime(); }
function addMonthsMs(ms, n) { const x = new Date(ms); return new Date(x.getFullYear(), x.getMonth() + n, 1).getTime(); }
// Hora de un ISO en 12h con AM/PM y en horario de COLOMBIA (Bogotá), para el
// feed de actividad — así el equipo ve la misma hora sin importar su zona.
function hhmm(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
}

// Resumen de respuestas del receptor a partir del feedback.
function feedbackSummary(fb) {
  const items = Array.isArray(fb?.items) ? fb.items : [];
  return {
    liked: items.filter((i) => i.status === 'liked').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    comments: items.filter((i) => (i.note || '').trim()).length,
    total: items.length,
  };
}

// ── Demo seed (SOLO en memoria — solo si no hay ninguna propuesta real) ─────
// Propuestas variadas: distintos empleados, modelos, estados y respuestas.
function demoSeed() {
  const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const img = (id) => `https://images.unsplash.com/${id}?w=400&q=70&auto=format&fit=crop`;
  return [
    {
      _demo: true, id: 'JP-7K2M9A', code: 'JP-7K2M9A', lang: 'es', _status: 'published',
      name: 'Sesión exclusiva — Valentina', subtitle: 'Un look que no se repite',
      createdBy: 'Isabel Tuiran', createdAt: iso(-2), expiresAt: iso(6),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Valentina Cruz', email: 'valentina@example.com', kind: 'prospect' },
      _feedback: { items: [
        { id: 'a1', caption: 'Editorial en azotea', result: img('photo-1524504388940-b1c1722653e1'), status: 'liked', note: 'Me encanta esta, la quiero primero.' },
        { id: 'a2', caption: 'Retrato natural', result: img('photo-1494790108377-be9c29b29330'), status: 'liked', note: '' },
        { id: 'a3', caption: 'Full body noche', result: img('photo-1517841905240-472988babdf9'), status: 'rejected', note: 'Esta pose no me convence.' },
      ] },
      _reg: { name: 'Valentina Cruz', email: 'valentina@example.com', phone: '+57 300 123 4567', at: iso(-1) },
    },
    {
      _demo: true, id: 'JP-3X8Q1B', code: 'JP-3X8Q1B', lang: 'en', _status: 'published',
      name: 'Your first drop — Monica', subtitle: 'Fire your photographer',
      createdBy: 'David Aunta', createdAt: iso(-4), expiresAt: iso(2),
      model: { name: 'Monica Rivas', agency: 'Kash Agency' },
      recipient: { name: 'Chris Bennett', email: 'chris@example.com', kind: 'client' },
      _feedback: { items: [
        { id: 'b1', caption: 'Beach golden hour', result: img('photo-1502823403499-6ccfcf4fb453'), status: 'liked', note: 'Perfect.' },
        { id: 'b2', caption: 'Studio minimal', result: img('photo-1488426862026-3ee34a7d66df'), status: null, note: '' },
      ] },
      _reg: null,
    },
    {
      _demo: true, id: 'JP-9F4L2C', code: 'JP-9F4L2C', lang: 'es', _status: 'published',
      name: 'Propuesta — Monica Rivas', subtitle: 'Contenido premium listo',
      createdBy: 'Lizeth Jerez', createdAt: iso(-9), expiresAt: iso(-3), // vencida
      model: { name: 'Monica Rivas', agency: 'Kash Agency' },
      recipient: { name: 'Laura Méndez', email: 'laura.mendez@example.com', kind: 'prospect' },
      _feedback: { items: [
        { id: 'c1', caption: 'Casual urbano', result: img('photo-1529626455594-4ff0802cfb7e'), status: 'liked', note: '' },
        { id: 'c2', caption: 'Vestido rojo', result: img('photo-1515886657613-9f3515b0c78f'), status: 'rejected', note: 'Cambiar color.' },
        { id: 'c3', caption: 'Primer plano', result: img('photo-1544005313-94ddf0286df2'), status: 'liked', note: 'Sí!' },
      ] },
      _reg: { name: 'Laura Méndez', email: 'laura.mendez@example.com', phone: '', at: iso(-4) },
    },
    {
      _demo: true, _draft: true, id: 'JP-5B6N3D', code: 'JP-5B6N3D', lang: 'es', _status: 'published',
      name: 'Borrador — Julia Parker', subtitle: 'Sin publicar todavía',
      createdBy: 'Isabel Tuiran', createdAt: iso(-1), expiresAt: null,
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Sofía Ramírez', email: '', kind: 'prospect' },
      _feedback: null, _reg: null,
    },
    {
      _demo: true, id: 'JP-1P0R7E', code: 'JP-1P0R7E', lang: 'pt', _status: 'published',
      name: 'Proposta exclusiva — Julia', subtitle: 'Um ensaio só seu',
      createdBy: 'David Aunta', createdAt: iso(-6), expiresAt: iso(9),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Rafael Souza', email: 'rafael@example.com', kind: 'model' },
      _feedback: null, _reg: null,
    },
  ];
}

// Normaliza una fila de photo_proposals (+ feedback/registro resueltos por
// proposal_id) al shape que usa la vista.
function mapProposal(row, fb, reg, fbInt) {
  const isInternal = row.recipient_kind === 'internal';
  return {
    _demo: false,
    id: row.id,
    code: row.link_id,
    reviewers: Array.isArray(row.internal_reviewers) ? row.internal_reviewers.filter((x) => x?.name || x?.id) : [],
    lang: row.lang || 'es',
    template: row.template || null,
    name: row.name || '',
    subtitle: row.subtitle || '',
    intro: row.intro || '',
    createdBy: row.created_by_name || '',
    createdAt: row.created_at || null,
    approvedAt: row.approved_at || null,
    deliveredAt: row.delivered_at || null,
    firstOpenedAt: row.first_opened_at || null,
    expiresAt: row.expires_at || null,
    _status: row.status || 'published',
    _internal: isInternal,
    approval: row.approval_required
      ? {
          required: true, status: row.approval_status || 'pending',
          approver: row.approver_email || row.internal_reviewer_name || '',
          reviewer: row.approval_reviewer_name || '', reason: row.approval_reason || '',
        }
      : null,
    model: { name: row.model_name || '', agency: row.model_agency || '' },
    recipient: { name: row.recipient_name || '', email: row.recipient_email || '', kind: row.recipient_kind || '', instagram: row.recipient_instagram || '', userId: row.recipient_user_id || null },
    looks: Array.isArray(row.looks) ? row.looks : [],
    _feedback: fb ? { items: Array.isArray(fb.items) ? fb.items : [], recipientName: fb.recipient_name || '', updatedAt: fb.updated_at || null } : null,
    _internalFeedback: fbInt ? { items: Array.isArray(fbInt.items) ? fbInt.items : [], recipientName: fbInt.recipient_name || '', updatedAt: fbInt.updated_at || null } : null,
    _reg: reg ? { name: reg.name || '', email: reg.email || '', phone: reg.phone || '', at: reg.created_at || null } : null,
  };
}

// "Abrió" = el receptor entró al link. El backend dejó de sellar first_opened_at
// (una migración reescribió get_proposal_by_link y perdió ese update), así que lo
// deducimos de cualquier señal real: sello del backend, registro o progreso parcial.
function openSignalAt(p) {
  return p?.firstOpenedAt || p?._reg?.at || p?._progress?.updated_at || null;
}
// Para el CONTEO de "abrieron": cualquiera de las anteriores O que ya respondió
// (responder implica haber abierto) — así "abrieron" nunca queda por debajo de
// "respondieron", que era justo el número imposible (0 abrieron / 3 respondieron).
function openedAt(p) {
  return openSignalAt(p) || p?._feedback?.updatedAt || null;
}

export default function AdminPropuestas() {
  const [rows, setRows] = useState([]);         // lista normalizada (reales o, si no hay, demos)
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [origin, setOrigin] = useState('');
  const [sel, setSel] = useState(null);         // id de la propuesta abierta en el drawer
  const [empSel, setEmpSel] = useState(null);   // nombre del empleado con el expediente abierto
  const [copied, setCopied] = useState('');
  const [selDay, setSelDay] = useState(startOfToday()); // día ancla del calendario (ms 00:00 local)
  const [rangeMode, setRangeMode] = useState('day');    // 'day' | 'week' | 'month' — el span del movimiento/actividad
  const [calMonth, setCalMonth] = useState(startOfMonthMs(startOfToday())); // mes visible del mini-calendario
  const [calOpen, setCalOpen] = useState(false);        // el mini-calendario arranca CERRADO (se abre con el botón)
  const [view, setView] = useState('calendario');       // 'calendario' (día a día) | 'historial' (lista completa) | 'entregas'
  const [empOpen, setEmpOpen] = useState(false);         // marcador "Por empleado": arranca colapsado
  const [calEmp, setCalEmp] = useState('');              // filtro Calendario: por empleado
  const [calCreator, setCalCreator] = useState('');      // filtro Calendario: por creadora
  const [calKind, setCalKind] = useState('');            // filtro Calendario: tipo (clic en un contador de Movimiento)

  // Filtros
  const [q, setQ] = useState('');
  const [fEmpleado, setFEmpleado] = useState('all');
  const [fEstado, setFEstado] = useState('all');

  // Carga desde Supabase — el staff tiene sesión y su RLS (is_staff()) permite
  // leer TODAS las propuestas del equipo con consultas normales a las tablas.
  useEffect(() => {
    try { setOrigin(window.location.origin); } catch {}
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      try {
        const [propsRes, fbRes, regRes, contentRes, remRes, progRes] = await Promise.all([
          sb.from('photo_proposals').select('*').order('created_at', { ascending: false }),
          sb.from('photo_proposal_feedback').select('proposal_id, items, recipient_name, updated_at, reviewer_kind').order('updated_at', { ascending: false }),
          sb.from('photo_proposal_registrations').select('proposal_id, name, email, phone, created_at').order('created_at', { ascending: false }),
          sb.from('proposal_content').select('proposal_id, item_id, kind, label, src, decision, prod_state').order('created_at', { ascending: true }),
          sb.from('proposal_reminders').select('proposal_id, kind, count, last_sent_at, paused'),
          sb.from('proposal_progress').select('proposal_id, decided, liked, total, updated_at, reviewer_kind'),
        ]);
        if (cancelled) return;
        const props = Array.isArray(propsRes.data) ? propsRes.data : [];

        // Contenido que cayó a la cuenta (SOLO lo aprobado → por producir), por propuesta.
        const contentMap = {};
        (Array.isArray(contentRes.data) ? contentRes.data : []).forEach((c) => {
          if (!c?.proposal_id) return;
          (contentMap[c.proposal_id] = contentMap[c.proposal_id] || []).push(c);
        });

        // Feedback en DOS buckets por proposal_id: creadora vs equipo (interno).
        const fbCreator = {}, fbInternal = {};
        (Array.isArray(fbRes.data) ? fbRes.data : []).forEach((f) => {
          if (!f?.proposal_id) return;
          const map = f.reviewer_kind === 'internal' ? fbInternal : fbCreator;
          if (!map[f.proposal_id]) map[f.proposal_id] = f;
        });

        // registro por proposal_id — nos quedamos con el más reciente (ya viene
        // ordenado desc, así que el primero gana).
        const regMap = {};
        (Array.isArray(regRes.data) ? regRes.data : []).forEach((r) => {
          if (r?.proposal_id && !regMap[r.proposal_id]) regMap[r.proposal_id] = r;
        });

        // Progreso PARCIAL (borrador) de la creadora — "abrió · N/total" sin terminar.
        const progMap = {};
        (Array.isArray(progRes.data) ? progRes.data : []).forEach((pr) => {
          if (pr?.proposal_id && pr.reviewer_kind !== 'internal' && !progMap[pr.proposal_id]) progMap[pr.proposal_id] = pr;
        });

        if (props.length > 0) {
          // Recordatorios por propuesta: { approval: fila, response: fila }.
          const remMap = {};
          (Array.isArray(remRes.data) ? remRes.data : []).forEach((r) => {
            if (!r?.proposal_id) return;
            (remMap[r.proposal_id] = remMap[r.proposal_id] || {})[r.kind] = r;
          });

          setRows(props.map((p) => ({ ...mapProposal(p, fbCreator[p.id], regMap[p.id], fbInternal[p.id]), _reminders: remMap[p.id] || null, _progress: progMap[p.id] || null })));
          setUsingDemo(false);
        } else {
          // Sin reales: sembramos ejemplos en memoria para no verse vacío.
          setRows(demoSeed());
          setUsingDemo(true);
        }
      } catch {
        if (!cancelled) { setRows(demoSeed()); setUsingDemo(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const all = rows;

  const empleados = useMemo(() => {
    const s = new Set();
    all.forEach((p) => { if (p.createdBy) s.add(p.createdBy); });
    return [...s].sort();
  }, [all]);

  // Creadoras (destinatarios) para el filtro del calendario.
  const creadorasCal = useMemo(() => {
    const s = new Set();
    all.forEach((p) => { const n = (p.recipient?.name || '').trim(); if (n) s.add(n); });
    return [...s].sort();
  }, [all]);

  // Filtro del calendario (empleado + creadora) — combinables. Aplica al
  // movimiento del día y a la actividad.
  const calMatch = (p) =>
    (!calEmp || p.createdBy === calEmp) &&
    (!calCreator || (p.recipient?.name || '').trim() === calCreator);

  const isArch = (p) => p?._status === 'archived';

  // Marcador por empleado: cuántas armó cada uno (de un vistazo, sin filtrar) y
  // cómo les fue — aprobadas / abiertas / vencidas. Sobre las NO archivadas y
  // SIN depender del filtro de empleado (para poder saltar entre personas).
  const teamTally = useMemo(() => {
    const byEmp = new Map();
    all.filter((p) => !isArch(p)).forEach((p) => {
      const name = p.createdBy || '—';
      if (!byEmp.has(name)) byEmp.set(name, { name, total: 0, approved: 0, opened: 0, expired: 0 });
      const e = byEmp.get(name);
      e.total += 1;
      if (p.approval?.status === 'approved') e.approved += 1;
      if (p._reg) e.opened += 1;
      if (stateOf(p) === 'vencida') e.expired += 1;
    });
    return [...byEmp.values()].sort((a, b) => b.total - a.total);
  }, [all]);

  // Backlog: lo que se está ATRASANDO ahorita = pendientes de aprobación +
  // vencidas sin respuesta. Externas (no internas), sin borradores/archivadas.
  // Coincide con el badge de la pestaña (que se calcula en /admin).
  const backlog = useMemo(() => {
    let sinAprobar = 0, atrasadas = 0;
    all.forEach((p) => {
      if (isArch(p) || p._internal) return;
      const stt = stateOf(p);
      if (stt === 'borrador') return;
      if (p.approval?.required && p.approval?.status === 'pending') sinAprobar += 1;
      else if (stt === 'vencida' && feedbackSummary(p._feedback).total === 0) atrasadas += 1;
    });
    return { sinAprobar, atrasadas, total: sinAprobar + atrasadas };
  }, [all]);

  // Rango activo (día · semana · mes) a partir del ancla `selDay` + su período
  // anterior (para el "vs"). Un solo lugar que todo lo demás consume.
  const _today0 = startOfToday();
  const range = useMemo(() => {
    if (rangeMode === 'week') {
      const rStart = startOfWeekMs(selDay);
      return { rStart, rEnd: rStart + 7 * 86400000, pStart: rStart - 7 * 86400000, pEnd: rStart, prevLabel: 'sem. ant.' };
    }
    if (rangeMode === 'month') {
      const rStart = startOfMonthMs(selDay);
      return { rStart, rEnd: endOfMonthMs(selDay), pStart: startOfMonthMs(rStart - 1), pEnd: rStart, prevLabel: 'mes ant.' };
    }
    const rStart = startOfDayMs(selDay);
    return { rStart, rEnd: rStart + 86400000, pStart: rStart - 86400000, pEnd: rStart, prevLabel: 'ayer' };
  }, [rangeMode, selDay]);

  const rangeLabel = useMemo(() => {
    const d = new Date(selDay);
    if (rangeMode === 'week') {
      const s = new Date(range.rStart), e = new Date(range.rEnd - 86400000);
      const em = e.toLocaleDateString('es-US', { month: 'short' });
      const sm = s.toLocaleDateString('es-US', { month: 'short' });
      return sm === em ? `${s.getDate()}–${e.getDate()} ${em}` : `${s.getDate()} ${sm} – ${e.getDate()} ${em}`;
    }
    if (rangeMode === 'month') return d.toLocaleDateString('es-US', { month: 'long', year: 'numeric' });
    if (startOfDayMs(selDay) === _today0) return 'Hoy';
    if (startOfDayMs(selDay) === _today0 - 86400000) return 'Ayer';
    return d.toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [rangeMode, selDay, range, _today0]);

  // Movimiento del RANGO seleccionado vs el período anterior (pulso del equipo).
  const dayStats = useMemo(() => {
    const { rStart, rEnd, pStart, pEnd } = range;
    const bucket = (ts) => { if (!ts) return null; const m = new Date(ts).getTime(); if (Number.isNaN(m)) return null; if (m >= rStart && m < rEnd) return 'hoy'; if (m >= pStart && m < pEnd) return 'ayer'; return null; };
    const z = () => ({ hoy: 0, ayer: 0 });
    const s = { creadas: z(), respondieron: z(), aprobadas: z(), abrieron: z(), sinterminar: z(), entregadas: z() };
    all.forEach((p) => {
      if (!calMatch(p)) return;
      const c = bucket(p.createdAt); if (c) s.creadas[c] += 1;
      if (p.approval && (p.approval.status === 'approved' || p.approval.status === 'rejected')) { const a = bucket(p.approvedAt); if (a) s.aprobadas[a] += 1; }
      if (feedbackSummary(p._feedback).total > 0) { const r = bucket(p._feedback?.updatedAt); if (r) s.respondieron[r] += 1; }
      const o = bucket(openedAt(p)); if (o) s.abrieron[o] += 1;
      // SIN TERMINAR: abrió el link pero NO completó su respuesta (solo propuestas
      // a la creadora, no internas). Se cuenta por la fecha en que abrió.
      if (!p._internal && feedbackSummary(p._feedback).total === 0) { const u = bucket(openSignalAt(p)); if (u) s.sinterminar[u] += 1; }
      const d = bucket(p.deliveredAt); if (d) s.entregadas[d] += 1;
    });
    return s;
  }, [all, range, calEmp, calCreator]);

  // Feed de actividad del día SELECCIONADO (armó / aprobó / respondió / abrió /
  // entregó). Cada evento abre esa propuesta.
  const activityForDay = useMemo(() => {
    const { rStart, rEnd } = range;
    const fresh = (ts) => { if (!ts) return false; const m = new Date(ts).getTime(); return m >= rStart && m < rEnd; };
    const ev = [];
    all.forEach((p) => {
      if (!calMatch(p)) return;
      if (fresh(p.createdAt)) ev.push({ at: p.createdAt, kind: 'created', p });
      if (p.approval && fresh(p.approvedAt) && (p.approval.status === 'approved' || p.approval.status === 'rejected')) ev.push({ at: p.approvedAt, kind: p.approval.status, p });
      if (fresh(p._feedback?.updatedAt) && feedbackSummary(p._feedback).total > 0) ev.push({ at: p._feedback.updatedAt, kind: 'responded', p });
      { const oa = openSignalAt(p);
        if (fresh(oa)) {
          ev.push({ at: oa, kind: 'opened', p });
          // Si abrió pero NO completó, también entra a "Sin terminar".
          if (!p._internal && feedbackSummary(p._feedback).total === 0) ev.push({ at: oa, kind: 'unfinished', p });
        } }
      if (fresh(p.deliveredAt)) ev.push({ at: p.deliveredAt, kind: 'delivered', p });
    });
    const kindOk = (k) => !calKind || (calKind === 'decided' ? (k === 'approved' || k === 'rejected') : k === calKind);
    return ev.filter((e) => kindOk(e.kind)).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 120);
  }, [all, range, calEmp, calCreator, calKind]);

  // Actividad AGRUPADA por tipo (separadito, no revuelto) — mismo orden que
  // Movimiento. 'approved'/'rejected' caen en "Aprobadas".
  const activityGroups = useMemo(() => {
    const norm = (k) => (k === 'approved' || k === 'rejected') ? 'decided' : k;
    const order = [['created', 'Creadas', 'bg-brand'], ['responded', 'Respondieron', 'bg-amber-400'], ['decided', 'Aprobadas (equipo)', 'bg-emerald-400'], ['opened', 'Abrieron', 'bg-sky-400'], ['unfinished', 'Sin terminar', 'bg-rose-400'], ['delivered', 'Entregadas', 'bg-violet-400']];
    const by = {};
    activityForDay.forEach((e) => { const g = norm(e.kind); (by[g] = by[g] || []).push(e); });
    return order.filter(([g]) => by[g]?.length).map(([g, label, dot]) => ({ g, label, dot, items: by[g] }));
  }, [activityForDay]);

  // Mini-calendario: días del mes visible CON movimiento (para el puntito) + las
  // 42 celdas (6 semanas, lunes→domingo).
  const calActiveDays = useMemo(() => {
    const mStart = startOfMonthMs(calMonth), mEnd = endOfMonthMs(calMonth);
    const set = new Set();
    const add = (ts) => { if (!ts) return; const m = new Date(ts).getTime(); if (Number.isNaN(m) || m < mStart || m >= mEnd) return; set.add(startOfDayMs(m)); };
    all.forEach((p) => {
      if (!calMatch(p)) return;
      add(p.createdAt);
      if (p.approval && (p.approval.status === 'approved' || p.approval.status === 'rejected')) add(p.approvedAt);
      if (feedbackSummary(p._feedback).total > 0) add(p._feedback?.updatedAt);
      add(openedAt(p)); add(p.deliveredAt);
    });
    return set;
  }, [all, calMonth, calEmp, calCreator]);
  const calCells = useMemo(() => {
    const gridStart = startOfWeekMs(startOfMonthMs(calMonth));
    return Array.from({ length: 42 }, (_, i) => gridStart + i * 86400000);
  }, [calMonth]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((p) => {
      const archived = isArch(p);
      // "Archivadas" es un estado más: solo se ven cuando el filtro lo pide.
      if (fEstado === 'archivadas') { if (!archived) return false; }
      else if (archived) return false;
      if (fEstado !== 'all' && fEstado !== 'archivadas' && stateOf(p) !== fEstado) return false;
      if (fEmpleado !== 'all' && (p.createdBy || '') !== fEmpleado) return false;
      if (query) {
        const hay = `${p.recipient?.name || ''} ${p.recipient?.email || ''} ${p.model?.name || ''} ${p.code || ''} ${p.createdBy || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt || b.expiresAt || 0) - new Date(a.createdAt || a.expiresAt || 0));
  }, [all, q, fEmpleado, fEstado]);

  const linkFor = (p) => `${origin}/p/${p.code}?lang=${p.lang || 'es'}`;

  const copyLink = async (p) => {
    try { await navigator.clipboard.writeText(linkFor(p)); setCopied(p.code); setTimeout(() => setCopied(''), 1800); } catch {}
  };
  const mailHref = (p) => {
    const url = linkFor(p);
    const greet = (p.recipient?.name || '').trim().split(/\s+/)[0];
    const body = `${greet ? `Hola ${greet}!` : 'Hola!'}\n\nTe comparto la propuesta: ${p.name}.\nMírala acá: ${url}`;
    return `mailto:${(p.recipient?.email || '').trim()}?subject=${encodeURIComponent(p.name || 'Propuesta')}&body=${encodeURIComponent(body)}`;
  };
  // Archivar/desarchivar: para reales escribe status en Supabase (RLS staff);
  // las demo solo cambian en memoria. En ambos casos refrescamos la fila local.
  const toggleArchive = async (p) => {
    const next = isArch(p) ? 'published' : 'archived';
    if (!p._demo) {
      try { await getSupabase().from('photo_proposals').update({ status: next }).eq('id', p.id); } catch {}
    }
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, _status: next } : r)));
  };

  // Aprobar una propuesta INTERNA: la decide el DUEÑO/ADMIN (los revisores solo
  // opinan). Sella approved + fecha + quién aprobó, y habilita "Enviar a la creadora".
  const approveInternal = async (p) => {
    if (p._demo) return;
    let reviewer = '';
    try {
      const { data: au } = await getSupabase().auth.getUser();
      if (au?.user) {
        const { data: pr } = await getSupabase().from('profiles').select('full_name').eq('id', au.user.id).maybeSingle();
        reviewer = pr?.full_name || '';
      }
    } catch {}
    const nowIso = new Date().toISOString();
    try {
      await getSupabase().from('photo_proposals')
        .update({ approval_status: 'approved', approved_at: nowIso, approval_reviewer_name: reviewer || null })
        .eq('id', p.id);
    } catch {}
    setRows((prev) => prev.map((r) => (r.id === p.id
      ? { ...r, approvedAt: nowIso, approval: { ...(r.approval || {}), required: true, status: 'approved', reviewer } }
      : r)));
  };

  const selProp = shown.find((p) => p.id === sel) || all.find((p) => p.id === sel) || null;

  const activeCount = fEstado === 'archivadas'
    ? all.filter((p) => isArch(p)).length
    : all.filter((p) => !isArch(p)).length;

  // Hoy + navegación. Mover por la unidad del rango (día/semana/mes).
  const _t0 = startOfToday();
  const isToday = rangeMode === 'day' && startOfDayMs(selDay) === _t0;
  const atToday = range.rStart <= _t0 && _t0 < range.rEnd;         // el rango ya incluye hoy → no avanzar
  const goToday = () => { setRangeMode('day'); setSelDay(_t0); setCalMonth(startOfMonthMs(_t0)); };
  const stepRange = (dir) => {
    const nd = rangeMode === 'week' ? startOfWeekMs(selDay) + dir * 7 * 86400000
      : rangeMode === 'month' ? addMonthsMs(selDay, dir)
      : startOfDayMs(selDay) + dir * 86400000;
    setSelDay(nd);
    setCalMonth(startOfMonthMs(nd));
  };
  const emptyWhen = isToday ? 'todavía hoy' : rangeMode === 'day' ? 'ese día' : 'ese período';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-paper-mute">
          {view === 'historial'
            ? 'El historial completo de todas las propuestas. Buscá, filtrá y abrí cualquiera para ver el detalle y las respuestas.'
            : 'Toda foto que llega a una creadora pasa por una propuesta. Este es el movimiento del equipo, día por día: qué se armó, a quién se le mandó y quién aprobó.'}
        </p>
        <a
          href="/propuestas"
          className="btn3d inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          <Send size={15} /> Crear propuesta
        </a>
      </div>

      {/* Switch Calendario | Historial — el día a día y el listado completo, juntos. */}
      <div className="mt-4 inline-flex rounded-full border border-line bg-card p-1">
        {[['calendario', 'Calendario'], ['historial', 'Historial']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              view === id ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:text-paper'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Aviso: solo cuando no hay propuestas reales y se muestran ejemplos. */}
      {usingDemo && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-card/50 px-4 py-3 text-xs text-paper-dim">
          <Inbox size={14} className="mt-0.5 shrink-0 text-paper-mute" />
          <span>Todavía no hay propuestas publicadas. Se muestran ejemplos para ilustrar la vista; cuando el equipo publique desde <span className="text-paper-mute">Propuestas › crear</span>, aparecerán acá automáticamente.</span>
        </div>
      )}

      {view === 'calendario' && (
      <>
      {/* Controles: span (Día/Semana/Mes) + navegación por unidad + filtros.
          En móvil se apilan en filas limpias; la navegación (‹ fecha ›) va SIEMPRE
          agrupada para que no se parta. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-line bg-card p-0.5">
          {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setRangeMode(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${rangeMode === id ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:text-paper'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Navegación por fecha — AGRUPADA (‹ fecha ›), nunca se separa al envolver. */}
        <div className="inline-flex shrink-0 items-center gap-1.5">
          <button onClick={() => stepRange(-1)} aria-label="Anterior"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <ChevronLeft size={16} />
          </button>
          {/* La FECHA es el botón para volver a hoy (ya no hay botón "Hoy" aparte). */}
          <button type="button" onClick={goToday} disabled={atToday}
            title={atToday ? undefined : 'Volver a hoy'}
            className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-full px-2 py-1 font-display text-base font-semibold capitalize text-paper transition-colors enabled:hover:text-brand disabled:cursor-default">
            {rangeLabel}
            {!atToday && <RotateCcw size={13} className="text-paper-mute" />}
          </button>
          <button onClick={() => stepRange(1)} disabled={atToday} aria-label="Siguiente"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
        {/* Abrir/cerrar el mini-calendario (arranca cerrado). */}
        <button type="button" onClick={() => setCalOpen((o) => !o)} aria-expanded={calOpen}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${calOpen ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
          <CalendarDays size={14} /> Calendario
          <ChevronDown size={13} className={`transition-transform ${calOpen ? '' : '-rotate-90'}`} />
        </button>

        {/* Filtros — empleado + creadora. Full-width en móvil (cada uno la mitad),
            a la derecha en desktop. */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <select value={calEmp} onChange={(e) => setCalEmp(e.target.value)}
              className={`w-full appearance-none truncate rounded-full border bg-card py-1.5 pl-3 pr-7 text-xs font-semibold outline-none focus:border-brand/60 sm:w-auto ${calEmp ? 'border-brand/50 text-brand' : 'border-line text-paper-mute'}`}>
              <option value="">Todo el equipo</option>
              {empleados.map((n) => <option key={n} value={n} className="bg-ink text-paper">{n}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          </div>
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <select value={calCreator} onChange={(e) => setCalCreator(e.target.value)}
              className={`w-full appearance-none truncate rounded-full border bg-card py-1.5 pl-3 pr-7 text-xs font-semibold outline-none focus:border-brand/60 sm:w-auto sm:max-w-[170px] ${calCreator ? 'border-brand/50 text-brand' : 'border-line text-paper-mute'}`}>
              <option value="">Todas las creadoras</option>
              {creadorasCal.map((n) => <option key={n} value={n} className="bg-ink text-paper">{n}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          </div>
          {(calEmp || calCreator) && (
            <button onClick={() => { setCalEmp(''); setCalCreator(''); }}
              className="shrink-0 text-xs font-medium text-paper-dim hover:text-paper">Limpiar</button>
          )}
        </div>
      </div>

      {/* MINI-CALENDARIO del mes — colapsable (arranca cerrado; puntito = hubo movimiento). */}
      {calOpen && (
      <div className="mt-3 rounded-2xl border border-line bg-card p-3 sm:max-w-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <button onClick={() => setCalMonth((m) => addMonthsMs(m, -1))} aria-label="Mes anterior"
            className="grid h-7 w-7 place-items-center rounded-full text-paper-mute transition-colors hover:bg-hair/10 hover:text-paper">
            <ChevronLeft size={15} />
          </button>
          <span className="font-display text-sm font-semibold capitalize text-paper">
            {new Date(calMonth).toLocaleDateString('es-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCalMonth((m) => addMonthsMs(m, 1))} disabled={startOfMonthMs(calMonth) >= startOfMonthMs(_t0)} aria-label="Mes siguiente"
            className="grid h-7 w-7 place-items-center rounded-full text-paper-mute transition-colors hover:bg-hair/10 hover:text-paper disabled:opacity-30">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">{d}</span>
          ))}
          {calCells.map((ms) => {
            const inMonth = startOfMonthMs(ms) === startOfMonthMs(calMonth);
            const isFuture = ms > _t0;
            const inRange = ms >= range.rStart && ms < range.rEnd;
            const isTodayCell = ms === _t0;
            const hasDot = calActiveDays.has(ms);
            return (
              <button key={ms} type="button" disabled={isFuture}
                onClick={() => { setRangeMode('day'); setSelDay(ms); setCalMonth(startOfMonthMs(ms)); setCalOpen(false); }}
                className={`relative grid aspect-square place-items-center rounded-lg text-[12px] transition-colors ${
                  inRange ? 'bg-brand font-bold text-on-accent'
                    : isTodayCell ? 'text-paper ring-1 ring-inset ring-brand/50'
                    : inMonth ? 'text-paper hover:bg-hair/10' : 'text-paper-dim/40'
                } ${isFuture ? 'cursor-default opacity-40' : ''}`}>
                {new Date(ms).getDate()}
                {hasDot && !inRange && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* BACKLOG — lo que se está atrasando ahorita (mismo número que el badge
          de la pestaña). Clic → salta al Historial para perseguirlas. */}
      {backlog.total > 0 && (
        <button onClick={() => setView('historial')}
          className="mt-4 flex w-full flex-col gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3 text-left transition-colors hover:border-rose-500/50 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="shrink-0 text-rose-300" />
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-paper">
              {backlog.sinAprobar > 0 && <span>{backlog.sinAprobar} sin aprobar</span>}
              {backlog.sinAprobar > 0 && backlog.atrasadas > 0 && <span className="font-normal text-paper-dim">·</span>}
              {backlog.atrasadas > 0 && <span>{backlog.atrasadas} vencidas sin responder</span>}
            </span>
          </span>
          <span className="pl-[26px] text-[12px] text-paper-mute sm:pl-0">se está atrasando</span>
        </button>
      )}

      {/* MOVIMIENTO del día seleccionado (vs el día anterior). */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
          <TrendingUp size={13} /> Movimiento · <span className="capitalize">{rangeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['creadas', 'Creadas', 'created'],
            ['respondieron', 'Respondieron', 'responded'],
            ['aprobadas', 'Aprobadas (equipo)', 'decided', 'Propuestas que pasaron el paso de APROBACIÓN del equipo (internas o con aprobador). No cuenta fotos — para propuestas directas a la creadora no aplica, por eso suele ser 0.'],
            ['abrieron', 'Abrieron', 'opened'],
            ['sinterminar', 'Sin terminar', 'unfinished', 'Abrió el link pero NO completó su respuesta. Tocá para verlos abajo y mandarles «Recordar ahora».'],
            ['entregadas', 'Entregadas', 'delivered'],
          ].map(([key, label, kind, hint]) => (
            <DayStat key={key} label={label} hint={hint} today={dayStats[key].hoy} yesterday={dayStats[key].ayer} prevLabel={range.prevLabel}
              active={calKind === kind} onClick={() => setCalKind((k) => (k === kind ? '' : kind))} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-paper-dim">Tocá un número para ver <b className="text-paper-mute">quiénes</b> abajo.</p>
      </div>

      {/* ACTIVIDAD del día — CADA tipo en su PROPIA caja, bien separadito. */}
      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
          <span>Actividad · <span className="capitalize">{rangeLabel}</span>
            {calKind && <span className="text-brand"> · {({ created: 'creadas', responded: 'respondieron', decided: 'aprobadas', opened: 'abrieron', unfinished: 'sin terminar', delivered: 'entregadas' })[calKind]}</span>}
            {calEmp && <span className="text-brand"> · {calEmp}</span>}
            {calCreator && <span className="text-brand"> · {calCreator}</span>}
          </span>
          {(calKind || calEmp || calCreator) && (
            <button onClick={() => { setCalKind(''); setCalEmp(''); setCalCreator(''); }}
              className="normal-case tracking-normal text-paper-dim transition-colors hover:text-paper">Ver todo</button>
          )}
        </div>
        {activityGroups.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-paper-dim">
            {calKind || calEmp || calCreator ? 'Nadie con ese filtro ' : 'Sin movimiento '}{emptyWhen}.
          </p>
        ) : (
          <div className="space-y-3">
            {activityGroups.map((grp) => (
              <div key={grp.g} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className="flex items-center gap-2 border-b border-line bg-hair/[0.03] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-paper-dim">
                  <span className={`h-1.5 w-1.5 rounded-full ${grp.dot}`} /> {grp.label} <span className="text-paper-mute">· {grp.items.length}</span>
                </div>
                <ul className="max-h-[300px] divide-y divide-line/50 overflow-y-auto">
                  {grp.items.map((e, i) => (
                    <li key={`${e.p.id}-${e.kind}-${i}`}>
                      <button type="button" onClick={() => setSel(e.p.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hair/[0.04]">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${(EVENT_META[e.kind] || EVENT_META.created).dot}`} />
                        <span className="min-w-0 flex-1 truncate text-sm text-paper-mute">{eventLine(e)}</span>
                        <span className="shrink-0 font-mono text-[11px] text-paper-dim">{hhmm(e.at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marcador por empleado (colapsable, secundario) — clic abre el expediente. */}
      {teamTally.length > 0 && (
        <div className="mt-5">
          <button type="button" onClick={() => setEmpOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim transition-colors hover:text-paper">
            <UserCheck size={13} /> Por empleado
            <ChevronDown size={13} className={`transition-transform ${empOpen ? '' : '-rotate-90'}`} />
            <span className="font-normal normal-case tracking-normal text-paper-dim/70">· {empOpen ? 'clic en una para el expediente' : 'mostrar'}</span>
          </button>
          {empOpen && (
          <div className="mt-2 flex gap-2.5 overflow-x-auto pb-1">
            {teamTally.map((e) => {
              const active = fEmpleado === e.name;
              return (
                <button
                  key={e.name}
                  type="button"
                  onClick={() => setEmpSel(e.name)}
                  title={`Ver el expediente de ${e.name}`}
                  aria-pressed={active}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active ? 'border-brand/60 bg-brand/10' : 'border-line bg-card hover:border-brand/40'
                  }`}
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="max-w-[140px] truncate text-sm font-medium text-paper">{e.name}</span>
                    <span className="font-display text-xl font-bold leading-none tabular-nums text-brand">{e.total}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-paper-mute"><Check size={11} className="text-emerald-400" />{e.approved} aprob.</span>
                    <span className="inline-flex items-center gap-1 text-paper-mute"><UserCheck size={11} className="text-brand" />{e.opened} abrió</span>
                    {e.expired > 0 && <span className="text-paper-dim">{e.expired} venc.</span>}
                  </div>
                </button>
              );
            })}
          </div>
          )}
        </div>
      )}
      </>
      )}

      {view === 'historial' && (
      <>
      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por destinatario, modelo o código…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
        <FilterSelect icon={SlidersHorizontal} value={fEstado} onChange={setFEstado}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'publicada', label: 'Publicadas' },
            { value: 'vencida', label: 'Vencidas' },
            { value: 'borrador', label: 'Borradores' },
            { value: 'archivadas', label: 'Archivadas' },
          ]} />
        <FilterSelect value={fEmpleado} onChange={setFEmpleado}
          options={[{ value: 'all', label: 'Todo el equipo' }, ...empleados.map((e) => ({ value: e, label: e }))]} />
      </div>

      <p className="mt-3 text-xs text-paper-dim">{shown.length} de {activeCount} · haz clic en una propuesta para ver el detalle y las respuestas.</p>

      {/* Lista */}
      <div className="mt-2 overflow-hidden rounded-2xl border border-line">
        <div className="hidden grid-cols-[1.7fr_0.95fr_1fr_0.7fr_1.05fr] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim sm:grid">
          <span>Destinatario</span><span>Creó</span><span>Estado</span><span>Fecha</span><span>Respuestas</span>
        </div>
        {shown.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-paper-dim">{loading ? 'Cargando propuestas…' : 'No hay propuestas que coincidan con el filtro.'}</p>
        )}
        {shown.map((p) => {
          const st = STATE_META[stateOf(p)];
          const d = daysLeft(p);
          const fs = feedbackSummary(p._feedback);
          const opened = !!p._reg;
          return (
            <div key={p.id} role="button" tabIndex={0} onClick={() => setSel(p.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSel(p.id); }}
              className="flex cursor-pointer flex-col gap-2 border-b border-line px-4 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04] sm:grid sm:grid-cols-[1.7fr_0.95fr_1fr_0.7fr_1.05fr] sm:items-center sm:gap-3 sm:px-5">
              <span className="min-w-0">
                <span className="block truncate font-medium text-paper">{p.recipient?.name || 'Sin destinatario'}</span>
                <span className="block truncate text-[11px] text-paper-dim">
                  <span className="font-mono text-paper-mute">{p.code}</span>
                  {p.recipient?.email ? ` · ${p.recipient.email}` : ''}
                  {p.model?.name ? ` · ${p.model.name}` : ''}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-paper-mute">
                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Creó</span>
                <span className="truncate">{p.createdBy || '—'}</span>
              </span>
              <span className="flex items-start gap-2 sm:flex-col sm:gap-1">
                <span className="w-24 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Estado</span>
                <span className="flex flex-col gap-1">
                  <StatusDot tone={st.tone}>{st.label}</StatusDot>
                  {stateOf(p) !== 'borrador' && d !== null && (
                    d < 0 ? <span className="text-[11px] text-paper-dim">venció hace {Math.abs(d)}d</span>
                      : <span className="text-[11px] text-paper-dim">{d === 0 ? 'vence hoy' : `${d}d restantes`}</span>
                  )}
                  {p.approval && (
                    p.approval.status === 'approved'
                      ? <span className="text-[11px] font-medium text-emerald-300/90">✓ aprobada</span>
                      : p.approval.status === 'rejected'
                        ? <span className="text-[11px] font-medium text-rose-300/90">rechazada</span>
                        : <span className="text-[11px] font-medium text-amber-300/90">pend. aprobación</span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2 tabular-nums text-paper-mute">
                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Fecha</span>
                <span className="min-w-0 truncate">{fmtFecha(p.createdAt) || '—'}</span>
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Respuestas</span>
                {fs.total === 0 ? (
                  p._progress && p._progress.decided > 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-300/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> va {p._progress.decided}/{p._progress.total}
                    </span>
                  ) : (
                    <span className="text-paper-dim">Sin respuestas</span>
                  )
                ) : (
                  <>
                    {fs.liked > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><Heart size={12} className="text-emerald-400" /> {fs.liked}</span>}
                    {fs.rejected > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><ThumbsDown size={12} className="text-rose-400" /> {fs.rejected}</span>}
                    {fs.comments > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><MessageSquare size={12} className="text-paper-dim" /> {fs.comments}</span>}
                  </>
                )}
                {(opened || (p._progress && p._progress.decided > 0)) && <StatusDot tone="ok">abrió</StatusDot>}
              </span>
            </div>
          );
        })}
      </div>
      </>
      )}

      {empSel && (
        <EmpleadoExpediente
          name={empSel}
          props={all.filter((p) => (p.createdBy || '') === empSel)}
          origin={origin}
          onOpenProp={(id) => setSel(id)}
          onClose={() => setEmpSel(null)}
        />
      )}

      {selProp && (
        <PropDetail
          key={selProp.id}
          p={selProp}
          archived={isArch(selProp)}
          link={linkFor(selProp)}
          copied={copied === selProp.code}
          onCopy={() => copyLink(selProp)}
          mailHref={mailHref(selProp)}
          onArchive={() => toggleArchive(selProp)}
          onApprove={() => approveInternal(selProp)}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}

// ── Detalle en drawer lateral ──────────────────────────────────────────────
function PropDetail({ p, archived, link, copied, onCopy, mailHref, onArchive, onApprove, onClose }) {
  const [approving, setApproving] = useState(false);
  const st = STATE_META[stateOf(p)];
  const d = daysLeft(p);
  const items = Array.isArray(p._feedback?.items) ? p._feedback.items : [];
  const fs = feedbackSummary(p._feedback);
  // Feedback del EQUIPO (interno) — bucket aparte del de la creadora.
  const internalItems = (Array.isArray(p._internalFeedback?.items) ? p._internalFeedback.items : [])
    .filter((i) => i.status || (i.note || '').trim());

  // Filtro de respuestas + orden: SIEMPRE primero lo rechazado, luego lo que
  // gustó, luego lo sin decidir. Los contadores de arriba son los filtros.
  const [fResp, setFResp] = useState('all'); // all | rejected | liked | commented
  const [lightbox, setLightbox] = useState(null); // { items, i } — foto grande del feedback
  const [resendState, setResendState] = useState(''); // '' | sending | sent | error
  const [resendMsg, setResendMsg] = useState('');

  // Reenviar la propuesta por correo con 1 clic (proposal-invite: a una cuenta
  // existente le manda su propuesta; a una nueva, la invitación). Resuelve el
  // correo por su id si la propuesta no lo trae (creadora activa).
  const resend = async () => {
    if (resendState === 'sending' || !p.code) return;
    setResendState('sending'); setResendMsg('');
    try {
      let email = (p.recipient?.email || '').trim();
      if (!email && p.recipient?.userId) {
        const { data: cp } = await getSupabase().from('profiles').select('email').eq('id', p.recipient.userId).maybeSingle();
        email = (cp?.email || '').trim();
      }
      if (!email) throw new Error('Sin correo en su ficha — usa «Copiar link».');
      const { data, error } = await getSupabase().functions.invoke('proposal-invite', {
        body: { link_id: p.code, email, full_name: p.recipient?.name || '', lang: 'es' },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'No se pudo reenviar.');
      setResendState('sent');
    } catch (e) {
      setResendState('error'); setResendMsg(e?.message || 'No se pudo reenviar.');
    }
  };
  const rank = (i) => (i.status === 'rejected' ? 0 : i.status === 'liked' ? 1 : 2);
  const sortedItems = [...items].sort((a, b) => rank(a) - rank(b));
  const matchResp = (i) =>
    fResp === 'all' ? true
    : fResp === 'rejected' ? i.status === 'rejected'
    : fResp === 'liked' ? i.status === 'liked'
    : (i.note || '').trim() !== '';
  const visibleItems = sortedItems.filter(matchResp);

  // Recordatorio manual ("Recordar ahora"): solo si hay algo pendiente —
  // aprobación pendiente, o la creadora ya la tiene y no ha respondido.
  const approvalPending = p.approval?.status === 'pending';
  const responsePending = !p._internal && !archived && !p.deliveredAt
    && (!p.approval || p.approval.status === 'approved')
    && fs.total === 0 && !!p.recipient?.email && stateOf(p) !== 'borrador';
  const reminderKind = approvalPending ? 'approval' : responsePending ? 'response' : null;
  const [remindState, setRemindState] = useState(''); // '' | sending | sent | error
  // Historial de recordatorios (cuántos se enviaron, cuándo) + pausa manual.
  const remInfo = (reminderKind && p._reminders?.[reminderKind])
    || p._reminders?.response || p._reminders?.approval || null;
  // A QUIÉN se le manda el recordatorio: aprobación → quien aprueba; respuesta →
  // la creadora (correo del receptor). Para "llevar el control de los contactos".
  const remIsApproval = !!(remInfo && p._reminders?.approval && remInfo === p._reminders.approval);
  const remContact = remInfo
    ? (remIsApproval ? (p.approval?.approver || '') : (p.recipient?.email || p.recipient?.name || ''))
    : '';
  const [pausedLocal, setPausedLocal] = useState(null); // null = lo que diga la DB
  const isPaused = pausedLocal ?? !!remInfo?.paused;
  const [pauseBusy, setPauseBusy] = useState(false);
  async function togglePause() {
    if (!reminderKind || pauseBusy) return;
    setPauseBusy(true);
    try {
      const { data, error } = await getSupabase().functions.invoke('proposal-reminders', { body: { action: 'set_pause', proposal_id: p.id, kind: reminderKind, paused: !isPaused } });
      let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = null; } }
      if (!out?.ok) throw new Error();
      setPausedLocal(!isPaused);
    } catch {}
    setPauseBusy(false);
  }
  async function doRemind() {
    if (!reminderKind || remindState === 'sending') return;
    setRemindState('sending');
    try {
      const { data, error } = await getSupabase().functions.invoke('proposal-reminders', { body: { action: 'nudge', proposal_id: p.id, kind: reminderKind } });
      let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = null; } }
      if (!out?.ok) throw new Error(out?.error || 'error');
      setRemindState('sent');
    } catch { setRemindState('error'); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-l border-line bg-card shadow-glow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Send size={15} className="text-brand" />
              <StatusDot tone={st.tone}>{st.label}</StatusDot>
              {archived && <StatusDot tone="zinc">Archivada</StatusDot>}
            </div>
            <h3 className="mt-2 truncate font-display text-lg font-semibold text-paper">{p.name || 'Propuesta'}</h3>
            <p className="mt-0.5 truncate text-sm text-paper-mute">{p.subtitle || ''}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-paper-dim hover:text-paper"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Ficha */}
          <div className="grid gap-3 rounded-2xl border border-line bg-ink-2/40 p-4 text-sm">
            <Row label="Destinatario" value={<span>{p.recipient?.name || '—'}{p.recipient?.email ? <span className="text-paper-dim"> · {p.recipient.email}</span> : null}</span>} />
            <Row label="Creada por" value={p.createdBy || '—'} />
            <Row label="Fecha" value={fmtFecha(p.createdAt) || '—'} />
            {p.model?.name && <Row label="Modelo" value={<span>{p.model.name}{p.model?.agency ? <span className="text-paper-dim"> · {p.model.agency}</span> : null}</span>} />}
            <Row label="Código" value={<span className="font-mono text-xs">{p.code}</span>} />
            <Row label="Vencimiento" value={stateOf(p) === 'borrador' || d === null ? '—'
              : d < 0 ? <span className="text-paper-dim">venció hace {Math.abs(d)}d</span>
              : <span>{d === 0 ? 'vence hoy' : `${d} días restantes`}</span>} />
            <Row label="Abrió / registró" value={p._reg
              ? <StatusDot tone="ok">{p._reg.name || p._reg.email || 'sí'}{p._reg.at ? ` · ${new Date(p._reg.at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}` : ''}</StatusDot>
              : <span className="text-paper-dim">todavía no</span>} />
            {p._reg && (
              <Row label="Registro" value={
                <span className="text-paper-mute">
                  {p._reg.name || '—'}
                  {p._reg.email ? <span className="text-paper-dim"> · {p._reg.email}</span> : null}
                  {p._reg.phone ? <span className="inline-flex items-center gap-1 text-paper-dim"> · <Phone size={11} className="inline" />{p._reg.phone}</span> : null}
                </span>
              } />
            )}
            {p._internal && (
              <Row label="Tipo" value={<StatusDot tone="brand">Interna (equipo)</StatusDot>} />
            )}
            {p._internal && (p.recipient?.name || p.recipient?.instagram) && (
              <Row label="Para (modelo)" value={
                <span>{p.recipient.name || '—'}{p.recipient.instagram ? <span className="text-paper-dim"> · {p.recipient.instagram}</span> : null}</span>
              } />
            )}
            {p.approval && (
              <Row label={p._internal ? 'Revisión interna' : 'Aprobación'} value={
                <span>
                  {p.approval.status === 'approved'
                    ? <StatusDot tone="ok">Aprobada</StatusDot>
                    : p.approval.status === 'rejected'
                      ? <StatusDot tone="bad">Rechazada</StatusDot>
                      : <StatusDot tone="warn">Pendiente</StatusDot>}
                  {p.approval.reviewer
                    ? <span className="text-paper-dim"> · {p.approval.reviewer}</span>
                    : p.approval.approver ? <span className="text-paper-dim"> · {p.approval.approver}</span> : null}
                  {p.approval.reason
                    ? <span className="mt-1 block text-[12px] italic text-rose-200/80">&ldquo;{p.approval.reason}&rdquo;</span> : null}
                </span>
              } />
            )}
            {p._internal && p.reviewers?.length > 0 && (
              <Row label="Revisan (equipo)" value={
                <span className="flex flex-wrap gap-1.5">
                  {p.reviewers.map((r, i) => (
                    <span key={r.id || i} className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">{r.name || 'Revisor'}</span>
                  ))}
                </span>
              } />
            )}
            {/* Historial de recordatorios + pausa manual ("pararlo si hace falta") */}
            {!p._demo && (reminderKind || remInfo) && (
              <Row label="Recordatorios" value={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-paper-mute">
                    {(remInfo?.count ?? 0) === 0 ? 'ninguno todavía' : `${remInfo.count} enviado${remInfo.count === 1 ? '' : 's'}`}
                    {remInfo?.last_sent_at ? <span className="text-paper-dim"> · último {new Date(remInfo.last_sent_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</span> : null}
                    {remContact && (remInfo?.count ?? 0) > 0 ? <span className="text-paper-dim"> · a {remContact}</span> : null}
                  </span>
                  {isPaused && <StatusDot tone="zinc">parados a mano</StatusDot>}
                  {reminderKind && (
                    <button onClick={togglePause} disabled={pauseBusy}
                      title={isPaused ? 'Reanudar los recordatorios automáticos' : 'Parar los recordatorios automáticos de esta propuesta'}
                      className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-paper-mute transition-colors hover:text-paper disabled:opacity-50">
                      {pauseBusy ? '…' : isPaused ? 'Reanudar' : 'Parar'}
                    </button>
                  )}
                </span>
              } />
            )}
          </div>

          {/* Acciones */}
          <div className="mt-4 flex flex-wrap gap-2">
            {!p._demo && reminderKind && (
              <button onClick={doRemind} disabled={remindState === 'sending'}
                title={reminderKind === 'approval' ? 'Recordar a quien tiene que aprobar' : 'Recordar a la creadora que le falta responder'}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
                  remindState === 'sent' ? 'bg-emerald-500 text-white' : remindState === 'error' ? 'border border-rose-500/40 text-rose-300' : 'btn3d'}`}>
                {remindState === 'sent' ? <><Check size={14} /> Recordatorio enviado</>
                  : remindState === 'sending' ? <><Bell size={14} className="animate-pulse" /> Enviando…</>
                  : remindState === 'error' ? <><Bell size={14} /> Reintentar</>
                  : <><Bell size={14} /> Recordar ahora</>}
              </button>
            )}
            {!p._demo && p._internal && p.approval?.status === 'pending' && (
              <button onClick={async () => { setApproving(true); try { await onApprove?.(); } finally { setApproving(false); } }} disabled={approving}
                title="Aprobar esta propuesta interna (la decide el dueño/admin) y habilitar el envío a la creadora"
                className="btn3d inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold disabled:opacity-60">
                {approving ? 'Aprobando…' : <><Check size={14} /> Aprobar (equipo)</>}
              </button>
            )}
            {!p._demo && p._internal && p.approval?.status === 'approved' && (
              <a href={`/propuestas?edit=${encodeURIComponent(p.code)}&tocreator=1`}
                className="btn3d inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
                <Send size={14} /> Enviar a la creadora
              </a>
            )}
            <a href={`${link}${link.includes('?') ? '&' : '?'}preview=1`} target="_blank" rel="noopener noreferrer"
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
              <ExternalLink size={14} /> Ver como cliente
            </a>
            {!p._demo && !p._internal && (
              <a href={`${link}${link.includes('?') ? '&' : '?'}asmodel=1`} target="_blank" rel="noopener noreferrer"
                title="Entrar a la propuesta COMO la modelo y completarla — lo que marques se guarda como SU respuesta"
                className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold text-brand">
                <UserCheck size={14} /> Entrar como la modelo
              </a>
            )}
            {!p._demo && (
              <a href={`/propuestas?edit=${encodeURIComponent(p.code)}`}
                className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
                <Pencil size={14} /> Editar
              </a>
            )}
            <button onClick={onCopy}
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
              {copied ? <><Check size={14} className="text-emerald-400" /> Copiado</> : <><Copy size={14} /> Copiar link</>}
            </button>
            {!p._demo && !p._internal && (
              <button onClick={resend} disabled={resendState === 'sending' || resendState === 'sent'}
                className={`btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${resendState === 'sent' ? 'text-emerald-300' : resendState === 'error' ? 'text-rose-300' : ''}`}>
                {resendState === 'sent' ? <><Check size={14} /> Reenviada</>
                  : resendState === 'sending' ? <><Mail size={14} className="animate-pulse" /> Enviando…</>
                  : resendState === 'error' ? <><Mail size={14} /> Reintentar</>
                  : <><Mail size={14} /> Reenviar por correo</>}
              </button>
            )}
            <button onClick={onArchive}
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
              <Archive size={14} /> {archived ? 'Desarchivar' : 'Archivar'}
            </button>
          </div>
          {resendState === 'sent' && <p className="mt-2 text-[12px] text-emerald-300/90">Reenviada por correo a {p.recipient?.name || 'la creadora'}.</p>}
          {resendState === 'error' && resendMsg && <p className="mt-2 text-[12px] text-rose-300">{resendMsg}</p>}

          {/* Feedback del EQUIPO (interno) — separado del de la creadora. */}
          {(p._internal || internalItems.length > 0) && (
            <div className="mt-6">
              <h4 className="font-display text-sm font-semibold text-paper">Feedback del equipo <span className="font-normal text-paper-dim">· interno</span></h4>
              {internalItems.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-5 text-center text-sm text-paper-dim">
                  {p.approval?.status === 'pending' ? 'En revisión — el equipo todavía no dejó feedback.' : 'Sin feedback del equipo.'}
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {[...internalItems].sort((a, b) => (a.status === 'rejected' ? 0 : a.status === 'liked' ? 1 : 2) - (b.status === 'rejected' ? 0 : b.status === 'liked' ? 1 : 2)).map((it, i, arr) => {
                    const tone = it.status === 'liked' ? 'ok' : it.status === 'rejected' ? 'bad' : 'zinc';
                    const lbl = it.status === 'liked' ? 'Va' : it.status === 'rejected' ? 'Recrear' : 'Nota';
                    return (
                      <div key={`int-${it.id}`} className={`flex gap-3 rounded-xl border bg-ink-2/30 p-2.5 ${it.status === 'rejected' ? 'border-rose-500/40' : 'border-line'}`}>
                        {it.result ? (
                          <button type="button" onClick={() => setLightbox({ items: arr, i })}
                            className="group relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-hair/10 ring-1 ring-inset ring-white/5 transition hover:ring-brand/60"
                            title="Ver grande">
                            <img src={it.result} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.06]" />
                            <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><Maximize2 size={14} className="text-white" /></span>
                          </button>
                        ) : (
                          <div className="h-16 w-14 shrink-0 rounded-lg bg-hair/10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-paper">{it.caption || 'Sin título'}</span>
                            <StatusDot tone={tone}>{lbl}</StatusDot>
                          </div>
                          {(it.note || '').trim() && (
                            <p className="mt-1 flex items-start gap-1.5 text-xs text-paper-mute">
                              <MessageSquare size={12} className="mt-0.5 shrink-0 text-paper-dim" /><span className="min-w-0">{it.note}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Respuestas de la CREADORA — rechazadas primero, luego gustadas.
              Los contadores son filtros clicables (tap para aislar cada tipo). */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h4 className="font-display text-sm font-semibold text-paper">Respuestas de la creadora</h4>
              {fs.total > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <RespChip active={fResp === 'all'} onClick={() => setFResp('all')}>Todas · {fs.total}</RespChip>
                  <RespChip active={fResp === 'rejected'} tone="bad" icon={ThumbsDown}
                    onClick={() => setFResp((f) => (f === 'rejected' ? 'all' : 'rejected'))}>{fs.rejected} rechazó</RespChip>
                  <RespChip active={fResp === 'liked'} tone="ok" icon={Heart}
                    onClick={() => setFResp((f) => (f === 'liked' ? 'all' : 'liked'))}>{fs.liked} le gustaron</RespChip>
                  <RespChip active={fResp === 'commented'} icon={MessageSquare}
                    onClick={() => setFResp((f) => (f === 'commented' ? 'all' : 'commented'))}>{fs.comments} comentó</RespChip>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-paper-dim">
                {stateOf(p) === 'borrador' ? 'Borrador — todavía no se publica ni recibe respuestas.' : 'El receptor aún no ha respondido.'}
              </p>
            ) : visibleItems.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-paper-dim">
                No hay respuestas de ese tipo. <button onClick={() => setFResp('all')} className="font-semibold text-brand hover:underline">Ver todas</button>
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {visibleItems.map((it, i) => {
                  const tone = it.status === 'liked' ? 'ok' : it.status === 'rejected' ? 'bad' : 'zinc';
                  const lbl = it.status === 'liked' ? 'Le gustó' : it.status === 'rejected' ? 'Rechazó' : 'Sin decidir';
                  return (
                    <div key={it.id} className={`flex gap-3 rounded-xl border bg-ink-2/30 p-2.5 ${it.status === 'rejected' ? 'border-rose-500/40' : 'border-line'}`}>
                      {it.result ? (
                        <button type="button" onClick={() => setLightbox({ items: visibleItems, i })}
                          className="group relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-hair/10 ring-1 ring-inset ring-white/5 transition hover:ring-brand/60"
                          title="Ver grande">
                          <img src={it.result} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.06]" />
                          <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><Maximize2 size={14} className="text-white" /></span>
                        </button>
                      ) : (
                        <div className="h-16 w-14 shrink-0 rounded-lg bg-hair/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-paper">{it.caption || 'Sin título'}</span>
                          <StatusDot tone={tone}>{lbl}</StatusDot>
                        </div>
                        {(it.note || '').trim() && (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-paper-mute">
                            <MessageSquare size={12} className="mt-0.5 shrink-0 text-paper-dim" />
                            <span className="min-w-0">{it.note}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lightbox — foto grande del feedback (ver bien qué le gustó / rechazó). */}
          {lightbox && (() => {
            const list = lightbox.items || [];
            const cur = list[lightbox.i];
            if (!cur) return null;
            const tone = cur.status === 'liked' ? 'ok' : cur.status === 'rejected' ? 'bad' : 'zinc';
            const lbl = cur.status === 'liked' ? 'Le gustó' : cur.status === 'rejected' ? 'Rechazó' : 'Sin decidir';
            const go = (d) => setLightbox((lb) => ({ items: lb.items, i: (lb.i + d + list.length) % list.length }));
            return (
              <div className="fixed inset-0 z-[90] flex flex-col bg-ink/92 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>
                <div className="flex items-center justify-between gap-3 px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <StatusDot tone={tone}>{lbl}</StatusDot>
                    <span className="truncate text-sm text-paper-mute">{cur.caption || 'Sin título'}</span>
                    {list.length > 1 && <span className="shrink-0 text-[11px] text-paper-dim">{lightbox.i + 1}/{list.length}</span>}
                  </span>
                  <button onClick={() => setLightbox(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={18} /></button>
                </div>
                <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-2">
                  {list.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); go(-1); }} title="Anterior" className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-ink/70 text-paper-mute transition-colors hover:text-paper"><ChevronLeft size={20} /></button>
                  )}
                  {cur.result ? <img onClick={(e) => e.stopPropagation()} src={cur.result} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-glow-sm" /> : null}
                  {list.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); go(1); }} title="Siguiente" className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-ink/70 text-paper-mute transition-colors hover:text-paper"><ChevronRight size={20} /></button>
                  )}
                </div>
                {(cur.note || '').trim() ? (
                  <div className="px-5 pb-5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <p className="mx-auto flex max-w-xl items-start gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-paper-mute">
                      <MessageSquare size={14} className="mt-0.5 shrink-0 text-paper-dim" /><span className="min-w-0">{cur.note}</span>
                    </p>
                  </div>
                ) : <div className="pb-4" />}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Expediente de empleado (pantalla completa) ──────────────────────────────
// "Entrar y ver qué hizo Isabel": todo lo de una persona en una vista amplia —
// totales por estado, respuestas recibidas de las creadoras, su historial
// cronológico y la lista de sus propuestas (cada una abre el detalle completo).
const EVENT_META = {
  created:   { dot: 'bg-brand' },
  approved:  { dot: 'bg-emerald-400' },
  rejected:  { dot: 'bg-rose-400' },
  opened:    { dot: 'bg-sky-400' },
  unfinished:{ dot: 'bg-rose-400' },
  responded: { dot: 'bg-amber-400' },
  delivered: { dot: 'bg-emerald-300' },
};

// Un renglón del feed de actividad: quién hizo qué, a quién.
function eventLine(e) {
  const to = e.p.recipient?.name || 'destinatario';
  const who = e.p.createdBy || 'Equipo';
  const rev = e.p.approval?.reviewer || e.p.approval?.approver || '';
  if (e.kind === 'created') return <><b className="font-medium text-paper">{who}</b> armó una propuesta para <b className="font-medium text-paper">{to}</b></>;
  if (e.kind === 'approved') return <><b className="font-medium text-paper">{rev || 'Alguien'}</b> aprobó · {to}</>;
  if (e.kind === 'rejected') return <><b className="font-medium text-paper">{rev || 'Alguien'}</b> rechazó · {to}</>;
  if (e.kind === 'responded') { const f = feedbackSummary(e.p._feedback); return <><b className="font-medium text-paper">{to}</b> respondió · {f.liked} ♥ · {f.rejected} ✕</>; }
  if (e.kind === 'opened') return <><b className="font-medium text-paper">{to}</b> abrió el link</>;
  if (e.kind === 'unfinished') { const pr = e.p._progress; const va = pr && pr.total ? ` · va ${pr.decided}/${pr.total}` : ''; return <><b className="font-medium text-paper">{to}</b> abrió · <span className="text-rose-300">no terminó</span>{va}</>; }
  if (e.kind === 'delivered') return <>Entregada a <b className="font-medium text-paper">{to}</b></>;
  return null;
}

// Tarjeta de una métrica del día (número grande + tendencia vs ayer). Clicable:
// filtra la actividad de abajo por ese tipo (quiénes lo hicieron).
function DayStat({ label, hint, today, yesterday, prevLabel = 'ayer', onClick, active }) {
  const delta = today - yesterday;
  const up = delta > 0, down = delta < 0;
  return (
    <button type="button" onClick={onClick} title={hint || undefined}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? 'border-brand/60 bg-brand/10' : 'border-line bg-card hover:border-brand/40'}`}>
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-3xl font-bold leading-none tabular-nums ${active ? 'text-brand' : 'text-paper'}`}>{today}</span>
        <span className={`text-[11px] font-semibold ${up ? 'text-emerald-300' : down ? 'text-rose-300' : 'text-paper-dim'}`}>
          {up ? `↑${delta}` : down ? `↓${Math.abs(delta)}` : '='}
        </span>
      </div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-paper-dim">{label}</div>
      <div className="text-[10px] text-paper-dim">{prevLabel} {yesterday}</div>
    </button>
  );
}

function Tile({ label, value, tone }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : tone === 'warn' ? 'text-amber-300' : 'text-paper';
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <div className={`font-display text-2xl font-bold leading-none tabular-nums ${color}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-paper-dim">{label}</div>
    </div>
  );
}

function EmpleadoExpediente({ name, props, origin, onOpenProp, onClose }) {
  const stats = useMemo(() => {
    const s = { total: props.length, active: 0, archived: 0, publicadas: 0, vencidas: 0, borradores: 0, pend: 0, aprob: 0, rech: 0, abiertas: 0, liked: 0, rejected: 0, comments: 0 };
    props.forEach((p) => {
      if (p._status === 'archived') { s.archived += 1; return; }
      s.active += 1;
      const st = stateOf(p);
      if (st === 'vencida') s.vencidas += 1;
      else if (st === 'borrador') s.borradores += 1;
      else s.publicadas += 1;
      if (p.approval?.status === 'pending') s.pend += 1;
      else if (p.approval?.status === 'approved') s.aprob += 1;
      else if (p.approval?.status === 'rejected') s.rech += 1;
      if (p._reg) s.abiertas += 1;
      const fs = feedbackSummary(p._feedback);
      s.liked += fs.liked; s.rejected += fs.rejected; s.comments += fs.comments;
    });
    return s;
  }, [props]);

  const sorted = useMemo(
    () => [...props].sort((a, b) => new Date(b.createdAt || b.expiresAt || 0) - new Date(a.createdAt || a.expiresAt || 0)),
    [props],
  );

  const timeline = useMemo(() => {
    const ev = [];
    props.forEach((p) => {
      if (p.createdAt) ev.push({ at: p.createdAt, kind: 'created', p });
      if (p.approval && p.approvedAt && (p.approval.status === 'approved' || p.approval.status === 'rejected'))
        ev.push({ at: p.approvedAt, kind: p.approval.status, p });
      if (p._reg?.at) ev.push({ at: p._reg.at, kind: 'opened', p });
      if (p._feedback?.updatedAt && (p._feedback.items || []).some((i) => i.status || (i.note || '').trim()))
        ev.push({ at: p._feedback.updatedAt, kind: 'responded', p });
    });
    return ev.filter((e) => e.at).sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [props]);

  const primera = sorted.length ? sorted[sorted.length - 1].createdAt : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <button onClick={onClose} className="btn3d-ghost inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold">
          <ChevronDown size={16} className="rotate-90" /> Volver a Propuestas
        </button>

        {/* Título */}
        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <h2 className="font-display text-2xl font-bold text-paper sm:text-3xl">{name}</h2>
          <span className="font-display text-3xl font-bold leading-none tabular-nums text-brand">{stats.total}</span>
          <span className="pb-1 text-sm text-paper-mute">propuestas armadas</span>
        </div>
        <p className="mt-1 text-xs text-paper-dim">
          {stats.active} activas{stats.archived ? ` · ${stats.archived} archivadas` : ''}{primera ? ` · desde ${fmtFecha(primera)}` : ''}
        </p>

        {/* Estados desglosados */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Tile label="Publicadas" value={stats.publicadas} />
          <Tile label="Pend. aprob." value={stats.pend} tone="warn" />
          <Tile label="Aprobadas" value={stats.aprob} tone="ok" />
          <Tile label="Rechazadas" value={stats.rech} tone="bad" />
          <Tile label="Vencidas" value={stats.vencidas} />
          <Tile label="Abrieron" value={stats.abiertas} tone="ok" />
        </div>

        {/* Respuestas recibidas de las creadoras */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-card px-5 py-3.5 text-sm">
          <span className="text-xs uppercase tracking-wider text-paper-dim">Respuestas recibidas</span>
          <span className="inline-flex items-center gap-1.5 text-paper"><Heart size={14} className="text-emerald-400" /> {stats.liked} le gustaron</span>
          <span className="inline-flex items-center gap-1.5 text-paper"><ThumbsDown size={14} className="text-rose-400" /> {stats.rejected} rechazó</span>
          <span className="inline-flex items-center gap-1.5 text-paper"><MessageSquare size={14} className="text-paper-dim" /> {stats.comments} comentarios</span>
        </div>

        {/* Dos columnas: sus propuestas + historial */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <h3 className="mb-2.5 font-display text-sm font-semibold text-paper">Sus propuestas <span className="font-normal text-paper-dim">· {sorted.length}</span></h3>
            <div className="space-y-2">
              {sorted.length === 0 && <p className="rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-paper-dim">Sin propuestas.</p>}
              {sorted.map((p) => {
                const st = STATE_META[stateOf(p)];
                const fs = feedbackSummary(p._feedback);
                const who = p.approval?.reviewer || p.approval?.approver || '';
                return (
                  <button key={p.id} type="button" onClick={() => onOpenProp(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left transition-colors hover:border-brand/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-paper">{p.recipient?.name || 'Sin destinatario'}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-paper-dim">
                        <span className="font-mono">{p.code}</span>
                        <span>· {fmtFecha(p.createdAt) || '—'}</span>
                        {p.model?.name ? <span>· {p.model.name}</span> : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusDot tone={st.tone}>{st.label}</StatusDot>
                      {p.approval && (
                        p.approval.status === 'approved'
                          ? <span className="text-[11px] font-medium text-emerald-300/90">✓ aprobada{who ? ` · ${who}` : ''}</span>
                          : p.approval.status === 'rejected'
                            ? <span className="text-[11px] font-medium text-rose-300/90">rechazada{who ? ` · ${who}` : ''}</span>
                            : <span className="text-[11px] font-medium text-amber-300/90">pend. aprob.{who ? ` · ${who}` : ''}</span>
                      )}
                      {fs.total > 0 ? (
                        <span className="flex items-center gap-2 text-[11px] text-paper-mute">
                          {fs.liked > 0 && <span className="inline-flex items-center gap-0.5"><Heart size={11} className="text-emerald-400" />{fs.liked}</span>}
                          {fs.rejected > 0 && <span className="inline-flex items-center gap-0.5"><ThumbsDown size={11} className="text-rose-400" />{fs.rejected}</span>}
                          {p._reg && <StatusDot tone="ok">abrió</StatusDot>}
                        </span>
                      ) : p._progress && p._progress.decided > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300/90">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> va {p._progress.decided}/{p._progress.total}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2.5 font-display text-sm font-semibold text-paper">Historial</h3>
            {timeline.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-paper-dim">Sin actividad todavía.</p>
            ) : (
              <ol className="relative ml-1 space-y-3 border-l border-line pl-4">
                {timeline.map((e, i) => {
                  const meta = EVENT_META[e.kind] || EVENT_META.created;
                  const who = e.p.recipient?.name || 'el receptor';
                  const label =
                    e.kind === 'created' ? <>Creó la propuesta para <b className="font-medium text-paper">{who}</b></>
                    : e.kind === 'approved' ? <>Aprobada{e.p.approval?.reviewer ? <> por {e.p.approval.reviewer}</> : ''}</>
                    : e.kind === 'rejected' ? <>Rechazada{e.p.approval?.reviewer ? <> por {e.p.approval.reviewer}</> : ''}</>
                    : e.kind === 'opened' ? <><b className="font-medium text-paper">{who}</b> abrió / se registró</>
                    : <><b className="font-medium text-paper">{who}</b> respondió</>;
                  return (
                    <li key={`${e.p.id}-${e.kind}-${i}`} className="relative">
                      <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-ink ${meta.dot}`} />
                      <button type="button" onClick={() => onOpenProp(e.p.id)} className="block w-full text-left">
                        <span className="text-sm text-paper-mute">{label}</span>
                        <span className="mt-0.5 block text-[11px] text-paper-dim">{fmtFecha(e.at) || ''} · {e.p.name || e.p.code}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs uppercase tracking-wider text-paper-dim">{label}</span>
      <span className="min-w-0 text-right text-paper">{value}</span>
    </div>
  );
}

// Chip-filtro de respuestas (le gustaron / rechazó / comentó). Activo = resaltado.
function RespChip({ active, tone, icon: Icon, onClick, children }) {
  const iconColor = tone === 'bad' ? 'text-rose-400' : tone === 'ok' ? 'text-emerald-400' : 'text-paper-dim';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active ? 'border-brand/60 bg-brand/15 text-paper' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'
      }`}
    >
      {Icon && <Icon size={12} className={iconColor} />} {children}
    </button>
  );
}

// Selector compacto nativo estilizado — sin pills tinturadas.
function FilterSelect({ icon: Icon, value, onChange, options }) {
  return (
    <div className="relative inline-flex items-center">
      {Icon && <Icon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full border border-line bg-card py-2 pr-8 text-sm text-paper-mute outline-none transition-colors hover:border-brand/40 focus:border-brand/60 ${Icon ? 'pl-8' : 'pl-3.5'}`}>
        {options.map((o) => <option key={o.value} value={o.value} className="bg-ink text-paper">{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
    </div>
  );
}
