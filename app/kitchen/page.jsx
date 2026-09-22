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
const fmtLikes = (n) => { const x = Number(n || 0); return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : `${x}`; };

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
  const [detail, setDetail] = useState(null);      // ficha de una foto de la mesa
  const [q, setQ] = useState('');                  // buscador de modelos

  // Cocinar
  const [source, setSource] = useState('encontre');
  const [vibe, setVibe] = useState('Todos');
  const [queue, setQueue] = useState([]);
  const [enq, setEnq] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Perfil de búsqueda por modelo (nichos) + scraper
  const [niches, setNiches] = useState([]);
  const [newNiche, setNewNiche] = useState('');
  const [styleDesc, setStyleDesc] = useState('');
  const [scraping, setScraping] = useState(false);
  const [balance, setBalance] = useState(null); // saldo real de Higgsfield (créditos)

  const sb = getSupabase();

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) { const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m); setBalance(out.balance ?? null); }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, note, created_at').order('created_at', { ascending: false }).limit(200);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);
  const loadVault = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('id, url, caption, creator_id, kind, vibe, likes, source_handle, source_url, source_platform, interest, ai_ok, ai_reason, created_at').in('kind', ['ref', 'real']).order('created_at', { ascending: false }).limit(600);
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

  // Auto-refresco: mientras haya algo cocinándose, recargar solo cada 6s (para que el resultado aparezca sin apretar nada).
  useEffect(() => {
    if (access !== 'ok') return;
    if (!gens.some((g) => ['queued', 'in_progress'].includes(g.status))) return;
    const t = setInterval(() => { loadGens(); }, 6000);
    return () => clearInterval(t);
  }, [access, gens, loadGens]);

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

  const sourceRows = useMemo(() => {
    if (source === 'tengo') return vault.filter((r) => r.kind === 'real' && r.creator_id === sel);
    if (source === 'encontre') return vault.filter((r) => r.kind === 'ref');
    return vault.filter((r) => r.kind === 'ref' && r.creator_id === sel);
  }, [vault, source, sel]);
  // Vibes que realmente tienen fotos etiquetadas (para no mostrar chips que dan grilla vacía).
  const vibeCounts = useMemo(() => {
    const m = {}; sourceRows.forEach((r) => { const v = (r.vibe || '').trim(); if (v) m[v] = (m[v] || 0) + 1; }); return m;
  }, [sourceRows]);
  const pickPhotos = useMemo(() => {
    // Fuera las descartadas y la basura que marcó la IA.
    let rows = sourceRows.filter((r) => r.interest !== 'descartada' && r.ai_ok !== false);
    if (vibe !== 'Todos' && vibeCounts[vibe]) rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    // Éxitos primero: más likes arriba (las scrapeadas tienen likes; las subidas a mano quedan después).
    return [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0)).slice(0, 120);
  }, [sourceRows, vibe, vibeCounts]);

  // Cargar el perfil de búsqueda (nichos) de la modelo elegida.
  useEffect(() => {
    if (!sel) { setNiches([]); setStyleDesc(''); return; }
    (async () => { const { data } = await sb.from('creator_search_profile').select('niches, style_desc').eq('creator_id', sel).maybeSingle(); setNiches(Array.isArray(data?.niches) ? data.niches : []); setStyleDesc(data?.style_desc || ''); })();
  }, [sel, sb]);

  const saveNiches = async (list) => {
    setNiches(list);
    await sb.from('creator_search_profile').upsert({ creator_id: sel, niches: list, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' });
  };
  const saveStyle = async () => { await sb.from('creator_search_profile').upsert({ creator_id: sel, style_desc: styleDesc, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' }); };
  const addNiche = () => { const v = newNiche.trim(); if (!v) return; if (!niches.includes(v)) saveNiches([...niches, v].slice(0, 8)); setNewNiche(''); };
  const doScrape = async () => {
    if (niches.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos un nicho (ej: gótica, playa) para buscar.' }); return; }
    setScraping(true); setMsg({ kind: 'info', text: 'Buscando virales en Instagram… (puede tardar 1-2 min)' });
    const out = await callFn('scrape', { creator_id: sel });
    setScraping(false);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || 'No se pudo buscar.' }); return; }
    await loadVault();
    setMsg({ kind: 'ok', text: `Encontré ${out.saved} virales para ${selCreator?.full_name}.${out.reviewed ? ` La IA revisó ${out.reviewed} y sacó la basura.` : ''} Aparecen abajo, éxitos arriba.` });
  };

  // Curación de la mesa
  const markInterest = async (row, val) => {
    await sb.from('creator_vault').update({ interest: val }).eq('id', row.id);
    setVault((v) => v.map((r) => (r.id === row.id ? { ...r, interest: val } : r)));
    if (val === 'descartada') { setDetail(null); setQueue((k) => k.filter((u) => u !== row.url)); }
  };
  const moreLikeThis = async (row) => {
    const niche = row.vibe || '';
    if (!niche) { setMsg({ kind: 'info', text: 'Esta foto no tiene nicho para buscar similares.' }); return; }
    setDetail(null); setScraping(true); setMsg({ kind: 'info', text: `Buscando más como esta (#${niche})…` });
    const out = await callFn('scrape', { creator_id: sel, niches: [niche] });
    setScraping(false);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || 'No se pudo buscar.' }); return; }
    await loadVault();
    setMsg({ kind: 'ok', text: `Traje ${out.saved} similares a "#${niche}".` });
  };
  const cookFromDetail = (row) => { if (!queue.includes(row.url)) setQueue((k) => [...k, row.url]); setDetail(null); setMsg({ kind: 'info', text: 'Agregada a la selección. Dale "Cocinar" abajo (o elegí más).' }); };

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
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
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

  // Reintentar una rechazada: la vuelve a la cola.
  const retry = async (g) => {
    await sb.from('generations').update({ status: 'queued', note: null, result_url: null }).eq('id', g.id);
    loadGens();
    setMsg({ kind: 'info', text: 'La mandé de nuevo a la cola.' });
  };

  // Referencias que esta modelo YA cocinó (para marcarlas en el selector).
  const cookedRefs = useMemo(() => new Set(gens.filter((g) => g.creator_id === sel && g.reference_url && g.status !== 'failed').map((g) => g.reference_url)), [gens, sel]);

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
  const failedRows = gens.filter((g) => g.creator_id === sel && g.status === 'failed');

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
              <div className="flex shrink-0 items-center gap-2">
                <div className="rounded-xl border border-line bg-card px-3.5 py-2 text-center" title={`${totalCredits.toFixed(2)} créditos gastados en la app`}>
                  <div className="text-base font-bold tabular-nums text-amber-300">{money(totalCredits)}</div>
                  <div className="text-[10px] text-paper-dim">gastado (app)</div>
                </div>
                {balance != null && (
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

                {source === 'encontre' && (
                  <div className="mb-3 rounded-2xl border border-line bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-paper-dim"><Search size={13} /> Buscar para {selCreator.full_name}:</span>
                      {niches.map((n) => (
                        <span key={n} className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                          {n}
                          <button type="button" onClick={() => saveNiches(niches.filter((x) => x !== n))} className="opacity-70 hover:opacity-100"><X size={11} /></button>
                        </span>
                      ))}
                      <input value={newNiche} onChange={(e) => setNewNiche(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNiche(); } }}
                        placeholder="nicho o #hashtag (gótica, playa…)" className="min-w-[150px] flex-1 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                      <button type="button" onClick={doScrape} disabled={scraping} className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50">
                        {scraping ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} {scraping ? 'Buscando…' : 'Buscar virales'}
                      </button>
                    </div>
                    <input value={styleDesc} onChange={(e) => setStyleDesc(e.target.value)} onBlur={saveStyle}
                      placeholder="Estilo de esta modelo (ej: fitness sensual de playa, nada de producto ni hombres)"
                      className="mt-2 w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-xs text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                    <p className="mt-1.5 text-[11px] text-paper-dim">Vos elegís el nicho y el estilo. Traigo virales de Instagram, con @cuenta y likes, y la IA saca la basura (productos, hombres, paisajes) según ese estilo.</p>
                  </div>
                )}

                {source !== 'subir' && Object.keys(vibeCounts).length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {['Todos', ...VIBES.filter((v) => v !== 'Todos' && vibeCounts[v])].map((v) => (
                      <button key={v} type="button" onClick={() => setVibe(v)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${vibe === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:text-paper'}`}>
                        {v}{v !== 'Todos' && <span className="text-[10px] opacity-70">{vibeCounts[v]}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {source !== 'subir' && Object.keys(vibeCounts).length === 0 && (
                  <p className="mb-3 text-xs text-paper-dim">Las secciones por vibe (casual, playa, editorial…) y los likes se activan cuando conecto el scraper, que trae las virales con su fuente y sus números.</p>
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
                        <div key={r.id} onClick={() => setDetail(r)}
                          className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-ink-2 transition-all ${on ? 'border-brand ring-2 ring-brand/50' : 'border-line hover:border-brand/40'}`}>
                          <img src={r.url} alt="" className="aspect-[3/4] w-full object-cover" />
                          <button type="button" title="Seleccionar para cocinar" onClick={(e) => { e.stopPropagation(); toggleQueue(r.url); }}
                            className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${on ? 'border-brand bg-brand text-on-accent' : 'border-white/60 bg-black/50 text-white/80 hover:bg-black/70'}`}><Check size={13} /></button>
                          {cookedRefs.has(r.url) && <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-2 py-0.5 text-[10px] font-bold text-white"><Check size={10} /> Hecha</div>}
                          {(r.likes || r.source_handle) && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">
                              {r.likes ? <span className="inline-flex items-center gap-0.5"><Heart size={10} className="fill-rose-400 text-rose-400" /> {fmtLikes(r.likes)}</span> : <span />}
                              {r.source_handle && <span className="truncate opacity-90">@{r.source_handle}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── RESULTADOS (de esta modelo) ── */}
            {subtab === 'resultados' && (
              <div className="space-y-6">
                {reviewRows.length === 0 && approvedRows.length === 0 && pendingRows.length === 0 && failedRows.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no cocinaste nada para {selCreator.full_name}. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</p>
                )}

                {/* Cocinándose — la referencia borrosa con spinner */}
                {pendingRows.length > 0 && (
                  <section>
                    <h3 className="mb-2 inline-flex items-center gap-1.5 font-display text-sm font-bold text-amber-300"><Loader2 size={14} className="animate-spin" /> Cocinándose · {pendingRows.length}</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {pendingRows.map((g) => (
                        <div key={g.id} className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-ink-2">
                          {g.reference_url ? <img src={g.reference_url} alt="" className="aspect-[3/4] w-full scale-105 object-cover blur-md brightness-[0.4]" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                            <Loader2 size={26} className="animate-spin text-amber-300" />
                            <span className="text-[11px] font-semibold tracking-wide">cocinándose…</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Para revisar */}
                {reviewRows.length > 0 && (
                  <section>
                    <h3 className="mb-2 font-display text-sm font-bold text-paper">Para revisar · {reviewRows.length}</h3>
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
                  </section>
                )}

                {/* Aprobadas */}
                {approvedRows.length > 0 && (
                  <section>
                    <h3 className="mb-2 font-display text-sm font-bold text-paper">Aprobadas · {approvedRows.length}</h3>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                      {approvedRows.map((g) => (
                        <div key={g.id} className="overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                          {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Rechazadas — motivo + reintentar */}
                {failedRows.length > 0 && (
                  <section>
                    <h3 className="mb-1 inline-flex items-center gap-1.5 font-display text-sm font-bold text-rose-300"><AlertTriangle size={14} /> Rechazadas · {failedRows.length}</h3>
                    <p className="mb-2 text-xs text-paper-dim">La foto es la referencia que mandaste; abajo el motivo. Podés reintentar.</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {failedRows.map((g) => (
                        <div key={g.id} className="overflow-hidden rounded-xl border border-rose-500/30 bg-ink-2">
                          <div className="relative">
                            {g.reference_url ? <img src={g.reference_url} alt="" className="aspect-[3/4] w-full object-cover opacity-50" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] font-bold text-white"><AlertTriangle size={10} /> Rechazada</div>
                          </div>
                          <div className="p-2">
                            <p className="mb-1.5 text-[11px] leading-snug text-rose-200">{g.note || 'Rechazada por el motor.'}</p>
                            <button type="button" onClick={() => retry(g)} className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-line px-2 py-1.5 text-[11px] font-semibold text-paper-mute hover:border-brand/40 hover:text-paper"><RefreshCw size={11} /> Reintentar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
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
                    {detail.vibe && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Nicho</span><span className="font-semibold text-paper">#{detail.vibe}</span></div>}
                  </>
                ) : (
                  <p className="text-paper-mute">Foto tuya (subida a mano). No tiene datos de origen.</p>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2"><span className="text-paper-dim">Cuesta recrearla</span><span className="font-semibold text-amber-300">~{money(0.12)} · 0.12 créd</span></div>
                {detail.ai_reason && <p className="rounded-lg border border-line bg-ink-2/40 p-2 text-[12px] text-paper-mute">🤖 {detail.ai_reason}</p>}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                <button type="button" onClick={() => cookFromDetail(detail)} className="btn3d col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold"><Flame size={15} /> Cocinar con {(selCreator?.full_name || '').split(' ')[0]}</button>
                <button type="button" onClick={() => markInterest(detail, 'interesada')} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${detail.interest === 'interesada' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}><Heart size={13} /> Me interesa</button>
                <button type="button" onClick={() => markInterest(detail, 'descartada')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-rose-300"><X size={13} /> Fuera</button>
                {detail.vibe && <button type="button" onClick={() => moreLikeThis(detail)} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-paper"><Search size={13} /> Más como esta (#{detail.vibe})</button>}
              </div>
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
