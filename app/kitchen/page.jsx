'use client';

// /kitchen — "La cocina" (dashboard high-level, con pestañas).
//   Resumen · Modelos · Cocinar · Resultados · Gastos
// Flujo: el sistema muestra fotos virales → elegís modelo → "Recrear" → el motor saca
// SU versión (identidad Higgsfield + referencia) → ves ANTES/DESPUÉS → aprobás → baúl IA.
// Contador de créditos/USD y costo por foto. El scraper (Apify) llenará el feed solo.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, XCircle, Sparkles, IdCard, Coins, RefreshCw,
  Heart, Trash2, LayoutDashboard, Users, Flame, Images, Wallet, ArrowRight, AlertTriangle, X,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => `US$${(Number(n) || 0).toFixed(3)}`;

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'modelos', label: 'Modelos', icon: Users },
  { id: 'cocinar', label: 'Cocinar', icon: Flame },
  { id: 'resultados', label: 'Resultados', icon: Images },
  { id: 'gastos', label: 'Gastos', icon: Wallet },
];

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [tab, setTab] = useState('cocinar');
  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');
  const [ident, setIdent] = useState({});       // creator_id -> {status, character_id, n_photos}
  const [realCount, setRealCount] = useState({}); // creator_id -> nº fotos reales
  const [summary, setSummary] = useState({ credits: 0, usd: 0, images: 0 });
  const [refs, setRefs] = useState([]);
  const [gens, setGens] = useState([]);
  const [idBusy, setIdBusy] = useState('');      // creator_id que está creando identidad
  const [msg, setMsg] = useState(null);          // {kind:'ok'|'err'|'info', text}
  const [cooking, setCooking] = useState({});
  const [compare, setCompare] = useState(null);  // {reference_url, result_url, generation_id} para antes/después

  const sb = getSupabase();

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) {
      setSummary({ credits: out.total_credits || 0, usd: out.total_usd || 0, images: out.total_images || 0 });
      const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m);
    }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, usd, created_at').order('created_at', { ascending: false }).limit(60);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);

  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      try { const { data } = await sb.rpc('team_creators'); if (Array.isArray(data)) setCreators(data.filter((c) => c?.id && c?.full_name && c.onboarding_status === 'active')); } catch {}
      const { data: rd } = await sb.from('creator_vault').select('id, url, caption, creator_id, kind').in('kind', ['ref', 'real']).order('created_at', { ascending: false }).limit(400);
      const allV = Array.isArray(rd) ? rd : [];
      setRefs(allV.filter((r) => r.kind === 'ref').slice(0, 80));
      const rc = {}; allV.filter((r) => r.kind === 'real').forEach((r) => { rc[r.creator_id] = (rc[r.creator_id] || 0) + 1; }); setRealCount(rc);
      loadSummary(); loadGens();
    })();
  }, [access, sb, loadSummary, loadGens]);

  const selCreator = creators.find((c) => c.id === sel) || null;
  const selReady = ident[sel]?.status === 'ready';
  const modelsReady = creators.filter((c) => ident[c.id]?.status === 'ready').length;

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

  const recreate = async (ref) => {
    if (!sel) { setTab('modelos'); setMsg({ kind: 'info', text: 'Elegí una modelo primero (arriba).' }); return; }
    if (!selReady) { setMsg({ kind: 'err', text: 'Esa modelo todavía no tiene identidad. Creala en Modelos.' }); return; }
    setCooking((c) => ({ ...c, [ref.url]: true })); setMsg(null);
    const out = await callFn('recreate', { creator_id: sel, reference_url: ref.url });
    if (!out.ok || !out.generation_id) {
      setCooking((c) => ({ ...c, [ref.url]: false }));
      setMsg({ kind: 'err', text: `No se pudo generar. ${out.error || ''} ${out.detail ? '· ' + JSON.stringify(out.detail).slice(0, 240) : ''}` });
      return;
    }
    loadGens(); loadSummary();
    let finalUrl = null;
    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      const st = await callFn('gen_poll', { generation_id: out.generation_id });
      if (st.status === 'done') { finalUrl = st.result_url; break; }
      if (st.status === 'failed') { setMsg({ kind: 'err', text: `La generación falló. ${st.detail ? JSON.stringify(st.detail).slice(0, 240) : ''}` }); break; }
    }
    setCooking((c) => ({ ...c, [ref.url]: false }));
    loadGens();
    if (finalUrl) { setCompare({ reference_url: ref.url, result_url: finalUrl, generation_id: out.generation_id }); }
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
                <div className="text-sm font-bold tabular-nums text-paper">{money(summary.usd)} · {summary.credits.toFixed(1)} créd.</div>
                <div className="text-[10px] text-paper-dim">{summary.images} fotos{summary.images ? ` · ~${money(summary.usd / summary.images).replace('US$', 'US$')}/foto` : ''}</div>
              </div>
            </div>
          </div>
          {/* Pestañas */}
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

        {/* Barra: modelo elegida (visible en Cocinar/Resultados) */}
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
          </div>
        )}

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Gastado', value: money(summary.usd), sub: `${summary.credits.toFixed(1)} créditos`, icon: Wallet, tone: 'text-amber-300' },
              { label: 'Fotos generadas', value: summary.images, sub: summary.images ? `~${money(summary.usd / summary.images)}/foto` : 'sin generar aún', icon: Images, tone: 'text-brand' },
              { label: 'Modelos listas', value: `${modelsReady}/${creators.length}`, sub: 'con identidad', icon: Users, tone: 'text-emerald-300' },
              { label: 'Para revisar', value: toReview.length, sub: pending.length ? `${pending.length} en proceso` : 'al día', icon: Flame, tone: 'text-rose-300' },
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
                <li><b className="text-paper">1.</b> En <b>Modelos</b>, creás la identidad de cada creadora (con sus fotos reales).</li>
                <li><b className="text-paper">2.</b> En <b>Cocinar</b>, elegís la modelo y le das <b>“Recrear”</b> a una foto viral.</li>
                <li><b className="text-paper">3.</b> Ves el <b>antes/después</b> y aprobás → va a su baúl IA.</li>
                <li className="text-paper-dim">4. El scraper (Apify · Instagram por nicho) llenará el feed de virales solo.</li>
              </ol>
              <button type="button" onClick={() => setTab('modelos')} className="btn3d mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">Empezar por Modelos <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        {/* ── MODELOS ── */}
        {tab === 'modelos' && (
          <div className="space-y-2.5">
            <p className="text-sm text-paper-mute">Cada creadora necesita su <b>identidad</b> (un personaje en Higgsfield con sus fotos reales) para que el motor haga SU cara. Solo con 5+ fotos reales.</p>
            {creators.map((c) => {
              const id = ident[c.id]; const nreal = realCount[c.id] || 0; const ready = id?.status === 'ready';
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-xs font-bold text-brand">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.full_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-paper">{c.full_name}</div>
                    <div className="text-[11px] text-paper-dim">{nreal} foto{nreal === 1 ? '' : 's'} real{nreal === 1 ? '' : 'es'}{ready ? ` · Higgsfield ${String(id.character_id).slice(0, 8)}…` : ''}</div>
                  </div>
                  {ready ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={14} /> Identidad lista</span>
                  ) : nreal >= 5 ? (
                    <button type="button" onClick={() => createIdentity(c.id)} disabled={idBusy === c.id} className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">{idBusy === c.id ? <Loader2 size={13} className="animate-spin" /> : <IdCard size={13} />} {idBusy === c.id ? 'Creando…' : 'Crear identidad'}</button>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-paper-dim" title="Necesita 5+ fotos reales en su baúl"><AlertTriangle size={12} className="text-amber-400" /> Faltan fotos ({nreal}/5)</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── COCINAR ── */}
        {tab === 'cocinar' && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-paper-mute">Dale <b>“Recrear”</b> a la foto que quieras → sale su versión. <span className="text-paper-dim">(Feed = tus referencias juntadas; el scraper traerá las virales frescas.)</span></p>
              <button type="button" onClick={() => { loadGens(); loadSummary(); }} className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"><RefreshCw size={13} /> Actualizar</button>
            </div>
            {refs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no hay fotos de referencia. Conectá el scraper (Apify) o juntá inspiraciones en los baúles.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {refs.map((r) => (
                  <div key={r.id} className="group relative overflow-hidden rounded-xl border border-line bg-ink-2">
                    <img src={r.url} alt="" className="aspect-[3/4] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5">
                      <button type="button" onClick={() => recreate(r)} disabled={cooking[r.url]} className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand px-2 py-1.5 text-[11px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-45">
                        {cooking[r.url] ? <><Loader2 size={11} className="animate-spin" /> Cocinando…</> : <><Sparkles size={11} /> Recrear</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {tab === 'resultados' && (
          <div>
            {pending.length > 0 && <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-300"><Loader2 size={13} className="animate-spin" /> {pending.length} en proceso…</p>}
            {toReview.length === 0 && approved.length === 0 && pending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no generaste nada. Andá a <button onClick={() => setTab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button> y recreá una foto.</p>
            ) : (
              <>
                {toReview.length > 0 && <h3 className="mb-2 font-display text-sm font-bold text-paper">Para revisar · {toReview.length}</h3>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {toReview.map((g) => (
                    <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                      <button type="button" onClick={() => setCompare({ reference_url: g.reference_url, result_url: g.result_url, generation_id: g.id })} className="block w-full">
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
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Total gastado</div><div className="mt-1 font-display text-2xl font-bold text-paper">{money(summary.usd)}</div><div className="text-[11px] text-paper-dim">{summary.credits.toFixed(2)} créditos</div></div>
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Fotos generadas</div><div className="mt-1 font-display text-2xl font-bold text-paper">{summary.images}</div></div>
              <div className="card3d rounded-2xl border border-line bg-card p-4"><div className="text-xs uppercase tracking-wider text-paper-dim">Costo por foto</div><div className="mt-1 font-display text-2xl font-bold text-paper">{summary.images ? money(summary.usd / summary.images) : '—'}</div><div className="text-[11px] text-paper-dim">Soul v2 ≈ US$0.004</div></div>
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
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' : g.status === 'failed' ? 'bg-rose-500/15 text-rose-300' : 'bg-hair/15 text-paper-mute'}`}>{g.status}</span>
                        <span className="shrink-0 tabular-nums text-paper-mute">{g.usd ? money(g.usd) : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

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
              <button type="button" onClick={() => decide({ id: compare.generation_id, creator_id: sel, result_url: compare.result_url }, false)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"><Trash2 size={14} /> Descartar</button>
              <button type="button" onClick={() => decide({ id: compare.generation_id, creator_id: sel, result_url: compare.result_url }, true)} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold"><Heart size={14} /> Aprobar → baúl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
