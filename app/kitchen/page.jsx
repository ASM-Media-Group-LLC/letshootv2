'use client';

// /kitchen — "La cocina" (dashboard high-level, CENTRADO EN LA MODELO).
// Flujo lineal: 1) Elegí la modelo (fácil, con buscador) → 2) su cocina: elegís virales
// (Cocinar = biblioteca de guías COMPARTIDA · Buscar en IG aparte) → cola → 3) sus Resultados
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
  FolderHeart, Compass, Upload, Check, ChefHat as Pot, LayoutGrid, Plus, Clock, ChevronDown, Star, Play, Download, Info,
} from 'lucide-react';

async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}

const VIBES = ['Todos', 'Casual', 'Sensual', 'Editorial', 'Playa', 'Fitness', 'Fiesta'];

// La misma foto de IG llega con URL firmada distinta cada scrape → se duplica.
// Dedup por su ID de media estable (del path .../<a>_<mediaid>_<b>_n) o ig_cache_key.
const mediaKey = (r) => {
  const u = r?.url || '';
  let m = u.match(/\/\d+_(\d{6,})_\d+_n/);
  if (m) return 'm:' + m[1];
  m = u.match(/[?&]ig_cache_key=([^&%.]+)/);
  if (m) return 'c:' + m[1];
  return 'u:' + u.split('?')[0];
};
const dedupeByMedia = (rows) => {
  const seen = new Set(); const out = [];
  for (const r of rows) { const k = mediaKey(r); if (seen.has(k)) continue; seen.add(k); out.push(r); }
  return out;
};
// Momentos de la vida real para el carrusel "Sorpréndeme": actividad + expresión + ENCUADRE + prop DISTINTOS en cada foto. Se barajan.
// El lugar es el MISMO punto exacto; solo cambia cuánto se ve (el crop), la pose y la situación.
const POSE_POOL = [
  'Straight-on bedroom mirror selfie, phone held at mid-chest and half caught in the reflection, weight dropped onto one hip with the free hand hooked loosely into the waistband, a calm closed-lip almost-smirk.',
  'Overhead front-facing angle with the phone held just above and tilted down, lying back into a pile of pillows with one knee bent up and both arms relaxed at the sides, a drowsy soft half-smile.',
  'Waist-up shot at full arm length beside a window, standing side-on and turned back toward the lens while both hands cradle a steaming ceramic mug near the chest, a gentle content smile.',
  'Candid framing from a phone propped on a table a few feet away, sunk low into a soft couch with the legs curled to one side and one arm draped along the backrest, laughing naturally with the head tilted.',
  'Low front-facing angle with the phone near floor level looking slightly up, sitting on the floor with the back leaned against the bed and the knees pulled up, forearms resting on them, a relaxed mid-thought look.',
  'Full-length shot from a phone held at hip height and angled up, standing barefoot and turned three-quarters away to look out a window with one hand flat on the frame, a soft wistful expression in profile.',
  'Handheld selfie at arm length lying on the stomach with the upper body propped on both elbows and the ankles crossed in the air behind, an easy playful grin caught mid-laugh.',
  'Low-angle full-body shot from near the floor aimed steeply upward, standing tall with the weight shifted onto one leg, one hand lifted toward the collarbone and the other loose at the side, glancing off to the side with a calm confident look.',
  'Wide shot framed from across the room so the whole figure sits small within the space, caught mid-stride walking toward the camera with both arms swinging naturally, laughing openly as if mid-conversation.',
  'Shot from directly behind at shoulder height, glancing back over one shoulder toward the lens with the hips squared away and one hand trailing along a nearby edge, a subtle amused smirk.',
  'Tight waist-up close-up filling the frame from just below the ribs upward, the torso squared to the camera with one hand resting lightly at the collarbone, a warm close-mouthed smile straight down the lens.',
  'Over-the-shoulder shot from just behind and beside, the camera peeking past the near shoulder to reveal her looking down at a phone cupped in both hands, a quiet focused half-smile.',
  'Eye-level three-quarter shot, kneeling upright with the weight settled back on the heels and one hand raised mid-gesture, mouth open mid-sentence as if telling a story to someone off-camera, brows lifted and animated.',
  'Low candid side angle, crouched and balanced on the balls of the feet with the weight carried over the toes, one hand reaching down to adjust a shoe strap, brow lightly furrowed in casual concentration.',
  'Eye-level medium shot leaning the shoulder and upper back into a wall with the weight tipped against it and the ankles loosely crossed, holding the phone down at the side, gazing off-frame with a quiet relaxed look.',
  'Eye-level three-quarter shot perched on the front edge of a couch with the weight balanced on that edge and both feet planted flat, hands resting loosely in the lap, turning toward the camera with a warm genuine smile.',
  'Slightly low-angle waist-up shot, standing with the weight on one hip while lifting a sweating clear plastic cup of iced coffee toward the mouth mid-sip, the gaze dropped to the straw with a relaxed soft smile.',
  'Slightly low upward angle, the chin lifted toward the light with the eyes gently closed and a serene content half-smile, the arms loose and relaxed as if soaking in the warmth.',
];
const shuffle = (arr) => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Valor aprox del crédito Higgsfield (Soul 2.0 ≈ 0.12 créd ≈ US$0.011/foto). Ajustable.
const USD_PER_CREDIT = 0.09;
const money = (credits) => `US$${(Number(credits || 0) * USD_PER_CREDIT).toFixed(2)}`;
// Costo estimado del scraper por foto bajada (Apify IG ≈ US$2.3/1000). El costo REAL de cada
// corrida se guarda en scrape_runs desde el motor; esto es el estimado inmediato para lo ya bajado.
const SCRAPER_USD_PER_PHOTO = 0.0023;
const scraperMoney = (photos) => `US$${(Number(photos || 0) * SCRAPER_USD_PER_PHOTO).toFixed(2)}`;
const usd = (n) => `US$${(Number(n) || 0).toFixed(2)}`;
const fmtDay = (d) => { try { return new Date(String(d) + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short' }); } catch { return String(d); } };
// Agrupa filas (ya cortadas) por DÍA: Hoy · Ayer · fecha.
const dayGroups = (rows) => {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOf(new Date());
  const label = (ts) => { if (!ts) return 'Sin fecha'; const d = new Date(ts); const diff = Math.round((today - startOf(d)) / 86400000); if (diff === 0) return 'Hoy'; if (diff === 1) return 'Ayer'; return d.toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const groups = []; let cur = null;
  rows.forEach((r) => { const lbl = label(r.created_at); if (!cur || cur.label !== lbl) { cur = { label: lbl, rows: [] }; groups.push(cur); } cur.rows.push(r); });
  return groups;
};
// Acepta LINK COMPLETO de Instagram o solo @cuenta y devuelve el usuario limpio.
// instagram.com/skylar_tisdale/... → skylar_tisdale · @skylar_tisdale → skylar_tisdale
const parseHandle = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/instagram\.com\/(?:p\/|reel\/|tv\/)?@?([A-Za-z0-9._]+)/i);
  if (m && !/^(p|reel|tv|explore|stories)$/i.test(m[1])) return m[1].replace(/^@/, '');
  return s.replace(/^@/, '').replace(/\/+$/, '').split(/[/?#]/)[0];
};
const fmtLikes = (n) => { const x = Math.max(0, Number(n || 0)); return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : `${x}`; };

export default function KitchenPage() {
  const [access, setAccess] = useState('loading');
  useEffect(() => { (async () => { try { const up = await getUserProfile(); const p = up?.profile; setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied'); } catch { setAccess('denied'); } })(); }, []);

  const [creators, setCreators] = useState([]);
  const [sel, setSel] = useState('');              // modelo elegida (si vacío → pantalla de elegir modelo)
  const [subtab, setSubtab] = useState('todo'); // dentro de la modelo: cocinar | buscar | resultados | aprobadas | todo
  const [reviewFlat, setReviewFlat] = useState(true); // Resultados: true = TODAS sueltas (rollo de cámara, default) · false = agrupadas por carrusel
  const [resTab, setResTab] = useState('revisar'); // dentro de Resultados: revisar | aprobadas | nosalieron | todas
  const [tick, setTick] = useState(() => Date.now()); // reloj para el contador de "cocinándose"
  const [visN, setVisN] = useState(30); // cuántas fotos se muestran (scroll por tandas)
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
  const [vibe, setVibe] = useState('Todos'); // filtro de vibe en la pestaña Buscar en IG
  // Biblioteca de guías (Cocinar): filtro + modelo + buscador + orden
  const [baulFilter, setBaulFilter] = useState('guias'); // guias | reales | favoritas
  const [baulModel, setBaulModel] = useState('');        // '' = todas las modelos (solo aplica a Guías)
  const [showUpload, setShowUpload] = useState(false);   // dropzone de "Subir fotos"
  const [baulSearch, setBaulSearch] = useState('');
  const [baulSort, setBaulSort] = useState('recientes'); // recientes (última primero) | likes
  const [queue, setQueue] = useState([]);
  const [enq, setEnq] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [costOpen, setCostOpen] = useState(() => new Set()); // ids con el precio por foto desplegado
  // Perfil de búsqueda por modelo (nichos) + scraper
  const [niches, setNiches] = useState([]);
  const [newNiche, setNewNiche] = useState('');
  const [styleDesc, setStyleDesc] = useState('');
  const [scraping, setScraping] = useState(false);
  const [accounts, setAccounts] = useState([]);   // cuentas guía (IG) de referencia de la modelo
  const [newAccount, setNewAccount] = useState('');
  const [scrapingAcc, setScrapingAcc] = useState(false);
  const [checkingAcct, setCheckingAcct] = useState(null); // handle que se está re-chequeando (una sola)
  const [privateAccts, setPrivateAccts] = useState(() => new Set()); // cuentas detectadas privadas (aviso)
  const [acctView, setAcctView] = useState(false); // dashboard de cuentas guía a pantalla completa
  const [balance, setBalance] = useState(null); // saldo real de Higgsfield (créditos)
  const [wiz, setWiz] = useState(null); // pop-up "agregar fuente": null | { step: 0..4, mode: 'cuenta'|'tema'|null }
  const [wizType, setWizType] = useState('fotos'); // en el wizard: fotos | videos | ambos
  const [acctDetail, setAcctDetail] = useState(null); // handle abierto en el panel de cuentas → ver TODAS sus fotos
  const [acctIssue, setAcctIssue] = useState({}); // handle -> motivo por el que NO jaló (privada, no existe, bloqueada…)
  const [libView, setLibView] = useState(false); // Biblioteca global (guías de todas) desde el selector, sin entrar a una modelo
  const [acctSearch, setAcctSearch] = useState(''); // buscar cuenta guía por nombre en el panel
  const [acctDate, setAcctDate] = useState('todas'); // filtro por actividad: todas | hoy | ayer | semana
  const [scrapView, setScrapView] = useState(false); // desde el selector: TODO lo scrapeado de IG (todas las modelos)
  const [scrapedGlobal, setScrapedGlobal] = useState([]); // filas scrapeadas de todas las modelos
  const [qtyPhotos, setQtyPhotos] = useState(10); // cuántas FOTOS traer por búsqueda (las mejores 10 por default)
  const [qtyVideos, setQtyVideos] = useState(0);  // cuántos VIDEOS traer (se bajan a nuestro storage)
  const [mediaFilter, setMediaFilter] = useState('todo'); // grilla de scraping/ficha: todo | fotos | videos
  const [videoPlay, setVideoPlay] = useState(null); // {url, poster} para reproducir un video en grande
  const [scraperGlobal, setScraperGlobal] = useState({ photos: 0, accounts: 0 }); // total global del scraper (todas las modelos)
  const [scrapeRuns, setScrapeRuns] = useState([]); // corridas registradas de la modelo abierta (costo real, cuando el motor las escribe)

  const sb = getSupabase();

  // Aviso "cuando terminan de cocinarse" — para no estar adivinando.
  const seenCookingRef = useRef(new Set()); // ids que estaban cocinándose en el ciclo anterior
  const askNotify = () => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch { /* noop */ } };

  const loadSummary = useCallback(async () => {
    const out = await callFn('kitchen_summary');
    if (out.ok) { const m = {}; (out.identities || []).forEach((i) => { m[i.creator_id] = i; }); setIdent(m); setBalance(out.balance ?? null); }
  }, []);
  const loadGens = useCallback(async () => {
    const { data } = await sb.from('generations').select('id, creator_id, reference_url, result_url, status, credits, note, created_at, done_at, carousel_of, engine_label').order('created_at', { ascending: false }).limit(200);
    setGens(Array.isArray(data) ? data : []);
  }, [sb]);
  const loadVault = useCallback(async () => {
    // La BIBLIOTECA DE GUÍAS es COMPARTIDA: las fotos subidas a mano (sin scraping) de
    // TODAS las modelos forman un solo pool del que se elige para cualquier modelo.
    // Aparte, de la modelo abierta traemos sus fotos REALES y su SCRAPING (pestaña Buscar).
    // No traemos la basura del scraping (ai_ok=false). Fusionamos por id (una guía subida
    // a la propia modelo aparece en ambos lados → dedup).
    const cols = 'id, url, caption, creator_id, kind, vibe, likes, views, source_handle, source_url, source_platform, interest, ai_ok, ai_reason, created_at';
    const [g, mineRows] = await Promise.all([
      sb.from('creator_vault').select(cols).eq('kind', 'ref').is('source_handle', null).is('source_platform', null).or('ai_ok.is.null,ai_ok.eq.true').order('created_at', { ascending: false }).limit(6000),
      sel ? sb.from('creator_vault').select(cols).eq('creator_id', sel).or('ai_ok.is.null,ai_ok.eq.true').order('created_at', { ascending: false }).limit(4000) : Promise.resolve({ data: [] }),
    ]);
    const byId = new Map();
    (g.data || []).forEach((r) => byId.set(r.id, r));
    (mineRows.data || []).forEach((r) => byId.set(r.id, r));
    setVault([...byId.values()]);
  }, [sb, sel]);
  // Conteo de fotos reales por modelo (liviano) para el selector de modelos.
  const loadRealCounts = useCallback(async () => {
    const { data } = await sb.from('creator_vault').select('creator_id').eq('kind', 'real');
    const rc = {}; (data || []).forEach((r) => { if (r.creator_id) rc[r.creator_id] = (rc[r.creator_id] || 0) + 1; }); setRealCount(rc);
  }, [sb]);
  // Total GLOBAL del scraper (todas las modelos): fotos bajadas + cuentas guía guardadas.
  const loadScraperGlobal = useCallback(async () => {
    const [ph, ac] = await Promise.all([
      sb.from('creator_vault').select('id', { count: 'exact', head: true }).eq('kind', 'ref').not('source_handle', 'is', null),
      sb.from('scrape_accounts').select('id', { count: 'exact', head: true }),
    ]);
    setScraperGlobal({ photos: ph.count || 0, accounts: ac.count || 0 });
  }, [sb]);
  // TODO lo scrapeado de Instagram de TODAS las modelos (para el botón global "Buscar en IG" del selector).
  const loadScrapedGlobal = useCallback(async () => {
    const cols = 'id, url, caption, creator_id, kind, vibe, likes, views, source_handle, source_url, source_platform, interest, ai_ok, media_type, video_url, created_at';
    const { data } = await sb.from('creator_vault').select(cols).eq('kind', 'ref').not('source_handle', 'is', null).or('ai_ok.is.null,ai_ok.eq.true').order('created_at', { ascending: false }).limit(6000);
    setScrapedGlobal(Array.isArray(data) ? data : []);
  }, [sb]);
  // Corridas registradas de la modelo abierta (costo REAL de Apify, cuando el motor las escribe).
  const loadScrapeRuns = useCallback(async () => {
    if (!sel) { setScrapeRuns([]); return; }
    const { data } = await sb.from('scrape_runs').select('id, account_id, kind, query, run_at, found, saved, kept, cost_real, cost_est, status').eq('creator_id', sel).order('run_at', { ascending: false }).limit(500);
    setScrapeRuns(Array.isArray(data) ? data : []);
  }, [sb, sel]);

  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      try { const { data } = await sb.rpc('team_creators'); if (Array.isArray(data)) setCreators(data.filter((c) => c?.id && c?.full_name && c.onboarding_status === 'active')); } catch {}
      loadRealCounts(); loadSummary(); loadGens(); loadScraperGlobal();
    })();
  }, [access, sb, loadRealCounts, loadSummary, loadGens, loadScraperGlobal]);
  // El baúl se recarga solo cada vez que cambia la modelo abierta (sel).
  useEffect(() => { if (access === 'ok') loadVault(); }, [access, loadVault]);
  useEffect(() => { if (access === 'ok') loadScrapeRuns(); }, [access, loadScrapeRuns]);

  // Auto-refresco: mientras haya algo cocinándose, recargar solo cada 6s (para que el resultado aparezca sin apretar nada).
  useEffect(() => {
    if (access !== 'ok') return;
    if (!gens.some((g) => ['queued', 'in_progress'].includes(g.status))) return;
    const t = setInterval(() => { loadGens(); }, 6000);
    return () => clearInterval(t);
  }, [access, gens, loadGens]);

  // Reloj para el contador de "cocinándose" (se actualiza solo).
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 20000); return () => clearInterval(t); }, []);

  // Scroll por tandas: reset a 30 al cambiar de pestaña/modelo/fuente; observer que suma de a 30.
  const sentinelRef = useRef(null);
  useEffect(() => { setVisN(30); }, [subtab, sel, baulFilter, baulModel, resTab]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setVisN((v) => v + 30); }, { rootMargin: '700px' });
    io.observe(el);
    return () => io.disconnect();
  }, [subtab, sel, baulFilter, baulModel, resTab]);

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
      setMsg({ kind: 'info', text: `${justFailed.length} foto(s) fallaron al cocinarse. Mirá "No salieron" para reintentar.` });
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

  // Es del scraper si tiene origen de red social (source_platform/handle). Si no, la subió un humano.
  const isScraped = (r) => !!(r.source_platform || r.source_handle);
  // Nombre de la modelo dueña de cada guía (para el buscador y el filtro "por modelo").
  const nameById = useMemo(() => { const m = {}; creators.forEach((c) => { m[c.id] = c.stage_name || c.full_name || 'Modelo'; }); return m; }, [creators]);
  // BIBLIOTECA DE GUÍAS = subidas a mano, de TODAS las modelos (pool compartido). Elegís de acá para cualquier modelo.
  const guideRows = useMemo(() => dedupeByMedia(vault.filter((r) => r.kind === 'ref' && !isScraped(r) && r.ai_ok !== false)), [vault]);
  // Fotos REALES de la modelo abierta (su identidad).
  const realRows = useMemo(() => vault.filter((r) => r.kind === 'real' && r.creator_id === sel), [vault, sel]);
  // Scraping (IG) de la modelo abierta — vive en su propia pestaña.
  const scrapedRows = useMemo(() => dedupeByMedia(vault.filter((r) => r.kind === 'ref' && isScraped(r) && r.creator_id === sel && r.ai_ok !== false)), [vault, sel]);
  // Vibes que realmente tienen fotos etiquetadas (para no mostrar chips que dan grilla vacía).
  const vibeCounts = useMemo(() => {
    const m = {}; scrapedRows.forEach((r) => { const v = (r.vibe || '').trim(); if (v) m[v] = (m[v] || 0) + 1; }); return m;
  }, [scrapedRows]);
  // Cuántas fotos BUENAS (en la mesa, no descartadas) trajo cada cuenta guía — para el panel de administración.
  const acctCounts = useMemo(() => {
    const m = {};
    vault.forEach((r) => {
      if (r.kind !== 'ref' || !r.source_handle) return;
      if (r.interest === 'descartada' || r.ai_ok === false) return;
      const h = String(r.source_handle).replace(/^@/, '');
      m[h] = (m[h] || 0) + 1;
    });
    return m;
  }, [vault]);
  // FICHA por cuenta guía: fotos bajadas (total) · en mesa (usables) · última · por día (calendario).
  const scrapeByAcct = useMemo(() => {
    const m = {};
    vault.forEach((r) => {
      if (r.kind !== 'ref' || !r.source_handle || r.creator_id !== sel) return;
      const h = String(r.source_handle).replace(/^@/, '');
      const rec = m[h] || (m[h] = { fotos: 0, enMesa: 0, lastAt: 0, days: {} });
      rec.fotos += 1;
      if (r.interest !== 'descartada' && r.ai_ok !== false) rec.enMesa += 1;
      if (r.created_at) {
        const t = new Date(r.created_at).getTime(); if (t > rec.lastAt) rec.lastAt = t;
        const d = String(r.created_at).slice(0, 10); rec.days[d] = (rec.days[d] || 0) + 1;
      }
    });
    return m;
  }, [vault, sel]);
  // Corridas REALES registradas por cuenta (costo real de Apify) — vacío hasta que el motor las escriba.
  const runsByAcct = useMemo(() => {
    const m = {};
    scrapeRuns.forEach((r) => { if (!r.account_id) return; (m[r.account_id] = m[r.account_id] || []).push(r); });
    return m;
  }, [scrapeRuns]);
  // Total del scraper para la MODELO abierta (todas sus fotos scrapeadas, cualquier cuenta/tema).
  const scrapeModelTotal = useMemo(() => {
    let fotos = 0;
    vault.forEach((r) => { if (r.kind === 'ref' && r.creator_id === sel && (r.source_platform || r.source_handle)) fotos += 1; });
    const real = scrapeRuns.reduce((a, r) => a + (Number(r.cost_real) || 0), 0);
    return { fotos, costEst: fotos * SCRAPER_USD_PER_PHOTO, costReal: real };
  }, [vault, sel, scrapeRuns]);
  // Top fotos (por likes) de una cuenta guía — para las miniaturas del dashboard.
  const acctTopPhotos = useCallback((handle) => vault
    .filter((r) => r.kind === 'ref' && String(r.source_handle || '').replace(/^@/, '') === handle && r.interest !== 'descartada' && r.ai_ok !== false && r.url)
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
    .slice(0, 5), [vault]);
  // Cuándo se trajo la foto MÁS RECIENTE de esa cuenta (proxy de "última actualización").
  const acctLastAt = useCallback((handle) => {
    let max = 0;
    vault.forEach((r) => { if (r.kind === 'ref' && String(r.source_handle || '').replace(/^@/, '') === handle && r.created_at) { const t = new Date(r.created_at).getTime(); if (t > max) max = t; } });
    return max || null;
  }, [vault]);
  const agoLabel = (ms) => {
    if (!ms) return 'nunca';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 90) return 'recién';
    const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`;
    return `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}`;
  };
  // BIBLIOTECA (Cocinar): Guías · Reales · Favoritas + filtro por modelo + buscador + orden.
  const libPhotos = useMemo(() => {
    let rows;
    if (baulFilter === 'reales') rows = realRows;
    else if (baulFilter === 'favoritas') rows = [...guideRows, ...realRows].filter((r) => r.interest === 'favorita');
    else rows = guideRows; // guias (por defecto)
    if (baulFilter === 'guias' && baulModel) rows = rows.filter((r) => r.creator_id === baulModel);
    rows = rows.filter((r) => r.interest !== 'descartada');
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${nameById[r.creator_id] || ''} ${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [guideRows, realRows, baulFilter, baulModel, baulSearch, baulSort, nameById]);

  // Scraping (pestaña Buscar en IG): éxitos (más likes) arriba, filtrable por vibe.
  const scrapedPhotos = useMemo(() => {
    let rows = scrapedRows.filter((r) => r.interest !== 'descartada');
    if (mediaFilter === 'fotos') rows = rows.filter((r) => r.media_type !== 'video');
    else if (mediaFilter === 'videos') rows = rows.filter((r) => r.media_type === 'video');
    if (vibe !== 'Todos' && vibeCounts[vibe]) rows = rows.filter((r) => (r.vibe || '').toLowerCase() === vibe.toLowerCase());
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [scrapedRows, vibe, vibeCounts, mediaFilter, baulSearch, baulSort]);
  const scrapedGroups = useMemo(() => dayGroups(scrapedPhotos.slice(0, visN)), [scrapedPhotos, visN]);
  // Cuántos videos hay scrapeados para esta modelo (para mostrar el chip solo si tiene sentido).
  const scrapedVideoCount = useMemo(() => scrapedRows.filter((r) => r.media_type === 'video' && r.interest !== 'descartada').length, [scrapedRows]);

  // Contadores de los chips (Guías respeta el filtro por modelo).
  const baulCounts = useMemo(() => ({
    guias: (baulModel ? guideRows.filter((r) => r.creator_id === baulModel) : guideRows).filter((r) => r.interest !== 'descartada').length,
    reales: realRows.filter((r) => r.interest !== 'descartada').length,
    favoritas: [...guideRows, ...realRows].filter((r) => r.interest === 'favorita').length,
  }), [guideRows, realRows, baulModel]);

  // Modelos que tienen guías (para el filtro "por modelo").
  const guideModels = useMemo(() => {
    const m = new Map(); guideRows.forEach((r) => { if (r.creator_id) m.set(r.creator_id, (m.get(r.creator_id) || 0) + 1); });
    return [...m.entries()].map(([id, n]) => ({ id, n, name: nameById[id] || 'Modelo' })).sort((a, b) => b.n - a.n);
  }, [guideRows, nameById]);

  // TODO lo scrapeado de IG (todas las modelos) — para el botón global "Buscar en IG" del selector.
  const scrapGlobalDeduped = useMemo(() => dedupeByMedia(scrapedGlobal.filter((r) => r.interest !== 'descartada')), [scrapedGlobal]);
  const scrapGlobalVideoCount = useMemo(() => scrapGlobalDeduped.filter((r) => r.media_type === 'video').length, [scrapGlobalDeduped]);
  const scrapGlobalModels = useMemo(() => {
    const m = new Map(); scrapGlobalDeduped.forEach((r) => { if (r.creator_id) m.set(r.creator_id, (m.get(r.creator_id) || 0) + 1); });
    return [...m.entries()].map(([id, n]) => ({ id, n, name: nameById[id] || 'Modelo' })).sort((a, b) => b.n - a.n);
  }, [scrapGlobalDeduped, nameById]);
  const scrapGlobalRows = useMemo(() => {
    let rows = scrapGlobalDeduped;
    if (mediaFilter === 'fotos') rows = rows.filter((r) => r.media_type !== 'video');
    else if (mediaFilter === 'videos') rows = rows.filter((r) => r.media_type === 'video');
    if (baulModel) rows = rows.filter((r) => r.creator_id === baulModel);
    const term = baulSearch.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${nameById[r.creator_id] || ''} ${r.source_handle || ''} ${r.caption || ''} ${r.vibe || ''}`.toLowerCase().includes(term));
    return baulSort === 'likes'
      ? [...rows].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      : [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [scrapGlobalDeduped, mediaFilter, baulModel, baulSearch, baulSort, nameById]);
  const scrapGlobalGroups = useMemo(() => dayGroups(scrapGlobalRows.slice(0, visN)), [scrapGlobalRows, visN]);

  // Agrupado por DÍA (Hoy · Ayer · fecha) para la biblioteca.
  const pickGroups = useMemo(() => {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = startOf(new Date());
    const label = (ts) => {
      if (!ts) return 'Sin fecha';
      const d = new Date(ts);
      const diff = Math.round((today - startOf(d)) / 86400000);
      if (diff === 0) return 'Hoy';
      if (diff === 1) return 'Ayer';
      return d.toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    const groups = []; let cur = null;
    libPhotos.slice(0, visN).forEach((r) => {
      const lbl = label(r.created_at);
      if (!cur || cur.label !== lbl) { cur = { label: lbl, rows: [] }; groups.push(cur); }
      cur.rows.push(r);
    });
    return groups;
  }, [libPhotos, visN]);

  // Tarjeta de foto del baúl (vista "Todas"): mismos gestos + estrella de favorita.
  const renderTodaCard = (r) => {
    const on = queue.includes(r.url);
    const fav = r.interest === 'favorita';
    const isVid = r.media_type === 'video' && r.video_url;
    return (
      <div key={r.id} onClick={() => (isVid ? setVideoPlay({ url: r.video_url, poster: r.url }) : setDetail(r))}
        className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-ink-2 transition-all ${on ? 'border-brand ring-2 ring-brand/50' : 'border-line hover:border-brand/40'}`}>
        <img src={r.url} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" />
        {isVid && <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play size={18} className="fill-current" /></span></span>}
        <button type="button" title="Seleccionar" onClick={(e) => { e.stopPropagation(); toggleQueue(r.url); }}
          className={`absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${on ? 'border-brand bg-brand text-on-accent' : 'border-white/60 bg-black/50 text-white/80 hover:bg-black/70'}`}><Check size={13} /></button>
        <button type="button" title={fav ? 'Quitar de favoritas' : 'Marcar favorita'} onClick={(e) => { e.stopPropagation(); markInterest(r, fav ? null : 'favorita'); }}
          className={`absolute right-9 top-1.5 grid h-6 w-6 place-items-center rounded-full border transition-colors ${fav ? 'border-amber-400 bg-amber-400 text-[#2a1a00]' : 'border-white/50 bg-black/50 text-white/80 opacity-0 hover:bg-black/70 group-hover:opacity-100'}`}><Star size={12} className={fav ? 'fill-current' : ''} /></button>
        <button type="button" title="Sacar (basura)" onClick={(e) => { e.stopPropagation(); markInterest(r, 'descartada'); }}
          className="absolute right-16 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-white/50 bg-black/50 text-white/80 opacity-0 transition-opacity hover:border-rose-400 hover:bg-rose-500 hover:text-white group-hover:opacity-100"><X size={13} /></button>
        <button type="button" title="Info y por qué la elegí" onClick={(e) => { e.stopPropagation(); setDetail(r); }}
          className="absolute bottom-1.5 left-1.5 z-10 grid h-6 w-6 place-items-center rounded-full border border-white/40 bg-black/55 text-white/90 hover:bg-black/80"><Info size={13} /></button>
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {(r.source_platform || r.source_handle)
            ? <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Search size={10} /> Scraping</span>
            : r.kind === 'real'
              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><FolderHeart size={10} /> Real</span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Upload size={10} /> Subida</span>}
          {isVid && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Play size={9} className="fill-current" /> Video</span>}
          {cookingRefs.has(r.url)
            ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Loader2 size={10} className="animate-spin" /> Cocinando…</span>
            : cookedRefs.has(r.url) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/85 px-2 py-0.5 text-[10px] font-bold text-white"><Check size={10} /> Hecha</span>}
        </div>
        <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isVid ? (
            <a href={r.video_url} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white"><Download size={12} /> Descargar</a>
          ) : (
            <>
              <button type="button" title="Cocinar réplica (Soul 2.0)" onClick={(e) => { e.stopPropagation(); cookDetail(r, 1); }}
                className="btn3d inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"><Flame size={12} /> Cocinar</button>
              <button type="button" title="Cocinar en carrusel" onClick={(e) => { e.stopPropagation(); setDetailN(4); setDetail(r); }}
                className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black/80"><LayoutGrid size={12} /> Carrusel</button>
            </>
          )}
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
  };

  // Cargar el perfil de búsqueda (nichos) de la modelo elegida.
  useEffect(() => {
    if (!sel) { setNiches([]); setStyleDesc(''); setAccounts([]); return; }
    (async () => { const { data } = await sb.from('creator_search_profile').select('niches, style_desc, seed_accounts').eq('creator_id', sel).maybeSingle(); setNiches(Array.isArray(data?.niches) ? data.niches : []); setStyleDesc(data?.style_desc || ''); setAccounts(Array.isArray(data?.seed_accounts) ? data.seed_accounts : []); })();
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
    const out = await callFn('scrape', { creator_id: sel, photos: qtyPhotos, videos: qtyVideos });
    setScraping(false);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || 'No se pudo buscar.' }); return; }
    await loadVault();
    setMsg({ kind: 'ok', text: `Encontré ${out.saved} virales para ${selCreator?.full_name}.${out.reviewed ? ` La IA revisó ${out.reviewed} y sacó la basura.` : ''} Aparecen abajo, éxitos arriba.` });
  };

  // Cuentas guía (creadoras de referencia de IG): guardar + traer sus posts.
  const saveAccounts = async (list) => {
    setAccounts(list);
    await sb.from('creator_search_profile').upsert({ creator_id: sel, seed_accounts: list, updated_at: new Date().toISOString() }, { onConflict: 'creator_id' });
  };
  // Acepta pegar VARIAS de una (separadas por coma, espacio o salto de línea). Limpia @ y URLs.
  const addAccount = () => {
    const parts = newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean);
    if (!parts.length) return;
    const merged = [...new Set([...accounts, ...parts])].slice(0, 20);
    saveAccounts(merged); setNewAccount('');
  };
  // Marca/desmarca privadas según lo que devolvió Apify (error_items trae el handle que falló por privada/vacía).
  const flagPrivate = (out, checked) => {
    const bad = new Set((out?.error_items || [])
      .filter((e) => /private|empty|not found|restrict/i.test(`${e?.desc || ''}${e?.error || ''}`))
      .map((e) => String(e?.input || '').replace(/^@/, '').replace(/\/+$/, '').split('/').pop())
      .filter(Boolean));
    setPrivateAccts((prev) => {
      const next = new Set(prev);
      // las que chequeamos y NO fallaron: dejan de estar marcadas como privadas
      checked.forEach((h) => { if (bad.has(h)) next.add(h); else next.delete(h); });
      return next;
    });
    return bad;
  };
  // Guarda POR QUÉ no jaló cada cuenta chequeada (para mostrarlo en su tarjeta). Si jaló, limpia el aviso.
  const noteIssues = (out, checked) => {
    const errByHandle = {};
    (out?.error_items || []).forEach((e) => {
      const h = parseHandle(e?.input || '');
      if (h) errByHandle[h] = `${e?.desc || ''} ${e?.error || ''} ${(Array.isArray(e?.msgs) ? e.msgs.join(' ') : '')}`.toLowerCase();
    });
    setAcctIssue((prev) => {
      const next = { ...prev };
      checked.forEach((h) => {
        const t = errByHandle[h];
        if (t == null) { delete next[h]; return; }
        if (/priv|restrict|login/.test(t)) next[h] = 'Privada — Instagram no la deja ver sin login.';
        else if (/not.?found|no.?exist|doesn|invalid|404/.test(t)) next[h] = 'No existe o mal escrita — revisá el @.';
        else if (/empty|no.?post|sin/.test(t)) next[h] = 'Sin posts públicos usables.';
        else next[h] = 'Instagram la bloqueó o la restringió.';
      });
      return next;
    });
  };
  const doScrapeAccounts = async () => {
    // Si escribió una cuenta y no la agregó con Enter, la tomamos igual (no lo hacemos renegar).
    const pending = parseHandle(newAccount);
    let list = accounts;
    if (pending && !accounts.includes(pending)) { list = [...new Set([...accounts, pending])].slice(0, 20); await saveAccounts(list); setNewAccount(''); }
    if (list.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos una cuenta guía (ej: @creadora) arriba.' }); return; }
    setScrapingAcc(true); setMsg({ kind: 'info', text: `Chequeando ${list.map((a) => '@' + a).join(', ')}… (puede tardar 1-2 min, no cierres)` });
    const out = await callFn('scrape_accounts', { creator_id: sel, accounts: list, photos: qtyPhotos, videos: qtyVideos });
    setScrapingAcc(false);
    if (!out.ok) { setMsg({ kind: 'err', text: `${out.error || 'No se pudo traer de esas cuentas.'}${out.detail ? ` · Apify: ${(typeof out.detail === 'string' ? out.detail : JSON.stringify(out.detail)).slice(0, 400)}` : ''}` }); return; }
    await loadVault();
    const bad = flagPrivate(out, list); noteIssues(out, list); loadScrapeRuns(); loadScraperGlobal();
    setMsg({ kind: out.saved ? 'ok' : 'info', text: out.saved ? `Traje ${out.saved} fotos de tus cuentas guía.${out.reviewed ? ` La IA revisó ${out.reviewed} y sacó la basura.` : ''} Aparecen abajo (filtro "Scraping").` : bad.size ? `⚠️ ${[...bad].map((h) => '@' + h).join(', ')} es privada/vacía (Instagram no la deja ver). Probá con una cuenta PÚBLICA.` : `Instagram devolvió ${out.found ?? 0} items y 0 fotos usables. Probá con otra cuenta.` });
  };
  // Re-chequear UNA sola cuenta (traer su último contenido) sin tocar las demás.
  const checkOneAccount = async (handle) => {
    setCheckingAcct(handle); setMsg({ kind: 'info', text: `Chequeando @${handle}… (puede tardar 1-2 min)` });
    const out = await callFn('scrape_accounts', { creator_id: sel, accounts: [handle], photos: qtyPhotos, videos: qtyVideos });
    setCheckingAcct(null);
    if (!out.ok) { setMsg({ kind: 'err', text: out.error || `No se pudo chequear @${handle}.` }); return; }
    await loadVault();
    const bad = flagPrivate(out, [handle]); noteIssues(out, [handle]); loadScrapeRuns(); loadScraperGlobal();
    setMsg({ kind: out.saved ? 'ok' : 'info', text: out.saved ? `@${handle}: ${out.saved} fotos nuevas.${out.reviewed ? ` (IA revisó ${out.reviewed})` : ''}` : bad.has(handle) ? `⚠️ @${handle} es privada/vacía — Instagram no la deja ver. Quitala y probá otra pública.` : `@${handle}: sin fotos nuevas usables por ahora.` });
  };

  // Curación de la mesa
  const markInterest = async (row, val) => {
    await sb.from('creator_vault').update({ interest: val }).eq('id', row.id);
    setVault((v) => v.map((r) => (r.id === row.id ? { ...r, interest: val } : r)));
    if (val === 'descartada') { setDetail(null); setQueue((k) => k.filter((u) => u !== row.url)); }
  };
  // Sacar la basura EN LOTE: descarta todas las seleccionadas (desaparecen de la mesa) de una.
  const bulkDiscard = async () => {
    const ids = vault.filter((r) => queue.includes(r.url)).map((r) => r.id);
    if (!ids.length) { setMsg({ kind: 'info', text: 'No hay fotos seleccionadas.' }); return; }
    await sb.from('creator_vault').update({ interest: 'descartada' }).in('id', ids);
    setVault((v) => v.map((r) => (ids.includes(r.id) ? { ...r, interest: 'descartada' } : r)));
    setQueue([]);
    setMsg({ kind: 'ok', text: `${ids.length} foto(s) fuera de la mesa (basura).` });
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
    setMsg({ kind: 'ok', text: total > 1 ? `Cocinando carrusel: la réplica + ${total - 1} variaciones. Miralas en Resultados (aparecen ahí al terminar).` : 'Cocinando la réplica. Miralas en Resultados (aparece ahí al terminar).' });
  };

  const enterModel = (id) => { setSel(id); setSubtab('cocinar'); setQueue([]); setMsg(null); setBaulFilter('guias'); setBaulModel(''); setShowUpload(false); setVibe('Todos'); };
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
    setMsg({ kind: 'ok', text: `${n} foto(s) en la cola de ${selCreator?.full_name || 'la modelo'}. Se cocinan con su soul real; miralas en Resultados.` });
    setSubtab('resultados');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ }
  };

  const onUpload = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, 60);
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
      setShowUpload(false); setBaulFilter('guias'); setBaulModel('');
      setMsg({ kind: 'ok', text: `${list.length} guía(s) al baúl. Ya están arriba de todo, listas para elegir.` });
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
  const [varMode, setVarMode] = useState('carrusel'); // 'carrusel' (set coherente) | 'suelta' (fotos variadas) | 'custom' (yo prompteo)
  const [varEngine, setVarEngine] = useState('describe'); // Soul 2.0 DEFAULT = 'describe' (poses distintas) | 'copy' (escena exacta) | 'mixed' (mitad y mitad)
  const [varN, setVarN] = useState(3);
  const [varIdeas, setVarIdeas] = useState(['', '']); // modo custom: una idea por foto
  const [varBusy, setVarBusy] = useState(false);
  const [detailN, setDetailN] = useState(1); // ficha: 1 = normal, >1 = carrusel al cocinar
  const makeVariations = async (rootId) => {
    if (!rootId) return;
    askNotify();
    // 3 modos (todo Soul 2.0 con su soul = se parece a ella):
    //  · 'carrusel' (describe): MISMO lugar + outfit, otras poses → set coherente para UN post.
    //  · 'suelta'   (free):     fotos NUEVAS variadas (otros lugares/outfits) → contenido suelto, no atado a esta foto.
    //  · 'custom'   (describe): vos escribís cada pose (mismo lugar/outfit).
    const method = varMode === 'suelta' ? 'free' : 'describe';
    let ideas;
    if (varMode === 'custom') {
      ideas = varIdeas.map((s) => s.trim()).slice(0, 8);
      if (ideas.length === 0) { setMsg({ kind: 'info', text: 'Agregá al menos una foto.' }); return; }
    } else {
      // Carrusel/Sueltas: cada foto una situación DISTINTA (pool barajado) → variedad garantizada, natural.
      const poses = shuffle(POSE_POOL);
      ideas = Array.from({ length: varN }, (_, i) => poses[i % poses.length]);
    }
    setVarBusy(true);
    const r = await callFn('make_variations', { generation_id: rootId, ideas, method });
    setVarBusy(false);
    if (r?.ok) {
      if (varMode === 'custom') setVarIdeas(['', '']);
      setMsg({ kind: 'ok', text: `${r.queued} foto(s) en la cola. Miralas en Resultados.` });
      setSubtab('resultados');
      loadGens();
    } else setMsg({ kind: 'err', text: r?.error || 'No se pudo.' });
  };

  // Referencias que esta modelo YA cocinó (para marcarlas en el selector).
  const cookedRefs = useMemo(() => new Set(gens.filter((g) => g.creator_id === sel && g.reference_url && g.status !== 'failed').map((g) => g.reference_url)), [gens, sel]);
  // Fotos que se están cocinando AHORA (para el indicador "Cocinando…" en la tarjeta).
  const cookingRefs = useMemo(() => new Set(gens.filter((g) => g.creator_id === sel && g.reference_url && ['queued', 'in_progress'].includes(g.status)).map((g) => g.reference_url)), [gens, sel]);

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
  const reviewRows = mineGens.filter((g) => g.status === 'done' && (reviewFlat || isRoot(g))).sort((a, b) => doneTs(b) - doneTs(a));
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
  // Motor real de una foto (honesto): lo que reportó el worker; si es viejo sin dato, la réplica fue Soul 2.0 y la variación fue Nano.
  const engineOf = (g) => (g?.engine_label ? g.engine_label : (g?.carousel_of ? 'Nano' : 'Soul 2.0'));

  // Listas para las pestañas nuevas.
  const cookingRows = mineGens.filter((g) => ['queued', 'in_progress'].includes(g.status)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // cocinándose (réplicas + carrusel) TODAS juntas de esta modelo
  const allRows = mineGens.filter((g) => g.status !== 'failed').sort((a, b) => doneTs(b) - doneTs(a)); // "Todo": todas menos rechazadas, la última primero
  // Contador de tiempo de una foto cocinándose (+ marca "trabada" si pasa mucho).
  const fmtElapsed = (g) => {
    const min = Math.max(0, Math.floor((tick - new Date(g.created_at).getTime()) / 60000));
    if (min < 60) return { txt: `${min} min`, stuck: min >= 15 };
    const h = Math.floor(min / 60), m = min % 60;
    return { txt: `${h} h${m ? ` ${m}m` : ''}`, stuck: true };
  };
  // Motor + precio por foto (créditos + US$), desplegable con una flechita.
  const motorLine = (g) => {
    const open = costOpen.has(g.id);
    const cr = Number(g.credits || 0);
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); setCostOpen((s) => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; }); }}
        className="flex w-full items-center gap-1 px-2 pt-1 text-left text-[10px] text-paper-dim hover:text-paper" title="Ver el precio de esta foto">
        <span>Motor: <span className={`font-semibold ${engineOf(g) === 'Nano' ? 'text-rose-300' : 'text-brand'}`}>{engineOf(g)}</span></span>
        {open && <span className="text-amber-300">· {cr > 0 ? `${cr.toFixed(2)} créd · ${money(cr)}` : 'sin costo registrado'}</span>}
        <ChevronDown size={11} className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    );
  };
  const cookingTile = (g) => {
    const e = fmtElapsed(g);
    return (
      <div key={g.id} className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-ink-2">
        {g.reference_url ? <img src={g.reference_url} alt="" className="aspect-[3/4] w-full scale-105 object-cover blur-md brightness-[0.4]" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
          <Loader2 size={24} className="animate-spin text-amber-300" />
          <span className="text-[11px] font-semibold tracking-wide">cocinándose…</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${e.stuck ? 'bg-rose-500/90 text-white' : 'bg-black/50 text-amber-200'}`}><Clock size={10} /> {e.txt}{e.stuck ? ' · ¿trabada?' : ''}</span>
        </div>
      </div>
    );
  };

  // Estado GLOBAL de la cocina (todas las modelos) — para la ruedita flotante que se ve en cualquier pantalla.
  const cookingAll = gens.filter((g) => ['queued', 'in_progress'].includes(g.status));
  const readyAll = gens.filter((g) => g.status === 'done' && !g.carousel_of);
  const queueBarShown = !!(selCreator && (['cocinar', 'buscar'].includes(subtab) || acctView) && queue.length > 0);
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
            {/* Atajos globales — sin entrar a una modelo */}
            <div className="mb-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setBaulFilter('guias'); setBaulModel(''); setLibView(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-paper-mute hover:text-paper">
                <LayoutGrid size={15} /> Biblioteca <span className="text-paper-dim">{guideRows.length}</span>
              </button>
              <button type="button" onClick={() => { setMediaFilter('todo'); setBaulModel(''); setBaulSearch(''); loadScrapedGlobal(); setScrapView(true); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90">
                <Search size={15} /> Buscar en IG
              </button>
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
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
              {[
                { id: 'cocinar', label: 'Cocinar', icon: Flame },
                { id: 'resultados', label: 'Resultados', icon: Images, badge: (reviewRows.length + cookingRows.length) || null, spin: cookingRows.length > 0 },
                { id: 'buscar', label: 'Buscar en IG', icon: Search },
              ].map((t) => {
                const Icon = t.icon; const on = subtab === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setSubtab(t.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${on ? 'border-brand text-brand' : 'border-transparent text-paper-mute hover:text-paper'}`}>
                    <Icon size={15} className={t.spin ? 'animate-spin text-amber-300' : ''} /> {t.label}
                    {t.badge ? <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${on ? 'bg-brand text-on-accent' : 'bg-hair/20 text-paper-mute'}`}>{t.badge}</span> : null}
                  </button>
                );
              })}
            </div>

            {/* ── COCINAR — biblioteca de guías (pool compartido) ── */}
            {subtab === 'cocinar' && (
              <div className="pb-24">
                {/* Qué mirás · cómo lo ordenás · agregar */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-card p-1 text-xs font-semibold">
                    {[['guias', 'Guías'], ['reales', 'Reales'], ['favoritas', 'Favoritas']].map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setBaulFilter(k)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${baulFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                        {k === 'favoritas' && <Star size={11} />}{label} <span className="opacity-70">{baulCounts[k] || 0}</span>
                      </button>
                    ))}
                  </div>
                  {baulFilter === 'guias' && guideModels.length > 1 && (
                    <div className="relative">
                      <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)}
                        className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                        <option value="">Todas las modelos</option>
                        {guideModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                    </div>
                  )}
                  <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                    {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button type="button" onClick={() => setShowUpload((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${showUpload ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
                      <Upload size={14} /> Subir fotos
                    </button>
                    <button type="button" onClick={() => setSubtab('buscar')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-sm font-semibold text-paper-mute hover:text-paper">
                      <Search size={14} /> Buscar en IG
                    </button>
                  </div>
                </div>

                {/* Buscador de la biblioteca */}
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                  <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar en la biblioteca (modelo, @cuenta, tema…)"
                    className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                </div>

                {/* Subir fotos (se abre con el botón) */}
                {showUpload && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
                    className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-brand bg-brand/10' : 'border-line bg-card/40 hover:border-brand/40'}`}>
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => onUpload(e.target.files)} />
                    {uploading ? <Loader2 size={26} className="animate-spin text-brand" /> : <Upload size={26} className="text-paper-dim" />}
                    <div className="text-sm font-semibold text-paper">{uploading ? 'Subiendo…' : 'Arrastrá tus fotos acá (o tocá para elegir)'}</div>
                    <div className="text-xs text-paper-dim">Muchas de una (hasta 60). Entran como guías a la biblioteca — quedan arriba de todo.</div>
                  </label>
                )}

                {/* Grilla agrupada por día (última subida primero) */}
                {libPhotos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">
                    {baulFilter === 'reales'
                      ? `${selCreator.full_name} no tiene fotos reales cargadas todavía.`
                      : baulFilter === 'favoritas'
                        ? 'Todavía no marcaste favoritas. Tocá la ⭐ en cualquier foto para guardarla acá.'
                        : baulModel
                          ? 'Esta modelo no tiene guías. Probá «Todas las modelos» o subí fotos.'
                          : 'La biblioteca está vacía. Subí fotos o traé de Instagram.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {(pickGroups || []).map((g) => (
                      <div key={g.label} className="space-y-2">
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span>
                          <span className="text-[10px] text-paper-dim/70">{g.rows.length}</span>
                          <span className="h-px flex-1 bg-line/60" />
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                          {g.rows.map(renderTodaCard)}
                        </div>
                      </div>
                    ))}
                    {visN < libPhotos.length && <div ref={sentinelRef} className="h-8" />}
                  </div>
                )}
              </div>
            )}

            {/* ── BUSCAR EN IG — scraping, aparte de la biblioteca ── */}
            {subtab === 'buscar' && (
              <div className="pb-24 space-y-2.5">
                {/* Header limpio: resumen + agregar (wizard) + panel de cuentas */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-bold text-paper">{accounts.length} cuenta{accounts.length === 1 ? '' : 's'}</span>
                      <span className="text-paper-dim"><b className="text-paper">{scrapeModelTotal.fotos}</b> fotos bajadas</span>
                      <span className="text-paper-dim">gasto <b className="text-amber-300">{scrapeModelTotal.costReal > 0 ? usd(scrapeModelTotal.costReal) : scraperMoney(scrapeModelTotal.fotos)}</b> <span className="text-paper-dim/60">{scrapeModelTotal.costReal > 0 ? 'real' : 'est'}</span></span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-paper-dim">De Instagram, filtrado solo (mujeres/cuerpo, sin hombres ni basura). Lo que traés aparece abajo.</div>
                  </div>
                  <button type="button" onClick={() => { setWiz({ step: 1, mode: null }); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90">
                    <Plus size={15} /> Agregar (cuenta o tema)
                  </button>
                  <button type="button" onClick={() => setAcctView(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/[0.06] px-3.5 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/[0.12]">
                    <Compass size={15} /> Cuentas guía
                  </button>
                </div>

                {/* Filtros: Fotos/Videos + vibe + orden + buscador */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {scrapedVideoCount > 0 && (
                    <div className="mr-1 inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                      {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setMediaFilter(k)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${mediaFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                          {k === 'videos' && <Play size={10} className="fill-current" />}{label}{k === 'videos' && <span className="opacity-70">{scrapedVideoCount}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {Object.keys(vibeCounts).length > 0 && ['Todos', ...VIBES.filter((v) => v !== 'Todos' && vibeCounts[v])].map((v) => (
                    <button key={v} type="button" onClick={() => setVibe(v)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${vibe === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:text-paper'}`}>
                      {v}{v !== 'Todos' && <span className="text-[10px] opacity-70">{vibeCounts[v]}</span>}
                    </button>
                  ))}
                  <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-paper-mute hover:text-paper">
                    {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
                  </button>
                </div>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                  <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar en lo scrapeado (@cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                </div>

                {/* Resultados del scraping de ESTA modelo, agrupados por día (últimas primero) */}
                {scrapedPhotos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no traés nada de IG para {selCreator.full_name}. Agregá una cuenta o un tema y tocá Buscar.</p>
                ) : (
                  <div className="space-y-4">
                    {scrapedGroups.map((g) => (
                      <div key={g.label} className="space-y-2">
                        <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                      </div>
                    ))}
                    {visN < scrapedPhotos.length && <div ref={sentinelRef} className="h-8" />}
                  </div>
                )}
              </div>
            )}

            {/* ── RESULTADOS — todo lo cocinado en un solo lugar (chips) ── */}
            {subtab === 'resultados' && (
              <div className="pb-24">
                {/* Chips: Para revisar · Aprobadas · No salieron · Todas */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-card p-1 text-xs font-semibold">
                    {[
                      ['revisar', 'Para revisar', reviewRows.length, null],
                      ['aprobadas', 'Aprobadas', approvedRows.length, Check],
                      ['nosalieron', 'No salieron', failedRows.length, AlertTriangle],
                      ['todas', 'Todas', allRows.length, LayoutGrid],
                    ].map(([k, label, n, Icon]) => {
                      const on = resTab === k;
                      return (
                        <button key={k} type="button" onClick={() => setResTab(k)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${on ? (k === 'nosalieron' ? 'bg-rose-500 text-white' : 'bg-brand text-on-accent') : (k === 'nosalieron' && n > 0 ? 'text-rose-300 hover:text-rose-200' : 'text-paper-mute hover:text-paper')}`}>
                          {Icon ? <Icon size={11} /> : null}{label} <span className="opacity-70">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  {(resTab === 'revisar' || resTab === 'todas') && (reviewRows.length + allRows.length) > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-[11px] font-semibold">
                      <button type="button" onClick={() => setReviewFlat(true)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${reviewFlat ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><LayoutGrid size={11} /> Todas sueltas</button>
                      <button type="button" onClick={() => setReviewFlat(false)} className={`rounded-full px-2.5 py-1 transition-colors ${!reviewFlat ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>Agrupadas</button>
                    </div>
                  )}
                </div>

                {/* Cocinándose — en camino, con su reloj (visible en Para revisar y Todas) */}
                {cookingRows.length > 0 && (resTab === 'revisar' || resTab === 'todas') && (
                  <section className="mb-5">
                    <h3 className="mb-1 inline-flex items-center gap-1.5 font-display text-sm font-bold text-amber-300"><Loader2 size={14} className="animate-spin" /> Cocinándose · {cookingRows.length}</h3>
                    <p className="mb-2 text-xs text-paper-dim">El reloj marca cuánto lleva; a los 15 min se marca <span className="font-semibold text-rose-300">¿trabada?</span>. Al terminar caen acá abajo.</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {cookingRows.map((g) => cookingTile(g))}
                    </div>
                  </section>
                )}

                {/* PARA REVISAR — aprobar/descartar (rollo de cámara o agrupado) */}
                {resTab === 'revisar' && (
                  reviewRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">{cookingRows.length > 0 ? 'Se están cocinando; caen acá al terminar.' : <>No hay nada esperando tu OK. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</>}</p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-paper-dim">{reviewFlat ? 'Cada foto por separado, la última primero (como el rollo de tu cámara). Tocá una para verla grande y aprobarla.' : 'Agrupadas por carrusel. Tocá una para ver el grupo, aprobar y armar más.'}</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {reviewRows.slice(0, visN).map((g) => {
                          const kids = reviewFlat ? 0 : carouselCount(g.id);
                          return (
                          <div key={g.id} className="overflow-hidden rounded-xl border border-line bg-ink-2">
                            <button type="button" onClick={() => setCompare({ root: rootOf(g), creator_id: g.creator_id })} className="relative block w-full">
                              {g.result_url ? <img src={g.result_url} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                              {kids > 0 && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-on-accent"><LayoutGrid size={10} /> {kids + 1}</span>}
                            </button>
                            {motorLine(g)}
                            <div className="flex items-center gap-1 p-2 pt-1">
                              <button type="button" onClick={() => decide(g, true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30"><Heart size={12} /> Aprobar</button>
                              <button type="button" onClick={() => setCompare({ root: g.id, creator_id: g.creator_id })} className="inline-flex items-center justify-center gap-1 rounded-full border border-brand/40 px-2 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/10" title="Armar carrusel"><LayoutGrid size={12} /></button>
                              <button type="button" onClick={() => decide(g, false)} className="inline-flex items-center justify-center rounded-full border border-line px-2 py-1.5 text-paper-mute hover:text-rose-300"><Trash2 size={12} /></button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      {visN < reviewRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* APROBADAS — el baúl limpio */}
                {resTab === 'aprobadas' && (
                  approvedRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no aprobaste ninguna. En <button onClick={() => setResTab('revisar')} className="font-semibold text-brand hover:underline">Para revisar</button> tocá ❤️ Aprobar.</p>
                  ) : (
                    <>
                      <p className="mb-2 inline-flex items-center gap-1 text-xs text-emerald-300/80"><Check size={12} /> Limpias (sin metadata) en el baúl. Tocá una réplica para hacerle más carrusel.</p>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                        {approvedRows.slice(0, visN).map((g) => (
                          <button type="button" key={g.id} onClick={() => setCompare({ root: rootOf(g), creator_id: g.creator_id })} className="group relative block overflow-hidden rounded-xl border border-emerald-500/30 bg-ink-2">
                            {g.result_url ? <img src={g.result_url} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"><LayoutGrid size={10} /> carrusel</span>
                          </button>
                        ))}
                      </div>
                      {visN < approvedRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* NO SALIERON — motivo + reintentar */}
                {resTab === 'nosalieron' && (
                  failedRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Ninguna falló. Todo lo que cocinaste salió. 🎉</p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-paper-dim">Estas no se lograron cocinar. La foto es la referencia que mandaste; abajo <b className="text-paper-mute">el porqué</b>. Podés reintentar.</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {failedRows.slice(0, visN).map((g) => (
                          <div key={g.id} className="overflow-hidden rounded-xl border border-rose-500/30 bg-ink-2">
                            <div className="relative">
                              {g.reference_url ? <img src={g.reference_url} alt="" className="aspect-[3/4] w-full object-cover opacity-50" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                              <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] font-bold text-white"><AlertTriangle size={10} /> No salió</div>
                            </div>
                            <div className="p-2">
                              <p className="mb-1.5 text-[11px] leading-snug text-rose-200">{g.note || 'No salió — el motor la rechazó (suele ser por contenido +18 o un error).'}</p>
                              <button type="button" onClick={() => retry(g)} className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-line px-2 py-1.5 text-[11px] font-semibold text-paper-mute hover:border-brand/40 hover:text-paper"><RefreshCw size={11} /> Reintentar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {visN < failedRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}

                {/* TODAS — el rollo completo (menos las que no salieron) */}
                {resTab === 'todas' && (
                  allRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no cocinaste nada para {selCreator.full_name}. Andá a <button onClick={() => setSubtab('cocinar')} className="font-semibold text-brand hover:underline">Cocinar</button>.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {allRows.slice(0, visN).map((g) => {
                          if (['queued', 'in_progress'].includes(g.status)) return cookingTile(g);
                          const isApproved = g.status === 'approved';
                          const kids = isRoot(g) ? carouselCount(g.id) : 0;
                          return (
                            <button type="button" key={g.id} onClick={() => setCompare({ root: rootOf(g), creator_id: g.creator_id })} className={`group relative block overflow-hidden rounded-xl border bg-ink-2 ${isApproved ? 'border-emerald-500/30' : 'border-line'}`}>
                              {g.result_url ? <img src={g.result_url} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full bg-hair/10" />}
                              {isApproved && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={11} /></span>}
                              {kids > 0 && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2 py-0.5 text-[10px] font-bold text-on-accent"><LayoutGrid size={10} /> {kids + 1}</span>}
                              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">{isApproved ? 'aprobada' : 'para revisar'} · {engineOf(g)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {visN < allRows.length && <div ref={sentinelRef} className="h-8" />}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── BIBLIOTECA GLOBAL (guías de todas, desde el selector) ── */}
      {libView && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
              <button type="button" onClick={() => setLibView(false)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver</button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><LayoutGrid size={16} className="text-brand" /> Biblioteca de guías <span className="text-paper-dim">· {guideRows.length}</span></div>
                <div className="truncate text-[11px] text-paper-dim">Las guías de todas las modelos. Para cocinar, entrá a una modelo.</div>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {guideModels.length > 1 && (
                <div className="relative">
                  <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)} className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                    <option value="">Todas las modelos</option>
                    {guideModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              )}
              <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
              </button>
              <div className="relative min-w-[180px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar (modelo, @cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              </div>
            </div>
            {libPhotos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">La biblioteca está vacía todavía.</p>
            ) : (
              <div className="space-y-4">
                {(pickGroups || []).map((g) => (
                  <div key={g.label} className="space-y-2">
                    <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                  </div>
                ))}
                {visN < libPhotos.length && <div ref={sentinelRef} className="h-8" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUSCAR EN IG GLOBAL (todo lo scrapeado de todas, desde el selector) ── */}
      {scrapView && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
              <button type="button" onClick={() => setScrapView(false)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver</button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><Search size={16} className="text-fuchsia-300" /> Buscar en IG <span className="text-paper-dim">· {scrapGlobalDeduped.length}</span></div>
                <div className="truncate text-[11px] text-paper-dim">Todo lo traído de Instagram, de todas las modelos. Para traer más, entrá a una modelo.</div>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
            {/* Header como la pestaña: resumen + Agregar + Cuentas guía */}
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-bold text-paper">{scrapGlobalModels.length} modelo{scrapGlobalModels.length === 1 ? '' : 's'}</span>
                  <span className="text-paper-dim"><b className="text-paper">{scrapGlobalDeduped.length}</b> traídas de IG</span>
                  <span className="text-paper-dim"><b className="text-paper">{scrapGlobalVideoCount}</b> videos</span>
                </div>
                <div className="mt-0.5 text-[11px] text-paper-dim">De Instagram, filtrado solo (mujeres/cuerpo). Lo mejor de lo mejor.</div>
              </div>
              <button type="button" onClick={() => setWiz({ step: 0, mode: null })} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent hover:opacity-90"><Plus size={15} /> Agregar (cuenta o tema)</button>
              <button type="button" onClick={() => setWiz({ step: 0, mode: 'cuentas' })} className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/[0.06] px-3.5 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/[0.12]"><Compass size={15} /> Cuentas guía</button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {scrapGlobalVideoCount > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                  {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setMediaFilter(k)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${mediaFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{k === 'videos' && <Play size={10} className="fill-current" />}{label}{k === 'videos' && <span className="opacity-70">{scrapGlobalVideoCount}</span>}</button>
                  ))}
                </div>
              )}
              {scrapGlobalModels.length > 1 && (
                <div className="relative">
                  <select value={baulModel} onChange={(e) => setBaulModel(e.target.value)} className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-7 text-xs font-semibold text-paper-mute outline-none hover:text-paper focus:border-brand/60">
                    <option value="">Todas las modelos</option>
                    {scrapGlobalModels.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.n}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              )}
              <button type="button" onClick={() => setBaulSort((s) => (s === 'likes' ? 'recientes' : 'likes'))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                {baulSort === 'likes' ? <><Heart size={12} /> Más likes</> : <><Clock size={12} /> Últimas primero</>}
              </button>
              <div className="relative min-w-[180px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input value={baulSearch} onChange={(e) => setBaulSearch(e.target.value)} placeholder="Buscar (modelo, @cuenta, tema…)" className="w-full rounded-full border border-line bg-ink-2 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              </div>
            </div>
            {scrapGlobalRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Todavía no trajiste nada de Instagram. Entrá a una modelo y tocá «Buscar en IG».</p>
            ) : (
              <div className="space-y-4">
                {scrapGlobalGroups.map((g) => (
                  <div key={g.label} className="space-y-2">
                    <div className="flex items-center gap-2 pt-0.5"><span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{g.label}</span><span className="text-[10px] text-paper-dim/70">{g.rows.length}</span><span className="h-px flex-1 bg-line/60" /></div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{g.rows.map(renderTodaCard)}</div>
                  </div>
                ))}
                {visN < scrapGlobalRows.length && <div ref={sentinelRef} className="h-8" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPRODUCTOR DE VIDEO ── */}
      {videoPlay && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={() => setVideoPlay(null)}>
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <video src={videoPlay.url} poster={videoPlay.poster} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-2xl border border-line bg-black" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <a href={videoPlay.url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black hover:bg-white"><Download size={14} /> Descargar</a>
              <button type="button" onClick={() => setVideoPlay(null)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-paper-mute hover:text-paper"><X size={14} /> Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIZARD: agregar una fuente (cuenta o tema) en 3 pasos ── */}
      {wiz && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setWiz(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="text-sm font-bold text-paper">{wiz.step === 0 ? 'Buscar en Instagram' : <>Agregar a {selCreator?.full_name || 'la modelo'} <span className="font-normal text-paper-dim">· paso {wiz.step} de 4</span></>}</div>
              <button type="button" onClick={() => setWiz(null)} className="grid h-7 w-7 place-items-center rounded-full text-paper-mute hover:text-paper"><X size={16} /></button>
            </div>
            <div className="p-4">
              {wiz.step === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">¿Para qué modelo traigo las fotos?</p>
                  <select autoFocus defaultValue="" onChange={(e) => { if (e.target.value) { const cuentas = wiz.mode === 'cuentas'; setSel(e.target.value); setScrapView(false); if (cuentas) { setAcctView(true); setWiz(null); } else { setSubtab('buscar'); setWiz({ step: 1, mode: null }); } } }}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
                    <option value="">Elegí una modelo…</option>
                    {creators.map((c) => <option key={c.id} value={c.id}>{c.stage_name || c.full_name}</option>)}
                  </select>
                  <p className="text-[11px] text-paper-dim">{wiz.mode === 'cuentas' ? 'Abrís el panel de cuentas guía de esa modelo.' : 'Lo que traigas queda en el baúl de esa modelo.'}</p>
                </div>
              )}
              {wiz.step === 1 && (
                <div className="space-y-2.5">
                  <p className="text-xs text-paper-dim">¿De dónde traigo las fotos?</p>
                  <button type="button" onClick={() => setWiz({ step: 2, mode: 'cuenta' })}
                    className="flex w-full items-center gap-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/[0.06] p-3 text-left hover:bg-fuchsia-500/[0.12]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fuchsia-500/20 text-fuchsia-300"><Compass size={17} /></span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold text-paper">Una cuenta de Instagram</div><div className="text-[11px] text-paper-dim">Pegás @lacuenta y traigo sus mejores fotos</div></div>
                    <ArrowRight size={15} className="shrink-0 text-paper-dim" />
                  </button>
                  <button type="button" onClick={() => setWiz({ step: 2, mode: 'tema' })}
                    className="flex w-full items-center gap-3 rounded-xl border border-brand/40 bg-brand/[0.05] p-3 text-left hover:bg-brand/10">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/20 text-brand"><Search size={17} /></span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold text-paper">Un tema</div><div className="text-[11px] text-paper-dim">bikini, fitness, playa… sin cuenta</div></div>
                    <ArrowRight size={15} className="shrink-0 text-paper-dim" />
                  </button>
                </div>
              )}
              {wiz.step === 2 && wiz.mode === 'cuenta' && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">Pegá la cuenta pública (o varias separadas por coma).</p>
                  <input autoFocus value={newAccount} onChange={(e) => setNewAccount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setWiz({ ...wiz, step: 3 }); } }}
                    placeholder="@cuenta" className="w-full rounded-full border border-line bg-ink-2 px-4 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-fuchsia-400/60" />
                  {accounts.length > 0 && <p className="text-[11px] text-paper-dim">Ya tenés: {accounts.map((a) => '@' + a).join(', ')}. La nueva se suma.</p>}
                  <p className="text-[11px] text-paper-dim">Solo <b className="text-paper-mute">públicas</b>. Las privadas/+18 Instagram no las deja ver.</p>
                </div>
              )}
              {wiz.step === 2 && wiz.mode === 'tema' && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">Escribí uno o más temas y agregalos.</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {niches.map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                        {n}<button type="button" onClick={() => saveNiches(niches.filter((x) => x !== n))} className="opacity-70 hover:opacity-100"><X size={12} /></button>
                      </span>
                    ))}
                    <input autoFocus value={newNiche} onChange={(e) => setNewNiche(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNiche(); } }}
                      placeholder="bikini, fitness…" className="min-w-[120px] flex-1 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                    <button type="button" onClick={addNiche} disabled={!newNiche.trim()} className="inline-flex items-center gap-1 rounded-full border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-40"><Plus size={13} /> Agregar</button>
                  </div>
                </div>
              )}
              {wiz.step === 3 && (
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs text-paper-dim">¿Qué traigo? <span className="text-paper-dim/70">(los mejores éxitos)</span></p>
                    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                      {[['fotos', 'Fotos'], ['videos', 'Videos'], ['ambos', 'Ambos']].map(([k, label]) => (
                        <button key={k} type="button"
                          onClick={() => { setWizType(k); if (k === 'fotos') { setQtyVideos(0); setQtyPhotos((v) => v || 10); } else if (k === 'videos') { setQtyPhotos(0); setQtyVideos((v) => v || 5); } else { setQtyPhotos((v) => v || 10); setQtyVideos((v) => v || 5); } }}
                          className={`rounded-full px-3 py-1 transition-colors ${wizType === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {wizType !== 'videos' && <label className="flex items-center gap-2 text-sm text-paper"><span className="text-paper-dim">Fotos</span>
                      <input type="number" min="0" max="60" value={qtyPhotos} onFocus={(e) => e.target.select()} onChange={(e) => setQtyPhotos(Math.max(0, Math.min(60, Number(e.target.value) || 0)))} className="w-16 rounded-lg border border-line bg-ink-2 px-2 py-1 text-sm text-paper outline-none focus:border-brand/60" /></label>}
                    {wizType !== 'fotos' && <label className="flex items-center gap-2 text-sm text-paper"><span className="text-paper-dim">Videos</span>
                      <input type="number" min="0" max="12" value={qtyVideos} onFocus={(e) => e.target.select()} onChange={(e) => setQtyVideos(Math.max(0, Math.min(12, Number(e.target.value) || 0)))} className="w-16 rounded-lg border border-line bg-ink-2 px-2 py-1 text-sm text-paper outline-none focus:border-brand/60" /></label>}
                  </div>
                  <p className="text-[11px] text-paper-dim">Traigo los de más likes/views y te documento por qué (la «i» en cada foto). Los videos se bajan a tu storage.</p>
                </div>
              )}
              {wiz.step === 4 && (
                <div className="space-y-2">
                  <p className="text-xs text-paper-dim">Listo para buscar en Instagram:</p>
                  <div className="rounded-xl border border-line bg-card p-3 text-sm font-semibold text-paper">
                    {wiz.mode === 'cuenta'
                      ? (newAccount.trim() ? newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean).map((h) => '@' + h).join(', ') : '—')
                      : (niches.length ? niches.join(' · ') : (newNiche.trim() || '—'))}
                    <div className="mt-1 text-[11px] font-normal text-paper-dim">{qtyPhotos > 0 ? `${qtyPhotos} foto${qtyPhotos === 1 ? '' : 's'}` : ''}{qtyPhotos > 0 && qtyVideos > 0 ? ' + ' : ''}{qtyVideos > 0 ? `${qtyVideos} video${qtyVideos === 1 ? '' : 's'}` : ''}</div>
                  </div>
                  <p className="text-[11px] text-paper-dim">Tarda 1-2 min. Lo filtro solo y lo que sirva aparece en la grilla y suma a la ficha de la cuenta.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <button type="button" onClick={() => (wiz.step <= 1 ? setWiz(null) : setWiz({ ...wiz, step: wiz.step - 1 }))}
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper">
                {wiz.step <= 1 ? 'Cancelar' : <><ArrowLeft size={14} /> Atrás</>}
              </button>
              {wiz.step === 2 && (
                <button type="button"
                  disabled={(wiz.mode === 'cuenta' && !newAccount.trim()) || (wiz.mode === 'tema' && niches.length === 0 && !newNiche.trim())}
                  onClick={() => { if (wiz.mode === 'tema' && newNiche.trim()) addNiche(); setWiz({ ...wiz, step: 3 }); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-40">Siguiente <ArrowRight size={14} /></button>
              )}
              {wiz.step === 3 && (
                <button type="button" disabled={qtyPhotos + qtyVideos <= 0}
                  onClick={() => setWiz({ ...wiz, step: 4 })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-40">Siguiente <ArrowRight size={14} /></button>
              )}
              {wiz.step === 4 && (
                <button type="button" disabled={scraping || scrapingAcc || !!checkingAcct}
                  onClick={async () => {
                    const m = wiz.mode; setWiz(null);
                    if (m === 'cuenta') {
                      const handles = newAccount.split(/[\s,\n]+/).map(parseHandle).filter(Boolean);
                      if (!handles.length) return;
                      const merged = [...new Set([...accounts, ...handles])].slice(0, 20); await saveAccounts(merged); setNewAccount('');
                      for (const h of handles) { await checkOneAccount(h); } // scrapea SOLO las que agregaste, una por una
                    } else { await doScrape(); }
                    loadScrapeRuns(); loadScraperGlobal();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-1.5 text-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-50">
                  {(scraping || scrapingAcc || checkingAcct) ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD DE CUENTAS GUÍA (pantalla completa) ── */}
      {acctView && selCreator && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 lg:px-6">
              <button type="button" onClick={() => setAcctView(false)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={16} /> Volver a la mesa</button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold text-paper"><Compass size={16} className="text-fuchsia-300" /> Cuentas guía</div>
                <div className="truncate text-[11px] text-paper-dim">Influencers de {selCreator.full_name} · sus fotos alimentan tu mesa</div>
              </div>
              {accounts.length > 0 && (
                <button type="button" onClick={doScrapeAccounts} disabled={scrapingAcc || !!checkingAcct}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white hover:bg-fuchsia-600 disabled:opacity-50">
                  {scrapingAcc ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {scrapingAcc ? 'Buscando…' : `Buscar en todas (${accounts.length})`}
                </button>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
            {acctDetail ? (() => {
              const a = acctDetail; const priv = privateAccts.has(a);
              const st = scrapeByAcct[a] || { fotos: 0, enMesa: 0, lastAt: 0, days: {} };
              const myRuns = scrapeRuns.filter((r) => r.kind === 'account' && String(r.query || '').replace(/^@/, '') === a);
              const realCost = myRuns.reduce((s, r) => s + (Number(r.cost_real) || 0), 0);
              const dayList = Object.entries(st.days || {}).sort((x, y) => String(y[0]).localeCompare(String(x[0])));
              const allA = vault.filter((r) => r.kind === 'ref' && String(r.source_handle || '').replace(/^@/, '') === a && r.creator_id === sel);
              const vidCount = allA.filter((r) => r.media_type === 'video').length;
              const photos = allA.filter((r) => (mediaFilter === 'fotos' ? r.media_type !== 'video' : mediaFilter === 'videos' ? r.media_type === 'video' : true)).sort((x, y) => (Number(y.likes) || 0) - (Number(x.likes) || 0));
              return (
                <div>
                  <button type="button" onClick={() => setAcctDetail(null)} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-paper-mute hover:text-paper"><ArrowLeft size={15} /> Todas las cuentas</button>
                  <div className="mb-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-lg font-bold text-paper">@{a}</div>
                      <button type="button" onClick={() => { setNewAccount(a); setWiz({ step: 3, mode: 'cuenta' }); }} disabled={scrapingAcc || !!checkingAcct} className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-600 disabled:opacity-40" title="Traer sus fotos nuevas (no repite las que ya tenés)">{checkingAcct === a ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Buscar más</button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                      <div><div className="text-xl font-bold tabular-nums text-paper">{st.fotos}</div><div className="text-[10px] text-paper-dim">bajadas</div></div>
                      <div><div className="text-xl font-bold tabular-nums text-paper">{st.enMesa}</div><div className="text-[10px] text-paper-dim">en mesa</div></div>
                      <div><div className="text-xl font-bold tabular-nums text-amber-300">{realCost > 0 ? usd(realCost) : scraperMoney(st.fotos)}</div><div className="text-[10px] text-paper-dim">gasto {realCost > 0 ? 'real' : 'est'}</div></div>
                      <div><div className="text-sm font-bold tabular-nums text-paper">{agoLabel(st.lastAt)}</div><div className="text-[10px] text-paper-dim">última</div></div>
                    </div>
                    {priv && <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300"><AlertTriangle size={11} /> privada o +18 — Instagram no la deja ver</div>}
                  </div>
                  {dayList.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Historial · fotos por día</div>
                      <div className="flex flex-wrap gap-1.5">
                        {dayList.map(([d, c]) => <span key={d} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold text-paper-mute">{fmtDay(d)} <span className="text-fuchsia-300">+{c}</span></span>)}
                      </div>
                    </div>
                  )}
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Todo lo bajado · {photos.length}</span>
                    {vidCount > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-[11px] font-semibold">
                        {[['todo', 'Todo'], ['fotos', 'Fotos'], ['videos', 'Videos']].map(([k, label]) => (
                          <button key={k} type="button" onClick={() => setMediaFilter(k)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors ${mediaFilter === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>
                            {k === 'videos' && <Play size={9} className="fill-current" />}{label}{k === 'videos' && <span className="opacity-70">{vidCount}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {photos.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">Nada con este filtro.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{photos.map(renderTodaCard)}</div>
                  )}
                </div>
              );
            })() : (<>
            {/* Totales del scraper: esta modelo + global */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-200/80">{selCreator.full_name}</div>
                <div className="mt-1.5 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div><div className="text-xl font-bold tabular-nums text-paper">{scrapeModelTotal.fotos}</div><div className="text-[10px] text-paper-dim">fotos bajadas</div></div>
                  <div><div className="text-xl font-bold tabular-nums text-amber-300">{scrapeModelTotal.costReal > 0 ? usd(scrapeModelTotal.costReal) : scraperMoney(scrapeModelTotal.fotos)}</div><div className="text-[10px] text-paper-dim">gasto {scrapeModelTotal.costReal > 0 ? 'real' : 'estimado'}</div></div>
                  <div><div className="text-xl font-bold tabular-nums text-paper">{accounts.length}</div><div className="text-[10px] text-paper-dim">cuentas guía</div></div>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-card p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Total del scraper · todas las modelos</div>
                <div className="mt-1.5 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div><div className="text-xl font-bold tabular-nums text-paper">{scraperGlobal.photos}</div><div className="text-[10px] text-paper-dim">fotos bajadas</div></div>
                  <div><div className="text-xl font-bold tabular-nums text-amber-300">{scraperMoney(scraperGlobal.photos)}</div><div className="text-[10px] text-paper-dim">gasto estimado</div></div>
                  <div><div className="text-xl font-bold tabular-nums text-paper">{scraperGlobal.accounts}</div><div className="text-[10px] text-paper-dim">cuentas</div></div>
                </div>
              </div>
            </div>
            <p className="mb-4 text-[11px] text-paper-dim">El gasto es <b className="text-paper-mute">estimado</b> (≈US$2.30 por 1.000 fotos). El <b className="text-paper-mute">real</b> de Apify aparece por corrida cuando el motor lo registre.</p>

            {/* Agregar cuenta */}
            <div className="mb-5 rounded-2xl border border-line bg-card p-4">
              <div className="mb-2 text-sm font-semibold text-paper">Agregar cuenta</div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={newAccount} onChange={(e) => setNewAccount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newAccount.trim()) { e.preventDefault(); setWiz({ step: 2, mode: 'cuenta' }); } }}
                  placeholder="@cuenta pública o link (o pegá varias separadas por coma)" className="min-w-[200px] flex-1 rounded-full border border-line bg-ink-2 px-4 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-fuchsia-400/60" />
                <button type="button" onClick={() => setWiz({ step: 2, mode: 'cuenta' })} disabled={!newAccount.trim() || scrapingAcc} className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white hover:bg-fuchsia-600 disabled:opacity-40">
                  <Search size={15} /> Agregar y buscar
                </button>
              </div>
              <p className="mt-2 text-[11px] text-paper-dim">Te pregunto cuántas <b className="text-paper-mute">fotos</b> y cuántos <b className="text-paper-mute">videos</b> y traigo los mejores éxitos. Solo cuentas <b className="text-paper-mute">públicas</b> (las privadas/+18 te las marco en rojo).</p>
            </div>

            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-card/40 p-10 text-center">
                <Compass size={26} className="mx-auto mb-2 text-fuchsia-300/70" />
                <p className="text-sm font-semibold text-paper">Todavía no tenés cuentas guía</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-paper-dim">Agregá arriba las influencers públicas que te gustan. Traigo sus mejores fotos (por likes) y las dejo listas para cocinar.</p>
              </div>
            ) : (
              <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                  <input value={acctSearch} onChange={(e) => setAcctSearch(e.target.value)} placeholder="Buscar cuenta…" className="w-full rounded-full border border-line bg-ink-2 py-1.5 pl-9 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
                  {[['todas', 'Todas'], ['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', '7 días']].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setAcctDate(k)} className={`rounded-full px-2.5 py-1 transition-colors ${acctDate === k ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {accounts.filter((a) => {
                  const term = acctSearch.trim().toLowerCase();
                  if (term && !a.toLowerCase().includes(term)) return false;
                  if (acctDate !== 'todas') {
                    const t = scrapeByAcct[a]?.lastAt || 0; if (!t) return false;
                    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
                    const diff = Math.round((startOf(new Date()) - startOf(new Date(t))) / 86400000);
                    if (acctDate === 'hoy' && diff !== 0) return false;
                    if (acctDate === 'ayer' && diff !== 1) return false;
                    if (acctDate === 'semana' && diff > 6) return false;
                  }
                  return true;
                }).map((a) => {
                  const priv = privateAccts.has(a); const busy = checkingAcct === a; const running = busy || scrapingAcc; const tops = acctTopPhotos(a);
                  const st = scrapeByAcct[a] || { fotos: 0, enMesa: acctCounts[a] || 0, lastAt: acctLastAt(a), days: {} };
                  const myRuns = scrapeRuns.filter((r) => r.kind === 'account' && String(r.query || '').replace(/^@/, '') === a);
                  const realCost = myRuns.reduce((s, r) => s + (Number(r.cost_real) || 0), 0);
                  const dayList = Object.entries(st.days || {}).sort((x, y) => String(y[0]).localeCompare(String(x[0]))).slice(0, 8);
                  return (
                    <div key={a} className={`overflow-hidden rounded-2xl border ${priv ? 'border-rose-500/40 bg-rose-500/[0.05]' : 'border-line bg-card'}`}>
                      <div className="flex items-start gap-2 p-3">
                        <button type="button" onClick={() => setAcctDetail(a)} className="min-w-0 flex-1 text-left">
                          <div className="truncate text-sm font-bold text-paper hover:underline">@{a} <span className="text-[10px] font-semibold text-fuchsia-300">ver todas →</span></div>
                          {running ? (
                            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300"><Loader2 size={11} className="animate-spin" /> Buscando fotos… (1-2 min)</div>
                          ) : (acctIssue[a] || priv) ? (
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300"><AlertTriangle size={11} /> {acctIssue[a] || 'Privada o +18 — Instagram no la deja ver.'}</div>
                          ) : (
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                              <span className="text-paper-dim"><b className="text-paper">{st.fotos}</b> bajadas</span>
                              <span className="text-paper-dim"><b className="text-paper">{st.enMesa}</b> en mesa</span>
                              <span className="text-paper-dim">gasto <b className="text-amber-300">{realCost > 0 ? usd(realCost) : scraperMoney(st.fotos)}</b> <span className="text-paper-dim/60">{realCost > 0 ? 'real' : 'est'}</span></span>
                              {st.fotos === 0 && !st.lastAt
                                ? <span className="font-semibold text-fuchsia-300">· nueva — tocá «Buscar más» para traerla</span>
                                : <span className="text-paper-dim/70">· última {agoLabel(st.lastAt)}</span>}
                            </div>
                          )}
                        </button>
                        <button type="button" onClick={() => { setNewAccount(a); setWiz({ step: 3, mode: 'cuenta' }); }} disabled={scrapingAcc || !!checkingAcct}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-fuchsia-400/40 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10 disabled:opacity-40" title="Traer sus últimas fotos (y más abajo de su feed)">
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {busy ? 'Buscando…' : 'Buscar más'}
                        </button>
                        <button type="button" onClick={() => { saveAccounts(accounts.filter((x) => x !== a)); setPrivateAccts((p) => { const q = new Set(p); q.delete(a); return q; }); }}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:border-rose-400 hover:text-rose-300" title="Quitar cuenta"><X size={13} /></button>
                      </div>
                      {dayList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 border-t border-line/60 px-3 py-2">
                          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim/70">Historial</span>
                          {dayList.map(([d, c]) => (
                            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-ink-2 px-2 py-0.5 text-[10px] font-semibold text-paper-mute">{fmtDay(d)} <span className="text-fuchsia-300">+{c}</span></span>
                          ))}
                        </div>
                      )}
                      {tops.length > 0 && (
                        <div className="grid grid-cols-5 gap-0.5 border-t border-line/60 bg-ink-2">
                          {tops.map((r) => (
                            <div key={r.id} className="relative aspect-square overflow-hidden">
                              <img src={r.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                              {Number(r.likes) > 0 && <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[9px] font-bold text-white">{fmtLikes(r.likes)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            )}
            </>)}
          </div>
        </div>
      )}

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
      {selCreator && (['cocinar', 'buscar'].includes(subtab) || acctView) && queue.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-brand/30 bg-ink/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-2 text-sm text-paper">
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand px-2 text-xs font-bold text-on-accent">{queue.length}</span>
              <span className="font-semibold">seleccionada(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQueue([])} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">Quitar selección</button>
              <button type="button" onClick={bulkDiscard} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"><Trash2 size={14} /> Sacar la basura {queue.length}</button>
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
                    {detail.comments != null && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Comentarios</span><span className="font-semibold text-paper">💬 {fmtLikes(detail.comments)}</span></div>}
                    {detail.media_type === 'video' && detail.video_url && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Video</span><a href={detail.video_url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"><Download size={12} /> Descargar</a></div>}
                    {detail.vibe && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Nicho</span><span className="font-semibold text-paper">#{detail.vibe}</span></div>}
                    {detail.created_at && <div className="flex items-center justify-between gap-2"><span className="text-paper-dim">Traída</span><span className="font-semibold text-paper">{fmtDay(String(detail.created_at).slice(0, 10))}</span></div>}
                    <div className="rounded-lg border border-brand/30 bg-brand/[0.06] p-2 text-[12px] text-paper"><b className="text-brand">Por qué es de las mejores:</b> la elegí por engagement — {fmtLikes(detail.likes || 0)} likes{detail.views ? ` + ${fmtLikes(detail.views)} views` : ''}{detail.comments ? ` + ${fmtLikes(detail.comments)} comentarios` : ''}. Traigo siempre las de números más altos.</div>
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
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px]"><ChefHat size={12} className="text-brand" /> Motor: <span className="font-bold text-brand">Soul 2.0</span> <span className="text-paper-dim">— el único aprobado (mantiene cara y cuerpo real)</span></div>
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
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Viral (referencia)</div><img src={cmpRoot.reference_url} alt="" onClick={() => setLightbox({ url: cmpRoot.reference_url, label: 'Viral (referencia)' })} className="w-full cursor-zoom-in rounded-xl border border-line object-cover" /></div>
                <div><div className="mb-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">Su versión · <span className={engineOf(cmpRoot) === 'Nano' ? 'text-rose-300' : 'text-brand'}>{engineOf(cmpRoot)}</span> {cmpRoot.status === 'approved' && <span className="text-emerald-300">· aprobada ✓</span>}</div><img src={cmpRoot.result_url} alt="" onClick={() => setLightbox({ url: cmpRoot.result_url, label: `Su versión · ${engineOf(cmpRoot)}` })} className="w-full cursor-zoom-in rounded-xl border border-brand/40 object-cover" /></div>
              </div>
              {cmpRoot.status === 'done' && (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => decide(cmpRoot, false, false)} className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"><Trash2 size={14} /> Descartar</button>
                  <button type="button" onClick={() => decide(cmpRoot, true, true)} className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold"><Heart size={14} /> Aprobar → baúl</button>
                </div>
              )}

              {/* Carrusel: mismo lugar + mismo outfit, otras poses */}
              <div className="mt-4 rounded-2xl border border-brand/25 bg-ink-2 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-paper"><Sparkles size={15} className="text-brand" /> Más fotos de {selCreator.full_name} <span className="text-[11px] font-normal text-paper-dim">— con su soul real, se parece a ELLA</span></div>
                {/* 3 modos claros: Carrusel (set coherente) · Sorpréndeme (fotos sueltas variadas) · Yo elijo (prompteo cada una). Todo Soul 2.0. */}
                <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
                  <button type="button" onClick={() => setVarMode('carrusel')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'carrusel' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><LayoutGrid size={12} /> Carrusel</button>
                  <button type="button" onClick={() => setVarMode('suelta')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'suelta' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Sparkles size={12} /> Sorpréndeme</button>
                  <button type="button" onClick={() => setVarMode('custom')} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${varMode === 'custom' ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}><Flame size={12} /> Yo elijo</button>
                </div>
                <p className="mb-3 text-[10px] leading-snug text-paper-dim">{varMode === 'carrusel' ? <><b className="text-paper-mute">Mismo lugar y outfit</b>, varias poses que van JUNTAS como UN post de Instagram (set coherente).</> : varMode === 'suelta' ? <><b className="text-paper-mute">Fotos nuevas y variadas</b> de ella (otros lugares/outfits) — contenido suelto, no atado a esta foto.</> : <>Vos escribís qué querés en cada foto (mismo lugar y outfit).</>}</p>

                {varMode !== 'custom' ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-paper-mute">¿Cuántas?</span>
                      {[2, 3, 4, 6].map((n) => (
                        <button key={n} type="button" onClick={() => setVarN(n)} className={`h-7 w-8 rounded-lg text-xs font-bold transition-colors ${varN === n ? 'bg-brand text-on-accent' : 'border border-line text-paper-mute hover:text-paper'}`}>{n}</button>
                      ))}
                    </div>
                    <button type="button" disabled={varBusy} onClick={() => makeVariations(compare.root)} className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                      {varBusy ? <Loader2 size={14} className="animate-spin" /> : varMode === 'carrusel' ? <LayoutGrid size={14} /> : <Sparkles size={14} />} {varMode === 'carrusel' ? `Hacer carrusel · ${varN} fotos` : `Sorpréndeme · ${varN} sueltas`}
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
                              <img src={k.result_url} alt="" onClick={() => setLightbox({ url: k.result_url, label: `Motor: ${engineOf(k)}` })} className="aspect-[3/4] w-full cursor-zoom-in object-cover" />
                              {k.status === 'approved' && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={11} /></span>}
                            </div>
                            {motorLine(k)}
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
          {lightbox.label && <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">{lightbox.label}</div>}
          <img src={lightbox.url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
