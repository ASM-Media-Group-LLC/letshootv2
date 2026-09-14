'use client';

// ─────────────────────────────────────────────────────────────────────────
// AlmacenPropuestas — la vista de PRODUCCIÓN de propuestas (/trabajo › Almacén).
//
// Pensada para que el equipo que produce trabaje MUCHAS propuestas sin mierdero:
// agrupadas POR CREADORA, con estados de trabajo (Esperando / Por producir /
// Recrear / Entregado), lo que la creadora aprobó cae a su cuenta como «por
// producir» y lo rechazado a «recrear», y el trabajador sólo marca «entregado».
// Candados de link (matar / se apaga solo al entregar / ver si lo abrió) y una
// barra de «Novedades» con lo que respondieron las creadoras recién.
//
// FUENTE: Supabase con la sesión del staff (RLS is_staff). Tablas:
//   · photo_proposals              (la propuesta + delivered_at / link_killed /
//                                    first_opened_at)
//   · proposal_content            (lo que cayó a la cuenta: approved/rejected +
//                                    prod_state to_produce/delivered)
//   · photo_proposal_feedback     (respuesta de la creadora, para el resumen)
//   · photo_proposal_registrations(quién abrió / se registró)
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Search, Copy, Check, Mail, Archive, X, Heart, ThumbsDown, MessageSquare, ChevronDown, Send, Play, ExternalLink, Inbox } from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { getSupabase } from '@/lib/supabase/client';

const S = {
  esperando:   { label: 'Esperando creadora', tone: 'warn' },
  porproducir: { label: 'Por producir',        tone: 'brand' },
  recrear:     { label: 'Recrear',             tone: 'bad' },
  entregado:   { label: 'Entregado',           tone: 'ok' },
  archivada:   { label: 'Archivada',           tone: 'zinc' },
};

// Estado de trabajo de una propuesta (un solo estado principal para la píldora).
function stateOf(p) {
  if (p.status === 'archived') return 'archivada';
  if (p.delivered_at) return 'entregado';
  if (p.approved.length > 0) return 'porproducir';
  if (p.rejected.length > 0) return 'recrear';
  return 'esperando';
}

// "hace X h / X d" a partir de un ISO.
function hace(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'hace un momento';
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MES[d.getMonth()]}`;
}

function feedbackSummary(fb) {
  const items = Array.isArray(fb?.items) ? fb.items : [];
  return {
    liked: items.filter((i) => i.status === 'liked').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    comments: items.filter((i) => (i.note || '').trim()).length,
    total: items.length,
  };
}

// Iniciales para el avatar de la creadora.
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '·';
}

export default function AlmacenPropuestas({ creators = [], me, flash, readOnly = false }) {
  const [rows, setRows] = useState([]);       // propuestas normalizadas (no internas)
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('todas');  // todas | esperando | porproducir | recrear | entregado | archivadas
  const [busy, setBusy] = useState('');        // id de la propuesta en una acción
  const [copied, setCopied] = useState('');
  const [open, setOpen] = useState({});        // grupos abiertos por key (undefined = abierto)

  const load = async () => {
    const sb = getSupabase();
    try {
      const [propsRes, contentRes, fbRes, regRes] = await Promise.all([
        sb.from('photo_proposals').select('*').order('created_at', { ascending: false }),
        sb.from('proposal_content').select('proposal_id, creator_user_id, creator_name, item_id, kind, label, src, decision, prod_state').order('created_at', { ascending: true }),
        sb.from('photo_proposal_feedback').select('proposal_id, items, recipient_name, updated_at, reviewer_kind').order('updated_at', { ascending: false }),
        sb.from('photo_proposal_registrations').select('proposal_id, name, email, created_at').order('created_at', { ascending: false }),
      ]);
      const props = (Array.isArray(propsRes.data) ? propsRes.data : []).filter((p) => p.recipient_kind !== 'internal' && p.status !== 'draft');

      const contentBy = {};
      (Array.isArray(contentRes.data) ? contentRes.data : []).forEach((c) => {
        if (c?.proposal_id) (contentBy[c.proposal_id] = contentBy[c.proposal_id] || []).push(c);
      });
      const fbBy = {};
      (Array.isArray(fbRes.data) ? fbRes.data : []).forEach((f) => {
        // Sólo la respuesta de la CREADORA (no la del equipo interno).
        if (f?.proposal_id && f.reviewer_kind !== 'internal' && !fbBy[f.proposal_id]) fbBy[f.proposal_id] = f;
      });
      const regBy = {};
      (Array.isArray(regRes.data) ? regRes.data : []).forEach((r) => {
        if (r?.proposal_id && !regBy[r.proposal_id]) regBy[r.proposal_id] = r;
      });

      setRows(props.map((p) => {
        const content = contentBy[p.id] || [];
        return {
          ...p,
          content,
          approved: content.filter((c) => c.decision === 'approved'),
          rejected: content.filter((c) => c.decision === 'rejected'),
          fb: fbBy[p.id] || null,
          reg: regBy[p.id] || null,
        };
      }));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try { setOrigin(window.location.origin); } catch {}
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conteos por estado (sobre las NO archivadas; archivadas es su propio filtro).
  const counts = useMemo(() => {
    const c = { todas: 0, esperando: 0, porproducir: 0, recrear: 0, entregado: 0, archivadas: 0 };
    rows.forEach((p) => {
      if (p.status === 'archived') { c.archivadas += 1; return; }
      c.todas += 1;
      const st = stateOf(p);
      if (c[st] !== undefined) c[st] += 1;
    });
    return c;
  }, [rows]);

  // Novedades: respuestas de creadoras en las últimas 72 h.
  const novedades = useMemo(() => {
    const since = Date.now() - 72 * 3600000;
    return rows
      .filter((p) => p.fb?.updated_at && new Date(p.fb.updated_at).getTime() > since && feedbackSummary(p.fb).total > 0)
      .sort((a, b) => new Date(b.fb.updated_at) - new Date(a.fb.updated_at))
      .slice(0, 6);
  }, [rows]);

  const shownProps = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((p) => {
      const archived = p.status === 'archived';
      if (chip === 'archivadas') { if (!archived) return false; }
      else if (archived) return false;
      if (chip !== 'todas' && chip !== 'archivadas' && stateOf(p) !== chip) return false;
      if (query) {
        const hay = `${p.recipient_name || ''} ${p.recipient_email || ''} ${p.recipient_instagram || ''} ${p.model_name || ''} ${p.link_id || ''} ${p.created_by_name || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, q, chip]);

  // Agrupar por creadora (receptor). La más movida arriba.
  const groups = useMemo(() => {
    const map = new Map();
    shownProps.forEach((p) => {
      // Por CREADORA: la identidad es el nombre del receptor (el correo se reusa
      // en pruebas y juntaría creadoras distintas). Cae al correo si no hay nombre.
      const key = (p.recipient_name || p.recipient_email || 'sin').toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: p.recipient_name || p.recipient_email || 'Sin destinatario',
          handle: p.recipient_instagram || '',
          kind: p.recipient_kind || '',
          props: [],
        });
      }
      map.get(key).props.push(p);
    });
    const lastAt = (g) => Math.max(...g.props.map((p) => new Date(p.fb?.updated_at || p.created_at || 0).getTime()));
    return [...map.values()].sort((a, b) => lastAt(b) - lastAt(a));
  }, [shownProps]);

  const linkFor = (p) => `${origin}/p/${p.link_id}?lang=${p.lang || 'es'}`;

  const copyLink = async (p) => {
    try { await navigator.clipboard.writeText(linkFor(p)); setCopied(p.link_id); setTimeout(() => setCopied(''), 1600); } catch {}
  };
  const mailHref = (p) => {
    const greet = (p.recipient_name || '').trim().split(/\s+/)[0];
    const body = `${greet ? `Hola ${greet}!` : 'Hola!'}\n\nTe comparto la propuesta: ${p.name}.\nMírala acá: ${linkFor(p)}`;
    return `mailto:${(p.recipient_email || '').trim()}?subject=${encodeURIComponent(p.name || 'Propuesta')}&body=${encodeURIComponent(body)}`;
  };

  const doWrite = async (id, patch, contentPatch) => {
    if (readOnly) return;
    setBusy(id);
    try {
      await getSupabase().from('photo_proposals').update(patch).eq('id', id);
      if (contentPatch) await getSupabase().from('proposal_content').update(contentPatch).eq('proposal_id', id);
      await load();
    } catch {
      flash?.('No se pudo guardar. Reintentá.');
    } finally {
      setBusy('');
    }
  };
  const marcarEntregado = (p) => doWrite(p.id, { delivered_at: new Date().toISOString(), link_killed: true }, { prod_state: 'delivered' });
  const matarLink = (p) => doWrite(p.id, { link_killed: true });
  const archivar = (p) => doWrite(p.id, { status: 'archived' });

  const isOpen = (key) => open[key] !== false;
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: o[key] === false ? true : false }));

  return (
    <div className="mt-4">
      {/* Novedades */}
      {novedades.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/10 to-transparent px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#bfe9ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_1px_var(--tw-shadow-color)] shadow-brand" />
            Novedades
          </span>
          {novedades.map((p) => (
            <span key={p.id} className="rounded-full border border-line bg-hair/5 px-2.5 py-1 text-xs text-paper">
              {(p.recipient_name || 'Creadora').split(/\s+/)[0]} respondió · {hace(p.fb.updated_at)}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-paper-mute">✉ además le llegó un correo a quien la creó</span>
        </div>
      )}

      <p className="max-w-2xl text-sm text-paper-mute">
        Las propuestas agrupadas por creadora. Lo que aprueba cae a su cuenta como «por producir»; lo rechazado, a «recrear». Vos sólo marcás <b className="text-paper">entregado</b> cuando lo subiste.
      </p>

      {/* Toolbar: buscador + filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar creadora, @ o código…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['todas', 'Todas', counts.todas],
            ['esperando', 'Esperando', counts.esperando],
            ['porproducir', 'Por producir', counts.porproducir],
            ['recrear', 'Recrear', counts.recrear],
            ['entregado', 'Entregado', counts.entregado],
            ['archivadas', 'Archivadas', counts.archivadas],
          ].map(([id, label, n]) => (
            <button key={id} type="button" onClick={() => setChip(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                chip === id ? 'border-transparent bg-brand text-[#04222f]' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'
              }`}>
              {label}{n > 0 && <span className={chip === id ? 'text-[#04222f]/60' : 'text-paper-dim'}>{n}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="mt-4 space-y-3">
        {loading && <p className="rounded-2xl border border-line bg-card px-5 py-10 text-center text-sm text-paper-dim">Cargando el almacén…</p>}
        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-card/40 px-5 py-14 text-center">
            <Inbox size={22} className="text-paper-mute" />
            <p className="text-sm text-paper-mute">No hay propuestas que coincidan.</p>
            <p className="text-[12px] text-paper-dim">Cuando el equipo publique desde <span className="text-paper-mute">Propuestas</span> y las creadoras respondan, aparecen acá.</p>
          </div>
        )}

        {groups.map((g) => {
          const opened = isOpen(g.key);
          const approvedItems = g.props.reduce((n, p) => n + p.approved.length, 0);
          const rejectedItems = g.props.reduce((n, p) => n + p.rejected.length, 0);
          const kindLabel = g.kind === 'active' ? 'activa' : g.kind === 'new' ? 'nueva' : g.kind === 'model' ? 'modelo' : '';
          return (
            <div key={g.key} className="overflow-hidden rounded-2xl border border-line bg-card">
              <button type="button" onClick={() => toggle(g.key)} className="flex w-full items-center gap-3.5 px-4 py-4 text-left sm:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hair bg-gradient-to-br from-[#22384a] to-[#0d1319] text-sm font-bold text-paper">{initials(g.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-paper">
                    {g.name}
                    {(g.handle || kindLabel) && <span className="ml-2 text-[12.5px] font-normal text-paper-mute">{g.handle}{g.handle && kindLabel ? ' · ' : ''}{kindLabel}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-paper-mute">
                    <span><b className="text-paper">{g.props.length}</b> {g.props.length === 1 ? 'propuesta' : 'propuestas'}</span>
                    {approvedItems > 0 && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-[#bfe9ff]">{approvedItems} por producir</span>}
                    {rejectedItems > 0 && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-[#ffc4cd]">{rejectedItems} recrear</span>}
                  </span>
                </span>
                <ChevronDown size={18} className={`ml-auto shrink-0 text-paper-dim transition-transform ${opened ? '' : '-rotate-90'}`} />
              </button>

              {opened && (
                <div className="border-t border-line px-3 pb-3.5 pt-1.5 sm:px-4">
                  {g.props
                    .slice()
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                    .map((p) => (
                      <PropCard
                        key={p.id} p={p} origin={origin}
                        busy={busy === p.id} readOnly={readOnly}
                        copied={copied === p.link_id}
                        onCopy={() => copyLink(p)} mailHref={mailHref(p)}
                        onDeliver={() => marcarEntregado(p)} onKill={() => matarLink(p)} onArchive={() => archivar(p)}
                        link={linkFor(p)}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper-dim">
        Estados:
        <span className="text-amber-300">● Esperando</span>
        <span className="text-brand">● Por producir</span>
        <span className="text-rose-300">● Recrear</span>
        <span className="text-emerald-300">● Entregado</span>
      </div>
    </div>
  );
}

// ── Tarjeta de una propuesta dentro del grupo ───────────────────────────────
function PropCard({ p, origin, busy, readOnly, copied, onCopy, mailHref, onDeliver, onKill, onArchive, link }) {
  const st = S[stateOf(p)];
  const fs = feedbackSummary(p.fb);
  const delivered = !!p.delivered_at;
  const killed = !!p.link_killed || delivered;
  const photos = p.approved.filter((c) => c.kind === 'photo');
  const audios = p.approved.filter((c) => c.kind === 'audio');
  const rejPhotos = p.rejected.filter((c) => c.kind === 'photo');
  const rejAudios = p.rejected.filter((c) => c.kind === 'audio');
  const hasContent = p.content.length > 0;
  const creadora = (p.recipient_name || 'la creadora').split(/\s+/)[0];

  return (
    <div className="mt-3 rounded-2xl border border-line bg-ink-2/40 p-3.5">
      {/* fila título */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-semibold text-paper">{p.name || 'Propuesta'}</span>
        <span className="font-mono text-[10.5px] text-paper-dim">{p.link_id}</span>
        <StatusDot tone={st.tone}>{st.label}</StatusDot>
        <span className="ml-auto flex items-center gap-3 text-[12px] text-paper-mute">
          {fs.total === 0 ? <span className="text-paper-dim">sin respuesta aún</span> : (
            <>
              {fs.liked > 0 && <span className="inline-flex items-center gap-1"><Heart size={12} className="text-emerald-400" />{fs.liked}</span>}
              {fs.rejected > 0 && <span className="inline-flex items-center gap-1"><ThumbsDown size={12} className="text-rose-400" />{fs.rejected}</span>}
              {fs.comments > 0 && <span className="inline-flex items-center gap-1"><MessageSquare size={12} className="text-paper-dim" />{fs.comments}</span>}
            </>
          )}
        </span>
      </div>

      {/* ítems que cayeron a la cuenta */}
      {hasContent && (
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map((c) => (
            <span key={c.item_id} className="relative h-16 w-14 overflow-hidden rounded-lg border border-emerald-500/30 bg-hair/10">
              {c.src ? <img src={c.src} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute inset-x-0 bottom-0 bg-emerald-500/80 py-0.5 text-center text-[8px] font-bold text-white">→ cuenta</span>
            </span>
          ))}
          {rejPhotos.map((c) => (
            <span key={c.item_id} className="relative h-16 w-14 overflow-hidden rounded-lg border border-rose-500/40 bg-hair/10 opacity-70">
              {c.src ? <img src={c.src} alt="" className="h-full w-full object-cover grayscale" /> : null}
              <span className="absolute inset-x-0 bottom-0 bg-rose-500/80 py-0.5 text-center text-[8px] font-bold text-white">recrear</span>
            </span>
          ))}
          {audios.map((c) => (
            <span key={c.item_id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-2.5 py-1.5 text-[12px] text-paper">
              <Play size={11} className="text-emerald-400" /> {c.label || 'Audio'} <span className="font-bold text-emerald-300">→ cuenta</span>
            </span>
          ))}
          {rejAudios.map((c) => (
            <span key={c.item_id} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-1.5 text-[12px] text-paper-mute">
              <Play size={11} className="text-rose-400" /> {c.label || 'Audio'} · recrear
            </span>
          ))}
        </div>
      )}

      {/* línea "cayó a la cuenta" + marcar entregado */}
      {hasContent && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-3 text-[12.5px]">
          {delivered ? (
            <>
              <span className="text-emerald-300">✓ {p.approved.length} ítems en la cuenta de {creadora}</span>
              <span className="text-paper-dim">· entregado el {fecha(p.delivered_at)}</span>
            </>
          ) : (
            <>
              <span className="text-emerald-300">✓ {p.approved.length} ítems a la cuenta de {creadora}</span>
              {p.rejected.length > 0 && <span className="text-rose-300">· {p.rejected.length} a recrear</span>}
              {!readOnly && (
                <button type="button" onClick={onDeliver} disabled={busy}
                  className="btn3d ml-auto inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold disabled:opacity-60">
                  <Check size={14} /> {busy ? 'Guardando…' : 'Marcar entregado'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* candados de link */}
      <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] ${killed ? 'opacity-70' : ''}`}>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-paper-mute">
          <ExternalLink size={12} className="shrink-0 text-paper-dim" />
          <span className="truncate font-mono">{link.replace(/^https?:\/\//, '')}</span>
        </span>
        {killed ? <span className="text-paper-dim">🔒 link apagado{delivered ? ' (entregado)' : ''}</span>
          : p.first_opened_at ? <span className="text-emerald-300">● abierto {hace(p.first_opened_at)}</span>
          : <span className="text-paper-dim">○ todavía no lo abre</span>}
        <span className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-paper-mute hover:text-paper">
            {copied ? <><Check size={12} className="text-emerald-400" /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
          {!killed && !readOnly && p.recipient_email && (
            <a href={mailHref} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-paper-mute hover:text-paper">
              <Mail size={12} /> Reenviar
            </a>
          )}
          {!killed && !readOnly && (
            <button type="button" onClick={onKill} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-2.5 py-1.5 font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60">
              <X size={12} /> Matar link
            </button>
          )}
          {(killed || delivered) && !readOnly && p.status !== 'archived' && (
            <button type="button" onClick={onArchive} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-paper-mute hover:text-paper disabled:opacity-60">
              <Archive size={12} /> Archivar
            </button>
          )}
        </span>
      </div>

      {/* nota contextual */}
      {!hasContent && !delivered && (
        <p className="mt-2.5 text-[11px] text-paper-dim">
          {p.recipient_kind === 'new'
            ? 'Cuando la creadora nueva acepta, se le crea la cuenta y lo aprobado cae ahí solo.'
            : 'Cuando la creadora responda, lo que apruebe cae a su cuenta como «por producir».'}
        </p>
      )}
    </div>
  );
}
