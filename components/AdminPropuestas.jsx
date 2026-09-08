'use client';

// ─────────────────────────────────────────────────────────────────────────
// AdminPropuestas — vista de SUPERVISIÓN del dueño (/admin › Propuestas).
//
// El dueño ve TODAS las propuestas de fotos que arma el equipo: a quién van,
// quién las armó, en qué estado están, cuándo vencen y qué respondió el
// receptor (le gustó / rechazó / comentó / abrió).
//
// HONESTO: hoy el backend real no existe. Las propuestas viven en el
// localStorage del navegador (las publica el wizard en /propuestas).
// Por eso, además de las reales que encuentre, SEMBRAMOS unas de ejemplo
// (solo en memoria — NO se escriben a localStorage) para que el dueño vea la
// vista completa aunque todavía no haya publicado nada. Cuando llegue el
// backend, se cambia el origen de datos por una query y listo.
//
// Claves en localStorage:
//   'ls_prop_<CODE>'      → la propuesta (shape v1)
//   'ls_prop_fb_<CODE>'   → feedback del receptor {items:[{id,caption,result,status,note}]}
//   'ls_prop_reg_<CODE>'  → registro del receptor {name,email,at} (abrió/creó cuenta)
//   'ls_prop_last'        → último code publicado (NO es una propuesta)
//   'ls_prop_arch'        → array de codes archivados (persistente para reales)
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Send, Search, SlidersHorizontal, Copy, Check, Mail, Archive, ExternalLink, X, Heart, ThumbsDown, MessageSquare, UserCheck, ChevronDown, Inbox } from 'lucide-react';
import StatusDot from '@/components/StatusDot';

const ARCH_KEY = 'ls_prop_arch';
const LAST_KEY = 'ls_prop_last';
const DRAFT_KEY = 'ls_propuesta_draft';

// Estado derivado de una propuesta: borrador (solo demo), vencida (expiró) o publicada.
function stateOf(p) {
  if (p._draft) return 'borrador';
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

// ── Demo seed (SOLO en memoria — nunca se escribe a localStorage) ──────────
// Propuestas variadas: distintos empleados, modelos, estados y respuestas.
function demoSeed() {
  const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const img = (id) => `https://images.unsplash.com/${id}?w=400&q=70&auto=format&fit=crop`;
  return [
    {
      _demo: true, v: 1, code: 'JP-7K2M9A', lang: 'es',
      name: 'Sesión exclusiva — Valentina', subtitle: 'Un look que no se repite',
      createdBy: 'Isabel Tuiran', days: 10, expiresAt: iso(6),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Valentina Cruz', email: 'valentina@example.com', kind: 'prospect' },
      _feedback: { items: [
        { id: 'a1', caption: 'Editorial en azotea', result: img('photo-1524504388940-b1c1722653e1'), status: 'liked', note: 'Me encanta esta, la quiero primero.' },
        { id: 'a2', caption: 'Retrato natural', result: img('photo-1494790108377-be9c29b29330'), status: 'liked', note: '' },
        { id: 'a3', caption: 'Full body noche', result: img('photo-1517841905240-472988babdf9'), status: 'rejected', note: 'Esta pose no me convence.' },
      ] },
      _reg: { name: 'Valentina Cruz', email: 'valentina@example.com', at: iso(-1) },
    },
    {
      _demo: true, v: 1, code: 'JP-3X8Q1B', lang: 'en',
      name: 'Your first drop — Monica', subtitle: 'Fire your photographer',
      createdBy: 'David Aunta', days: 7, expiresAt: iso(2),
      model: { name: 'Monica Rivas', agency: 'Kash Agency' },
      recipient: { name: 'Chris Bennett', email: 'chris@example.com', kind: 'client' },
      _feedback: { items: [
        { id: 'b1', caption: 'Beach golden hour', result: img('photo-1502823403499-6ccfcf4fb453'), status: 'liked', note: 'Perfect.' },
        { id: 'b2', caption: 'Studio minimal', result: img('photo-1488426862026-3ee34a7d66df'), status: null, note: '' },
      ] },
      _reg: null,
    },
    {
      _demo: true, v: 1, code: 'JP-9F4L2C', lang: 'es',
      name: 'Propuesta — Monica Rivas', subtitle: 'Contenido premium listo',
      createdBy: 'Lizeth Jerez', days: 14, expiresAt: iso(-3), // vencida
      model: { name: 'Monica Rivas', agency: 'Kash Agency' },
      recipient: { name: 'Laura Méndez', email: 'laura.mendez@example.com', kind: 'prospect' },
      _feedback: { items: [
        { id: 'c1', caption: 'Casual urbano', result: img('photo-1529626455594-4ff0802cfb7e'), status: 'liked', note: '' },
        { id: 'c2', caption: 'Vestido rojo', result: img('photo-1515886657613-9f3515b0c78f'), status: 'rejected', note: 'Cambiar color.' },
        { id: 'c3', caption: 'Primer plano', result: img('photo-1544005313-94ddf0286df2'), status: 'liked', note: 'Sí!' },
      ] },
      _reg: { name: 'Laura Méndez', email: 'laura.mendez@example.com', at: iso(-4) },
    },
    {
      _demo: true, _draft: true, v: 1, code: 'JP-5B6N3D', lang: 'es',
      name: 'Borrador — Julia Parker', subtitle: 'Sin publicar todavía',
      createdBy: 'Isabel Tuiran', days: 10, expiresAt: null,
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Sofía Ramírez', email: '', kind: 'prospect' },
      _feedback: null, _reg: null,
    },
    {
      _demo: true, v: 1, code: 'JP-1P0R7E', lang: 'pt',
      name: 'Proposta exclusiva — Julia', subtitle: 'Um ensaio só seu',
      createdBy: 'David Aunta', days: 10, expiresAt: iso(9),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Rafael Souza', email: 'rafael@example.com', kind: 'model' },
      _feedback: null, _reg: null,
    },
  ];
}

export default function AdminPropuestas() {
  const [real, setReal] = useState([]);        // propuestas reales de localStorage
  const [fbMap, setFbMap] = useState({});       // code → feedback (reales)
  const [regMap, setRegMap] = useState({});     // code → registro (reales)
  const [arch, setArch] = useState([]);         // codes archivados (persistente + demo en memoria)
  const [origin, setOrigin] = useState('');
  const [sel, setSel] = useState(null);         // code de la propuesta abierta en el drawer
  const [copied, setCopied] = useState('');

  // Filtros
  const [q, setQ] = useState('');
  const [fEmpleado, setFEmpleado] = useState('all');
  const [fEstado, setFEstado] = useState('all');
  const [fModelo, setFModelo] = useState('all');

  // Lectura de localStorage — solo en el cliente, con try/catch.
  useEffect(() => {
    try { setOrigin(window.location.origin); } catch {}
    const props = [];
    const fb = {};
    const reg = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('ls_prop_')) continue;
        if (key === LAST_KEY || key === DRAFT_KEY) continue;
        if (key.startsWith('ls_prop_fb_')) {
          const code = key.slice('ls_prop_fb_'.length);
          try { fb[code] = JSON.parse(localStorage.getItem(key)); } catch {}
          continue;
        }
        if (key.startsWith('ls_prop_reg_')) {
          const code = key.slice('ls_prop_reg_'.length);
          try { reg[code] = JSON.parse(localStorage.getItem(key)); } catch {}
          continue;
        }
        // Es una propuesta.
        try {
          const p = JSON.parse(localStorage.getItem(key));
          if (p && typeof p === 'object' && p.code) props.push(p);
        } catch {}
      }
    } catch {}
    setReal(props);
    setFbMap(fb);
    setRegMap(reg);
    try {
      const a = JSON.parse(localStorage.getItem(ARCH_KEY));
      if (Array.isArray(a)) setArch(a.filter((x) => typeof x === 'string'));
    } catch {}
  }, []);

  // Lista combinada: reales (con su feedback/reg de localStorage) + demo seed
  // (con su feedback/reg embebido). Cada entrada trae feedback/reg resueltos.
  const all = useMemo(() => {
    const realResolved = real.map((p) => ({
      ...p,
      _feedback: fbMap[p.code] || null,
      _reg: regMap[p.code] || null,
    }));
    // No dupliques un demo si por casualidad ya existe una real con ese code.
    const realCodes = new Set(realResolved.map((p) => p.code));
    const demos = demoSeed().filter((d) => !realCodes.has(d.code));
    return [...realResolved, ...demos];
  }, [real, fbMap, regMap]);

  const empleados = useMemo(() => {
    const s = new Set();
    all.forEach((p) => { if (p.createdBy) s.add(p.createdBy); });
    return [...s].sort();
  }, [all]);
  const modelos = useMemo(() => {
    const s = new Set();
    all.forEach((p) => { if (p.model?.name) s.add(p.model.name); });
    return [...s].sort();
  }, [all]);

  const isArch = (code) => arch.includes(code);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((p) => {
      const archived = isArch(p.code);
      // "Archivadas" es un estado más: solo se ven cuando el filtro lo pide.
      if (fEstado === 'archivadas') { if (!archived) return false; }
      else if (archived) return false;
      if (fEstado !== 'all' && fEstado !== 'archivadas' && stateOf(p) !== fEstado) return false;
      if (fEmpleado !== 'all' && (p.createdBy || '') !== fEmpleado) return false;
      if (fModelo !== 'all' && (p.model?.name || '') !== fModelo) return false;
      if (query) {
        const hay = `${p.recipient?.name || ''} ${p.recipient?.email || ''} ${p.model?.name || ''} ${p.code || ''} ${p.createdBy || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.expiresAt || 0) - new Date(a.expiresAt || 0));
  }, [all, q, fEmpleado, fEstado, fModelo, arch]);

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
  const toggleArchive = (p) => {
    setArch((prev) => {
      const next = prev.includes(p.code) ? prev.filter((c) => c !== p.code) : [...prev, p.code];
      // Persistimos SOLO para reales (las demo viven en memoria; su code no
      // ensucia el store — pero guardar el array completo es inofensivo y
      // mantiene el archivado de reales entre sesiones).
      try { localStorage.setItem(ARCH_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const selProp = shown.find((p) => p.code === sel) || all.find((p) => p.code === sel) || null;

  const activeCount = fEstado === 'archivadas'
    ? all.filter((p) => isArch(p.code)).length
    : all.filter((p) => !isArch(p.code)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-paper-mute">
          Todas las propuestas que arma el equipo. Ves a quién van, quién las creó y qué respondió cada receptor.
        </p>
      </div>

      {/* Aviso honesto: hoy es local al navegador. */}
      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-card/50 px-4 py-3 text-xs text-paper-dim">
        <Inbox size={14} className="mt-0.5 shrink-0 text-paper-mute" />
        <span>Por ahora las propuestas viven en este navegador (las publica el equipo desde <span className="text-paper-mute">Propuestas › crear</span>). Se muestran ejemplos para ilustrar la vista; el registro central llega con el backend.</span>
      </div>

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
        <FilterSelect value={fModelo} onChange={setFModelo}
          options={[{ value: 'all', label: 'Todas las modelos' }, ...modelos.map((m) => ({ value: m, label: m }))]} />
      </div>

      <p className="mt-3 text-xs text-paper-dim">{shown.length} de {activeCount} · haz clic en una propuesta para ver el detalle y las respuestas.</p>

      {/* Lista */}
      <div className="mt-2 overflow-x-auto rounded-2xl border border-line">
        <div className="grid min-w-[820px] grid-cols-[1.5fr_1fr_1fr_0.9fr_1.1fr] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim">
          <span>Destinatario</span><span>Creó</span><span>Estado</span><span>Modelo</span><span>Respuestas</span>
        </div>
        {shown.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-paper-dim">No hay propuestas que coincidan con el filtro.</p>
        )}
        {shown.map((p) => {
          const st = STATE_META[stateOf(p)];
          const d = daysLeft(p);
          const fs = feedbackSummary(p._feedback);
          const opened = !!p._reg;
          return (
            <div key={p.code} role="button" tabIndex={0} onClick={() => setSel(p.code)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSel(p.code); }}
              className="grid min-w-[820px] cursor-pointer grid-cols-[1.5fr_1fr_1fr_0.9fr_1.1fr] items-center gap-3 border-b border-line px-5 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04]">
              <span className="min-w-0">
                <span className="block truncate font-medium text-paper">{p.recipient?.name || 'Sin destinatario'}</span>
                <span className="block truncate text-[11px] text-paper-dim">{p.recipient?.email || 'sin correo'}</span>
              </span>
              <span className="min-w-0 truncate text-paper-mute">{p.createdBy || '—'}</span>
              <span className="flex flex-col gap-1">
                <StatusDot tone={st.tone}>{st.label}</StatusDot>
                {stateOf(p) !== 'borrador' && d !== null && (
                  d < 0 ? <span className="text-[11px] text-paper-dim">venció hace {Math.abs(d)}d</span>
                    : <span className="text-[11px] text-paper-dim">{d === 0 ? 'vence hoy' : `${d}d restantes`}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-paper">{p.model?.name || '—'}</span>
                <span className="block truncate font-mono text-[10px] text-paper-dim">{p.code}</span>
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {fs.total === 0 ? (
                  <span className="text-paper-dim">Sin respuestas</span>
                ) : (
                  <>
                    {fs.liked > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><Heart size={12} className="text-emerald-400" /> {fs.liked}</span>}
                    {fs.rejected > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><ThumbsDown size={12} className="text-rose-400" /> {fs.rejected}</span>}
                    {fs.comments > 0 && <span className="inline-flex items-center gap-1 text-paper-mute"><MessageSquare size={12} className="text-paper-dim" /> {fs.comments}</span>}
                  </>
                )}
                {opened && <StatusDot tone="ok">abrió</StatusDot>}
              </span>
            </div>
          );
        })}
      </div>

      {selProp && (
        <PropDetail
          p={selProp}
          archived={isArch(selProp.code)}
          link={linkFor(selProp)}
          copied={copied === selProp.code}
          onCopy={() => copyLink(selProp)}
          mailHref={mailHref(selProp)}
          onArchive={() => toggleArchive(selProp)}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}

// ── Detalle en drawer lateral ──────────────────────────────────────────────
function PropDetail({ p, archived, link, copied, onCopy, mailHref, onArchive, onClose }) {
  const st = STATE_META[stateOf(p)];
  const d = daysLeft(p);
  const items = Array.isArray(p._feedback?.items) ? p._feedback.items : [];
  const fs = feedbackSummary(p._feedback);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/70 backdrop-blur-sm" onClick={onClose}>
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
            <Row label="Modelo" value={<span>{p.model?.name || '—'}{p.model?.agency ? <span className="text-paper-dim"> · {p.model.agency}</span> : null}</span>} />
            <Row label="Código" value={<span className="font-mono text-xs">{p.code}</span>} />
            <Row label="Vencimiento" value={stateOf(p) === 'borrador' || d === null ? '—'
              : d < 0 ? <span className="text-paper-dim">venció hace {Math.abs(d)}d</span>
              : <span>{d === 0 ? 'vence hoy' : `${d} días restantes`}</span>} />
            <Row label="Abrió / registró" value={p._reg
              ? <StatusDot tone="ok">{p._reg.name || p._reg.email || 'sí'}{p._reg.at ? ` · ${new Date(p._reg.at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}` : ''}</StatusDot>
              : <span className="text-paper-dim">todavía no</span>} />
          </div>

          {/* Acciones */}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="btn3d inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
              <ExternalLink size={14} /> Ver como cliente
            </a>
            <button onClick={onCopy}
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
              {copied ? <><Check size={14} className="text-emerald-400" /> Copiado</> : <><Copy size={14} /> Copiar link</>}
            </button>
            <a href={mailHref}
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
              <Mail size={14} /> Reenviar por correo
            </a>
            <button onClick={onArchive}
              className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
              <Archive size={14} /> {archived ? 'Desarchivar' : 'Archivar'}
            </button>
          </div>

          {/* Respuestas foto por foto */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h4 className="font-display text-sm font-semibold text-paper">Respuestas</h4>
              {fs.total > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-paper-mute"><Heart size={12} className="text-emerald-400" /> {fs.liked} le gustaron</span>
                  <span className="inline-flex items-center gap-1 text-paper-mute"><ThumbsDown size={12} className="text-rose-400" /> {fs.rejected} rechazó</span>
                  <span className="inline-flex items-center gap-1 text-paper-mute"><MessageSquare size={12} className="text-paper-dim" /> {fs.comments} comentó</span>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-paper-dim">
                {stateOf(p) === 'borrador' ? 'Borrador — todavía no se publica ni recibe respuestas.' : 'El receptor aún no ha respondido.'}
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {items.map((it) => {
                  const tone = it.status === 'liked' ? 'ok' : it.status === 'rejected' ? 'bad' : 'zinc';
                  const lbl = it.status === 'liked' ? 'Le gustó' : it.status === 'rejected' ? 'Rechazó' : 'Sin decidir';
                  return (
                    <div key={it.id} className="flex gap-3 rounded-xl border border-line bg-ink-2/30 p-2.5">
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-hair/10">
                        {it.result ? <img src={it.result} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
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
