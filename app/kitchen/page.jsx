'use client';

// /kitchen — "La cocina". El sistema muestra fotos virales de referencia; vos elegís
// una modelo, das "Recrear", y el motor saca SU versión (misma pose/estilo, su cara).
// Después revisás y aprobás las buenas → van a su baúl. Con contador de créditos.
// Fase 1: el feed sale de las referencias ya juntadas; el scraper (Apify) las llena solo.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, XCircle, Sparkles, IdCard, Coins, RefreshCw, Heart, Trash2,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const initials = (n) => (n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');           // creator_id elegido
  const [ident, setIdent] = useState({});       // creator_id -> {status, character_id}
  const [summary, setSummary] = useState({ credits: 0, usd: 0, images: 0 });
  const [refs, setRefs] = useState([]);         // feed de referencias virales
  const [gens, setGens] = useState([]);         // generaciones para revisar
  const [idBusy, setIdBusy] = useState(false);
  const [idMsg, setIdMsg] = useState('');
  const [cooking, setCooking] = useState({});   // reference_url -> true mientras genera

  const sb = getSupabase();

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) {
      setSummary({ credits: out.total_credits || 0, usd: out.total_usd || 0, images: out.total_images || 0 });
      const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m);
    }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, usd, created_at').order('created_at', { ascending: false }).limit(40);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);

  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      try { const { data } = await sb.rpc('team_creators'); if (Array.isArray(data)) setCreators(data.filter((c) => c?.id && c?.full_name && c.onboarding_status === 'active')); } catch {}
      const { data: rd } = await sb.from('creator_vault').select('id, url, caption, creator_id').eq('kind', 'ref').order('created_at', { ascending: false }).limit(60);
      setRefs(Array.isArray(rd) ? rd : []);
      loadSummary(); loadGens();
    })();
  }, [access, sb, loadSummary, loadGens]);

  const selCreator = creators.find((c) => c.id === sel) || null;
  const selIdentityReady = ident[sel]?.status === 'ready';

  // Crear la identidad de la modelo elegida con sus fotos reales del baúl.
  const createIdentity = async () => {
    if (!sel) { setIdMsg('Elegí una modelo primero.'); return; }
    setIdBusy(true); setIdMsg('Juntando sus fotos reales…');
    const { data: rows } = await sb.from('creator_vault').select('url').eq('creator_id', sel).eq('kind', 'real').limit(20);
    const urls = (rows || []).map((r) => r.url).filter(Boolean);
    if (urls.length < 3) { setIdBusy(false); setIdMsg(`${selCreator?.full_name || 'Esta modelo'} tiene ${urls.length} foto(s) real(es). Se necesitan 5+ para su cara. Subí más en Propuestas → baúl → "Real de la modelo".`); return; }
    setIdMsg(`Creando su identidad con ${urls.length} fotos…`);
    const out = await callFn('create_character', { creator_id: sel, name: selCreator?.full_name || 'Modelo', image_urls: urls });
    setIdBusy(false);
    if (!out.ok || !out.character_id) { setIdMsg(out.error || 'No se pudo crear la identidad.'); return; }
    setIdMsg('Identidad creada ✓'); loadSummary();
  };

  // Recrear una referencia con la cara de la modelo elegida.
  const recreate = async (ref) => {
    if (!sel) { setIdMsg('Elegí una modelo primero.'); return; }
    if (!selIdentityReady) { setIdMsg('Esa modelo todavía no tiene identidad. Creala arriba.'); return; }
    setCooking((c) => ({ ...c, [ref.url]: true }));
    const out = await callFn('recreate', { creator_id: sel, reference_url: ref.url });
    if (!out.ok || !out.generation_id) { setCooking((c) => ({ ...c, [ref.url]: false })); setIdMsg(out.error || 'No se pudo iniciar la generación.'); return; }
    loadGens(); loadSummary();
    // Poll hasta que termine.
    for (let i = 0; i < 50; i++) {
      await sleep(3000);
      const st = await callFn('gen_poll', { generation_id: out.generation_id });
      if (st.status === 'done' || st.status === 'failed') { break; }
    }
    setCooking((c) => ({ ...c, [ref.url]: false }));
    loadGens();
  };

  const decide = async (g, approve) => {
    await callFn('approve_gen', { generation_id: g.id, approve });
    loadGens();
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

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin"><ArrowLeft size={17} /></Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute"><ChefHat size={13} className="text-brand" /> Kitchen</div>
              <h1 className="truncate font-display text-xl font-bold tracking-tight text-paper">La cocina de contenido</h1>
            </div>
          </div>
          {/* Contador de gastos */}
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2">
            <Coins size={15} className="text-amber-300" />
            <div className="text-right leading-tight">
              <div className="text-sm font-bold tabular-nums text-paper">US${summary.usd.toFixed(3)} · {summary.credits.toFixed(2)} créd.</div>
              <div className="text-[10px] text-paper-dim">{summary.images} fotos · {summary.images ? `~US$${(summary.usd / summary.images).toFixed(4)}/foto` : 'costo por foto al generar'}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 lg:px-6">
        {/* 1 · Elegir modelo + identidad */}
        <section className="card3d rounded-3xl border border-line bg-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-paper">1 · Elegí la modelo</h2>
          <p className="mt-1 text-sm text-paper-mute">Con qué creadora vas a recrear. Necesita su <b>identidad</b> creada (sus fotos reales) para que salga su cara.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select value={sel} onChange={(e) => { setSel(e.target.value); setIdMsg(''); }} className="min-w-[220px] rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
              <option value="">— Elegí una creadora —</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.full_name}{ident[c.id]?.status === 'ready' ? ' · ✓ identidad' : ''}</option>)}
            </select>
            {sel && (selIdentityReady
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"><IdCard size={14} /> Identidad lista</span>
              : <button type="button" onClick={createIdentity} disabled={idBusy} className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">{idBusy ? <Loader2 size={14} className="animate-spin" /> : <IdCard size={14} />} {idBusy ? 'Creando…' : 'Crear identidad'}</button>)}
            {idMsg && <span className={`text-xs ${idMsg.includes('✓') ? 'text-emerald-300' : 'text-amber-300'}`}>{idMsg}</span>}
          </div>
        </section>

        {/* 2 · Feed de referencias virales */}
        <section className="card3d rounded-3xl border border-line bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-paper">2 · Fotos para recrear</h2>
              <p className="mt-1 text-sm text-paper-mute">Dale <b>“Recrear”</b> a la que quieras y sale su versión. <span className="text-paper-dim">(Por ahora son tus referencias juntadas; al conectar el scraper aparecen las virales frescas.)</span></p>
            </div>
            <button type="button" onClick={() => { loadGens(); loadSummary(); }} className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"><RefreshCw size={13} /> Actualizar</button>
          </div>
          {refs.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-ink-2/40 p-6 text-center text-sm text-paper-dim">Todavía no hay referencias. Conectá el scraper (Apify) o juntá inspiraciones en los baúles.</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {refs.map((r) => (
                <div key={r.id} className="group relative overflow-hidden rounded-xl border border-line bg-ink-2">
                  <img src={r.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5">
                    <button type="button" onClick={() => recreate(r)} disabled={!sel || !selIdentityReady || cooking[r.url]}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand px-2 py-1.5 text-[11px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-45">
                      {cooking[r.url] ? <><Loader2 size={11} className="animate-spin" /> Cocinando…</> : <><Sparkles size={11} /> Recrear</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3 · Revisión de resultados */}
        <section className="card3d rounded-3xl border border-line bg-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-paper">3 · Revisá y aprobá</h2>
          <p className="mt-1 text-sm text-paper-mute">Las fotos generadas. Aprobá las buenas (van al baúl IA de la modelo) o descartá.</p>
          {pending.length > 0 && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-300"><Loader2 size={13} className="animate-spin" /> {pending.length} en proceso…</p>}
          {toReview.length === 0 && pending.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-ink-2/40 p-6 text-center text-sm text-paper-dim">Todavía no generaste nada. Elegí una modelo y dale “Recrear” a una foto.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {toReview.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                  {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                  <div className="flex items-center justify-between gap-1 p-2">
                    <button type="button" onClick={() => decide(g, true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30"><Heart size={12} /> Aprobar</button>
                    <button type="button" onClick={() => decide(g, false)} className="inline-flex items-center justify-center gap-1 rounded-full border border-line px-2 py-1.5 text-[11px] font-semibold text-paper-mute hover:text-rose-300"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="px-1 text-center text-[11px] text-paper-dim">Próximo: conectar el scraper (Apify · Instagram por nicho) para que las virales aparezcan solas acá.</p>
      </main>
    </div>
  );
}
