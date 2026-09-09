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
import { Send, Search, SlidersHorizontal, Copy, Check, Mail, Archive, ExternalLink, X, Heart, ThumbsDown, MessageSquare, UserCheck, ChevronDown, Inbox, Phone } from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { getSupabase } from '@/lib/supabase/client';

// Estado derivado de una propuesta: borrador (solo demo), vencida (expiró) o publicada.
// El archivado NO es un estado acá — es un flag aparte (status === 'archived').
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

// ── Demo seed (SOLO en memoria — solo si no hay ninguna propuesta real) ─────
// Propuestas variadas: distintos empleados, modelos, estados y respuestas.
function demoSeed() {
  const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const img = (id) => `https://images.unsplash.com/${id}?w=400&q=70&auto=format&fit=crop`;
  return [
    {
      _demo: true, id: 'JP-7K2M9A', code: 'JP-7K2M9A', lang: 'es', _status: 'published',
      name: 'Sesión exclusiva — Valentina', subtitle: 'Un look que no se repite',
      createdBy: 'Isabel Tuiran', expiresAt: iso(6),
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
      createdBy: 'David Aunta', expiresAt: iso(2),
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
      createdBy: 'Lizeth Jerez', expiresAt: iso(-3), // vencida
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
      createdBy: 'Isabel Tuiran', expiresAt: null,
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Sofía Ramírez', email: '', kind: 'prospect' },
      _feedback: null, _reg: null,
    },
    {
      _demo: true, id: 'JP-1P0R7E', code: 'JP-1P0R7E', lang: 'pt', _status: 'published',
      name: 'Proposta exclusiva — Julia', subtitle: 'Um ensaio só seu',
      createdBy: 'David Aunta', expiresAt: iso(9),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: 'Rafael Souza', email: 'rafael@example.com', kind: 'model' },
      _feedback: null, _reg: null,
    },
  ];
}

// Normaliza una fila de photo_proposals (+ feedback/registro resueltos por
// proposal_id) al shape que usa la vista.
function mapProposal(row, fb, reg) {
  return {
    _demo: false,
    id: row.id,
    code: row.link_id,
    lang: row.lang || 'es',
    template: row.template || null,
    name: row.name || '',
    subtitle: row.subtitle || '',
    intro: row.intro || '',
    createdBy: row.created_by_name || '',
    expiresAt: row.expires_at || null,
    _status: row.status || 'published',
    model: { name: row.model_name || '', agency: row.model_agency || '' },
    recipient: { name: row.recipient_name || '', email: row.recipient_email || '', kind: row.recipient_kind || '' },
    looks: Array.isArray(row.looks) ? row.looks : [],
    _feedback: fb ? { items: Array.isArray(fb.items) ? fb.items : [], recipientName: fb.recipient_name || '', updatedAt: fb.updated_at || null } : null,
    _reg: reg ? { name: reg.name || '', email: reg.email || '', phone: reg.phone || '', at: reg.created_at || null } : null,
  };
}

export default function AdminPropuestas() {
  const [rows, setRows] = useState([]);         // lista normalizada (reales o, si no hay, demos)
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [origin, setOrigin] = useState('');
  const [sel, setSel] = useState(null);         // id de la propuesta abierta en el drawer
  const [copied, setCopied] = useState('');

  // Filtros
  const [q, setQ] = useState('');
  const [fEmpleado, setFEmpleado] = useState('all');
  const [fEstado, setFEstado] = useState('all');
  const [fModelo, setFModelo] = useState('all');

  // Carga desde Supabase — el staff tiene sesión y su RLS (is_staff()) permite
  // leer TODAS las propuestas del equipo con consultas normales a las tablas.
  useEffect(() => {
    try { setOrigin(window.location.origin); } catch {}
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      try {
        const [propsRes, fbRes, regRes] = await Promise.all([
          sb.from('photo_proposals').select('*').order('created_at', { ascending: false }),
          sb.from('photo_proposal_feedback').select('proposal_id, items, recipient_name, updated_at').order('updated_at', { ascending: false }),
          sb.from('photo_proposal_registrations').select('proposal_id, name, email, phone, created_at').order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;
        const props = Array.isArray(propsRes.data) ? propsRes.data : [];

        // feedback por proposal_id (el upsert garantiza 1 por propuesta).
        const fbMap = {};
        (Array.isArray(fbRes.data) ? fbRes.data : []).forEach((f) => { if (f?.proposal_id && !fbMap[f.proposal_id]) fbMap[f.proposal_id] = f; });

        // registro por proposal_id — nos quedamos con el más reciente (ya viene
        // ordenado desc, así que el primero gana).
        const regMap = {};
        (Array.isArray(regRes.data) ? regRes.data : []).forEach((r) => {
          if (r?.proposal_id && !regMap[r.proposal_id]) regMap[r.proposal_id] = r;
        });

        if (props.length > 0) {
          setRows(props.map((p) => mapProposal(p, fbMap[p.id], regMap[p.id])));
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
  const modelos = useMemo(() => {
    const s = new Set();
    all.forEach((p) => { if (p.model?.name) s.add(p.model.name); });
    return [...s].sort();
  }, [all]);

  const isArch = (p) => p?._status === 'archived';

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((p) => {
      const archived = isArch(p);
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
  }, [all, q, fEmpleado, fEstado, fModelo]);

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

  const selProp = shown.find((p) => p.id === sel) || all.find((p) => p.id === sel) || null;

  const activeCount = fEstado === 'archivadas'
    ? all.filter((p) => isArch(p)).length
    : all.filter((p) => !isArch(p)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-paper-mute">
          Todas las propuestas que arma el equipo. Ves a quién van, quién las creó y qué respondió cada receptor.
        </p>
      </div>

      {/* Aviso: solo cuando no hay propuestas reales y se muestran ejemplos. */}
      {usingDemo && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-card/50 px-4 py-3 text-xs text-paper-dim">
          <Inbox size={14} className="mt-0.5 shrink-0 text-paper-mute" />
          <span>Todavía no hay propuestas publicadas. Se muestran ejemplos para ilustrar la vista; cuando el equipo publique desde <span className="text-paper-mute">Propuestas › crear</span>, aparecerán acá automáticamente.</span>
        </div>
      )}

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
          key={selProp.id}
          p={selProp}
          archived={isArch(selProp)}
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

  // Filtro de respuestas + orden: SIEMPRE primero lo rechazado, luego lo que
  // gustó, luego lo sin decidir. Los contadores de arriba son los filtros.
  const [fResp, setFResp] = useState('all'); // all | rejected | liked | commented
  const rank = (i) => (i.status === 'rejected' ? 0 : i.status === 'liked' ? 1 : 2);
  const sortedItems = [...items].sort((a, b) => rank(a) - rank(b));
  const matchResp = (i) =>
    fResp === 'all' ? true
    : fResp === 'rejected' ? i.status === 'rejected'
    : fResp === 'liked' ? i.status === 'liked'
    : (i.note || '').trim() !== '';
  const visibleItems = sortedItems.filter(matchResp);
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
            {p._reg && (
              <Row label="Registro" value={
                <span className="text-paper-mute">
                  {p._reg.name || '—'}
                  {p._reg.email ? <span className="text-paper-dim"> · {p._reg.email}</span> : null}
                  {p._reg.phone ? <span className="inline-flex items-center gap-1 text-paper-dim"> · <Phone size={11} className="inline" />{p._reg.phone}</span> : null}
                </span>
              } />
            )}
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

          {/* Respuestas foto por foto — rechazadas primero, luego gustadas.
              Los contadores son filtros clicables (tap para aislar cada tipo). */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h4 className="font-display text-sm font-semibold text-paper">Respuestas</h4>
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
                {visibleItems.map((it) => {
                  const tone = it.status === 'liked' ? 'ok' : it.status === 'rejected' ? 'bad' : 'zinc';
                  const lbl = it.status === 'liked' ? 'Le gustó' : it.status === 'rejected' ? 'Rechazó' : 'Sin decidir';
                  return (
                    <div key={it.id} className={`flex gap-3 rounded-xl border bg-ink-2/30 p-2.5 ${it.status === 'rejected' ? 'border-rose-500/40' : 'border-line'}`}>
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
