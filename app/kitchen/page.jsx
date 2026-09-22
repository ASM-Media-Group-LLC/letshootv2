'use client';

// /kitchen — "La cocina" (dashboard high-level, con pestañas).
//   Resumen · Modelos · Cocinar · Resultados · Gastos
// Pipeline REAL (Soul 2.0 de la cuenta Higgsfield, vía CLI oficial):
//   elegís modelo → elegís virales (pestañas: Lo que tengo · Lo que encontré · Subir)
//   → van a la COLA → el motor las cocina con SU soul real → ANTES/DESPUÉS → aprobás → baúl IA.
// La generación de las souls reales corre por el CLI logueado (no por el edge). El /kitchen
// encola; el "worker" (CLI) las procesa y escribe el resultado en `generations`.
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, Sparkles, IdCard, Coins, RefreshCw,
  Heart, Trash2, LayoutDashboard, Users, Flame, Images, Wallet, ArrowRight, AlertTriangle, X,
  FolderHeart, Compass, Upload, Plus, Check, ChefHat as Pot,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}
const money = (n) => `US$${(Number(n) || 0).toFixed(3)}`;

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'modelos', label: 'Modelos', icon: Users },
  { id: 'cocinar', label: 'Cocinar', icon: Flame },
  { id: 'resultados', label: 'Resultados', icon: Images },
  { id: 'gastos', label: 'Gastos', icon: Wallet },
];

// Fuentes del selector de fotos.
const SOURCES = [
  { id: 'encontre', label: 'Lo que encontré', icon: Compass, hint: 'Referencias y virales guardadas' },
  { id: 'tengo', label: 'Lo que tengo', icon: FolderHeart, hint: 'Fotos reales de la modelo' },
  { id: 'subir', label: 'Subir', icon: Upload, hint: 'Una foto nueva del momento' },
];
const VIBES = ['Todos', 'Casual', 'Sensual', 'Editorial', 'Playa', 'Fitness', 'Fiesta'];

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [tab, setTab] = useState('cocinar');
  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');
  const [ident, setIdent] = useState({});        // creator_id -> {status, character_id, n_photos}
  const [realCount, setRealCount] = useState({}); // creator_id -> nº fotos reales
  const [summary, setSummary] = useState({ credits: 0, usd: 0, images: 0 });
  const [vault, setVault] = useState([]);         // baúl completo (ref + real) con vibe
  const [gens, setGens] = useState([]);
  const [idBusy, setIdBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [compare, setCompare] = useState(null);

  // Cocinar
  const [source, setSource] = useState('encontre');
  const [vibe, setVibe] = useState('Todos');
  const [queue, setQueue] = useState([]);         // urls seleccionadas para encolar
  const [enq, setEnq] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sb = getSupabase();

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) {
      setSummary({ credits: out.total_credits || 0, usd: out.total_usd || 0, images: out.total_images || 0 });
      const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m);
    }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, usd, created_at').order('created_at', { ascending: false }).limit(80);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);
  const loadVault = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('id, url, caption, creator_id, kind, vibe').in('kind', ['ref', 'real']).order('created_at', { ascending: false }).limit(500);
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
  const modelsReady = creators.filter((c) => ident[c.id]?.status === 'ready').length;

  // Fotos que muestra el selector según fuente + vibe.
  const pickPhotos = useMemo(() => {
    let rows = [];
    if (source === 'tengo') rows = vault.filter((r) => r.kind === 'real' && (!sel || r.creator_id === sel));
    else if (source === 'encontre') rows = vault.filter((r) => r.kind === 'ref');
    else rows = vault.filter((r) => r.kind === 'ref' && r.creator_id === sel); // 'subir' muestra lo subido de esta modelo
    if (vibe !== 'Todos') rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    return rows.slice(0, 120);
  }, [vault, source, vibe, sel]);

  const createIdentity = async (creatorId) => {
    const c = creators.find((x) => x.id === creatorId);
    setIdBusy(creatorId); setMsg(null);
    const { data: rows } = await sb.from('creator_vault').select('url').eq('creator_id', creatorId).eq('kind', 'real').limit(20);
    const urls = (rows || []).map((r) => r.url).filter(Boolean);
    if (urls.length < 3) { setIdBusy(''); setMsg({ kind: 'err', text: `${c?.full_name || 'Esta modelo'} tiene ${urls.length} foto(s) real(es). Se necesitan 5+ para su cara. Subí más en Propuestas → baúl → "Real de la modelo".` }); return; }
    const out = await callFn('create_character', { creator_id: creatorId, name: c?.full_name || 'Modelo', image_urls: urls });
    setIdBusy('');
    if (!out.ok || !out.character_id) { setMsg({ kind: 'err', text: out.error || 'No se pudo crear la identidad.' }); return; }
    setMsg({ kind: 'ok', text: `Identidad de ${c?.full_name || 'la modelo'} creada ✓` }); loadSummary();
  };

  const toggleQueue = (url) => setQueue((q) => q.includes(url) ? q.filter((u) => u !== url) : [...q, url]);

  // Encolar: crea filas 'queued' en generations (las cocina el worker/CLI).
  const enqueue = async () => {
    if (!sel) { setTab('cocinar'); setMsg({ kind: 'info', text: 'Elegí una modelo primero (arriba).' }); return; }
    if (!selReady) { setMsg({ kind: 'err', text: 'Esa modelo todavía no tiene identidad. Creala en Modelos.' }); return; }
    if (queue.length === 0) { setMsg({ kind: 'info', text: 'Elegí al menos una foto (tocá para seleccionar).' }); return; }
    setEnq(true);
    const rows = queue.map((u) => ({ creator_id: sel, reference_url: u, status: 'queued', engine: 'soul2', model: 'text2image_soul_v2' }));
    const { error } = await sb.from('generations').insert(rows);
    setEnq(false);
    if (error) { setMsg({ kind: 'err', text: `No se pudo encolar: ${error.message}` }); return; }
    setMsg({ kind: 'ok', text: `${queue.length} foto(s) en la cola. El motor las va cocinando con la Julia real → aparecen en Resultados.` });
    setQueue([]); loadGens();
  };

  const onUpload = async (files) => {
    if (!sel) { setMsg({ kind: 'info', text: 'Elegí una modelo primero para subir su referencia.' }); return; }
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
      setMsg({ kind: 'ok', text: `${list.length} foto(s) subida(s). Ya podés seleccionarlas y mandarlas a la cola.` });
    } catch (e) {
      setMsg({ kind: 'err', text: `No se pudo subir: ${e?.message || e}` });
    }
    setUploading(false);
  };

  const decide = async (g, approve) => {
    await callFn('approve_gen', { generation_id: g.id, approve });
    setCompare(null); loadGens();
    setMsg({ kind: approve ? 'ok' : 'info', text: approve ? 'Aprobada — va al baúl IA de la modelo ✓' : 'Descartada.' });
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

  const pending = gens.filter((g) => ['queued', 'in_progress'].includes(g.status));
  const toReview = gens.filter((g) => g.status === 'done');
  const approved = gens.filter((g) => g.status === 'approved');

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin"><ArrowLeft size={17} /></Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute"><ChefHat size={13} className="text-brand" /> Kitchen</div>
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-paper">La cocina de contenido</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2">
              <Coins size={15} className="text-amber-300" />
              <div className="text-right leading-tight">
                <div className="text-sm font-bold tabular-nums text-paper">{summary.credits.toFixed(1)} créd.</div>
                <div className="text-[10px] text-paper-dim">{summary.images} fotos generadas</div>
              </div>
            </div>
          </div>
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon; const on = tab === t.id;
              const badge = t.id === 'resultados' ? (toReview.length || null) : t.id === 'modelos' ? (modelsReady || null) : null;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${on ? 'border-brand text-brand' : 'border-transparent text-paper-mute hover:text-paper'}`}>
                  <Icon size={15} /> {t.label}
                  {badge ? <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${on ? 'bg-brand text-on-accent' : 'bg-hair/20 text-paper-mute'}`}>{badge}</span> : null}
                </button>
              );
            })}
          </nav>
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

        {(tab === 'cocinar' || tab === 'resultados') && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-paper-dim">Modelo</span>
            <select value={sel} onChange={(e) => { setSel(e.target.value); }} className="min-w-[200px] rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60">
              <option value="">— Elegí una modelo —</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.full_name}{ident[c.id]?.status === 'ready' ? ' · ✓' : ''}</option>)}
            </select>
            {sel && (selReady
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"><IdCard size={14} /> Identidad lista</span>
              : <button type="button" onClick={() => setTab('modelos')} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"><AlertTriangle size={13} /> Sin identidad · crear en Modelos</button>)}
            {pending.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs font-semibold text-amber-300"><Loader2 size={13} className="animate-spin" /> {pending.length} en la cola</span>}
          </div>
        )}

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Créditos gastados', value: summary.credits.toFixed(1), sub: `${summary.images} fotos`, icon: Wallet, tone: 'text-amber-300' },
              { label: 'Fotos generadas', value: summary.images, sub: 'con soul real', icon: Images, tone: 'text-brand' },
              { label: 'Modelos listas', value: `${modelsReady}/${creators.length}`, sub: 'con identidad', icon: Users, tone: 'text-emerald-300' },
              { label: 'Para revisar', value: toReview.length, sub: pending.length ? `${pending.length} en la cola` : 'al día', icon: Flame, tone: 'text-rose-300' },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card3d rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-paper-dim">{k.label}</span><Icon size={16} className={k.tone} /></div>
                  <div className="mt-2 font-display text-2xl font-bold tabular-nums text-paper">{k.value}</div>
                  <div className="mt-0.5 text-[11px] text-paper-dim">{k.sub}</div>
                </div>
              );
            })}
            <div className="card3d col-span-full rounded-2xl border border-line bg-card p-5">
              <h3 className="font-display text-sm font-bold text-paper">Cómo funciona</h3>
              <ol className="mt-2 space-y-1.5 text-sm text-paper-mute">
                <li><b className="text-paper">1.</b> En <b>Modelos</b>, cada creadora se enlaza con su <b>soul real</b> de Higgsfield (Soul 2.0).</li>
                <li><b className="text-paper">2.</b> En <b>Cocinar</b>, elegís la modelo y seleccionás <b>varias virales</b> → van a la <b>cola</b>.</li>
                <li><b className="text-paper">3.</b> El motor las cocina con SU cara y aparecen en <b>Resultados</b>: ves el <b>antes/después</b> y aprobás → baúl IA.</li>
                <li className="text-paper-dim">4. El scraper (Apify · Instagram por nicho) llenará el feed de virales solo.</li>
              </ol>
              <button type="button" onClick={() => setTab('cocinar')} className="btn3d mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">Ir a Cocinar <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        {/* ── MODELOS ── */}
        {tab === 'modelos' && (
          <div className="space-y-2.5">
            <p className="text-sm text-paper-mute">Cada creadora se conecta con su <b>soul real</b> entrenada en Higgsfield (Soul 2.0) para que el motor haga SU cara. Se enlaza desde el CLI (te lo dejo mapeado yo).</p>
            {creators.map((c) => {
              const id = ident[c.id]; const nreal = realCount[c.id] || 0; const ready = id?.status === 'ready';
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-xs font-bold text-brand">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.full_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-paper">{c.full_name}</div>
                    <div className="text-[11px] text-paper-dim">{nreal} foto{nreal === 1 ? '' : 's'} real{nreal === 1 ? '' : 'es'}{ready ? ` · soul ${String(id.character_id).slice(0, 8)}…` : ''}</div>
                  </div>
                  {ready ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={14} /> Soul real enlazada</span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-paper-dim" title="Se enlaza su soul de Higgsfield desde el CLI"><AlertTriangle size={12} className="text-amber-400" /> Sin soul enlazada</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── COCINAR ── */}
        {tab === 'cocinar' && (
          <div>
            {/* Sub-pestañas de fuente */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {SOURCES.map((s) => {
                const Icon = s.icon; const on = source === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => setSource(s.id)} title={s.hint}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
                    <Icon size={14} /> {s.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => { loadGens(); loadVault(); loadSummary(); }} className="btn3d-ghost ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"><RefreshCw size={13} /> Actualizar</button>
            </div>

            {/* Chips de vibe */}
            {source !== 'subir' && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {VIBES.map((v) => (
                  <button key={v} type="button" onClick={() => setVibe(v)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${vibe === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:text-paper'}`}>{v}</button>
                ))}
              </div>
            )}

            {/* SUBIR */}
            {source === 'subir' ? (
              <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card/40 p-10 text-center transition-colors hover:border-brand/40 ${!sel ? 'opacity-60' : ''}`}>
                <input type="file" accept="image/*" multiple className="hidden" disabled={!sel || uploading} onChange={(e) => onUpload(e.target.files)} />
                {uploading ? <Loader2 size={26} className="animate-spin text-brand" /> : <Upload size={26} className="text-paper-dim" />}
                <div className="text-sm font-semibold text-paper">{uploading ? 'Subiendo…' : 'Subí una foto de referencia'}</div>
                <div className="text-xs text-paper-dim">{sel ? `Se guarda en el baúl de ${selCreator?.full_name || 'la modelo'} y podés mandarla a la cola.` : 'Elegí una modelo primero (arriba).'}</div>
              </label>
            ) : pickPhotos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">
                {source === 'tengo' ? 'Esta modelo no tiene fotos reales cargadas todavía.' : 'No hay referencias con este filtro. Probá otra vibe o subí fotos.'}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {pickPhotos.map((r) => {
                  const on = queue.includes(r.url);
                  return (
                    <button key={r.id} type="button" onClick={() => toggleQueue(r.url)}
                      className={`group relative overflow-hidden rounded-xl border bg-ink-2 text-left transition-all ${on ? 'border-brand ring-2 ring-brand/50' : 'border-line hover:border-brand/40'}`}>
                      <img src={r.url} alt="" className="aspect-[3/4] w-full object-cover" />
                      <div className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${on ? 'border-brand bg-brand text-on-accent' : 'border-white/50 bg-black/40 text-transparent group-hover:text-white/70'}`}>
                        <Check size={13} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {tab === 'resultados' && (
          <div>
            {pending.length > 0 && <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-300"><Loader2 size={13} className="animate-spin" /> {pending.length} en la cola, cocinándose…</p>}
            {toReview.length === 0 && approved.length === 0 && pending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no hay nada. Andá a <button onClick={() => setTab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>, elegí virales y mandalas a la cola.</p>
            ) : (
              <>
                {toReview.length > 0 && <h3 className="mb-2 font-display text-sm font-bold text-paper">Para revisar · {toReview.length}</h3>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {toReview.map((g) => (
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
                {approved.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-6 font-display text-sm font-bold text-paper">Aprobadas · {approved.length}</h3>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                      {approved.map((g) => (
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

        {/* ── GASTOS ── */}
        {tab === 'gastos' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Créditos gastados</div><div className="mt-1 font-display text-2xl font-bold text-paper">{summary.credits.toFixed(2)}</div></div>
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Fotos generadas</div><div className="mt-1 font-display text-2xl font-bold text-paper">{summary.images}</div></div>
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Costo por foto</div><div className="mt-1 font-display text-2xl font-bold text-paper">{summary.images ? (summary.credits / summary.images).toFixed(2) : '—'}</div><div className="text-[11px] text-paper-dim">créditos/foto</div></div>
            </div>
            <div className="card3d rounded-2xl border border-line bg-card p-4">
              <h3 className="mb-2 font-display text-sm font-bold text-paper">Últimas generaciones</h3>
              {gens.length === 0 ? <p className="text-sm text-paper-dim">Sin movimientos.</p> : (
                <div className="space-y-1.5">
                  {gens.slice(0, 15).map((g) => {
                    const c = creators.find((x) => x.id === g.creator_id);
                    return (
                      <div key={g.id} className="flex items-center gap-3 border-b border-line/60 py-1.5 text-sm last:border-0">
                        <span className="min-w-0 flex-1 truncate text-paper">{c?.full_name || '—'}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : g.status === 'failed' ? 'bg-rose-500/15 text-rose-300' : g.status === 'queued' ? 'bg-amber-500/15 text-amber-300' : 'bg-hair/15 text-paper-mute'}`}>{g.status}</span>
                        <span className="shrink-0 tabular-nums text-paper-mute">{g.credits ? `${Number(g.credits).toFixed(2)} cr` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Barra flotante de cola (en Cocinar) */}
      {tab === 'cocinar' && queue.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-card px-4 py-3 shadow-lg shadow-black/30 lg:px-6">
          <div className="flex items-center gap-2 text-sm text-paper">
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand px-2 text-xs font-bold text-on-accent">{queue.length}</span>
            <span className="font-semibold">seleccionada{queue.length === 1 ? '' : 's'}</span>
            {selCreator && <span className="text-paper-dim">→ {selCreator.full_name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQueue([])} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">Limpiar</button>
            <button type="button" onClick={enqueue} disabled={enq} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {enq ? <Loader2 size={14} className="animate-spin" /> : <Pot size={14} />} Mandar {queue.length} a la cola
            </button>
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
