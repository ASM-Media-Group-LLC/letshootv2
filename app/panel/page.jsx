'use client';

// Creator panel — calm and clear for the model (OnlyFans creator).
// Two sections: Galería (her delivered content, organized by delivery, with a
// simple monthly accounting: fotos · videos · dinero) and Pedidos (request
// content). Everything about numbers/notes is READ-ONLY — a mirror of what her
// agency/manager keeps. Per photo she sees: when it was delivered, how much it
// sold, who added it, the agency's day-by-day notes, and she can leave feedback.

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Image as ImageIcon, Film, Download, Heart, MessageSquarePlus, MessageSquare, User, Bell,
  X, Sparkles, Target, Building2, Inbox, Plus, Send, ChevronLeft, ChevronRight, ChevronDown,
  ShoppingBag, DollarSign, Images, UserPlus, NotebookPen, Activity, Check, CalendarRange, BellOff, Eye, Clock, Loader2, TrendingUp, TrendingDown, Maximize2,
} from 'lucide-react';
import { getUserProfile, signOut, homeForRole } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { ymOf, ymLabel, shiftYm, initials } from '@/lib/portal-stats';
import Logo from '@/components/Logo';
import MediaThumb, { MediaLightbox } from '@/components/MediaThumb';
import Avatar from '@/components/Avatar';
import LangToggle from '@/components/LangToggle';
import WelcomeTour from '@/components/WelcomeTour';
import LoraUploader from '@/components/LoraUploader';

function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }
const ASSET_COLS = 'id, folder_id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, added_by';
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function notifText(t, n) {
  const m = n.meta || {};
  switch (n.kind) {
    case 'delivery': return t.panel.notifDelivery(m.folder || '');
    case 'approved': return t.panel.notifApproved;
    case 'rejected': return t.panel.notifRejected(m.reason || '');
    case 'feedback_resolved': return t.panel.notifFeedback;
    case 'request_msg': return `${(t.panel.reqMsgFrom || {})[m.from] || m.from}: «${m.title || ''}» — ${m.body || ''}`;
    default: return m.text || t.panel.notifGeneric;
  }
}

// Estética por tipo de notificación: icono + color del avatar circular.
const NOTIF_META = {
  delivery: { icon: Sparkles, cls: 'bg-brand/15 text-brand' },
  approved: { icon: Check, cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { icon: X, cls: 'bg-rose-500/15 text-rose-300' },
  feedback_resolved: { icon: Heart, cls: 'bg-rose-500/15 text-rose-300' },
  request_msg: { icon: MessageSquare, cls: 'bg-sky/15 text-sky' },
  default: { icon: Bell, cls: 'bg-hair/10 text-paper-dim' },
};

// Página con auth: nunca es estática. force-dynamic la saca del prerender del
// build (donde useSearchParams sin Suspense rompía `next build`, no `next dev`).
export const dynamic = 'force-dynamic';

// Wrapper con Suspense — Next 14 exige que useSearchParams viva dentro de un
// límite de Suspense para el build de producción. Sin esto, TODOS los deploys
// de Vercel fallaban al prerenderizar /panel.
export default function PanelPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>}>
      <PanelPageInner />
    </Suspense>
  );
}

function PanelPageInner() {
  const { t, lang } = usePortal();
  const router = useRouter();
  const search = useSearchParams();
  const asId = search.get('as'); // ?as=<creatorId> → el equipo VE el panel de esa creadora (solo lectura)
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  const [state, setState] = useState({ loading: true, profile: null, assets: [], folders: {} });
  const [viewAs, setViewAs] = useState(null); // { id, name } cuando el equipo mira como la creadora; null si es su propio panel
  const readOnly = !!viewAs; // en modo «ver como» NADA se puede escribir
  const [urls, setUrls] = useState({});
  const [toast, setToast] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [justUnread, setJustUnread] = useState([]); // ids sin leer al abrir la campana
  const [detail, setDetail] = useState(null);
  const [agency, setAgency] = useState('');
  const [weekly, setWeekly] = useState([]); // ventas por semana (momentum)
  const [leaveReq, setLeaveReq] = useState(null); // solicitud de salida activa (pending|rejected)
  const [leaveModal, setLeaveModal] = useState(false); // pop-up de confirmación
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [requests, setRequests] = useState([]);
  const [reqOpen, setReqOpen] = useState(false);
  const [notesFeed, setNotesFeed] = useState([]);
  const [view, setView] = useState('contenido'); // contenido (default) | numeros | activity | requests
  const [range, setRange] = useState('month'); // week (7 días) | month | all | custom — compartido Contenido/Números
  const [customFrom, setCustomFrom] = useState(''); // rango de fechas: desde
  const [customTo, setCustomTo] = useState('');     // rango de fechas: hasta
  const [sortBy, setSortBy] = useState('revenue-desc'); // orden de las listas de detalle
  const [numCard, setNumCard] = useState('revenue');  // photos | videos | revenue — qué detalle se ve
  const [month, setMonth] = useState(null);
  const [openDays, setOpenDays] = useState([]);   // gallery day-folders expanded
  const [openFolders, setOpenFolders] = useState([]); // gallery folder-boxes expanded
  const [myFeedback, setMyFeedback] = useState({}); // asset_id -> 'love' | 'change'
  // Modo selección estilo iPhone/AirDrop: toca fotos para marcarlas y bajarlas
  // todas de un tirón. Se activa con el botón «Seleccionar» y se sale con «X».
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [contentLayout, setContentLayout] = useState('grid'); // grid | days | folders
  const [bulkDownloading, setBulkDownloading] = useState(false);
  function toggleSel(id) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function clearSel() { setSelected(new Set()); }
  function exitSelect() { setSelectMode(false); clearSel(); }
  // Al cambiar de vista o de mes/rango, sale del modo selección (evita quedarse
  // con selecciones fantasma cuando ya no ves esas fotos).
  useEffect(() => { exitSelect(); }, [view, range, month]);

  const load = useCallback(async (userId) => {
    const supabase = getSupabase();
    const [{ data: folders }, { data: nots }, { data: reqs }] = await Promise.all([
      supabase.from('folders').select(`id, name, assets(${ASSET_COLS})`).eq('creator_id', userId).order('created_at'),
      supabase.from('notifications').select('id, kind, meta, read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('requests').select('id, title, description, status, created_at, chatter_id').eq('creator_id', userId).order('created_at', { ascending: false }),
    ]);
    const folderMap = {}; (folders || []).forEach((f) => { folderMap[f.id] = f.name; });
    const assets = (folders || []).flatMap((f) => f.assets || []);
    const toSign = assets.filter((a) => !isDirect(a.storage_path));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries').createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {}; (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; }); setUrls(map);
    }
    // Request threads: team questions + replies (copy always reaches her).
    const { data: reqMsgs } = await supabase.from('request_messages').select('*').order('created_at');
    const msgsByReq = {}; (reqMsgs || []).forEach((m) => { (msgsByReq[m.request_id] = msgsByReq[m.request_id] || []).push(m); });
    setNotifs(nots || []); setRequests((reqs || []).map((r) => ({ ...r, _msgs: msgsByReq[r.id] || [] })));
    // Activity feed — the agency's notes across all her content (with thumbs).
    const ids = assets.map((a) => a.id);
    if (ids.length) {
      const { data: ns } = await supabase.from('asset_notes')
        .select('id, note, note_date, author_name, author_handle, asset_id')
        .in('asset_id', ids).order('note_date', { ascending: false }).order('created_at', { ascending: false }).limit(40);
      const byId = {}; assets.forEach((a) => { byId[a.id] = a; });
      setNotesFeed((ns || []).map((n) => ({ ...n, asset: byId[n.asset_id] })).filter((n) => n.asset));
    } else setNotesFeed([]);
    // Her own feedback so the gallery/detail can reflect it.
    const { data: fb } = await supabase.from('feedback').select('asset_id, kind, created_at').eq('creator_id', userId).order('created_at', { ascending: true });
    const fbMap = {}; (fb || []).forEach((f) => { fbMap[f.asset_id] = f.kind; }); setMyFeedback(fbMap);
    return { assets, folders: folderMap };
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (!up.profile?.role) { router.replace('/login'); return; }

      // ── Modo «ver como»: el equipo (staff/admin) abre el panel de una creadora
      // tal como ella lo ve. Solo lectura; usa las políticas de staff para leer
      // su contenido/pedidos/feedback. No aplica a la creadora misma.
      const isStaff = ['admin', 'supervisor', 'producer', 'chatter'].includes(up.profile.role);
      if (asId && isStaff) {
        const { data: rows } = await getSupabase().rpc('creator_profile', { target: asId });
        const cp = rows?.[0];
        if (!cp) { router.replace('/admin'); return; }
        const profile = {
          id: cp.id, role: 'creator', full_name: cp.full_name, stage_name: cp.stage_name,
          handle: cp.handle, avatar_url: cp.avatar_url, onboarding_status: cp.onboarding_status,
          payment_status: cp.payment_status, plan: cp.plan, lora_status: cp.lora_status,
        };
        const { assets, folders } = await load(cp.id);
        const latest = assets.reduce((mx, a) => (a.deliver_date && a.deliver_date > mx ? a.deliver_date : mx), '');
        setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
        setViewAs({ id: cp.id, name: cp.stage_name || cp.full_name || 'la creadora' });
        setState({ loading: false, profile, assets, folders });
        // La agencia que la maneja (para reflejar «gestionada por…» igual que ella lo ve).
        const { data: link } = await getSupabase().from('agency_creators').select('agency_id, profiles!agency_creators_agency_id_fkey(full_name)').eq('creator_id', cp.id).maybeSingle();
        if (link?.profiles?.full_name) setAgency(link.profiles.full_name);
        return;
      }

      // ── Panel propio de la creadora ──
      if (up.profile.role !== 'creator') { router.replace(homeForRole(up.profile.role)); return; }
      if (up.profile.onboarding_status !== 'active') { router.replace('/onboarding'); return; }
      const { assets, folders } = await load(up.user.id);
      const latest = assets.reduce((mx, a) => (a.deliver_date && a.deliver_date > mx ? a.deliver_date : mx), '');
      setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
      setState({ loading: false, profile: up.profile, assets, folders });
      const { data: ag } = await getSupabase().rpc('my_agency'); if (ag) setAgency(ag);
      // Ventas por semana (para la banda de momentum): últimas ~10 semanas.
      const { data: wk } = await getSupabase().from('agency_weekly_sales')
        .select('week_start, sales, revenue').eq('creator_id', up.profile.id)
        .order('week_start', { ascending: true }).limit(12);
      setWeekly(wk || []);
      // Solicitud de salida activa (pendiente o rechazada) para mostrar su estado.
      const { data: lr } = await getSupabase().from('agency_leave_requests')
        .select('id, status, created_at').eq('creator_id', up.profile.id)
        .in('status', ['pending', 'rejected']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setLeaveReq(lr || null);
    })();
  }, [router, load, asId]);

  const refresh = useCallback(async () => {
    if (!state.profile?.id) return;
    const { assets, folders } = await load(state.profile.id);
    setState((s) => ({ ...s, assets, folders }));
  }, [state.profile?.id, load]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));
  // URL de DESCARGA: fuerza attachment (si no, la URL firmada cross-origin se abre en vez de bajar).
  const dlFor = (a) => {
    const u = srcFor(a); if (!u) return u;
    const name = `${(a.title || 'letshoot').replace(/[^\w.-]+/g, '_')}.${(a.storage_path?.split('.').pop() || (a.type === 'video' ? 'mp4' : 'jpg'))}`;
    if (isDirect(a.storage_path)) return u; // demo /public paths: same-origin, el attr download basta
    return u + (u.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(name);
  };
  const unread = notifs.filter((n) => !n.read).length;
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function openBell() {
    const opening = !bellOpen; setBellOpen(opening);
    if (opening) {
      setJustUnread(notifs.filter((n) => !n.read).map((n) => n.id));
      if (unread > 0 && !readOnly) { setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); await getSupabase().from('notifications').update({ read: true }).eq('user_id', state.profile.id).eq('read', false); }
    }
  }
  // Ella decide: salirse de su agencia (borra el vínculo; avisa a la agencia).
  // La modelo pide salir → crea una solicitud PENDIENTE (no sale aún).
  async function submitLeaveRequest() {
    if (readOnly) return;
    setLeaveBusy(true);
    const { data, error } = await getSupabase().rpc('request_leave_agency', { p_reason: leaveReason.trim() || null });
    setLeaveBusy(false);
    if (error) { flash(t.common.error); return; }
    setLeaveReq({ id: data, status: 'pending' });
    setLeaveModal(false); setLeaveReason('');
    flash(isEs ? 'Solicitud enviada a tu agencia' : 'Request sent to your agency');
  }
  // La modelo sale de todos modos (rechazada o ignorada) — siempre gana.
  async function leaveAnyway() {
    if (readOnly || !leaveReq) return;
    if (!window.confirm(isEs ? '¿Salir de la agencia de todos modos? No se puede deshacer.' : 'Leave the agency anyway? This cannot be undone.')) return;
    setLeaveBusy(true);
    const { error } = await getSupabase().rpc('creator_leave_anyway', { p_request: leaveReq.id });
    setLeaveBusy(false);
    if (error) { flash(t.common.error); return; }
    setLeaveReq(null); setAgency(null);
    flash(isEs ? 'Saliste de la agencia' : 'You left the agency');
  }
  // La modelo cancela su solicitud pendiente (cambió de opinión).
  async function cancelLeaveRequest() {
    if (readOnly || !leaveReq) return;
    setLeaveBusy(true);
    const { error } = await getSupabase().rpc('cancel_leave_request', { p_request: leaveReq.id });
    setLeaveBusy(false);
    if (error) { flash(t.common.error); return; }
    setLeaveReq(null);
    flash(isEs ? 'Solicitud cancelada' : 'Request cancelled');
  }

  async function sendFeedback(asset, kind) {
    if (readOnly) return;
    let message = null;
    if (kind === 'change') { message = window.prompt(t.panel.changePrompt, ''); if (message === null) return; }
    const { error } = await getSupabase().from('feedback').upsert(
      { asset_id: asset.id, creator_id: state.profile.id, kind, message, author_id: state.profile.id, author_role: 'creator', resolved: kind !== 'change' },
      { onConflict: 'asset_id,author_id' });
    if (error) { flash(t.common.error); return; }
    // Reflect it for her; a DB trigger notifies the team (pop-up + dashboard).
    setMyFeedback((m) => ({ ...m, [asset.id]: kind }));
    flash(kind === 'love' ? (t.panel.fbLoved || 'Le dijiste que te encantó') : (t.panel.fbChange || 'Pediste un cambio — el equipo ya lo sabe'));
  }
  async function createRequest({ title, description, refFiles }) {
    if (readOnly) return false;
    if (!title.trim()) return false;
    const supabase = getSupabase();
    // Client-generated id so reference photos upload under it BEFORE the insert —
    // creators can't UPDATE a request afterward (RLS), so everything goes in one insert.
    const reqId = crypto.randomUUID();
    const paths = [];
    for (const f of (refFiles || [])) {
      if (!f.type?.startsWith('image/')) continue;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${state.profile.id}/${reqId}/${crypto.randomUUID()}.${ext}`;
      const { error: up } = await supabase.storage.from('request-refs').upload(path, f, { contentType: f.type });
      if (!up) paths.push(path);
    }
    const { error } = await supabase.from('requests').insert({
      id: reqId, creator_id: state.profile.id, chatter_id: state.profile.id,
      title: title.trim(), description: description.trim() || null,
      status: 'pending', ref_images: paths.length ? paths : null,
    });
    if (error) { console.error(error); flash(t.common.error); return false; }
    // Reach the team that attends requests: in-app pop-up + email.
    supabase.functions.invoke('notify-request', { body: { request_id: reqId } }).catch(() => {});
    setReqOpen(false); flash(t.panel.reqSent); await refresh(); return true;
  }
  function downloadMany(items) { items.forEach((a, i) => { const src = dlFor(a); if (!src) return; setTimeout(() => { const el = document.createElement('a'); el.href = src; el.download = ''; el.rel = 'noopener'; document.body.appendChild(el); el.click(); el.remove(); }, i * 350); }); }

  const isEs = (locale || 'es').startsWith('es');
  // Rango compartido (Contenido + Números): 7 días · mes · todo.
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAgoISO = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const rangeAssets = state.assets.filter((a) => {
    const d = (a.deliver_date || '').slice(0, 10);
    if (range === 'week') return d && d >= weekAgoISO && d <= todayISO;
    if (range === 'all') return true;
    if (range === 'custom') {
      if (!d) return false;
      if (customFrom && d < customFrom) return false;
      if (customTo && d > customTo) return false;
      return true;
    }
    return ymOf(a.deliver_date) === month; // month
  });
  const acc = {
    photos: rangeAssets.filter((a) => a.type !== 'video').length,
    videos: rangeAssets.filter((a) => a.type === 'video').length,
    revenue: rangeAssets.reduce((s, a) => s + Number(a.revenue || 0), 0),
  };
  const groups = [];
  [...rangeAssets].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || '')).forEach((a) => {
    let g = groups.find((x) => x.date === a.deliver_date); if (!g) { g = { date: a.deliver_date, items: [] }; groups.push(g); } g.items.push(a);
  });
  const fmtDay = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : '');
  const fmtShort = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '…');
  const rangeLabel = range === 'week' ? (isEs ? 'últimos 7 días' : 'last 7 days')
    : range === 'all' ? (isEs ? 'todo el histórico' : 'all time')
    : range === 'custom' ? ((customFrom || customTo) ? `${fmtShort(customFrom)} → ${fmtShort(customTo)}` : (isEs ? 'rango de fechas' : 'date range'))
    : ymLabel(month, locale);
  // Ordenamiento de las listas de detalle — de más a menos y más opciones.
  const SORT_OPTS = [
    ['revenue-desc', isEs ? 'Ingresos: mayor a menor' : 'Revenue: high to low'],
    ['revenue-asc', isEs ? 'Ingresos: menor a mayor' : 'Revenue: low to high'],
    ['sales-desc', isEs ? 'Ventas: mayor a menor' : 'Sales: high to low'],
    ['sales-asc', isEs ? 'Ventas: menor a mayor' : 'Sales: low to high'],
    ['date-desc', isEs ? 'Más reciente primero' : 'Newest first'],
    ['date-asc', isEs ? 'Más antiguo primero' : 'Oldest first'],
    ['title-asc', isEs ? 'Título: A → Z' : 'Title: A → Z'],
  ];
  const sortAssets = (list) => {
    const arr = [...list];
    const num = (x, k) => Number(x[k] || 0);
    switch (sortBy) {
      case 'revenue-asc': return arr.sort((a, b) => num(a, 'revenue') - num(b, 'revenue'));
      case 'sales-desc': return arr.sort((a, b) => num(b, 'sales_count') - num(a, 'sales_count'));
      case 'sales-asc': return arr.sort((a, b) => num(a, 'sales_count') - num(b, 'sales_count'));
      case 'date-desc': return arr.sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || ''));
      case 'date-asc': return arr.sort((a, b) => (a.deliver_date || '').localeCompare(b.deliver_date || ''));
      case 'title-asc': return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'revenue-desc':
      default: return arr.sort((a, b) => num(b, 'revenue') - num(a, 'revenue'));
    }
  };
  // Desglose de ingresos — qué piezas vendieron (ordenable, por defecto de más a menos).
  const revenueBreakdown = sortAssets(rangeAssets.filter((a) => Number(a.revenue) > 0 || (a.sales_count || 0) > 0));
  const rangePhotos = sortAssets(rangeAssets.filter((a) => a.type !== 'video'));
  const rangeVideos = sortAssets(rangeAssets.filter((a) => a.type === 'video'));
  // Dropdown de orden reutilizable en las listas de Números.
  const sortSelect = () => (
    <div className="relative shrink-0">
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
        className="appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-8 text-[11px] font-semibold text-paper-mute outline-none transition-colors focus:border-brand/60">
        {SORT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
    </div>
  );
  // Barra de rango reutilizable (chips + navegador de mes / rango de fechas).
  const rangeBar = () => (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {[['week', isEs ? '7 días' : '7 days'], ['month', isEs ? 'Este mes' : 'This month'], ['all', isEs ? 'Todo' : 'All'], ['custom', isEs ? 'Rango' : 'Range']].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${range === v ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
            {v === 'custom' && <CalendarRange size={13} />}{l}
          </button>
        ))}
        {range === 'month' && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setMonth(shiftYm(month, -1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronLeft size={15} /></button>
            <span className="min-w-[130px] text-center text-sm font-semibold">{ymLabel(month, locale)}</span>
            <button onClick={() => setMonth(shiftYm(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>
      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
          <span className="text-[11px] font-medium text-paper-dim">{isEs ? 'Desde' : 'From'}</span>
          <input type="date" value={customFrom} max={customTo || todayISO} onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-xs text-paper outline-none [color-scheme:dark] focus:border-brand/60" />
          <span className="text-[11px] font-medium text-paper-dim">{isEs ? 'Hasta' : 'To'}</span>
          <input type="date" value={customTo} min={customFrom || undefined} max={todayISO} onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-xs text-paper outline-none [color-scheme:dark] focus:border-brand/60" />
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(''); setCustomTo(''); }}
              className="ml-1 rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-paper-dim transition-colors hover:border-brand/40 hover:text-paper">{isEs ? 'Limpiar' : 'Clear'}</button>
          )}
        </div>
      )}
    </div>
  );
  const NAV = [
    { id: 'numeros', label: isEs ? 'Números' : 'Numbers', icon: DollarSign },
    { id: 'contenido', label: isEs ? 'Contenido' : 'Content', icon: Images },
    { id: 'activity', label: t.panel.navActivity, icon: Activity },
    { id: 'requests', label: t.panel.navRequests, icon: Inbox },
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      {readOnly && (
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-amber-200">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium">
            <Eye size={15} /> {isEs ? <>Vista del equipo — estás viendo el panel de <b className="text-amber-100">{viewAs?.name}</b> tal como ella lo ve. Solo lectura.</> : <>Team view — you're seeing <b className="text-amber-100">{viewAs?.name}</b>'s panel exactly as she sees it. Read-only.</>}
          </span>
          <button onClick={() => { if (window.history.length > 1) window.close(); if (!window.closed) router.push('/admin'); }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/15">
            <X size={13} /> {isEs ? 'Cerrar vista' : 'Close view'}
          </button>
        </div>
      )}
      {!readOnly && (
      <WelcomeTour storageKey="ls_tour_creator_v1" steps={[
        { eyebrow: 'Bienvenida', title: 'Te damos la bienvenida', body: 'Aquí recibes tu contenido listo para vender, cada día. Te mostramos lo básico en 20 segundos.' },
        { eyebrow: 'Calendario', title: 'Tu calendario', body: 'Los días que tu equipo sube contenido quedan marcados. Toca un día para ver y descargar lo de esa fecha.' },
        { eyebrow: 'Galería', title: 'Toda tu galería', body: 'Todo tu contenido en un solo lugar, listo para descargar y vender donde quieras.' },
        { eyebrow: 'Pedidos', title: 'Pide lo que necesites', body: '¿Quieres un set específico? Crea un pedido y tu equipo lo produce por ti.' },
      ]} />
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3"><Logo size="sm" /><span className="hidden text-sm text-paper-dim sm:inline">· {(lang || 'es').startsWith('es') ? 'Tu portal' : 'Your portal'}</span></div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-paper-mute md:inline">{t.panel.hello} {state.profile?.full_name || t.panel.creator}</span>
            <LangToggle />
            <div className="relative">
              <button onClick={openBell} aria-label={t.panel.notifications} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                <Bell size={16} />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-accent">{unread}</span>}
              </button>
              {bellOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setBellOpen(false)} aria-hidden />
                  <div className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-card shadow-glow-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[23rem] sm:max-w-[calc(100vw-2rem)]">
                    <div className="flex items-center justify-between gap-2 border-b border-line bg-ink-2/40 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-paper"><Bell size={15} className="text-brand" /> {t.panel.notifications}</span>
                      {justUnread.length > 0 && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">{justUnread.length} {isEs ? 'nuevas' : 'new'}</span>}
                    </div>
                    <div className="max-h-[24rem] overflow-y-auto">
                      {notifs.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-ink-2 text-paper-dim"><BellOff size={19} /></span>
                          <p className="mt-3 text-sm text-paper-dim">{t.panel.notifEmpty}</p>
                        </div>
                      ) : notifs.map((n) => {
                        const meta = NOTIF_META[n.kind] || NOTIF_META.default;
                        const fresh = justUnread.includes(n.id);
                        const full = notifText(t, n);
                        const sep = n.kind === 'request_msg' ? full.indexOf(': ') : -1;
                        const sender = sep > -1 ? full.slice(0, sep) : null;
                        const body = sep > -1 ? full.slice(sep + 2) : full;
                        return (
                          <div key={n.id} className={`flex items-start gap-2.5 border-b border-line px-3.5 py-2.5 transition-colors last:border-0 hover:bg-ink-2/40 ${fresh ? 'bg-brand/[0.04]' : ''}`}>
                            <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${meta.cls}`}><meta.icon size={13} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] leading-[1.35] text-paper-mute">
                                {sender && <span className="font-semibold text-paper">{sender}: </span>}{body}
                              </p>
                              <p className="mt-0.5 text-[10.5px] text-paper-dim">{new Date(n.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                            </div>
                            {fresh && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Link href="/cuenta" aria-label={t.panel.myAccount} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><User size={16} /></Link>
            {readOnly
              ? <button onClick={() => { window.close(); if (!window.closed) router.push('/admin'); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><X size={15} /> <span className="hidden sm:inline">{isEs ? 'Cerrar' : 'Close'}</span></button>
              : <button onClick={async () => { await signOut(); router.replace('/login'); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><LogOut size={15} /> <span className="hidden sm:inline">{t.common.exit}</span></button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center gap-4">
          <Avatar src={state.profile?.avatar_url} name={state.profile?.stage_name || state.profile?.full_name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.panel.hello} {(state.profile?.stage_name || state.profile?.full_name || '').split(' ')[0]}</h1>
            {state.profile?.handle && <p className="text-sm text-paper-dim">@{state.profile.handle}</p>}
            <p className="mt-1 text-sm text-paper-mute">{t.panel.greeting}</p>
            {agency && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-paper-dim">
                <Building2 size={12} className="text-brand" /> {t.panel.managedBy} <span className="font-medium text-paper-mute">{agency}</span>
                {!readOnly && !leaveReq && (
                  <button onClick={() => setLeaveModal(true)} className="ml-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-paper-dim transition-colors hover:border-rose-500/40 hover:text-rose-300">
                    {t.panel.leaveAgency}
                  </button>
                )}
                {!readOnly && leaveReq?.status === 'pending' && (
                  <>
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Clock size={10} /> {isEs ? 'Salida pendiente' : 'Leave pending'}
                    </span>
                    <button onClick={leaveAnyway} disabled={leaveBusy} className="rounded-full border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50">
                      {isEs ? 'Salir de todos modos' : 'Leave anyway'}
                    </button>
                    <button onClick={cancelLeaveRequest} disabled={leaveBusy} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-paper-dim transition-colors hover:text-paper disabled:opacity-50">
                      {isEs ? 'Cancelar' : 'Cancel'}
                    </button>
                  </>
                )}
                {!readOnly && leaveReq?.status === 'rejected' && (
                  <>
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      {isEs ? 'La agencia rechazó' : 'Agency declined'}
                    </span>
                    <button onClick={leaveAnyway} disabled={leaveBusy} className="rounded-full border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50">
                      {isEs ? 'Salir de todos modos' : 'Leave anyway'}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-card p-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${view === n.id ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
              <n.icon size={15} /> {n.label}
              {n.id === 'requests' && requests.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${view === n.id ? 'bg-on-accent/20' : 'bg-brand/15 text-brand'}`}>{requests.length}</span>}
            </button>
          ))}
        </div>

        {/* ── Números: dashboard del mes + desglose de ingresos ── */}
        {view === 'numeros' && (
          <div className="mt-6">
            <MomentumBand weekly={weekly} locale={locale} isEs={isEs} />
            {rangeBar()}
            {/* Cards = selector: cada una abre su detalle abajo */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'photos', icon: ImageIcon, label: t.panel.mPhotos, value: nf(acc.photos) },
                { id: 'videos', icon: Film, label: t.panel.mVideos, value: nf(acc.videos) },
                { id: 'revenue', icon: DollarSign, label: t.panel.mRevenue, value: money(acc.revenue) },
              ].map((k) => {
                const on = numCard === k.id;
                return (
                  <button key={k.id} onClick={() => setNumCard(k.id)}
                    className={`rounded-2xl border p-3.5 text-center transition-colors sm:text-left ${on ? 'border-brand/60 bg-brand/[0.08] shadow-glow-sm' : 'border-line bg-card hover:border-brand/40'}`}>
                    <div className="flex items-center justify-center gap-1.5 text-paper-dim sm:justify-start"><k.icon size={13} className={on ? 'text-brand' : 'text-brand'} /><span className="text-[11px] font-medium">{k.label}</span></div>
                    <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{k.value}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-paper-dim">{t.panel.statsNote} · {rangeLabel}</p>

            {/* Detalle del card seleccionado */}
            <div className="mt-6">
              {numCard === 'revenue' && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{isEs ? 'Ingresos · qué se vendió' : 'Revenue · what sold'}</span>
                    {revenueBreakdown.length > 1 && sortSelect()}
                  </div>
                  {revenueBreakdown.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">{isEs ? 'Sin ventas en este rango.' : 'No sales in this range.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {revenueBreakdown.map((a) => (
                        <button key={a.id} onClick={() => setDetail(a)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-card p-2.5 text-left transition-colors hover:border-brand/40">
                          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2">
                            <MediaThumb asset={a} src={srcFor(a)} className="h-full w-full object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-paper">{a.title || (isEs ? 'Pieza' : 'Piece')}</span>
                            <span className="block text-[11px] text-paper-dim">{a.deliver_date ? new Date(a.deliver_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''} · {nf(a.sales_count || 0)} {isEs ? 'ventas' : 'sales'}</span>
                          </span>
                          <span className="shrink-0 font-display text-sm font-bold text-brand">{money(a.revenue)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {(numCard === 'photos' || numCard === 'videos') && (() => {
                const list = numCard === 'photos' ? rangePhotos : rangeVideos;
                return (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{numCard === 'photos' ? (isEs ? 'Fotos' : 'Photos') : (isEs ? 'Videos' : 'Videos')} · {list.length}</span>
                      {list.length > 1 && sortSelect()}
                    </div>
                    {list.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">{isEs ? 'Nada en este rango.' : 'Nothing in this range.'}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {list.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} folder={state.folders[a.folder_id]} onOpen={setDetail} feedback={myFeedback[a.id]} selectMode={selectMode} isSelected={selected.has(a.id)} onToggle={toggleSel} />)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Contenido: calendario de entregas por día ── */}
        {view === 'contenido' && (() => {
          const allVisible = groups.flatMap((g) => g.items);
          const allIds = allVisible.map((a) => a.id);
          // Agrupar por carpeta (situación) para la vista «Carpetas» — le da a la
          // creadora el mismo orden por carpetas que ve el equipo interno.
          const folderGroups = (() => {
            const map = new Map();
            allVisible.forEach((a) => {
              const key = a.folder_id || '__none__';
              if (!map.has(key)) map.set(key, { id: key, name: state.folders[a.folder_id] || (isEs ? 'General' : 'General'), items: [] });
              map.get(key).items.push(a);
            });
            return [...map.values()].sort((x, y) => x.name.localeCompare(y.name, locale, { numeric: true }));
          })();
          // Subcarpetas por convención de nombre: «Padre / Hijo» se anida bajo
          // un encabezado «Padre». Sin esquema nuevo — solo el nombre manda.
          const splitFolderName = (name) => {
            const parts = String(name).split(/\s*\/\s*/);
            return parts.length > 1 ? { parent: parts[0], child: parts.slice(1).join(' / ') } : { parent: null, child: name };
          };
          const folderSections = (() => {
            const secs = []; const byParent = new Map();
            folderGroups.forEach((g) => {
              const { parent, child } = splitFolderName(g.name);
              const folder = { ...g, displayName: child };
              if (parent) {
                if (!byParent.has(parent)) { const s = { parent, folders: [] }; byParent.set(parent, s); secs.push(s); }
                byParent.get(parent).folders.push(folder);
              } else {
                secs.push({ parent: null, folders: [folder] });
              }
            });
            return secs;
          })();
          const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
          const selectAll = () => setSelected(new Set(allIds));
          async function downloadSelected() {
            const chosen = allVisible.filter((a) => selected.has(a.id));
            if (!chosen.length) return;
            setBulkDownloading(true);
            downloadMany(chosen);
            // Deja que arranquen todas las descargas antes de bajar el spinner.
            setTimeout(() => setBulkDownloading(false), Math.max(400, chosen.length * 350));
            exitSelect();
          }
          return (
          <div className="mt-6">
            {rangeBar()}

            {/* Barra de acción: toggle Galería/Entregas + Select (Select SOLO en Galería) */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-paper-dim">
                {contentLayout === 'grid'
                  ? (isEs ? 'Toca «Seleccionar» para marcar varias y bajarlas juntas.' : 'Tap “Select” to mark several and download them together.')
                  : contentLayout === 'folders'
                  ? (isEs ? 'Cada carpeta tiene su «Descargar todo».' : 'Each folder has its own “Download all”.')
                  : (isEs ? 'Cada entrega tiene su «Descargar todo».' : 'Each delivery has its own “Download all”.')}
              </p>
              <div className="flex items-center gap-2">
                {/* Toggle Galería | Entregas */}
                {!selectMode && allIds.length > 0 && (
                  <div className="inline-flex items-center rounded-full border border-line bg-ink-2 p-0.5 text-[11px] font-semibold">
                    {[
                      { k: 'grid', l: isEs ? 'Galería' : 'Gallery' },
                      { k: 'folders', l: isEs ? 'Carpetas' : 'Folders' },
                      { k: 'days', l: isEs ? 'Entregas' : 'Deliveries' },
                    ].map((t) => {
                      const on = contentLayout === t.k;
                      return (
                        <button key={t.k} onClick={() => setContentLayout(t.k)}
                          className={`rounded-full px-3 py-1 transition-colors ${on ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:text-paper'}`}>
                          {t.l}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Select — SOLO en Galería (en Entregas cada día tiene Download all) */}
                {contentLayout === 'grid' && (!selectMode ? (
                  <button onClick={() => setSelectMode(true)} disabled={allIds.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40">
                    <Check size={13} /> {isEs ? 'Seleccionar' : 'Select'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={allSelected ? clearSel : selectAll}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                      {allSelected ? (isEs ? 'Quitar todas' : 'Deselect all') : (isEs ? `Seleccionar todas (${allIds.length})` : `Select all (${allIds.length})`)}
                    </button>
                    <button onClick={exitSelect} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper">
                      {isEs ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra sticky: cuenta y botón Descargar cuando hay selección */}
            {selectMode && selected.size > 0 && (
              <div className="sticky top-2 z-30 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/50 bg-brand/10 px-3 py-2 backdrop-blur">
                <span className="text-sm font-semibold text-brand">
                  {selected.size} {selected.size === 1 ? (isEs ? 'seleccionada' : 'selected') : (isEs ? 'seleccionadas' : 'selected')}
                </span>
                <button onClick={downloadSelected} disabled={bulkDownloading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:brightness-110 disabled:opacity-60">
                  <Download size={13} /> {isEs ? `Descargar ${selected.size}` : `Download ${selected.size}`}
                </button>
              </div>
            )}

            {allVisible.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.emptyMonth}</p>
            ) : contentLayout === 'grid' ? (
              /* Vista GRID pura como Fotos de Mac: TODAS las piezas en un solo
                 grid, sin separadores por día. Orden: lo último subido primero. */
              <div className="mt-6 grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {allVisible.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} folder={state.folders[a.folder_id]} onOpen={setDetail} feedback={myFeedback[a.id]} selectMode={selectMode} isSelected={selected.has(a.id)} onToggle={toggleSel} bare locale={locale} />)}
              </div>
            ) : contentLayout === 'folders' ? (
              /* Vista CARPETAS: una cajita por carpeta (situación), colapsable.
                 Las «Padre / Hijo» se anidan bajo un encabezado del padre. */
              <div className="mt-6 space-y-5">
                {folderSections.map((sec) => (
                  <div key={sec.parent || sec.folders[0].id}>
                    {sec.parent && (
                      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">
                        <Images size={13} className="text-brand" /> {sec.parent}
                        <span className="text-paper-dim/60">· {sec.folders.reduce((s, f) => s + f.items.length, 0)}</span>
                      </div>
                    )}
                    <div className={`space-y-3 ${sec.parent ? 'border-l border-line pl-3' : ''}`}>
                      {sec.folders.map((g) => {
                        const open = openFolders.includes(g.id);
                        const cover = g.items[0];
                        const label = `${g.items.length} ${g.items.length === 1 ? t.panel.mPhotos.slice(0, -1).toLowerCase() : t.panel.mPhotos.toLowerCase()}`;
                        return (
                          <div key={g.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                            <div className="flex items-center gap-3 p-3">
                              <button onClick={() => setOpenFolders((d) => open ? d.filter((x) => x !== g.id) : [...d, g.id])}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <span className="relative h-16 w-16 shrink-0">
                                  <span className="absolute -right-1 -top-1 h-full w-full rounded-xl border border-line bg-ink-2" aria-hidden />
                                  <span className="relative block h-16 w-16 overflow-hidden rounded-xl border border-line">
                                    <MediaThumb asset={cover} src={srcFor(cover)} className="h-full w-full object-cover" />
                                    <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-bold text-paper">{g.items.length}</span>
                                  </span>
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-paper">{!sec.parent && <Images size={14} className="shrink-0 text-brand" />} {g.displayName}</span>
                                  <span className="mt-0.5 block text-xs text-paper-dim">{label} · {open ? (t.panel.tapClose || (isEs ? 'toca para cerrar' : 'tap to close')) : (t.panel.tapOpen || (isEs ? 'toca para ver' : 'tap to view'))}</span>
                                </span>
                              </button>
                              {!selectMode && (
                                <button onClick={() => downloadMany(g.items)} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:inline-flex"><Download size={13} /> {t.panel.downloadAll}</button>
                              )}
                              <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`} />
                            </div>
                            {open && (
                              <div className="border-t border-line p-3">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                  {g.items.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} folder={g.name} onOpen={setDetail} feedback={myFeedback[a.id]} selectMode={selectMode} isSelected={selected.has(a.id)} onToggle={toggleSel} />)}
                                </div>
                                {!selectMode && (
                                  <button onClick={() => downloadMany(g.items)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:hidden"><Download size={13} /> {t.panel.downloadAll}</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vista DÍAS: cajitas colapsables — portada + fecha + Download
                 all + chevron. Layout anterior para quien lo prefiera. */
              <div className="mt-6 space-y-3">
                {groups.map((g) => {
                  const open = openDays.includes(g.date);
                  const cover = g.items[0];
                  const label = `${g.items.length} ${g.items.length === 1 ? t.panel.mPhotos.slice(0, -1).toLowerCase() : t.panel.mPhotos.toLowerCase()}`;
                  return (
                    <div key={g.date} className="overflow-hidden rounded-2xl border border-line bg-card">
                      <div className="flex items-center gap-3 p-3">
                        <button onClick={() => setOpenDays((d) => open ? d.filter((x) => x !== g.date) : [...d, g.date])}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span className="relative h-16 w-16 shrink-0">
                            <span className="absolute -right-1 -top-1 h-full w-full rounded-xl border border-line bg-ink-2" aria-hidden />
                            <span className="relative block h-16 w-16 overflow-hidden rounded-xl border border-line">
                              <MediaThumb asset={cover} src={srcFor(cover)} className="h-full w-full object-cover" />
                              <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-bold text-paper">{g.items.length}</span>
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-paper"><Sparkles size={14} className="text-brand" /> {fmtDay(g.date)}</span>
                            <span className="mt-0.5 block text-xs text-paper-dim">{label} · {open ? (t.panel.tapClose || (isEs ? 'toca para cerrar' : 'tap to close')) : (t.panel.tapOpen || (isEs ? 'toca para ver' : 'tap to view'))}</span>
                          </span>
                        </button>
                        {!selectMode && (
                          <button onClick={() => downloadMany(g.items)} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:inline-flex"><Download size={13} /> {t.panel.downloadAll}</button>
                        )}
                        <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                      {open && (
                        <div className="border-t border-line p-3">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {g.items.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} folder={state.folders[a.folder_id]} onOpen={setDetail} feedback={myFeedback[a.id]} selectMode={selectMode} isSelected={selected.has(a.id)} onToggle={toggleSel} />)}
                          </div>
                          {!selectMode && (
                            <button onClick={() => downloadMany(g.items)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:hidden"><Download size={13} /> {t.panel.downloadAll}</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {state.profile?.id && !readOnly && (
              <details className="mt-10 rounded-2xl border border-line bg-card p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-paper-mute"><UserPlus size={15} className="text-brand" /> {t.panel.addClonePhotos}</summary>
                <div className="mt-4"><LoraUploader userId={state.profile.id} compact /></div>
              </details>
            )}
          </div>
          );
        })()}

        {view === 'activity' && (
          <div className="mt-6">
            {notesFeed.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.activityEmpty}</p>
            ) : (
              <div className="relative space-y-3 before:absolute before:left-[27px] before:top-3 before:bottom-3 before:w-px before:bg-line">
                {notesFeed.map((n) => (
                  <button key={n.id} onClick={() => setDetail(n.asset)} className="group relative flex w-full items-start gap-3 rounded-2xl border border-line bg-card p-3 text-left transition-colors hover:border-brand/40">
                    <div className="relative z-10 h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
                      <MediaThumb asset={n.asset} src={srcFor(n.asset)} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-paper">{n.note}</p>
                      <p className="mt-1 text-[11px] text-paper-dim">
                        <span className="text-paper-mute">{n.asset.title}</span> · {new Date(n.note_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}{n.author_name ? ` · ${n.author_name}` : ''}{n.author_handle ? ` · @${n.author_handle}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'requests' && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-paper-mute">{t.panel.requests}</p>
              {!readOnly && <button onClick={() => setReqOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"><Plus size={15} /> {t.panel.askContent}</button>}
            </div>
            {reqOpen && !readOnly && <RequestForm t={t} onSubmit={createRequest} />}
            <div className="mt-4 space-y-2.5">
              {requests.length === 0 && !reqOpen && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.reqEmpty}</p>}
              {requests.map((r) => {
                const st = r.status === 'delivered' ? { l: t.panel.reqDelivered, cls: 'border-brand/40 bg-brand/10 text-brand' }
                  : r.status === 'in_progress' ? { l: t.panel.reqProgress, cls: 'border-sky/40 bg-sky/10 text-sky' }
                  : { l: t.panel.reqPending, cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
                return (
                  <div key={r.id} className="rounded-2xl border border-line bg-card px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-paper">{r.title}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-paper-dim">{r.chatter_id === state.profile.id ? (isEs ? 'Lo pediste tú' : 'Requested by you') : (isEs ? 'Pedido por tu agencia' : 'Requested by your agency')}</p>
                        {r.description && <p className="mt-0.5 text-xs text-paper-dim">{r.description}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${st.cls}`}>{st.l}</span>
                    </div>
                    <CreatorReqThread req={r} t={t} locale={locale} onSent={refresh} flash={flash} readOnly={readOnly} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {detail && <AssetDetail asset={detail} src={srcFor(detail)} dl={dlFor(detail)} t={t} locale={locale} folderName={state.folders[detail.folder_id]} feedback={myFeedback[detail.id]} onClose={() => setDetail(null)} onFeedback={sendFeedback} />}

      {/* Pop-up: pedir salir de la agencia (crea una solicitud, no sale al toque) */}
      {leaveModal && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !leaveBusy && setLeaveModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-ink p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500/15 text-rose-300"><Building2 size={17} /></span>
              <h3 className="font-display text-lg font-semibold text-paper">{isEs ? 'Salir de la agencia' : 'Leave the agency'}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-paper-mute">
              {isEs
                ? <>Se le enviará una solicitud a <span className="font-semibold text-paper">{agency}</span>. Si la acepta, sales de una. Si la rechaza o no responde, podrás salir de todos modos.</>
                : <>A request will be sent to <span className="font-semibold text-paper">{agency}</span>. If they accept, you leave right away. If they decline or don’t respond, you can still leave anyway.</>}
            </p>
            <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-paper-dim">{isEs ? 'Motivo (opcional)' : 'Reason (optional)'}</label>
            <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={2} placeholder={isEs ? 'Ej. me voy por mi cuenta' : 'e.g. going independent'}
              className="mt-1 w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setLeaveModal(false)} disabled={leaveBusy} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-paper-mute hover:text-paper disabled:opacity-50">{isEs ? 'Cancelar' : 'Cancel'}</button>
              <button onClick={submitLeaveRequest} disabled={leaveBusy} className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60">
                {leaveBusy && <Loader2 size={14} className="animate-spin" />} {isEs ? 'Enviar solicitud' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">{toast}</div>}
    </div>
  );
}

// Request thread: team questions land here (and at her agency); she replies.
function CreatorReqThread({ req, t, locale, onSent, flash, readOnly }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const n = req._msgs?.length || 0;
  if (!n && req.status === 'delivered') return null;

  async function send(e) {
    e.preventDefault();
    if (readOnly) return;
    if (!body.trim()) return;
    setSending(true);
    const { error } = await getSupabase().rpc('post_request_message', { rid: req.id, body_text: body.trim() });
    setSending(false);
    if (error) { flash(t.common.error); return; }
    setBody('');
    onSent?.();
  }

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper-mute transition-colors hover:text-paper">
        <MessageSquare size={11} className={n ? 'text-brand' : ''} />
        {t.panel.reqMsgTitle}{n ? ` · ${n}` : ''} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {(req._msgs || []).map((m) => (
            <div key={m.id} className={`rounded-lg border p-2 text-xs ${m.author_role === 'creator' ? 'border-brand/25 bg-brand/[0.05]' : 'border-line bg-ink-2'}`}>
              <div className="mb-0.5 text-[10px] text-paper-dim">
                <span className="font-semibold text-paper-mute">{(t.panel.reqMsgFrom || {})[m.author_role] || m.author_role}</span>
                {m.author_name ? ` · ${m.author_name}` : ''} · {new Date(m.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
              </div>
              <p className="text-paper-mute">{m.body}</p>
            </div>
          ))}
          {!readOnly && <form className="flex gap-2" onSubmit={send}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.panel.reqMsgPlaceholder}
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <button type="submit" disabled={sending || !body.trim()}
              className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-accent disabled:opacity-50">
              {sending ? '…' : t.panel.reqMsgSend}
            </button>
          </form>}
        </div>
      )}
    </div>
  );
}

// Banda de MOMENTUM: lo que la modelo ve para sentir que sube. Esta semana vs
// la pasada (ventas + ingresos + %), racha, y mini-gráfico de las últimas semanas.
function MomentumBand({ weekly, locale, isEs }) {
  if (!weekly || weekly.length === 0) return null;
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const nf = (n) => Number(n || 0).toLocaleString('en-US');
  const rows = [...weekly].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const cur = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  const delta = prev && prev.sales > 0 ? Math.round(((cur.sales - prev.sales) / prev.sales) * 100) : null;
  const up = delta === null ? true : delta >= 0;
  // Racha: cuántas semanas seguidas (hasta la actual) subió respecto a la anterior.
  let streak = 0;
  for (let i = rows.length - 1; i > 0; i--) { if (rows[i].sales >= rows[i - 1].sales) streak++; else break; }
  const bars = rows.slice(-8);
  const peak = Math.max(1, ...bars.map((b) => b.sales));
  const wLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString(locale || 'es-US', { day: 'numeric', month: 'short' });

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[0.10] to-transparent p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <Activity size={12} /> {isEs ? 'Tu momentum · esta semana' : 'Your momentum · this week'}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-paper">{nf(cur.sales)}</span>
            <span className="text-sm text-paper-mute">{isEs ? 'ventas' : 'sales'} · {money(cur.revenue)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            {delta !== null && (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{up ? '+' : ''}{delta}% {isEs ? 'vs la semana pasada' : 'vs last week'}
              </span>
            )}
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-semibold text-amber-300">
                🔥 {streak} {isEs ? 'semanas subiendo' : 'weeks up'}
              </span>
            )}
          </div>
        </div>
        {/* Mini-gráfico de barras — últimas 8 semanas */}
        <div className="flex h-16 items-end gap-1.5">
          {bars.map((b, i) => {
            const h = Math.max(8, Math.round((b.sales / peak) * 100));
            const isLast = i === bars.length - 1;
            return (
              <div key={b.week_start} className="group/bar relative flex flex-col items-center">
                <div className={`w-3 rounded-t sm:w-4 ${isLast ? 'bg-brand' : 'bg-brand/30'}`} style={{ height: `${h}%`, minHeight: 8 }}
                  title={`${wLabel(b.week_start)}: ${nf(b.sales)} ${isEs ? 'ventas' : 'sales'}`} />
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-paper-dim">
        {isEs ? 'Ventas que registró tu agencia, semana a semana. Mientras más enganche tu contenido, más sube.' : 'Sales your agency logged, week by week. The more your content hooks, the higher it climbs.'}
      </p>
    </div>
  );
}

function PhotoCard({ a, src, folder, onOpen, feedback, selectMode, isSelected, onToggle, bare, locale }) {
  // Fecha en que se subió (created_at; fallback a deliver_date), corta y discreta.
  const upDate = a.created_at ? new Date(a.created_at) : (a.deliver_date ? new Date(a.deliver_date + 'T00:00:00') : null);
  const upLabel = upDate ? upDate.toLocaleDateString(locale || 'es-US', { day: 'numeric', month: 'short' }) : null;
  // `bare` = modo «manejo de fotos» tipo Fotos de Mac: sin precios, sin título,
  // sin folder, sin bordes redondeados. Solo la miniatura pura.
  const handleClick = () => { selectMode ? onToggle?.(a.id) : onOpen(a); };
  return (
    <button onClick={handleClick}
      className={`group relative overflow-hidden text-left transition-all ${bare ? 'rounded-none border-0 bg-black' : 'rounded-xl border bg-card'} ${isSelected ? (bare ? 'ring-2 ring-brand' : 'border-brand ring-2 ring-brand/60') : (bare ? '' : 'border-line')}`}>
      <div className={`aspect-[3/4] w-full overflow-hidden ${isSelected ? 'scale-[0.97]' : ''}`}>
        <MediaThumb asset={a} src={src} className="h-full w-full object-cover"
          imgClassName="transition-transform duration-300 group-hover:scale-105" />
      </div>
      {/* Checkbox estilo iPhone — visible cuando el modo selección está activo */}
      {selectMode && (
        <span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border-2 backdrop-blur transition-all ${isSelected ? 'border-brand bg-brand text-on-accent' : 'border-white/70 bg-black/40 text-transparent'}`}>
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      {/* Modo bare (Galería): abajo-izquierda la fecha de subida, abajo-derecha el
          precio — ambos discretos, colores suaves, para no robar atención. */}
      {bare && !selectMode && (
        <>
          {upLabel && (
            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/75 backdrop-blur-sm">{upLabel}</span>
          )}
          {Number(a.revenue) > 0 && (
            <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-brand/90 backdrop-blur-sm">{money(a.revenue)}</span>
          )}
        </>
      )}
      {/* Metadatos (precios, título, folder) — SOLO en modo no-bare */}
      {!bare && (
        <>
          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
            {Number(a.revenue) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><DollarSign size={10} className="text-brand" /> {money(a.revenue)}</span>
            )}
            {feedback === 'love' && <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur"><Heart size={10} /> </span>}
            {feedback === 'change' && <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink backdrop-blur"><MessageSquarePlus size={10} /> </span>}
          </div>
          {(a.title || folder) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
              {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
              {folder && <p className="truncate text-[11px] text-paper-mute">{folder}</p>}
            </div>
          )}
        </>
      )}
    </button>
  );
}

function RequestForm({ t, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refFiles, setRefFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const refInput = useRef(null);
  const addFiles = (list) => setRefFiles((prev) => [...prev, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 6));

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); const ok = await onSubmit({ title, description, refFiles }); setSaving(false); if (ok) { setTitle(''); setDescription(''); setRefFiles([]); } }}
      className="mt-3 rounded-2xl border border-line bg-card p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.panel.reqWhat} className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t.panel.reqDetails} className="mt-2 w-full resize-none rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />

      <div className="mt-3">
        <label className="block text-[11px] font-medium uppercase tracking-wide text-paper-dim">{t.panel.reqRefs}</label>
        <p className="text-[11px] text-paper-dim">{t.panel.reqRefsHint}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {refFiles.map((f, i) => (
            <span key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setRefFiles((p) => p.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ink/80 text-paper"><X size={10} /></button>
            </span>
          ))}
          {refFiles.length < 6 && (
            <button type="button" onClick={() => refInput.current?.click()} className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-line text-paper-dim transition-colors hover:border-brand/50 hover:text-brand"><Plus size={18} /></button>
          )}
          <input ref={refInput} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      </div>

      <button type="submit" disabled={saving} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"><Send size={14} /> {saving ? t.common.saving : t.panel.reqSend}</button>
    </form>
  );
}

// Read-only photo detail: when delivered, how much it sold, who added it,
// the agency's notes journal (read-only), and the creator's own feedback.
function AssetDetail({ asset, src, dl, t, locale, folderName, feedback, onClose, onFeedback }) {
  const [notes, setNotes] = useState([]);
  const [zoom, setZoom] = useState(false);
  const isEs = (locale || 'es').startsWith('es');
  useEffect(() => { (async () => { const { data } = await getSupabase().from('asset_notes').select('id, note, note_date, author_name, author_handle, author_email').eq('asset_id', asset.id).order('note_date', { ascending: false }).order('created_at', { ascending: false }); setNotes(data || []); })(); }, [asset.id]);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label={t.panel.close} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand"><X size={18} /></button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="group relative bg-ink">
            {asset.type === 'video'
              ? <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" controls autoPlay loop playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={src} alt={asset.title || ''} onClick={() => setZoom(true)} className="h-full max-h-[46vh] w-full cursor-zoom-in object-contain md:max-h-[85vh]" />}
            {/* Ampliar a pantalla completa — para foto y video */}
            <button onClick={() => setZoom(true)} aria-label={isEs ? 'Ampliar' : 'Enlarge'}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100">
              <Maximize2 size={13} /> {isEs ? 'Ampliar' : 'Enlarge'}
            </button>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[85vh]">
            <div>
              {asset.title && <h3 className="font-display text-xl font-semibold text-paper">{asset.title}</h3>}
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper-dim">
                {asset.deliver_date && <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-brand" /> {t.panel.deliveredOn} {fmtDate(asset.deliver_date)}</span>}
                {folderName && <span>· {folderName}</span>}
              </div>
              {asset.added_by && <p className="mt-1 flex items-center gap-1 text-xs text-paper-dim"><UserPlus size={12} className="text-brand" /> {t.panel.addedBy} <span className="text-paper-mute">{asset.added_by}</span></p>}
            </div>

            {/* Sold (read-only) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line bg-ink-2 p-3">
                <div className="flex items-center gap-1.5 text-paper-dim"><ShoppingBag size={12} className="text-brand" /><span className="text-[10px] font-medium uppercase tracking-wide">{t.panel.sold}</span></div>
                <div className="mt-0.5 font-display text-lg font-semibold text-paper">{nf(asset.sales_count)}</div>
              </div>
              <div className="rounded-xl border border-line bg-ink-2 p-3">
                <div className="flex items-center gap-1.5 text-paper-dim"><DollarSign size={12} className="text-brand" /><span className="text-[10px] font-medium uppercase tracking-wide">{t.panel.mRevenue}</span></div>
                <div className="mt-0.5 font-display text-lg font-semibold text-paper">{money(asset.revenue)}</div>
              </div>
            </div>

            {/* Purpose */}
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} /> {t.panel.why}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || t.panel.noPurpose}</p>
            </div>

            {/* Agency notes journal (read-only) */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim"><NotebookPen size={12} className="text-brand" /> {t.panel.notesTitle}</div>
              {notes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-paper-dim">{t.panel.notesEmpty}</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-xl border border-line bg-ink-2 p-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{initials(n.author_name)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-paper">{n.author_name || t.panel.managedBy}{n.author_handle ? <span className="font-normal text-paper-dim"> · @{n.author_handle}</span> : null}</span>
                          {n.author_email && <span className="block truncate text-[10px] text-paper-dim">{n.author_email}</span>}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-paper-dim">{fmtDate(n.note_date)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-snug text-paper">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Her feedback — reflects the current state; the team is notified */}
            <div className="mt-auto border-t border-line pt-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onFeedback(asset, 'love')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${feedback === 'love' ? 'border-rose-400/50 bg-rose-500/15 text-rose-300' : 'border-line text-paper-mute hover:border-brand/40 hover:text-brand'}`}>
                  <Heart size={14} fill={feedback === 'love' ? 'currentColor' : 'none'} /> {feedback === 'love' ? (t.panel.fbLovedShort || 'Te encantó') : t.panel.love}
                </button>
                <button onClick={() => onFeedback(asset, 'change')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${feedback === 'change' ? 'border-amber-400/50 bg-amber-500/15 text-amber-300' : 'border-line text-paper-mute hover:border-brand/40 hover:text-brand'}`}>
                  <MessageSquarePlus size={14} /> {feedback === 'change' ? (t.panel.fbChangeShort || 'Cambio pedido') : t.panel.change}
                </button>
                <a href={dl || src} download rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Download size={14} /> {t.panel.download}</a>
              </div>
              {feedback && <p className="mt-2 text-[11px] text-paper-dim">{feedback === 'love' ? (t.panel.fbLoved || 'Le dijiste al equipo que te encantó.') : (t.panel.fbChange || 'Pediste un cambio — el equipo ya lo sabe.')}</p>}
            </div>
          </div>
        </div>
      </div>
      {/* Zoom a pantalla completa (read-only para la creadora) */}
      {zoom && <MediaLightbox asset={asset} src={src} onClose={() => setZoom(false)} />}
    </div>
  );
}
