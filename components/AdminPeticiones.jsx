'use client';

// ─────────────────────────────────────────────────────────────────────────
// AdminPeticiones — /admin › Peticiones.
//
// Un PEDIDO de contenido que, al aprobarse, se convierte en una PROPUESTA
// borrador (lista para que el equipo le ponga fotos/audios y publique). Lo hace
// cualquiera del equipo. El destino puede ser una creadora que YA está en la
// plataforma (se elige del roster) o una NUEVA (nombre + correo → al publicar la
// propuesta se le manda la invitación, el mismo flujo que ya existe).
//
// Tabla: proposal_requests (RLS is_staff). Al aprobar se inserta un
// photo_proposals status='draft' y se liga (proposal_id / proposal_link_id).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Inbox, Search, Check, X, Plus, AlertTriangle, Pencil, Loader2 } from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { getSupabase } from '@/lib/supabase/client';

const A1 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const A2 = 'abcdefghijkmnpqrstuvwxyz23456789';
const rnd = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
const genCode = () => `JP-${rnd(A1, 6)}-${rnd(A2, 6)}`;

const TYPE_LABEL = { visual: 'Visual', audio: 'Audio', both: 'Ambas' };
const STATUS_META = {
  pending: { label: 'Pendiente', tone: 'warn' },
  approved: { label: 'Aprobado → propuesta', tone: 'ok' },
  rejected: { label: 'Rechazado', tone: 'bad' },
};

export default function AdminPeticiones({ creators = [], me, flash, readOnly = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState('pending');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await getSupabase().from('proposal_requests').select('*').order('created_at', { ascending: false });
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (chip !== 'all' && r.status !== chip) return false;
      if (query) {
        const hay = `${r.title || ''} ${r.brief || ''} ${r.creator_name || ''} ${r.created_by_name || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, chip, q]);

  // Aprobar → crear la propuesta BORRADOR y ligarla al pedido.
  const aprobar = async (r) => {
    if (readOnly || busy) return;
    setBusy(r.id);
    try {
      const isNew = r.is_new_creator || !r.creator_user_id;
      const draft = {
        link_id: genCode(),
        created_by: r.created_by || me?.id || null,
        created_by_name: r.created_by_name || me?.full_name || 'Equipo',
        name: r.title || 'Pedido de contenido',
        intro: r.brief || '',
        proposal_type: r.proposal_type || 'visual',
        status: 'draft',
        recipient_kind: isNew ? 'new' : 'active',
        recipient_name: r.creator_name || '',
        recipient_email: r.creator_email || '',
        recipient_instagram: r.creator_handle || '',
        recipient_user_id: isNew ? null : (r.creator_user_id || null),
        looks: [],
        audios: [],
      };
      const { data: prop, error } = await getSupabase().from('photo_proposals').insert(draft).select('id, link_id').single();
      if (error) throw error;
      await getSupabase().from('proposal_requests').update({
        status: 'approved', proposal_id: prop.id, proposal_link_id: prop.link_id,
        approved_by_name: me?.full_name || 'Equipo', approved_at: new Date().toISOString(),
      }).eq('id', r.id);
      flash?.('Aprobado — propuesta borrador creada. Ábrela para armar el contenido.');
      await load();
    } catch (e) {
      flash?.('No se pudo aprobar: ' + (e?.message || 'error'));
    } finally { setBusy(''); }
  };

  const rechazar = async (r) => {
    if (readOnly || busy) return;
    setBusy(r.id);
    try {
      await getSupabase().from('proposal_requests').update({ status: 'rejected' }).eq('id', r.id);
      await load();
    } catch { flash?.('No se pudo rechazar.'); } finally { setBusy(''); }
  };

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-paper-mute">
          Pedidos de contenido. Cualquiera del equipo pide; al <b className="text-paper">aprobar</b> se crea sola una propuesta borrador lista para armar. El pedido puede ser para una creadora que <b className="text-paper">ya está</b> o una <b className="text-paper">nueva</b>.
        </p>
        {!readOnly && (
          <button onClick={() => setFormOpen(true)} className="btn3d inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
            <Plus size={15} /> Nuevo pedido
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pedido, brief o creadora…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[['pending', 'Pendientes', counts.pending], ['approved', 'Aprobados', counts.approved], ['rejected', 'Rechazados', counts.rejected], ['all', 'Todos', counts.all]].map(([id, label, n]) => (
            <button key={id} onClick={() => setChip(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                chip === id ? 'border-transparent bg-brand text-[#04222f]' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
              {label}{n > 0 && <span className={chip === id ? 'text-[#04222f]/60' : 'text-paper-dim'}>{n}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {loading && <p className="rounded-2xl border border-line bg-card px-5 py-10 text-center text-sm text-paper-dim">Cargando pedidos…</p>}
        {!loading && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-card/40 px-5 py-14 text-center">
            <Inbox size={22} className="text-paper-mute" />
            <p className="text-sm text-paper-mute">No hay pedidos {chip === 'pending' ? 'pendientes' : 'acá'}.</p>
            {!readOnly && <button onClick={() => setFormOpen(true)} className="mt-1 text-sm font-semibold text-brand hover:underline">Crear el primero</button>}
          </div>
        )}
        {shown.map((r) => {
          const st = STATUS_META[r.status] || STATUS_META.pending;
          const urgent = r.priority === 'urgent';
          return (
            <div key={r.id} className={`rounded-2xl border bg-card p-4 ${urgent && r.status === 'pending' ? 'border-rose-500/40' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-semibold text-paper">{r.title || 'Pedido'}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] font-semibold text-paper-mute">{TYPE_LABEL[r.proposal_type] || 'Visual'}</span>
                {urgent && <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-bold text-rose-300"><AlertTriangle size={11} /> Urgente</span>}
                <StatusDot tone={st.tone}>{st.label}</StatusDot>
              </div>
              <p className="mt-1 text-[12px] text-paper-dim">
                Para <b className="text-paper-mute">{r.creator_name || '—'}</b>{r.is_new_creator ? ' · nueva' : ''} · pedido por {r.created_by_name || '—'}
              </p>
              {r.brief && <p className="mt-2 whitespace-pre-wrap text-sm text-paper-mute" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.brief}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.status === 'pending' && !readOnly && (
                  <>
                    <button onClick={() => aprobar(r)} disabled={busy === r.id}
                      className="btn3d inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold disabled:opacity-60">
                      {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aprobar → crear propuesta
                    </button>
                    <button onClick={() => rechazar(r)} disabled={busy === r.id}
                      className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold disabled:opacity-60">
                      <X size={14} /> Rechazar
                    </button>
                  </>
                )}
                {r.status === 'approved' && r.proposal_link_id && (
                  <a href={`/propuestas?edit=${encodeURIComponent(r.proposal_link_id)}`}
                    className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold">
                    <Pencil size={14} /> Armar la propuesta · <span className="font-mono text-[11px]">{r.proposal_link_id}</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {formOpen && (
        <NuevoPedido creators={creators} me={me}
          onClose={() => setFormOpen(false)}
          onCreated={() => { setFormOpen(false); setChip('pending'); load(); }}
          flash={flash} />
      )}
    </div>
  );
}

// ── Formulario de nuevo pedido (modal) ──────────────────────────────────────
function NuevoPedido({ creators, me, onClose, onCreated, flash }) {
  const [mode, setMode] = useState('existing'); // existing | new
  const [creatorId, setCreatorId] = useState('');
  const [nn, setNn] = useState({ name: '', email: '', handle: '' });
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [type, setType] = useState('visual');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!title.trim()) { setErr('Ponle un título al pedido.'); return; }
    let dest;
    if (mode === 'existing') {
      const c = creators.find((x) => x.id === creatorId);
      if (!c) { setErr('Elegí una creadora del roster.'); return; }
      dest = { creator_user_id: c.id, creator_name: c.stage_name || c.full_name || c.email || '', creator_email: c.email || '', creator_handle: c.handle || '', is_new_creator: false };
    } else {
      if (!nn.name.trim()) { setErr('Ponle el nombre de la creadora nueva.'); return; }
      dest = { creator_user_id: null, creator_name: nn.name.trim(), creator_email: nn.email.trim(), creator_handle: nn.handle.trim().replace(/^@/, ''), is_new_creator: true };
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().from('proposal_requests').insert({
        created_by: me?.id || null, created_by_name: me?.full_name || 'Equipo',
        ...dest, title: title.trim(), brief: brief.trim(), proposal_type: type, priority, status: 'pending',
      });
      if (error) throw error;
      flash?.('Pedido creado.');
      onCreated();
    } catch (e) { setErr(e?.message || 'No se pudo crear.'); setBusy(false); }
  };

  const Seg = ({ value, set, options }) => (
    <div className="inline-flex flex-wrap rounded-full border border-line bg-ink-2 p-1">
      {options.map(([id, l, tone]) => (
        <button key={id} type="button" onClick={() => set(id)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === id ? (tone === 'bad' ? 'bg-rose-500/15 text-rose-300' : 'bg-brand/15 text-brand') : 'text-paper-mute hover:text-paper'}`}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/70 p-5 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-paper">Nuevo pedido</h3>
          <button onClick={onClose} className="rounded-full p-1 text-paper-dim hover:text-paper"><X size={18} /></button>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-paper-dim">Creadora</label>
          <Seg value={mode} set={setMode} options={[['existing', 'Ya está'], ['new', 'Es nueva']]} />
          {mode === 'existing' ? (
            <select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
              <option value="">Elegí una creadora…</option>
              {creators.map((c) => (<option key={c.id} value={c.id} className="bg-ink">{c.stage_name || c.full_name || c.email}</option>))}
            </select>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input value={nn.name} onChange={(e) => setNn((v) => ({ ...v, name: e.target.value }))} placeholder="Nombre" className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
              <input value={nn.email} onChange={(e) => setNn((v) => ({ ...v, email: e.target.value }))} placeholder="Correo (para invitarla)" className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
              <input value={nn.handle} onChange={(e) => setNn((v) => ({ ...v, handle: e.target.value }))} placeholder="@usuario (opcional)" className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60 sm:col-span-2" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-paper-dim">Título del pedido</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Set nocturno · neón" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
        </div>

        <div className="mt-3 flex flex-wrap gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-paper-dim">Tipo</label>
            <Seg value={type} set={setType} options={[['visual', 'Visual'], ['audio', 'Audio'], ['both', 'Ambas']]} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-paper-dim">Prioridad</label>
            <Seg value={priority} set={setPriority} options={[['normal', 'Normal'], ['urgent', 'Urgente', 'bad']]} />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-paper-dim">Qué se pide (brief)</label>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} placeholder="Describí el contenido: ideas, looks, referencias…"
            className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
        </div>

        {err && <p className="mt-3 text-[12px] text-rose-300">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn3d-ghost rounded-xl px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn3d inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Crear pedido
          </button>
        </div>
      </div>
    </div>
  );
}
