'use client';

// /cost — Gastos. Panel SOLO para el dueño/admin: cuánto gasta cada MODELO y
// cada CUENTA de Higgsfield, partido en Fotos / Videos / Apify, con filtros de
// período + cuenta + buscador, y una ficha por modelo con el desglose completo.
//
// ── De dónde salen los números (todo reconcilia) ─────────────────────────────
//  • generations (no-fallidas, status<>'failed', sin is_test): media_type='image'
//    → FOTOS (usd + créditos + # imágenes); media_type='video' → VIDEOS (usd +
//    créditos + # videos). Hoy no hay filas 'audio' (voz = "sin datos aún").
//    Julia va fija a la Cuenta 1 (su Soul vive ahí); el resto toma su cuenta de
//    creator_identity. Sin cuenta reconocida → "otra cuenta / sin asignar".
//  • scrape_runs (sin is_test): APIFY por modelo. eff = cost_real ?? cost_est, así
//    una corrida sin costo real (video/IA) no se cae a $0. Se rotula honesto:
//    "real (Apify)" solo cuando TODAS sus corridas traen cost_real; "real+est" si
//    algunas; "estimado" si ninguna.
//  • Saldos de las cuentas: higgsfield_accounts es deny-all para el cliente, así
//    que el saldo llega por la edge `hf-accounts` acción 'list' (ya admin-only, la
//    misma que usa /conexion). Es un número PUNTUAL ("saldo actual"), NO se filtra
//    por período — un saldo es lo que hay hoy. Ningún secreto toca el navegador.
//
// ── Filtros (los tres combinan) ──────────────────────────────────────────────
//  • Período: Este mes / Mes pasado / Todo (default). Se filtra generations por
//    created_at y scrape_runs por run_at. La matemática de mes es en JS a partir
//    de los timestamps de las filas: "este mes"=mes calendario actual,
//    "mes pasado"=mes calendario anterior, "todo"=sin tope.
//  • Cuenta: Todas / Cuenta 1 / Cuenta 2 / (otras, solo si hay gasto ahí).
//  • Buscador: por nombre de modelo.
//
// ── Reconciliación (documentada) ─────────────────────────────────────────────
//  La tabla POR MODELO y el total de arriba salen del MISMO conjunto filtrado
//  (período ∩ cuenta ∩ buscador), así que siempre:
//     Σ (por-modelo: fotos+videos+apify)  ==  el gasto total mostrado arriba.
//  Las TARJETAS de cuenta son OTRA lente: muestran el gasto de cada cuenta EN EL
//  PERÍODO (sin el filtro de cuenta/buscador, para no dejar en $0 una cuenta que
//  sí gastó) + su saldo actual, que es puntual. Por eso, con un filtro de cuenta o
//  búsqueda activo, la suma de las tarjetas puede superar el total filtrado.
//
// Todo se agrega en el navegador a partir de tablas que el admin ya puede leer
// (RLS is_staff/is_admin) + esa edge. NO hace falta desplegar nada nuevo.
// Nota a futuro: si `generations` supera los miles de filas, mover la suma a una
// acción edge server-side (cost_summary) — hoy se pagina en cliente sin problema.

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, Wallet, RefreshCw, Loader2, Coins, Mic,
  Search, Users, Laptop, AlertTriangle, ChevronDown, ChevronRight, TrendingUp,
  Image as ImageIcon, Video, ArrowUp, ArrowDown, ArrowUpDown, X, Calendar,
} from 'lucide-react';

// Julia va fija a la Cuenta 1 (su Soul vive ahí). El resto toma su creator_identity.
const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const CUENTA_1 = '06efe22b-68f2-4cfd-b9ca-8a2849d37933';
// Créditos → US$ (ratio observado en las generaciones: 59.45 / 660.04 ≈ 0.09).
// Solo para APROXIMAR el saldo en dólares — el gasto real viene con su .usd exacto.
const CREDIT_USD = 0.09;
const STALE_MS = 15 * 60 * 1000; // el cocinero late ~cada minuto; +15 min sin latido = apagado

const usd = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cr = (n) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const ago = (ts) => {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
};

// Trae TODAS las filas de una tabla saltando el tope de 1000 del servidor.
// OJO: hay que ordenar por una columna ESTABLE y única antes de paginar. Sin
// ORDER BY, PostgREST devuelve las filas en orden arbitrario y dos .range()
// distintos pueden repetir o saltarse filas al cruzar las 1000 → totales de
// dinero corruptos. `orderCol` va por tabla: 'id' en las que lo tienen y
// 'creator_id' en creator_identity (su PK, no tiene 'id').
async function fetchAll(table, cols, orderCol) {
  const sb = getSupabase();
  const page = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb.from(table).select(cols).order(orderCol, { ascending: true }).range(from, from + page - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < page) break;
    from += page;
  }
  return all;
}

// Una cuenta "está conectada" cuando el motor ya devolvió su saldo o hay un
// login del CLI vivo. Si no, se muestra como "sin conectar" (Cuenta 2 nueva).
const isConnected = (a) => !!a && (a.balance != null || !!a.cli_seen_at);

// Estilos de las DOS cuentas — bien marcaditas: número + color + etiqueta.
const ACCT = {
  c1: { num: '1', chip: 'bg-brand/15 text-brand border-brand/30', dot: 'bg-brand', ring: 'border-brand/30', label: 'Cuenta 1 · Julia', short: 'C1' },
  c2: { num: '2', chip: 'bg-sky/15 text-sky border-sky/40', dot: 'bg-sky', ring: 'border-sky/40', label: 'Cuenta 2 · Modelos', short: 'C2' },
  none: { num: '–', chip: 'bg-paper/10 text-paper-mute border-line', dot: 'bg-paper-dim', ring: 'border-line', label: 'Otra / sin asignar', short: '–' },
};

const PERIODS = [
  { k: 'all', label: 'Todo', long: 'todo el histórico' },
  { k: 'this', label: 'Este mes', long: 'este mes' },
  { k: 'last', label: 'Mes pasado', long: 'el mes pasado' },
];

// Ventana [lo, hi) del período, calculada en JS desde la fecha de hoy.
// "este mes" = mes calendario actual; "mes pasado" = el anterior; "todo" = sin tope.
function periodBounds(period) {
  const now = new Date();
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const startNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (period === 'this') return [startThis, startNext];
  if (period === 'last') return [startLast, startThis];
  return [null, null];
}

const EMPTY_HF = { fUsd: 0, fCr: 0, imgs: 0, vUsd: 0, vCr: 0, vids: 0 };
const EMPTY_AP = { real: 0, est: 0, eff: 0, runs: 0, hasReal: false, allReal: true };

// Rótulo honesto del gasto de Apify de una modelo (real vs estimado).
const apLabel = (a) => (!a || !a.runs) ? '—' : (a.allReal ? 'real (Apify)' : (a.hasReal ? 'real + estimado' : 'estimado'));

export default function CostPage() {
  const [access, setAccess] = useState('loading'); // 'loading' | 'ok' | 'denied'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [raw, setRaw] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  // filtros + estado de la tabla
  const [period, setPeriod] = useState('all');
  const [acctFilter, setAcctFilter] = useState('all'); // 'all' | 'c1' | 'c2' | 'none'
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ col: 'total', dir: 'desc' });
  const [showZero, setShowZero] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const up = await getUserProfile();
        setAccess(up?.profile?.role === 'admin' ? 'ok' : 'denied');
      } catch { setAccess('denied'); }
    })();
  }, []);

  const callHf = async (action, extra) => {
    const { data: d, error } = await getSupabase().functions.invoke('hf-accounts', { body: { action, ...(extra || {}) } });
    let out = d; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    return out || {};
  };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [gens, profs, ident, scrapes, hf] = await Promise.all([
        fetchAll('generations', 'creator_id, media_type, status, credits, usd, created_at', 'id'),
        fetchAll('profiles', 'id, stage_name, full_name, role, active, is_test', 'id'),
        fetchAll('creator_identity', 'creator_id, account_id, status', 'creator_id'),
        fetchAll('scrape_runs', 'creator_id, cost_real, cost_est, run_at', 'id'),
        callHf('list'),
      ]);

      const profMap = Object.fromEntries(profs.map((p) => [p.id, p]));
      const testSet = new Set(profs.filter((p) => p.is_test).map((p) => p.id)); // is_test se excluye (Mitch)
      const identMap = Object.fromEntries(ident.map((i) => [i.creator_id, i.account_id]));

      // ── Cuentas de Higgsfield (saldo por la edge) ──
      const accts = hf.ok ? (hf.accounts || []) : [];
      const accMap = Object.fromEntries(accts.map((a) => [a.id, a]));
      const legacyIds = accts.filter((a) => a.legacy).map((a) => a.id);
      const cuenta1 = accMap[CUENTA_1] || accts.find((a) => a.legacy) || null;
      // 'c2' = SOLO la segunda cuenta real (no-legacy, distinta de la 1), por su id —
      // nunca todas las no-legacy. Así una 3ª cuenta a futuro no se rotula falso como
      // "Cuenta 2": cae en 'none' y su gasto se hace visible en "otra cuenta / sin
      // asignar", para que Σ(cuentas) siga cuadrando con el total.
      const cuenta2 = accts.find((a) => !a.legacy && a.id !== CUENTA_1) || null;

      const accountForModel = (id) => (id === JULIA_ID ? CUENTA_1 : (identMap[id] || null));
      const acctKind = (id) => {
        if (id && (id === CUENTA_1 || legacyIds.includes(id))) return 'c1';
        if (id && cuenta2 && id === cuenta2.id) return 'c2';
        return 'none';
      };

      // Roster de modelos activas (no-test) — para "sin gasto todavía".
      const activeCreators = profs
        .filter((p) => p.role === 'creator' && p.active && !p.is_test)
        .map((p) => ({ id: p.id, name: p.stage_name || p.full_name || 'Sin nombre', acctId: accountForModel(p.id) }));

      // ¿Hay gasto (histórico) que caiga en "otra cuenta / sin asignar"? Solo así se
      // ofrece esa opción en el filtro de cuenta.
      const spenderIds = new Set();
      for (const g of gens) { if (g.status !== 'failed' && !testSet.has(g.creator_id) && g.media_type !== 'audio') spenderIds.add(g.creator_id); }
      for (const s of scrapes) { if (!testSet.has(s.creator_id)) spenderIds.add(s.creator_id); }
      const hasOtras = [...spenderIds].some((id) => acctKind(accountForModel(id)) === 'none');

      setRaw({
        gens, scrapes, profMap, testSet, identMap,
        accountForModel, acctKind,
        accts, hfOk: !!hf.ok, cuenta1, cuenta2, cuenta2Id: cuenta2?.id || null,
        activeCreators, hasOtras,
      });
      setRefreshedAt(new Date());
    } catch (e) {
      setErr(e?.message || 'No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (access === 'ok') load(); }, [access, load]);

  // ── Vista derivada: todo sale de UN conjunto filtrado (período ∩ cuenta ∩ búsqueda) ──
  const view = useMemo(() => {
    if (!raw) return null;
    const { gens, scrapes, profMap, testSet, accountForModel, acctKind, activeCreators } = raw;
    const [lo, hi] = periodBounds(period);
    const inWin = (ts) => {
      if (!lo && !hi) return true;
      const t = new Date(ts).getTime();
      return (!lo || t >= lo.getTime()) && (!hi || t < hi.getTime());
    };

    // Agregación por modelo (dentro del período)
    const hfBy = {}; const apBy = {}; let voiceCount = 0;
    for (const g of gens) {
      if (g.status === 'failed') continue;
      if (testSet.has(g.creator_id)) continue;
      if (!inWin(g.created_at)) continue;
      if (g.media_type === 'audio') { voiceCount += 1; continue; }
      const b = (hfBy[g.creator_id] ??= { fUsd: 0, fCr: 0, imgs: 0, vUsd: 0, vCr: 0, vids: 0 });
      const u = Number(g.usd) || 0, c = Number(g.credits) || 0;
      if (g.media_type === 'video') { b.vUsd += u; b.vCr += c; b.vids += 1; }
      else { b.fUsd += u; b.fCr += c; b.imgs += 1; }
    }
    for (const s of scrapes) {
      if (testSet.has(s.creator_id)) continue;
      if (!inWin(s.run_at)) continue;
      const b = (apBy[s.creator_id] ??= { real: 0, est: 0, eff: 0, runs: 0, hasReal: false, allReal: true });
      b.real += Number(s.cost_real) || 0;
      b.est += Number(s.cost_est) || 0;
      b.eff += Number(s.cost_real != null ? s.cost_real : s.cost_est) || 0;
      b.runs += 1;
      if (s.cost_real != null) b.hasReal = true; else b.allReal = false;
    }

    // Filas por modelo con gasto (>0 en el período)
    const spenders = new Set([...Object.keys(hfBy), ...Object.keys(apBy)]);
    const allRows = [...spenders].map((id) => {
      const p = profMap[id] || {};
      const h = hfBy[id] || EMPTY_HF;
      const a = apBy[id] || EMPTY_AP;
      const acctId = accountForModel(id);
      return {
        id,
        name: p.stage_name || p.full_name || 'Sin nombre',
        acctId, kind: acctKind(acctId),
        hf: h, ap: a,
        fotos: h.fUsd || 0, videos: h.vUsd || 0, apify: a.eff || 0,
        total: (h.fUsd || 0) + (h.vUsd || 0) + (a.eff || 0),
      };
    });

    // Filtros de cuenta + buscador
    const q = query.trim().toLowerCase();
    const passFilter = (kind, name) => (acctFilter === 'all' || kind === acctFilter) && (!q || name.toLowerCase().includes(q));

    const shown = allRows
      .filter((r) => passFilter(r.kind, r.name))
      .sort(makeSorter(sort));

    // Modelos activas sin gasto en el período (respetan cuenta + búsqueda)
    const zero = activeCreators
      .filter((m) => !spenders.has(m.id))
      .map((m) => ({ ...m, kind: acctKind(m.acctId) }))
      .filter((m) => passFilter(m.kind, m.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Por cuenta — sobre TODAS las filas del período (allRows), NO sobre `shown`.
    // Las tarjetas de cuenta son una lente por-cuenta del período: no siguen el
    // filtro de cuenta/buscador de la tabla. Si siguieran, al elegir "Cuenta 2" la
    // tarjeta de la Cuenta 1 quedaría en $0.00 aunque Julia sí gastó — un $0 falso
    // justo al lado de su saldo real. allRows ya está filtrado por período.
    const perAcct = {
      c1: { fotos: 0, videos: 0, apify: 0, total: 0, models: 0 },
      c2: { fotos: 0, videos: 0, apify: 0, total: 0, models: 0 },
      none: { fotos: 0, videos: 0, apify: 0, total: 0, models: 0 },
    };
    for (const r of allRows) {
      const b = perAcct[r.kind];
      b.fotos += r.fotos; b.videos += r.videos; b.apify += r.apify; b.total += r.total;
      if (r.total > 0) b.models += 1;
    }

    // Totales del conjunto mostrado
    const tot = shown.reduce((acc, r) => {
      acc.fotos += r.fotos; acc.videos += r.videos; acc.apify += r.apify;
      acc.imgs += r.hf.imgs || 0; acc.vids += r.hf.vids || 0;
      acc.fCr += r.hf.fCr || 0; acc.vCr += r.hf.vCr || 0;
      acc.apReal += r.ap.real || 0; acc.apEst += r.ap.est || 0; acc.runs += r.ap.runs || 0;
      return acc;
    }, { fotos: 0, videos: 0, apify: 0, imgs: 0, vids: 0, fCr: 0, vCr: 0, apReal: 0, apEst: 0, runs: 0 });
    tot.grand = tot.fotos + tot.videos + tot.apify;
    tot.allApifyReal = shown.every((r) => !r.ap.runs || r.ap.allReal) && tot.runs > 0;
    tot.anyApifyReal = shown.some((r) => r.ap.hasReal); // ¿alguna corrida trae costo real?

    return { shown, zero, perAcct, tot, voiceCount };
  }, [raw, period, acctFilter, query, sort]);

  const onSort = (col) => setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'name' ? 'asc' : 'desc' });

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
        <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
          <span className="mx-auto mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Sin acceso
          </span>
          <h1 className="font-display text-xl font-bold text-paper">Solo el dueño</h1>
          <p className="mt-2 text-sm text-paper-mute">Los gastos son solo para administración.</p>
          <Link href="/admin" className="btn3d-ghost mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <ArrowLeft size={15} /> Volver
          </Link>
        </div>
      </div>
    );
  }

  const t = view?.tot;
  const periodLong = PERIODS.find((p) => p.k === period)?.long || '';
  const acctOptions = [
    { k: 'all', label: 'Todas' },
    { k: 'c1', label: 'Cuenta 1' },
    { k: 'c2', label: 'Cuenta 2' },
    ...(raw?.hasOtras ? [{ k: 'none', label: 'Otras' }] : []),
  ];
  const filtered = period !== 'all' || acctFilter !== 'all' || !!query.trim();

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 lg:px-6">
          <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">
              <Wallet size={12} className="text-brand" /> Gastos
            </div>
            <h1 className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-paper">Cuánto se gasta</h1>
          </div>
          <button type="button" onClick={load} disabled={loading} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:opacity-50" title="Actualizar">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 lg:px-6">
        {err && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">{err}</div>
        )}

        {loading && !view && (
          <div className="grid place-items-center rounded-3xl border border-line bg-card py-20 text-paper-mute">
            <Loader2 size={22} className="animate-spin text-brand" />
            <p className="mt-3 text-sm">Sumando los gastos…</p>
          </div>
        )}

        {view && (
          <>
            {/* ── FILTROS ── */}
            <section className="card3d rounded-3xl border border-line bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim"><Calendar size={11} /> Período</p>
                  <Seg options={PERIODS.map((p) => ({ k: p.k, label: p.label }))} value={period} onChange={setPeriod} />
                </div>
                <div className="min-w-0">
                  <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim"><Coins size={11} /> Cuenta</p>
                  <Seg options={acctOptions} value={acctFilter} onChange={setAcctFilter} />
                </div>
              </div>
              <div className="relative mt-3">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar modelo…"
                  className="w-full rounded-2xl border border-line bg-ink-2/50 py-2.5 pl-9 pr-9 text-sm text-paper placeholder:text-paper-dim focus:border-brand/40 focus:outline-none"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-paper-dim hover:bg-paper/10 hover:text-paper" title="Limpiar">
                    <X size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* ── RESUMEN ── */}
            <section className="card3d rounded-3xl border border-brand/30 bg-card p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Gasto total · {periodLong}</p>
                  <p className="mt-1 font-display text-4xl font-black tabular-nums tracking-tight text-paper sm:text-5xl">{usd(t.grand)}</p>
                </div>
                <TrendingUp size={22} className="shrink-0 text-brand/60" />
              </div>
              <p className="mt-1 text-xs text-paper-dim">Motor de imágenes (Higgsfield: fotos + videos) + scraper (Apify). La voz aún no registra gasto.</p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <SrcTile icon={<ImageIcon size={14} />} label="Fotos" main={usd(t.fotos)} sub={`${cr(t.imgs)} img · ${cr(t.fCr)} créd`} tone="brand" />
                <SrcTile icon={<Video size={14} />} label="Videos" main={usd(t.videos)} sub={`${cr(t.vids)} vid · ${cr(t.vCr)} créd`} tone="brand" />
                <SrcTile icon={<Search size={14} />} label="Apify" main={usd(t.apify)} sub={t.runs ? (t.allApifyReal ? 'real' : (t.anyApifyReal ? 'real+est' : 'estimado')) : 'sin corridas'} tone="sky" />
                <SrcTile icon={<Mic size={14} />} label="Voz" main="—" sub="sin datos" tone="dim" />
              </div>

              <p className="mt-4 border-t border-line/60 pt-3 text-[11px] leading-relaxed text-paper-dim">
                Cuadra: la tabla por modelo suma <b className="tabular-nums text-paper-mute">{usd(t.grand)}</b>{filtered ? ' (con el filtro activo)' : ''}. Las tarjetas de cuenta muestran el gasto por cuenta del período (sin el filtro de cuenta/búsqueda) y su saldo actual, que es puntual.
              </p>
            </section>

            {/* ── CUENTAS DE HIGGSFIELD ── */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 px-1 font-display text-sm font-bold uppercase tracking-wide text-paper-mute">
                <Coins size={15} className="text-brand" /> Las dos cuentas de Higgsfield
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <AcctCard kind="c1" acct={raw.cuenta1} spent={view.perAcct.c1} hfOk={raw.hfOk} periodLong={periodLong}
                  sublabel="El login de siempre — solo Julia" />
                <AcctCard kind="c2" acct={raw.cuenta2} spent={view.perAcct.c2} hfOk={raw.hfOk} periodLong={periodLong}
                  sublabel="LoRAs de las modelos" />
              </div>
              {view.perAcct.none.total > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-amber-300">
                      <AlertTriangle size={14} className="shrink-0" /> Otra cuenta / sin asignar
                    </span>
                    <span className="shrink-0 font-display text-sm font-bold tabular-nums text-paper">{usd(view.perAcct.none.total)}</span>
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-paper-dim">
                    Fotos {usd(view.perAcct.none.fotos)} · Videos {usd(view.perAcct.none.videos)} · Apify {usd(view.perAcct.none.apify)} · {view.perAcct.none.models} modelo{view.perAcct.none.models === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </section>

            {/* ── POR MODELO (tabla ordenable + ficha) ── */}
            <section className="card3d rounded-3xl border border-line bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-paper-mute">
                  <Users size={15} className="text-brand" /> Por modelo
                </h2>
                <span className="text-[11px] text-paper-dim">{view.shown.length} con gasto{filtered ? ' · filtrado' : ''}</span>
              </div>

              {(view.shown.length > 0 || (showZero && view.zero.length > 0)) ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <Th label="Modelo" col="name" align="left" sort={sort} onSort={onSort} />
                        <Th label="Fotos" col="fotos" sort={sort} onSort={onSort} />
                        <Th label="Videos" col="videos" sort={sort} onSort={onSort} />
                        <Th label="Apify" col="apify" sort={sort} onSort={onSort} />
                        <Th label="Total" col="total" sort={sort} onSort={onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {view.shown.map((r) => (
                        <ModelRow key={r.id} r={r} open={openId === r.id} onToggle={() => setOpenId((id) => id === r.id ? null : r.id)} />
                      ))}
                      {/* Roster sin gasto: grupo aparte con su propio rótulo, para no
                          romper el orden de la columna ordenada (sus $0 no se cuelan
                          entre los valores del sort) y con la MISMA estructura de fila
                          que los gastadores (chevron-espaciador + badge) para alinear. */}
                      {showZero && view.zero.length > 0 && (
                        <>
                          {view.shown.length > 0 && (
                            <tr className="border-b border-line/40">
                              <td colSpan={5} className="px-2 pt-4 pb-1">
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim">Sin gasto en {periodLong}</span>
                              </td>
                            </tr>
                          )}
                          {view.zero.map((m) => (
                            <tr key={m.id} className="border-b border-line/40 text-paper-dim">
                              <td className="px-2 py-2.5">
                                <span className="flex items-center gap-2">
                                  <span className="w-[14px] shrink-0" aria-hidden="true" />
                                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${ACCT[m.kind].chip}`} title={ACCT[m.kind].label}>{ACCT[m.kind].num}</span>
                                  <span className="truncate">{m.name}</span>
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right tabular-nums">{usd(0)}</td>
                              <td className="px-2 py-2.5 text-right tabular-nums">{usd(0)}</td>
                              <td className="px-2 py-2.5 text-right tabular-nums">{usd(0)}</td>
                              <td className="px-2 py-2.5 text-right tabular-nums">{usd(0)}</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-brand/30 bg-brand/[0.06]">
                        <td className="px-2 py-3 font-display text-sm font-bold text-paper">{filtered ? 'Total (filtro)' : 'Total'}</td>
                        <td className="px-2 py-3 text-right font-display text-sm font-black tabular-nums text-paper">{usd(t.fotos)}</td>
                        <td className="px-2 py-3 text-right font-display text-sm font-black tabular-nums text-paper">{usd(t.videos)}</td>
                        <td className="px-2 py-3 text-right font-display text-sm font-black tabular-nums text-paper">{usd(t.apify)}</td>
                        <td className="px-2 py-3 text-right font-display text-base font-black tabular-nums text-brand">{usd(t.grand)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : view.zero.length > 0 ? (
                // Nadie gastó, pero SÍ hay modelos activas: reconocé el roster en vez
                // de negar datos. El botón de abajo lo revela (una sola vía).
                <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line bg-ink-2/30 px-4 py-10 text-center">
                  <Coins size={20} className="text-paper-dim" />
                  <p className="mt-2 text-sm text-paper-mute">{filtered ? 'Nadie gastó con estos filtros.' : `Nadie gastó en ${periodLong}.`}</p>
                  <p className="mt-0.5 text-[12px] text-paper-dim">Hay {view.zero.length} modelo{view.zero.length === 1 ? ' activa' : 's activas'} sin gasto — vela{view.zero.length === 1 ? '' : 's'} con el botón de abajo.</p>
                  {filtered && (
                    <button type="button" onClick={() => { setPeriod('all'); setAcctFilter('all'); setQuery(''); }} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-paper-mute hover:border-brand/40 hover:text-paper">
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                // Genuinamente vacío: ni gasto ni roster (p. ej. buscador que no matchea a nadie).
                <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-line bg-ink-2/30 px-4 py-10 text-center">
                  <Search size={20} className="text-paper-dim" />
                  <p className="mt-2 text-sm text-paper-mute">Nada con estos filtros.</p>
                  <p className="mt-0.5 text-[12px] text-paper-dim">Probá otro período, otra cuenta, o limpiá el buscador.</p>
                  {filtered && (
                    <button type="button" onClick={() => { setPeriod('all'); setAcctFilter('all'); setQuery(''); }} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-paper-mute hover:border-brand/40 hover:text-paper">
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {/* modelos sin gasto todavía — el toggle SIEMPRE tiene dónde renderizar:
                  cuando showZero está activo la tabla de arriba se monta aunque no haya
                  gastadores, así que revelar nunca cae en vacío. */}
              {view.zero.length > 0 && (
                <div className="mt-3">
                  <button type="button" onClick={() => setShowZero((s) => !s)} aria-expanded={showZero} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-paper-dim hover:text-paper">
                    <ChevronDown size={13} className={`transition-transform ${showZero ? 'rotate-180' : ''}`} />
                    {showZero ? 'Ocultar' : 'Ver'} {view.zero.length} modelo{view.zero.length === 1 ? '' : 's'} sin gasto {period === 'all' ? 'todavía' : 'en este período'}
                  </button>
                </div>
              )}
            </section>

            {/* ── Voz (honesto: sin datos) ── */}
            <section className="card3d rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-paper-mute">
                <Mic size={15} className="text-brand" /> Voz · ElevenLabs
              </h2>
              <p className="mt-3 text-sm text-paper-mute">
                {view.voiceCount > 0
                  ? `${view.voiceCount} audio(s) generados en ${periodLong} — el detalle de créditos aún no se registra por modelo.`
                  : 'Sin datos aún. Cuando la cocina genere audios, cada modelo va a mostrar sus créditos acá.'}
              </p>
            </section>

            <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-paper-dim">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400/70" />
              El costo «real» de Apify captura el actor de posts de Instagram. Los sub-actores de video/IA pueden quedar sub-contados hasta que el motor los registre — por eso «real» aquí es del scraper de posts, no la factura mensual completa de Apify.
            </p>

            <p className="px-1 text-center text-[11px] text-paper-dim">
              {refreshedAt ? `Actualizado ${ago(refreshedAt.toISOString())}` : ''} · Los saldos vienen del motor; el gasto se suma de la base.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

// ── Orden de la tabla ──
function makeSorter(sort) {
  const s = sort.dir === 'asc' ? 1 : -1;
  return (a, b) => {
    if (sort.col === 'name') return a.name.localeCompare(b.name) * s;
    const av = a[sort.col] || 0, bv = b[sort.col] || 0;
    if (av === bv) return a.name.localeCompare(b.name);
    return (av - bv) * s;
  };
}

// ── Segmentado (mate; activo = hundido) ──
function Seg({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-ink-2/50 p-1">
      {options.map((o) => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            aria-pressed={on}
            className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${on ? 'bg-brand/15 text-brand shadow-inner' : 'text-paper-mute hover:text-paper'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Cabecera de columna ordenable ──
function Th({ label, col, sort, onSort, align = 'right' }) {
  const active = sort.col === col;
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-2 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${active ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}
      >
        <span>{label}</span>
        {active ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  );
}

// ── Fila de modelo + ficha (tap para abrir) ──
function ModelRow({ r, open, onToggle }) {
  const st = ACCT[r.kind];
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-line/50 transition-colors ${open ? 'bg-ink-2/50' : 'hover:bg-ink-2/30'}`}
      >
        <td className="px-2 py-2.5">
          <span className="flex items-center gap-2">
            <ChevronRight size={14} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-90' : ''}`} />
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${st.chip}`} title={st.label}>{st.num}</span>
            <span className="truncate font-medium text-paper">{r.name}</span>
          </span>
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums text-paper-mute">{usd(r.fotos)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums text-paper-mute">{usd(r.videos)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums text-paper-mute">{usd(r.apify)}</td>
        <td className="px-2 py-2.5 text-right font-display font-black tabular-nums text-paper">{usd(r.total)}</td>
      </tr>
      {open && (
        <tr className="border-b border-line/50 bg-ink-2/30">
          <td colSpan={5} className="px-2 pb-4 pt-1 sm:px-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <DetailBlock icon={<ImageIcon size={13} />} title="Fotos" main={usd(r.hf.fUsd)}
                lines={[`${cr(r.hf.imgs)} imágenes`, `${cr(r.hf.fCr)} créditos`]} />
              <DetailBlock icon={<Video size={13} />} title="Videos" main={usd(r.hf.vUsd)}
                lines={[`${cr(r.hf.vids)} videos`, `${cr(r.hf.vCr)} créditos`]} />
              <DetailBlock icon={<Search size={13} />} title="Apify" main={r.ap.runs ? usd(r.ap.eff) : usd(0)}
                lines={[apLabel(r.ap), `${cr(r.ap.runs)} corrida${r.ap.runs === 1 ? '' : 's'}`]} />
              <DetailBlock icon={<Mic size={13} />} title="Voz" main="—" lines={['sin datos aún']} muted />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-paper-dim">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
              </span>
              <span>{r.id === JULIA_ID ? 'Julia va fija a la Cuenta 1 (su Soul vive ahí).' : (r.kind === 'none' ? 'Sin cuenta reconocida en creator_identity.' : 'Cuenta tomada de creator_identity.')}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Bloque de detalle en la ficha ──
function DetailBlock({ icon, title, main, lines, muted }) {
  return (
    <div className="rounded-2xl border border-line bg-ink/40 p-3">
      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted ? 'text-paper-dim' : 'text-paper-mute'}`}>{icon}{title}</p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${muted ? 'text-paper-dim' : 'text-paper'}`}>{main}</p>
      {lines.map((l, i) => <p key={i} className="truncate text-[11px] tabular-nums text-paper-dim">{l}</p>)}
    </div>
  );
}

// ── Tile de fuente en el resumen ──
function SrcTile({ icon, label, main, sub, tone }) {
  const toneCls = tone === 'brand' ? 'text-brand' : tone === 'sky' ? 'text-sky' : 'text-paper-dim';
  return (
    <div className="rounded-2xl border border-line bg-ink-2/40 p-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${toneCls}`}>{icon}<span className="text-paper-mute">{label}</span></div>
      <p className="mt-1.5 font-display text-lg font-black tabular-nums text-paper sm:text-xl">{main}</p>
      <p className="truncate text-[11px] text-paper-dim">{sub}</p>
    </div>
  );
}

// ── Tarjeta grande de cuenta: saldo actual + gasto (fotos/videos/apify) del período ──
function AcctCard({ kind, acct, spent, sublabel, hfOk, periodLong }) {
  const st = ACCT[kind];
  const connected = isConnected(acct);
  // "Sin conectar" (estado vacío) SOLO cuando el motor sí respondió y la cuenta de
  // verdad no está conectada. Si la edge falló (hfOk=false) NO lo damos por
  // desconectado: el gasto viene de las tablas, así que mostramos el gasto real y
  // dejamos el saldo en "no se pudo leer el motor" — un bache de la edge no borra
  // el gasto conocido (p. ej. los $ de Julia en la Cuenta 1).
  const pending = !connected && hfOk;
  const balance = acct?.balance;
  const cliText = cliLabel(acct);
  const reason = acct?.cli_error || (acct ? 'Falta terminar su llave y el login en la Mac.' : null);
  const s = spent || { fotos: 0, videos: 0, apify: 0, total: 0, models: 0 };
  return (
    <div className={`card3d rounded-3xl border ${pending ? 'border-line' : st.ring} bg-card p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[12px] font-black ${st.chip}`}>{st.num}</span>
            <span className="truncate font-display text-base font-bold text-paper">{st.label}</span>
          </div>
          <p className="mt-1 text-[11px] text-paper-dim">{sublabel}</p>
        </div>
        {pending && <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">Sin conectar</span>}
      </div>

      {pending ? (
        <p className="mt-4 rounded-2xl border border-line bg-ink-2/40 p-3 text-[12px] leading-relaxed text-paper-mute">
          {acct
            ? <>Sin conectar todavía — {reason} Termina de configurarla en <b className="text-paper">Conexión</b> y su saldo y gasto aparecen acá.</>
            : <>Sin conectar todavía. Cuando le pegues la llave en <b className="text-paper">Conexión</b>, su saldo y su gasto aparecen acá.</>}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-line bg-ink-2/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-paper-dim">Saldo actual</p>
              <p className="mt-1 font-display text-xl font-black tabular-nums text-emerald-300">{balance != null ? cr(balance) : '—'}<span className="ml-1 text-[11px] font-semibold text-paper-dim">créd</span></p>
              {balance != null && <p className="text-[11px] tabular-nums text-paper-dim">≈ {usd(balance * CREDIT_USD)}{acct?.balance_at ? ` · ${ago(acct.balance_at)}` : ''}</p>}
              {balance == null && <p className="text-[11px] text-paper-dim">{hfOk ? 'sin dato del motor' : 'no se pudo leer el motor'}</p>}
            </div>
            <div className="rounded-2xl border border-line bg-ink-2/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-paper-dim">Gastado · {periodLong}</p>
              <p className="mt-1 font-display text-xl font-black tabular-nums text-paper">{usd(s.total)}</p>
              <p className="text-[11px] tabular-nums text-paper-dim">{s.models} modelo{s.models === 1 ? '' : 's'} con gasto</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Fotos" main={usd(s.fotos)} />
            <Stat label="Videos" main={usd(s.videos)} />
            <Stat label="Apify" main={usd(s.apify)} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-dim">
            <Laptop size={12} /> <span className={cliText.tone}>{cliText.text}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Estado del login del CLI en la Mac del cocinero (reusa la señal de /conexion).
function cliLabel(a) {
  if (!a) return { tone: 'text-paper-dim', text: 'sin cuenta' };
  const seen = a.cli_seen_at ? new Date(a.cli_seen_at).getTime() : 0;
  const stale = seen && Date.now() - seen > STALE_MS;
  if (a.legacy) return { tone: seen && !stale ? 'text-emerald-300' : 'text-paper-dim', text: `login de siempre${seen ? ` · visto ${ago(a.cli_seen_at)}` : ''}` };
  if (a.cli_error) return { tone: 'text-rose-300', text: a.cli_error };
  if (!seen) return { tone: 'text-paper-dim', text: 'sin login en la Mac todavía' };
  return { tone: stale ? 'text-amber-300' : 'text-emerald-300', text: `login listo · visto ${ago(a.cli_seen_at)}` };
}

// ── Mini-stat (celda de número) ──
function Stat({ label, main, sub, tone }) {
  const mainCls = tone === 'ok' ? 'text-emerald-300' : 'text-paper';
  return (
    <div className="rounded-xl border border-line bg-ink/40 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-paper-dim">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-black tabular-nums ${mainCls}`}>{main}</p>
      {sub && <p className="truncate text-[10px] text-paper-dim">{sub}</p>}
    </div>
  );
}
