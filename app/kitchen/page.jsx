'use client';

// /kitchen — "La cocina" (dashboard high-level, CENTRADO EN LA MODELO).
// Flujo lineal: 1) Elegí la modelo (fácil, con buscador) → 2) su cocina: elegís virales
// (pestañas: Lo que tengo · Lo que encontré · Subir + vibe) → cola → 3) sus Resultados
// (Antes/Después → Aprobar → baúl IA). El gasto se ve POR MODELO en su cabecera.
// Motor real = Soul 2.0 de la cuenta Higgsfield (soul entrenada), vía CLI oficial.
// /kitchen encola (generations queued); el "worker" (CLI logueado) las cocina.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, ChefHat, Loader2, CheckCircle2, Sparkles, IdCard, Coins, RefreshCw,
  Heart, Trash2, Flame, Images, ArrowRight, AlertTriangle, X, Search,
  FolderHeart, Compass, Upload, Check, ChefHat as Pot, LayoutGrid, Plus,
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
// Momentos de la vida real para el carrusel "Sorpréndeme": actividad + expresión + ENCUADRE + prop DISTINTOS en cada foto. Se barajan.
// El lugar es el MISMO punto exacto; solo cambia cuánto se ve (el crop), la pose y la situación.
const POSE_POOL = [
  'seen FROM THE SIDE (profile angle), sitting on the floor checking her phone, soft natural smile',
  'a CLOSE hand-held SELFIE from slightly above, cheeky playful look',
  'shot FROM ACROSS THE ROOM (wide), walking a step and glancing back over her shoulder, playful smile',
  'from a THREE-QUARTER back angle, leaning against a wall scrolling her phone, relaxed neutral look',
  'a LOW-ANGLE full-body shot, standing with a hand on her hip holding her sunglasses, confident calm gaze',
  'FROM BEHIND, looking over her shoulder toward the camera, warm genuine smile',
  'a HIGH-ANGLE close-up, lying back relaxing with eyes half-closed, serene expression',
  'waist-up FROM THE SIDE, caught mid-laugh with a cold drink in one hand',
  'full-body from the FRONT, crouching for a moment to fix her sandal, a light candid smile',
  'a candid FROM THE SIDE, adjusting her hair with both hands, soft thoughtful expression',
  'a CLOSE SELFIE angle, sipping a coffee, content relaxed smile',
  'a WIDE shot from a corner of the room, sitting hugging one knee, natural laugh',
];
const shuffle = (arr) => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
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
  const [lightbox, setLightbox] = useState(null);  // ver una foto en grande (URL)
  const [q, setQ] = useState('');                  // buscador de modelos

  // Cocinar
  const [source, setSource] = useState('encontre');
  const [vibe, setVibe] = useState('Todos');
  const [origin, setOrigin] = useState('all'); // filtro de ORIGEN: todo | scraping | subidas por vos
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

  // Aviso "cuando terminan de cocinarse" — para no estar adivinando.
  const seenCookingRef = useRef(new Set()); // ids que estaban cocinándose en el ciclo anterior
  const askNotify = () => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch { /* noop */ } };

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) { const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m); setBalance(out.balance ?? null); }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, note, created_at, done_at, carousel_of').order('created_at', { ascending: false }).limit(200);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);
  const loadVault = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('id, url, caption, creator_id, kind, vibe, likes, views, source_handle, source_url, source_platform, interest, ai_ok, ai_reason, created_at').in('kind', ['ref', 'real']).order('created_at', { ascending: false }).limit(600);
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

  // Detecta la transición cocinándose → LISTA y AVISA: toast + notificación del navegador (aunque estés en otra pestaña).
  useEffect(() => {
    if (access !== 'ok') return;
    const cookingNow = new Set(gens.filter((g) => ['queued', 'in_progress'].includes(g.status)).map((g) => g.id));
    const prev = seenCookingRef.current;
    seenCookingRef.current = cookingNow;
    if (prev.size === 0) return; // primer ciclo: no avisar por lo que ya estaba hecho antes de abrir
    const justDone = gens.filter((g) => g.status === 'done' && prev.has(g.id));
    const justFailed = gens.filter((g) => g.status === 'failed' && prev.has(g.id));
    const nameOf = (id) => (creators.find((c) => c.id === id)?.full_name) || 'una modelo';
    if (justDone.length > 0) {
      const byC = {}; justDone.forEach((g) => { byC[g.creator_id] = (byC[g.creator_id] || 0) + 1; });
      const parts = Object.entries(byC).map(([cid, n]) => `${n} de ${nameOf(cid)}`);
      const text = `Listas para revisar: ${parts.join(', ')}.${justFailed.length ? ` (${justFailed.length} fallaron)` : ''} Entrá a Resultados a verlas.`;
      setMsg({ kind: 'ok', text });
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification('Kitchen — fotos listas 🍳', { body: text, tag: 'kitchen-ready', renotify: true });
          n.onclick = () => { try { window.focus(); } catch { /* noop */ } };
        }
      } catch { /* noop */ }
    } else if (justFailed.length > 0) {
      setMsg({ kind: 'info', text: `${justFailed.length} foto(s) fallaron al cocinarse. Mirá "Rechazadas" para reintentar.` });
    }
  }, [gens, access, creators]);

  // El TÍTULO de la pestaña como identificador (lo ves aunque estés en otra pestaña del navegador).
  useEffect(() => {
    if (access !== 'ok') { document.title = 'Kitchen · LetShoot'; return; }
    const cooking = gens.filter((g) => ['queued', 'in_progress'].includes(g.status)).length;
    const ready = gens.filter((g) => g.status === 'done' && !g.carousel_of).length;
    document.title = cooking ? `🍳 Cocinando ${cooking}… · Kitchen` : ready ? `(${ready}) listas ✅ · Kitchen` : 'Kitchen · LetShoot';
    return () => { document.title = 'LetShoot'; };
  }, [gens, access]);

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
  // Es del scraper si tiene origen de red social (source_platform/handle). Si no, la subió un humano.
  const isScraped = (r) => !!(r.source_platform || r.source_handle);
  const originCounts = useMemo(() => {
    const base = sourceRows.filter((r) => r.interest !== 'descartada' && r.ai_ok !== false);
    let scraped = 0, mine = 0; base.forEach((r) => { if (isScraped(r)) scraped += 1; else mine += 1; });
    return { all: base.length, scraped, mine };
  }, [sourceRows]);
  const pickPhotos = useMemo(() => {
    // Fuera las descartadas y la basura que marcó la IA.
    let rows = sourceRows.filter((r) => r.interest !== 'descartada' && r.ai_ok !== false);
    if (origin === 'scraped') rows = rows.filter(isScraped);
    else if (origin === 'mine') rows = rows.filter((r) => !isScraped(r));
    if (vibe !== 'Todos' && vibeCounts[vibe]) rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    // Éxitos primero: más likes arriba (las scrapeadas tienen likes; las subidas a mano quedan después).
    return [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0)).slice(0, 120);
  }, [sourceRows, vibe, vibeCounts, origin]);

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
  // Cocina directo desde la ficha. Si total>1: cocina la réplica + (total-1) variaciones automáticas (mismo lugar/outfit, otras poses).
  const cookDetail = async (row, total) => {
    if (!selReady) { setMsg({ kind: 'err', text: `${selCreator?.full_name || 'Esta modelo'} todavía no tiene su soul enlazada. Avisame y la enlazo.` }); return; }
    askNotify();
    setEnq(true);
    const { error } = await sb.from('generations').insert({ creator_id: sel, reference_url: row.url, status: 'queued', engine: 'soul2', model: 'text2image_soul_v2', auto_carousel: Math.max(0, total - 1) });
    setEnq(false);
    if (error) { setMsg({ kind: 'err', text: `No se pudo encolar: ${error.message}` }); return; }
    setDetail(null); setDetailN(1); loadGens(); setSubtab('resultados');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
    setMsg({ kind: 'ok', text: total > 1 ? `Cocinando carrusel: la réplica + ${total - 1} variaciones. Aparece en Resultados.` : 'Cocinando la réplica. Aparece en Resultados.' });
  };

  const enterModel = (id) => { setSel(id); setSubtab('cocinar'); setQueue([]); setMsg(null); setSource('encontre'); setVibe('Todos'); };
  const toggleQueue = (url) => setQueue((k) => k.includes(url) ? k.filter((u) => u !== url) : [...k, url]);

  const enqueue = async () => {
    if (!selReady) { setMsg({ kind: 'err', text: `${selCreator?.full_name || 'Esta modelo'} todavía no tiene su soul enlazada. Avisame y la enlazo.` }); return; }
    if (queue.length === 0) { setMsg({ kind: 'info', text: 'Tocá al menos una foto para seleccionarla.' }); return; }
    askNotify();
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

  const decide = async (g, approve, keepOpen = false) => {
    await callFn('approve_gen', { generation_id: g.id, approve });
    if (!keepOpen) setCompare(null);
    loadGens();
    setMsg({ kind: approve ? 'ok' : 'info', text: approve ? 'Aprobada — foto limpia (sin metadata) al baúl ✓' : 'Descartada.' });
  };

  // Reintentar una rechazada: la vuelve a la cola.
  const retry = async (g) => {
    await sb.from('generations').update({ status: 'queued', note: null, result_url: null }).eq('id', g.id);
    loadGens();
    setMsg({ kind: 'info', text: 'La mandé de nuevo a la cola.' });
  };

  // Carrusel: variaciones (mismo lugar + mismo outfit, otras poses) sobre la foto raíz.
  // Dos modos: 'auto' (sorpréndeme: N fotos, la IA elige cada pose) o 'custom' (una idea por foto).
  const [varMode, setVarMode] = useState('auto');
  const [varN, setVarN] = useState(3);
  const [varIdeas, setVarIdeas] = useState(['', '']); // modo custom: una idea por foto
  const [varBusy, setVarBusy] = useState(false);
  const [detailN, setDetailN] = useState(1); // ficha: 1 = normal, >1 = carrusel al cocinar
  const makeVariations = async (rootId) => {
    if (!rootId) return;
    askNotify();
    let ideas;
    if (varMode === 'custom') {
      ideas = varIdeas.map((s) => s.trim()).slice(0, 8);
      if (ideas.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos una foto.' }); return; }
    } else {
      // Sorpréndeme: cada foto una pose DISTINTA (pool barajado) → variedad garantizada, natural.
      const poses = shuffle(POSE_POOL);
      ideas = Array.from({ length: varN }, (_, i) => poses[i % poses.length]);
    }
    setVarBusy(true);
    const r = await callFn('make_variations', { generation_id: rootId, ideas });
    setVarBusy(false);
    if (r?.ok) {
      if (varMode === 'custom') setVarIdeas(['', '']);
      setMsg({ kind: 'ok', text: `${r.queued} foto(s) en la cola — mismo lugar y outfit, otras poses. Aparecen acá abajo cocinándose.` });
      loadGens();
    } else setMsg({ kind: 'err', text: r?.error || 'No se pudo armar el carrusel.' });
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
  const doneTs = (g) => new Date(g.done_at || g.created_at).getTime();
  const mineGens = gens.filter((g) => g.creator_id === sel);
  const isRoot = (g) => !g.carousel_of; // réplica (no es variación de carrusel)
  // Grid principal: solo réplicas. Las variaciones se ven/aprueban dentro del pop-up del carrusel.
  const reviewRows = mineGens.filter((g) => g.status === 'done' && isRoot(g)).sort((a, b) => doneTs(b) - doneTs(a));
  const approvedRows = mineGens.filter((g) => g.status === 'approved').sort((a, b) => doneTs(b) - doneTs(a)); // baúl: réplicas + variaciones
  const pendingRows = mineGens.filter((g) => ['queued', 'in_progress'].includes(g.status) && isRoot(g));
  const failedRows = mineGens.filter((g) => g.status === 'failed' && isRoot(g));
  // Hijos de un carrusel (todas las fotos cuya raíz es rootId, sin la raíz), ordenadas por cocinado.
  const rootOf = (g) => g.carousel_of || g.id;
  const carouselKids = (rootId) => mineGens.filter((g) => g.carousel_of === rootId).sort((a, b) => doneTs(b) - doneTs(a)); // más nuevas ARRIBA (las que se están creando primero)
  const carouselCount = (rootId) => mineGens.filter((g) => g.carousel_of === rootId && g.status !== 'failed' && g.status !== 'rejected').length;
  // Datos del pop-up del carrusel (se recalculan vivos con el polling de gens).
  const cmpRoot = compare ? mineGens.find((x) => x.id === compare.root) : null;
  const cmpKids = compare ? carouselKids(compare.root) : [];

  // Estado GLOBAL de la cocina (todas las modelos) — para la ruedita flotante que se ve en cualquier pantalla.
  const cookingAll = gens.filter((g) => ['queued', 'in_progress'].includes(g.status));
  const readyAll = gens.filter((g) => g.status === 'done' && !g.carousel_of);
  const queueBarShown = !!(selCreator && subtab === 'cocinar' && queue.length > 0);
  const goToCooking = () => {
    const t = cookingAll[0] || readyAll[0];
    if (!t) return;
    setSel(t.creator_id); setSubtab('resultados'); setCompare(null); setDetail(null); setLightbox(null);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
  };

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
                <div className="rounded-xl border border-line bg-ink-2 px-3 py-2 text-center" title={`Total gastado en ${selCreator.full_name}: ${money(mine.credits)} = ${mine.credits.toFixed(2)} créditos en ${mine.total} fotos (${money(0.12)} c/foto)`}>
                  <div className="text-sm font-bold tabular-nums text-amber-300">{money(mine.credits)} <span className="text-paper-dim">·</span> {mine.credits.toFixed(1)} créd</div>
                  <div className="text-[10px] text-paper-dim">total gastado</div>
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

                {source !== 'subir' && originCounts.all > 0 && (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-line bg-card p-1 text-xs font-semibold">
                    {[['all', 'Todas', originCounts.all, null], ['scraped', 'Scraping', originCounts.scraped, Search], ['mine', 'Subidas por mí', originCounts.mine, Upload]].map(([k, label, n, Icon]) => (
                      <button key={k} type="button" onClick={() => setOrigin(k)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${origin === k ? (k === 'scraped' ? 'bg-fuchsia-500 text-white' : k === 'mine' ? 'bg-sky-500 text-white' : 'bg-brand text-on-accent') : 'text-paper-mute hover:text-paper'}`}>
                        {Icon ? <Icon size={12} /> : null} {label} <span className="opacity-70">{n}</span>
                      </button>
                    ))}
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
                          <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                            {/* Tag de ORIGEN: scraping (IG) vs subida por vos */}
                            {(r.source_platform || r.source_handle)
                              ? <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow" title={`Del scraping${r.source_handle ? ` · @${r.source_handle}` : ''}`}><Search size={10} /> Scraping</span>
                              : <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow" title="La subiste vos a mano"><Upload size={10} /> Subida</span>}
                            {cookedRefs.has(r.url) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-2 py-0.5 text-[10px] font-bold text-white"><Check size={10} /> Hecha</span>}
                          </div>
                          {(r.likes || r.views || r.source_handle) && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">
                              <span className="inline-flex items-center gap-1.5">
                                {r.views ? <span className="inline-flex items-center gap-0.5 text-sky-300">▶ {fmtLikes(r.views)}</span> : null}
                                {r.likes ? <span className="inline-flex items-center gap-0.5"><Heart size={10} className="fill-rose-400 text-rose-400" /> {fmtLikes(r.likes)}</span> : null}
                              </span>
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

                {/* Para revisar — cada réplica abre su pop-up (comparador + carrusel) */}
                {reviewRows.length > 0 && (
                  <section>
                    <h3 className="mb-1 font-display text-sm font-bold text-paper">Para revisar · {reviewRows.length}</h3>
                    <p className="mb-2 text-xs text-paper-dim">Tocá una foto para verla grande, aprobarla y armar su carrusel (mismo lugar y outfit, otras poses).</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {reviewRows.map((g) => {
                        const kids = carouselCount(g.id);
                        return (
                        <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                          <button type="button" onClick={() => setCompare({ root: g.id, creator_id: g.creator_id })} className="relative block w-full">
                            {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            {kids > 0 && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-on-accent"><LayoutGrid size={10} /> {kids + 1}</span>}
                          </button>
                          <div className="flex items-center gap-1 p-2">
                            <button type="button" onClick={() => decide(g, true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30"><Heart size={12} /> Aprobar</button>
                            <button type="button" onClick={() => setCompare({ root: g.id, creator_id: g.creator_id })} className="inline-flex items-center justify-center gap-1 rounded-full border border-brand/40 px-2 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/10" title="Armar carrusel"><LayoutGrid size={12} /></button>
                            <button type="button" onClick={() => decide(g, false)} className="inline-flex items-center justify-center rounded-full border border-line px-2 py-1.5 text-paper-mute hover:text-rose-300"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Aprobadas — limpias en el baúl; tocá una para seguir su carrusel */}
                {approvedRows.length > 0 && (
                  <section>
                    <h3 className="mb-1 font-display text-sm font-bold text-paper">Aprobadas · {approvedRows.length}</h3>
                    <p className="mb-2 inline-flex items-center gap-1 text-xs text-emerald-300/80"><Check size={12} /> Limpias (sin metadata) en el baúl. Tocá una réplica para hacerle más carrusel.</p>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                      {approvedRows.map((g) => (
                        <button type="button" key={g.id} onClick={() => setCompare({ root: rootOf(g), creator_id: g.creator_id })} className="group relative block overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                          {g.result_url ? <img src={g.result_url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><LayoutGrid size={10} /> carrusel</span>
                        </button>
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

      {/* ── RUEDITA FLOTANTE (identificador global): gira mientras cocina, se pone verde cuando hay listas ── */}
      {(cookingAll.length > 0 || readyAll.length > 0) && (
        <button type="button" onClick={goToCooking}
          className={`fixed right-4 z-30 inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-bold shadow-lg backdrop-blur transition-colors ${queueBarShown ? 'bottom-20' : 'bottom-4'} ${cookingAll.length > 0 ? 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'}`}
          title={cookingAll.length > 0 ? 'Se están creando fotos — tocá para verlas' : 'Hay fotos listas para revisar — tocá para verlas'}>
          {cookingAll.length > 0 ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Cocinando {cookingAll.length}…</span>
              {readyAll.length > 0 && <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-100">{readyAll.length} listas</span>}
            </>
          ) : (
            <>
              <CheckCircle2 size={17} />
              <span>{readyAll.length} lista{readyAll.length > 1 ? 's' : ''} para revisar</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      )}

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
                    {detail.views != null ? <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Views (video)</span><span className="inline-flex items-center gap-1 font-semibold text-sky-300">▶ {fmtLikes(detail.views)}</span></div> : <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Views</span><span className="text-[11px] text-paper-dim">solo videos/reels</span></div>}
                    {detail.vibe && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Nicho</span><span className="font-semibold text-paper">#{detail.vibe}</span></div>}
                  </>
                ) : (
                  <p className="text-paper-mute">Foto tuya (subida a mano). No tiene datos de origen.</p>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2"><span className="text-paper-dim">Cuesta recrearla</span><span className="font-semibold text-amber-300">~{money(0.12)} · 0.12 créd</span></div>
                {detail.ai_reason && <p className="rounded-lg border border-line bg-ink-2/40 p-2 text-[12px] text-paper-mute">🤖 {detail.ai_reason}</p>}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                {/* Elegir: normal (1 foto) o carrusel (réplica + N variaciones) */}
                <div className="col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-paper-mute">Cocinar como:</span>
                    <button type="button" onClick={() => setDetailN(1)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${detailN === 1 ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}>Normal</button>
                    {[2, 3, 4].map((n) => (
                      <button key={n} type="button" onClick={() => setDetailN(n)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${detailN === n ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}><LayoutGrid size={11} /> Carrusel {n}</button>
                    ))}
                  </div>
                  <button type="button" disabled={enq} onClick={() => cookDetail(detail, detailN)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                    {enq ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} />} {detailN > 1 ? `Cocinar carrusel de ${detailN}` : 'Cocinar'} con {(selCreator?.full_name || '').split(' ')[0]}
                  </button>
                </div>
                <button type="button" onClick={() => markInterest(detail, 'interesada')} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${detail.interest === 'interesada' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'}`}><Heart size={13} /> Me interesa</button>
                <button type="button" onClick={() => markInterest(detail, 'descartada')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-rose-300"><X size={13} /> Fuera</button>
                {detail.vibe && <button type="button" onClick={() => moreLikeThis(detail)} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-paper-mute hover:text-paper"><Search size={13} /> Más como esta (#{detail.vibe})</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ANTES / DESPUÉS + CARRUSEL (todo dentro del pop-up) ── */}
      {compare && cmpRoot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setCompare(null)}>
          <div className="card3d flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-paper">Antes / Después {cmpKids.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"><LayoutGrid size={11} /> Carrusel · {carouselCount(compare.root) + 1}</span>}</h3>
              <button type="button" onClick={() => setCompare(null)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper-mute hover:text-paper"><X size={15} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {/* Réplica: viral vs su versión */}
              <div className="grid grid-cols-2 gap-3">
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Viral (referencia)</div><img src={cmpRoot.reference_url} alt="" onClick={() => setLightbox(cmpRoot.reference_url)} className="w-full cursor-zoom-in rounded-xl border border-line object-cover" /></div>
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">Su versión {cmpRoot.status === 'approved' && <span className="text-emerald-300">· aprobada ✓</span>}</div><img src={cmpRoot.result_url} alt="" onClick={() => setLightbox(cmpRoot.result_url)} className="w-full cursor-zoom-in rounded-xl border border-brand/40 object-cover" /></div>
              </div>
              {cmpRoot.status === 'done' && (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => decide(cmpRoot, false, false)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"><Trash2 size={14} /> Descartar</button>
                  <button type="button" onClick={() => decide(cmpRoot, true, true)} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold"><Heart size={14} /> Aprobar → baúl</button>
                </div>
              )}

              {/* Carrusel: mismo lugar + mismo outfit, otras poses */}
              <div className="mt-4 rounded-2xl border border-brand/25 bg-ink-2 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-paper"><LayoutGrid size={15} className="text-brand" /> Hacer carrusel <span className="text-[11px] font-normal text-paper-dim">— mismo lugar y outfit, otras poses</span></div>
                {/* Modo: sorpréndeme vs una idea por foto */}
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-card p-1">
                  <button type="button" onClick={() => setVarMode('auto')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${varMode === 'auto' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Sparkles size={12} /> Sorpréndeme</button>
                  <button type="button" onClick={() => setVarMode('custom')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${varMode === 'custom' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Flame size={12} /> Yo elijo cada una</button>
                </div>

                {varMode === 'auto' ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-paper-mute">¿Cuántas?</span>
                      {[2, 3, 4, 6].map((n) => (
                        <button key={n} type="button" onClick={() => setVarN(n)} className={`h-7 w-8 rounded-lg text-xs font-bold transition-colors ${varN === n ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}>{n}</button>
                      ))}
                    </div>
                    <button type="button" disabled={varBusy} onClick={() => makeVariations(compare.root)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                      {varBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Cocinar {varN} · cada una una pose distinta
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[11px] text-paper-mute">Escribí qué querés en cada foto. La que dejes vacía, la IA la resuelve sola.</p>
                    <div className="mb-2 space-y-1.5">
                      {varIdeas.map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{i + 1}</span>
                          <input value={v} onChange={(e) => setVarIdeas((a) => a.map((x, j) => j === i ? e.target.value : x))} placeholder={`Foto ${i + 1} (ej: ${['con el teléfono, media sonrisa', 'riéndose mirando a un lado', 'tomando algo, relajada', 'de espaldas mirando atrás', 'selfie al espejo, coqueta'][i % 5]})`} className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-paper placeholder:text-paper-dim/60 focus:border-brand/50 focus:outline-none" />
                          {varIdeas.length > 1 && <button type="button" onClick={() => setVarIdeas((a) => a.filter((_, j) => j !== i))} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:text-rose-300"><X size={12} /></button>}
                        </div>
                      ))}
                    </div>
                    {varIdeas.length < 8 && <button type="button" onClick={() => setVarIdeas((a) => [...a, ''])} className="mb-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-paper-mute hover:text-paper"><Plus size={12} /> Agregar otra foto</button>}
                    <button type="button" disabled={varBusy} onClick={() => makeVariations(compare.root)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                      {varBusy ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />} Cocinar {varIdeas.length} con tus ideas
                    </button>
                  </>
                )}

                {/* Fotos del carrusel: cocinándose + listas */}
                {cmpKids.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {cmpKids.map((k) => (
                      <div key={k.id} className={`overflow-hidden rounded-lg border bg-card ${k.status === 'approved' ? 'border-emerald-500/40' : k.status === 'failed' ? 'border-rose-500/30' : 'border-line'}`}>
                        {['queued', 'in_progress'].includes(k.status) ? (
                          <div className="relative">
                            {k.reference_url ? <img src={k.reference_url} alt="" className="aspect-[3/4] w-full scale-105 object-cover blur-md brightness-[0.4]" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            <div className="absolute inset-0 grid place-items-center"><Loader2 size={20} className="animate-spin text-amber-300" /></div>
                          </div>
                        ) : k.status === 'failed' ? (
                          <div className="relative">
                            {k.reference_url ? <img src={k.reference_url} alt="" className="aspect-[3/4] w-full object-cover opacity-40" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            <button type="button" onClick={() => retry(k)} className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-rose-200"><RefreshCw size={16} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <img src={k.result_url} alt="" onClick={() => setLightbox(k.result_url)} className="aspect-[3/4] w-full cursor-zoom-in object-cover" />
                              {k.status === 'approved' && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={11} /></span>}
                            </div>
                            {k.status === 'done' && (
                              <div className="flex items-center gap-1 p-1.5">
                                <button type="button" onClick={() => decide(k, true, true)} className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-full bg-emerald-500/20 px-1 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/30"><Heart size={10} /></button>
                                <button type="button" onClick={() => decide(k, false, true)} className="inline-flex items-center justify-center rounded-full border border-line px-1.5 py-1 text-paper-mute hover:text-rose-300"><Trash2 size={10} /></button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISOR EN GRANDE (lightbox) ── z-index inline alto para quedar SIEMPRE arriba del pop-up */}
      {lightbox && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" style={{ zIndex: 2147483000 }} onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 hover:bg-white/10"><X size={20} /></button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
