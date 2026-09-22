'use client';

// /kitchen — "La cocina" (dashboard high-level, CENTRADO EN LA MODELO).
// Flujo lineal: 1) Elegí la modelo (fácil, con buscador) → 2) su cocina: elegís virales
// (pestañas: Lo que tengo · Lo que encontré · Subir + vibe) → cola → 3) sus Resultados
// (Antes/Después → Aprobar → baúl IA). El gasto se ve POR MODELO en su cabecera.
// Motor real = Soul 2.0 de la cuenta Higgsfield (soul entrenada), vía CLI oficial.
// /kitchen encola (generations queued); el "worker" (CLI logueado) las cocina.
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, Sparkles, IdCard, Coins, RefreshCw,
  Heart, Trash2, Flame, Images, ArrowRight, AlertTriangle, X, Search,
  FolderHeart, Compass, Upload, Check, ChefHat as Pot,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}

const SOURCES = [
  { id: 'encontre', label: 'Lo que encontré', icon: Compass },
  { id: 'tengo', label: 'Lo que tengo', icon: FolderHeart },
  { id: 'subir', label: 'Subir', icon: Upload },
];
const VIBES = ['Todos', 'Casual', 'Sensual', 'Editorial', 'Playa', 'Fitness', 'Fiesta'];
// Valor aprox del crédito Higgsfield (Soul 2.0 ≈ 0.12 créd ≈ US$0.011/foto). Ajustable.
const USD_PER_CREDIT = 0.09;
const money = (credits) => `US$${(Number(credits || 0) * USD_PER_CREDIT).toFixed(2)}`;

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');              // modelo elegida (si vacío → pantalla de elegir modelo)
  const [subtab, setSubtab] = useState('cocinar'); // dentro de la modelo: cocinar | resultados
  const [ident, setIdent] = useState({});
  const [realCount, setRealCount] = useState({});
  const [vault, setVault] = useState([]);
  const [gens, setGens] = useState([]);
  const [msg, setMsg] = useState(null);
  const [compare, setCompare] = useState(null);
  const [q, setQ] = useState('');                  // buscador de modelos

  // Cocinar
  const [source, setSource] = useState('encontre');
  const [vibe, setVibe] = useState('Todos');
  const [queue, setQueue] = useState([]);
  const [enq, setEnq] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sb = getSupabase();

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) { const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m); }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, created_at').order('created_at', { ascending: false }).limit(200);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);
  const loadVault = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('id, url, caption, creator_id, kind, vibe').in('kind', ['ref', 'real']).order('created_at', { ascending: false }).limit(600);
    const allV = Array.isArray(data) ? data : [];
    setVault(allV);
    const rc = {}; allV.filter((r) => r.kind === 'real').forEach((r) => { rc[r.creator_id] = (rc[r.creator_id] || 0) + 1; }); setRealCount(rc);
  }, [sb]);

  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      try { const { data } = await sb.rpc('team_creators'); if (Array.isArray(data)) setCreators(data.filter((c) => c?.id && c?.full_name && c.onboarding_status === 'active')); } catch {}
      loadVault(); loadSummary(); loadGens();
    })();
  }, [access, sb, loadVault, loadSummary, loadGens]);

  const selCreator = creators.find((c) => c.id === sel) || null;
  const selReady = ident[sel]?.status === 'ready';

  // Métricas por modelo (de las generaciones cargadas).
  const statsFor = useCallback((cid) => {
    const rows = gens.filter((g) => g.creator_id === cid);
    return {
      credits: rows.filter((g) => g.status !== 'failed').reduce((a, g) => a + Number(g.credits || 0), 0),
      review: rows.filter((g) => g.status === 'done').length,
      approved: rows.filter((g) => g.status === 'approved').length,
      pending: rows.filter((g) => ['queued', 'in_progress'].includes(g.status)).length,
      total: rows.filter((g) => g.status !== 'failed').length,
    };
  }, [gens]);
  const mine = statsFor(sel);

  const pickPhotos = useMemo(() => {
    let rows = [];
    if (source === 'tengo') rows = vault.filter((r) => r.kind === 'real' && r.creator_id === sel);
    else if (source === 'encontre') rows = vault.filter((r) => r.kind === 'ref');
    else rows = vault.filter((r) => r.kind === 'ref' && r.creator_id === sel);
    if (vibe !== 'Todos') rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    return rows.slice(0, 120);
  }, [vault, source, vibe, sel]);

  const enterModel = (id) => { setSel(id); setSubtab('cocinar'); setQueue([]); setMsg(null); setSource('encontre'); setVibe('Todos'); };
  const toggleQueue = (url) => setQueue((k) => k.includes(url) ? k.filter((u) => u !== url) : [...k, url]);

  const enqueue = async () => {
    if (!selReady) { setMsg({ kind: 'err', text: `${selCreator?.full_name || 'Esta modelo'} todavía no tiene su soul enlazada. Avisame y la enlazo.` }); return; }
    if (queue.length === 0) { setMsg({ kind: 'info', text: 'Tocá al menos una foto para seleccionarla.' }); return; }
    setEnq(true);
    const rows = queue.map((u) => ({ creator_id: sel, reference_url: u, status: 'queued', engine: 'soul2', model: 'text2image_soul_v2' }));
    const { error } = await sb.from('generations').insert(rows);
    setEnq(false);
    if (error) { setMsg({ kind: 'err', text: `No se pudo encolar: ${error.message}` }); return; }
    const n = queue.length;
    setQueue([]); loadGens();
    setMsg({ kind: 'ok', text: `${n} foto(s) en la cola de ${selCreator?.full_name || 'la modelo'}. Se cocinan con su soul real y aparecen en Resultados.` });
    setSubtab('resultados');
  };

  const onUpload = async (files) => {
    const list = Array.from(files || []).slice(0, 10);
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
      setSource('subir');
      setMsg({ kind: 'ok', text: `${list.length} foto(s) subida(s). Seleccionalas y mandalas a la cola.` });
    } catch (e) { setMsg({ kind: 'err', text: `No se pudo subir: ${e?.message || e}` }); }
    setUploading(false);
  };

  const decide = async (g, approve) => {
    await callFn('approve_gen', { generation_id: g.id, approve });
    setCompare(null); loadGens();
    setMsg({ kind: approve ? 'ok' : 'info', text: approve ? 'Aprobada — va a su baúl IA ✓' : 'Descartada.' });
  };

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
        <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold text-paper">Solo admin o supervisor</h1>
          <Link href="/admin" className="btn3d-ghost mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><ArrowLeft size={15} /> Volver</Link>
        </div>
      </div>
    );
  }

  const filteredCreators = creators.filter((c) => c.full_name.toLowerCase().includes(q.trim().toLowerCase()));
  const totalCredits = gens.filter((g) => g.status !== 'failed').reduce((a, g) => a + Number(g.credits || 0), 0);
  const reviewRows = gens.filter((g) => g.creator_id === sel && g.status === 'done');
  const approvedRows = gens.filter((g) => g.creator_id === sel && g.status === 'approved');
  const pendingRows = gens.filter((g) => g.creator_id === sel && ['queued', 'in_progress'].includes(g.status));

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin"><ArrowLeft size={17} /></Link>
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
        {msg && (
          <div className={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${msg.kind === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : msg.kind === 'err' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-line bg-card text-paper-mute'}`}>
            {msg.kind === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : msg.kind === 'err' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Sparkles size={16} className="mt-0.5 shrink-0" />}
            <span className="min-w-0 flex-1 break-words">{msg.text}</span>
            <button type="button" onClick={() => setMsg(null)} className="shrink-0 opacity-70 hover:opacity-100"><X size={14} /></button>
          </div>
        )}

        {/* ══════════ PASO 1 — ELEGÍ LA MODELO ══════════ */}
        {!sel && (
          <div>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-paper">Elegí la modelo</h1>
                <p className="mt-1 text-sm text-paper-mute">Tocá una modelo para entrar a su cocina.</p>
              </div>
              <div className="shrink-0 rounded-xl border border-line bg-card px-3.5 py-2 text-center" title={`${totalCredits.toFixed(2)} créditos · Higgsfield Soul 2.0`}>
                <div className="text-base font-bold tabular-nums text-amber-300">{money(totalCredits)}</div>
                <div className="text-[10px] text-paper-dim">gastado en total</div>
              </div>
            </div>
            <div className="relative mb-5 max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo…" className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
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
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="rounded-xl border border-line bg-ink-2 px-3 py-2 text-center" title={`${mine.credits.toFixed(2)} créditos · ~US$0.011/foto`}>
                  <div className="text-sm font-bold tabular-nums text-amber-300">{money(mine.credits)}</div>
                  <div className="text-[10px] text-paper-dim">gastado · {mine.credits.toFixed(1)} créd</div>
                </div>
                <div className="rounded-xl border border-line bg-ink-2 px-3 py-2 text-center">
                  <div className="text-sm font-bold tabular-nums text-paper">{mine.total}</div>
                  <div className="text-[10px] text-paper-dim">fotos</div>
                </div>
                <button type="button" onClick={() => { loadGens(); loadVault(); loadSummary(); }} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-paper-mute hover:text-paper" title="Actualizar"><RefreshCw size={15} /></button>
              </div>
            </div>

            {/* Sub-pestañas de la modelo */}
            <div className="mb-4 flex gap-1 border-b border-line">
              {[{ id: 'cocinar', label: 'Cocinar', icon: Flame }, { id: 'resultados', label: 'Resultados', icon: Images, badge: reviewRows.length || null }].map((t) => {
                const Icon = t.icon; const on = subtab === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setSubtab(t.id)}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${on ? 'border-brand text-brand' : 'border-transparent text-paper-mute hover:text-paper'}`}>
                    <Icon size={15} /> {t.label}
                    {t.badge ? <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${on ? 'bg-brand text-on-accent' : 'bg-hair/20 text-paper-mute'}`}>{t.badge}</span> : null}
                    {t.id === 'resultados' && pendingRows.length > 0 ? <Loader2 size={12} className="animate-spin text-amber-300" /> : null}
                  </button>
                );
              })}
            </div>

            {/* ── COCINAR ── */}
            {subtab === 'cocinar' && (
              <div className="pb-24">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {SOURCES.map((s) => {
                    const Icon = s.icon; const on = source === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setSource(s.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
                        <Icon size={14} /> {s.label}
                      </button>
                    );
                  })}
                </div>

                {source !== 'subir' && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {VIBES.map((v) => (
                      <button key={v} type="button" onClick={() => setVibe(v)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${vibe === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:text-paper'}`}>{v}</button>
                    ))}
                  </div>
                )}

                {source === 'subir' ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card/40 p-10 text-center transition-colors hover:border-brand/40">
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => onUpload(e.target.files)} />
                    {uploading ? <Loader2 size={26} className="animate-spin text-brand" /> : <Upload size={26} className="text-paper-dim" />}
                    <div className="text-sm font-semibold text-paper">{uploading ? 'Subiendo…' : 'Subí una foto de referencia'}</div>
                    <div className="text-xs text-paper-dim">Se guarda en el baúl de {selCreator.full_name} y la podés mandar a la cola.</div>
                  </label>
                ) : pickPhotos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">
                    {source === 'tengo' ? `${selCreator.full_name} no tiene fotos reales cargadas todavía.` : 'No hay referencias con este filtro. Probá otra vibe o subí fotos.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {pickPhotos.map((r) => {
                      const on = queue.includes(r.url);
                      return (
                        <button key={r.id} type="button" onClick={() => toggleQueue(r.url)}
                          className={`group relative overflow-hidden rounded-xl border bg-ink-2 text-left transition-all ${on ? 'border-brand ring-2 ring-brand/50' : 'border-line hover:border-brand/40'}`}>
                          <img src={r.url} alt="" className="aspect-[3/4] w-full object-cover" />
                          <div className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${on ? 'border-brand bg-brand text-on-accent' : 'border-white/50 bg-black/40 text-transparent group-hover:text-white/70'}`}><Check size={13} /></div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── RESULTADOS (de esta modelo) ── */}
            {subtab === 'resultados' && (
              <div>
                {pendingRows.length > 0 && <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-300"><Loader2 size={13} className="animate-spin" /> {pendingRows.length} en la cola, cocinándose…</p>}
                {reviewRows.length === 0 && approvedRows.length === 0 && pendingRows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no cocinaste nada para {selCreator.full_name}. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</p>
                ) : (
                  <>
                    {reviewRows.length > 0 && <h3 className="mb-2 font-display text-sm font-bold text-paper">Para revisar · {reviewRows.length}</h3>}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {reviewRows.map((g) => (
                        <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                          <button type="button" onClick={() => setCompare({ reference_url: g.reference_url, result_url: g.result_url, generation_id: g.id, creator_id: g.creator_id })} className="block w-full">
                            {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                          </button>
                          <div className="flex items-center gap-1 p-2">
                            <button type="button" onClick={() => decide(g, true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30"><Heart size={12} /> Aprobar</button>
                            <button type="button" onClick={() => decide(g, false)} className="inline-flex items-center justify-center rounded-full border border-line px-2 py-1.5 text-paper-mute hover:text-rose-300"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {approvedRows.length > 0 && (
                      <>
                        <h3 className="mb-2 mt-6 font-display text-sm font-bold text-paper">Aprobadas · {approvedRows.length}</h3>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                          {approvedRows.map((g) => (
                            <div key={g.id} className="overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                              {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barra flotante de cola */}
      {selCreator && subtab === 'cocinar' && queue.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand/30 bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2 text-sm text-paper">
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand px-2 text-xs font-bold text-on-accent">{queue.length}</span>
              <span className="font-semibold">para {selCreator.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQueue([])} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">Limpiar</button>
              <button type="button" onClick={enqueue} disabled={enq} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                {enq ? <Loader2 size={14} className="animate-spin" /> : <Pot size={14} />} Cocinar {queue.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ANTES / DESPUÉS ── */}
      {compare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setCompare(null)}>
          <div className="card3d flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="font-display text-base font-bold text-paper">Antes / Después</h3>
              <button type="button" onClick={() => setCompare(null)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper-mute hover:text-paper"><X size={15} /></button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-4">
              <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Viral (referencia)</div><img src={compare.reference_url} alt="" className="w-full rounded-xl border border-line object-cover" /></div>
              <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">Su versión</div><img src={compare.result_url} alt="" className="w-full rounded-xl border border-brand/40 object-cover" /></div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
              <button type="button" onClick={() => decide({ id: compare.generation_id, creator_id: compare.creator_id, result_url: compare.result_url }, false)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"><Trash2 size={14} /> Descartar</button>
              <button type="button" onClick={() => decide({ id: compare.generation_id, creator_id: compare.creator_id, result_url: compare.result_url }, true)} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold"><Heart size={14} /> Aprobar → baúl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
