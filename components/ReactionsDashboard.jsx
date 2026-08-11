'use client';

// Dashboard de reacciones (❤ likes + 💬 comentarios) sobre el contenido.
// Reutilizable: la agencia ve las suyas (RLS), el equipo/uploaders y el admin
// ven todo. Muestra total, detalle por modelo (de más a menos) e historial
// filtrable por modelo, por fecha y por tipo.
import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageSquare, Filter, ChevronDown, Check, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

const ROLE_LABEL = { creator: 'Modelo', agency: 'Agencia', team: 'Equipo', supervisor: 'Equipo', admin: 'Dueño' };

// canResolve: el equipo/uploaders puede marcar RESUELTO un cambio pedido.
// onResolved: callback para que el padre refresque contadores/Cola tras resolver.
export default function ReactionsDashboard({ creators = [], canResolve = false, onResolved }) {
  const [rows, setRows] = useState(null);       // feedback rows
  const [assets, setAssets] = useState({});     // asset_id -> {title}
  const [model, setModel] = useState('all');    // creator_id | all
  const [range, setRange] = useState('all');    // all | 30 | 7 | month
  const [kind, setKind] = useState('all');      // all | love | comment
  const [resolving, setResolving] = useState('');

  const nameOf = useMemo(() => {
    const m = {};
    for (const c of creators) m[c.id] = c.name || c.full_name || c.stage_name || 'Modelo';
    return m;
  }, [creators]);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.from('feedback')
        .select('id, creator_id, asset_id, kind, message, author_role, created_at, resolved')
        .order('created_at', { ascending: false });
      const fb = data || [];
      setRows(fb);
      const ids = [...new Set(fb.map((f) => f.asset_id).filter(Boolean))];
      if (ids.length) {
        const { data: as } = await supabase.from('assets').select('id, title, storage_path, type').in('id', ids);
        const isDirect = (p) => !p || p.startsWith('/') || p.startsWith('http');
        const toSign = (as || []).filter((a) => a.storage_path && !isDirect(a.storage_path)).map((a) => a.storage_path);
        const signed = {};
        if (toSign.length) {
          const { data: s } = await supabase.storage.from('deliveries').createSignedUrls(toSign, 3600);
          (s || []).forEach((x, i) => { if (x?.signedUrl) signed[toSign[i]] = x.signedUrl; });
        }
        const map = {};
        (as || []).forEach((a) => { map[a.id] = { ...a, url: isDirect(a.storage_path) ? a.storage_path : (signed[a.storage_path] || '') }; });
        setAssets(map);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    const cutoff = range === '7' ? now - 7 * 864e5
      : range === '30' ? now - 30 * 864e5
      : range === 'month' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
      : 0;
    return rows.filter((f) => {
      if (model !== 'all' && f.creator_id !== model) return false;
      if (kind === 'love' && f.kind !== 'love') return false;
      if (kind === 'comment' && !(f.message && f.message.trim())) return false;
      if (cutoff && new Date(f.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [rows, model, range, kind]);

  const totalLikes = filtered.filter((f) => f.kind === 'love').length;
  const totalComments = filtered.filter((f) => f.message && f.message.trim()).length;

  // Por modelo, de más a menos likes.
  const perModel = useMemo(() => {
    const m = {};
    for (const f of filtered) {
      const k = f.creator_id;
      if (!m[k]) m[k] = { id: k, likes: 0, comments: 0 };
      if (f.kind === 'love') m[k].likes++;
      if (f.message && f.message.trim()) m[k].comments++;
    }
    return Object.values(m).sort((a, b) => b.likes - a.likes || b.comments - a.comments);
  }, [filtered]);

  const fmt = (d) => new Date(d).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' });

  async function resolve(id) {
    setResolving(id);
    const { error } = await getSupabase().from('feedback').update({ resolved: true }).eq('id', id);
    setResolving('');
    if (!error) {
      setRows((rs) => (rs || []).map((r) => (r.id === id ? { ...r, resolved: true } : r)));
      onResolved?.();
    }
  }

  const Sel = ({ value, onChange, children }) => (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-line bg-card py-2 pl-3.5 pr-9 text-xs font-medium text-paper outline-none focus:border-brand/60">
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim" />
    </div>
  );

  if (rows === null) return <p className="mt-6 text-sm text-paper-dim">Cargando reacciones…</p>;

  return (
    <div className="mt-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-paper-dim"><Heart size={13} className="text-rose-400" /> Likes</div>
          <div className="mt-1 font-display text-3xl font-bold text-paper">{totalLikes}</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-paper-dim"><MessageSquare size={13} className="text-brand" /> Comentarios</div>
          <div className="mt-1 font-display text-3xl font-bold text-paper">{totalComments}</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-line bg-card p-4 sm:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-paper-dim">Modelos con reacciones</div>
          <div className="mt-1 font-display text-3xl font-bold text-paper">{perModel.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-paper-dim"><Filter size={13} /> Filtrar:</span>
        <Sel value={model} onChange={setModel}>
          <option value="all">Todas las modelos</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name || c.full_name || 'Modelo'}</option>)}
        </Sel>
        <Sel value={range} onChange={setRange}>
          <option value="all">Siempre</option>
          <option value="month">Este mes</option>
          <option value="30">Últimos 30 días</option>
          <option value="7">Últimos 7 días</option>
        </Sel>
        <Sel value={kind} onChange={setKind}>
          <option value="all">Likes y comentarios</option>
          <option value="love">Solo likes</option>
          <option value="comment">Solo comentarios</option>
        </Sel>
      </div>

      {/* Por modelo — de más a menos */}
      {perModel.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Por modelo · de más a menos</div>
          <div className="overflow-hidden rounded-2xl border border-line">
            {perModel.map((m, i) => (
              <div key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <span className="min-w-0 truncate text-sm font-medium text-paper">{nameOf[m.id] || 'Modelo'}</span>
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-rose-300"><Heart size={13} className="fill-current" /> {m.likes}</span>
                  <span className="inline-flex items-center gap-1 text-brand"><MessageSquare size={13} /> {m.comments}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Historial · {filtered.length}</div>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Sin reacciones con estos filtros.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <div key={f.id} className="flex items-start gap-3 rounded-xl border border-line bg-card p-3">
                {(() => {
                  const a = assets[f.asset_id];
                  const badge = (
                    <span className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-card ${f.kind === 'love' ? 'bg-rose-500 text-white' : 'bg-brand text-on-accent'}`}>
                      {f.kind === 'love' ? <Heart size={10} className="fill-current" /> : <MessageSquare size={10} />}
                    </span>
                  );
                  return (
                    <span className="relative mt-0.5 block h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2">
                      {a?.url ? (a.type === 'video'
                        ? <video src={a.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={a.url} alt="" className="h-full w-full object-cover" />)
                        : <span className={`grid h-full w-full place-items-center ${f.kind === 'love' ? 'text-rose-300' : 'text-brand'}`}>{f.kind === 'love' ? <Heart size={16} className="fill-current" /> : <MessageSquare size={16} />}</span>}
                      {badge}
                    </span>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-semibold text-paper">{nameOf[f.creator_id] || 'Modelo'}</span>
                    <span className="text-paper-dim">·</span>
                    <span className="text-paper-mute">{f.kind === 'love' ? 'le encantó' : 'pidió un cambio'}</span>
                    {assets[f.asset_id]?.title && <><span className="text-paper-dim">·</span><span className="truncate text-paper-mute">{assets[f.asset_id].title}</span></>}
                  </div>
                  {f.message && f.message.trim() && <p className="mt-1 text-sm text-paper">“{f.message}”</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-paper-dim">
                    <span className="rounded-full bg-hair/10 px-2 py-0.5">{ROLE_LABEL[f.author_role] || 'Modelo'}</span>
                    <span>{fmt(f.created_at)}</span>
                    {f.kind === 'change' && (f.resolved
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300"><Check size={11} /> Resuelto</span>
                      : canResolve && <button onClick={() => resolve(f.id)} disabled={resolving === f.id}
                          className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-50">
                          {resolving === f.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Marcar resuelto
                        </button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
