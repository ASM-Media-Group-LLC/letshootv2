'use client';

// Staff workspace (internal — Spanish).
// Roles: admin/supervisor → Creadoras (subir entregas + ver LoRA) · Pedidos · Feedback.
//        chatter → Pedidos only (creates requests for assigned creators).
// Privacy: staff only ever sees stage names via the team_creators() RPC.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Users, Inbox, MessageSquare, Folder, FolderPlus, Upload, Loader2,
  Check, RefreshCw, Sparkles, ChevronRight, ShieldCheck, X, Download,
  BarChart3, UserCog, Plus, UserPlus, Clock, Search, ArrowLeft,
  ImageIcon, DollarSign, Building2, Film, ShoppingBag, TrendingUp, TrendingDown,
  CreditCard, ListChecks, ChevronDown,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
import { sumCents, moneyCents } from '@/lib/money';
import { CAPS, CAP_SECTIONS, ALL_CAP_VALUES } from '@/lib/caps';
import { PACKS } from '@/lib/packs';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';
import ReactionsDashboard from '@/components/ReactionsDashboard';
import WelcomeTour from '@/components/WelcomeTour';

const ROLE_LABEL = { admin: 'Dueño', supervisor: 'Equipo', producer: 'Equipo', chatter: 'Equipo' };

// LoRA training set: house minimum 50 photos, up to 80. Category labels +
// numbered slugs so the bulk download lands organized for Higgsfield.
const LORA_MIN = 50;
const LORA_MAX = 80;
const LORA_CATS = {
  front: { label: 'Rostro de frente', slug: '01-rostro-frente' },
  left: { label: 'Ángulo 3/4', slug: '02-angulo-3-4' },
  right: { label: 'Perfil', slug: '03-perfil' },
  expression: { label: 'Expresiones', slug: '04-expresiones' },
  half: { label: 'Medio cuerpo', slug: '05-medio-cuerpo' },
  body: { label: 'Cuerpo (vestida)', slug: '06-cuerpo-vestida' },
  bikini: { label: 'Bikini', slug: '07-bikini' },
  hands: { label: 'Manos', slug: '08-manos' },
  feet: { label: 'Pies', slug: '09-pies' },
  other: { label: 'Tatuajes y marcas', slug: '10-marcas' },
  nude: { label: 'Sin ropa', slug: '11-sin-ropa' },
  face: { label: 'Rostro', slug: '00-rostro' },
};
// Estados del pedido — el mismo lenguaje en las tres experiencias:
// la modelo/agencia lo manda (Enviado) → el equipo lo toma (En proceso) → Completado.
const REQ_STATUS = {
  pending: { l: 'Enviado', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  in_progress: { l: 'En proceso', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  delivered: { l: 'Completado', cls: 'border-brand/40 bg-brand/10 text-brand' },
};
const MSG_FROM = { team: 'Equipo LetShoot', creator: 'Modelo', agency: 'Agencia' };
const OB_LABEL = {
  registered: 'Registrada', info: 'Falta ID', id_pending: 'ID en revisión',
  id_rejected: 'ID rechazado', id_approved: 'Falta pago', authorized: 'Falta pago',
  paid: 'Activa', active: 'Activa',
};
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }

export default function TrabajoPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState(null);       // null = todo cerrado; se abre al tocar una tarjeta
  const [creators, setCreators] = useState([]);
  const [staff, setStaff] = useState([]);
  const [counts, setCounts] = useState(null); // números reales de las tarjetas
  const [reqRows, setReqRows] = useState([]); // pedidos (filas) para la Cola del día
  const [fbRows, setFbRows] = useState([]);   // feedback (filas) para la Cola del día
  const [mine, setMine] = useState([]);       // piezas subidas por MÍ (Mi producción)
  const [focusCreator, setFocusCreator] = useState(null); // deep-link: abrir la biblioteca de una creadora
  const [colaOpen, setColaOpen] = useState(false); // Cola del día: viene colapsada, el usuario la extiende
  const [colaSeen, setColaSeen] = useState(false); // ¿ya abrió la cola en ESTA visita? (para dejar de palpitar)
  const [books, setBooks] = useState(null);   // números de empresa (producción/agencias)
  const [agencies, setAgencies] = useState([]); // agencias + sus modelos (acceso 'agencies')
  const [billRows, setBillRows] = useState([]); // creadoras con estado de suscripción (acceso 'billing')
  const [ms, setMs] = useState(null);         // resumen del libro Manual Sales (centavos exactos)
  const [reqPing, setReqPing] = useState(0); // bumps when a new request notification arrives
  const [toast, setToast] = useState('');
  const meRef = useRef(null);

  // Only the admin has every function; other staff have exactly the functions
  // assigned to their puesto. Requests come from the agency/creator — the
  // internal team receives and fulfills them.
  const ALL_CAPS = ALL_CAP_VALUES;
  const caps = !me ? [] : (me.role === 'admin' ? ALL_CAPS : (me.capabilities || []));
  const can = (c) => caps.includes(c);

  // One load for everything the cards summarize, guarded by the puesto's caps.
  const load = useCallback(async () => {
    const profile = meRef.current;
    if (!profile) return;
    const supabase = getSupabase();
    const pcaps = profile.role === 'admin'
      ? ['datos', 'kyc', 'add_creators', 'content', 'requests', 'feedback', 'metrics', 'agencies', 'billing', 'team']
      : (profile.capabilities || []);
    const monthKey = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const [{ data: cr }, { data: st }, rq, fb, bk, sales, myAssets, ag, bl] = await Promise.all([
      supabase.rpc('team_creators'),
      supabase.rpc('team_staff'),
      pcaps.includes('requests') ? supabase.from('requests').select('id, status, title, creator_id, created_at, producer_id') : Promise.resolve({ data: [] }),
      pcaps.includes('feedback') ? supabase.from('feedback').select('id, kind, resolved, creator_id, message, asset_id, created_at') : Promise.resolve({ data: [] }),
      pcaps.includes('metrics') ? supabase.rpc('team_books') : Promise.resolve({ data: null }),
      pcaps.includes('metrics') ? supabase.from('manual_sales').select('amount, period_month') : Promise.resolve({ data: [] }),
      pcaps.includes('content') ? supabase.from('assets').select('id, type, creator_id, created_at').eq('uploaded_by', profile.id) : Promise.resolve({ data: [] }),
      pcaps.includes('agencies') ? supabase.rpc('team_agencies') : Promise.resolve({ data: [] }),
      pcaps.includes('billing') ? supabase.rpc('team_billing') : Promise.resolve({ data: [] }),
    ]);
    setCreators(cr || []);
    setStaff(st || []);
    setBooks(bk.data || null);
    setAgencies(ag.data || []);
    setBillRows(bl.data || []);
    setMine(myAssets.data || []);
    const srows = sales.data || [];
    setMs({
      totalC: sumCents(srows, (r) => r.amount),
      count: srows.length,
      monthC: sumCents(srows.filter((r) => r.period_month === monthKey), (r) => r.amount),
    });
    const reqs = rq.data || [], fbs = fb.data || [];
    setReqRows(reqs);
    setFbRows(fbs);
    setCounts({
      reqPend: reqs.filter((r) => r.status === 'pending').length,
      reqProg: reqs.filter((r) => r.status === 'in_progress').length,
      fbOpen: fbs.filter((f) => !f.resolved && f.kind !== 'love').length,
      fbLove: fbs.filter((f) => f.kind === 'love').length,
    });
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      const role = up.profile?.role;
      if (!['admin', 'supervisor', 'producer', 'chatter'].includes(role)) { router.replace('/panel'); return; }
      meRef.current = up.profile;
      setMe(up.profile);
      load();
    })();
  }, [router, load]);

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  // Live pop-up: when a new request notification lands for me, toast it.
  useEffect(() => {
    if (!me?.id) return;
    const supabase = getSupabase();
    const ch = supabase
      .channel(`notif-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        (payload) => {
          const n = payload.new;
          if (n?.kind === 'request') {
            setToast(`Nuevo pedido${n.meta?.requester ? ` de ${n.meta.requester}` : ''}: ${n.meta?.title || ''}`);
            setTimeout(() => setToast(''), 6000);
            setReqPing((x) => x + 1); // refresh the Pedidos inbox
            setColaSeen(false);       // algo nuevo llegó → la Cola vuelve a palpitar
            load();                   // refresh the card numbers too
          } else if (n?.kind === 'feedback') {
            const fk = n.meta?.feedback_kind === 'love' ? 'Le encantó' : 'Pide un cambio';
            setToast(`${fk}${n.meta?.creator ? ` · ${n.meta.creator}` : ''}: ${n.meta?.asset || ''}`);
            setTimeout(() => setToast(''), 6000);
            setColaSeen(false);       // cambio pedido → la Cola vuelve a palpitar
            load();
          } else if (n?.kind === 'request_msg') {
            const who = n.meta?.from === 'creator' ? 'La modelo' : n.meta?.from === 'agency' ? 'La agencia' : 'El equipo';
            setToast(`${who} respondió en «${n.meta?.title || 'un pedido'}»`);
            setTimeout(() => setToast(''), 6000);
            setReqPing((x) => x + 1);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, load]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Invited staff waiting for the admin to approve them + assign access.
  if (me?.role !== 'admin' && me?.staff_status === 'pending') {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-ink px-5 text-center text-paper">
        <div className="max-w-sm">
          <Logo size="lg" />
          <Clock className="mx-auto mt-8 mb-3 text-brand" size={38} />
          <h1 className="font-display text-2xl font-semibold">Tu acceso está pendiente</h1>
          <p className="mt-2 text-sm leading-relaxed text-paper-mute">
            Ya estás registrado como equipo. El administrador debe <span className="text-paper">aprobar tu acceso</span> y asignarte tu puesto y permisos. Te avisaremos cuando puedas entrar a trabajar.
          </p>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    );
  }

  // The cards ARE the navigation — real numbers, everything closed by default;
  // tap a card to open its area, tap again to close. Split into two rooms:
  // OPERACIÓN (the daily work queues) and EMPRESA (how the company is doing).
  const act = creators.filter((c) => ['active', 'paid'].includes(c.onboarding_status)).length;
  const proc = creators.length - act;
  const idPend = creators.filter((c) => c.onboarding_status === 'id_pending').length;
  const staffPend = staff.filter((s) => s.staff_status === 'pending').length;

  // Suscripciones (acceso 'billing'): activas y las que vencen en ≤7 días.
  const todayISO = new Date().toISOString().slice(0, 10);
  const bill = {
    active: billRows.filter((c) => c.payment_status === 'paid' || ['active', 'paid'].includes(c.onboarding_status)).length,
    soon: billRows.filter((c) => {
      if (!c.subscription_ends_at) return false;
      const d = Math.floor((new Date(c.subscription_ends_at + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 864e5);
      return d >= 0 && d <= 7;
    }).length,
  };

  // ── Mi producción: piezas que subió ESTE trabajador ──
  const weekAgoISO = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);
  const myWeek = mine.filter((a) => (a.created_at || '').slice(0, 10) >= weekAgoISO).length;
  const myMonth = mine.filter((a) => (a.created_at || '').slice(0, 7) === monthKey).length;

  // ── Cola del día: lo más urgente primero (pedidos nuevos → cambios → en producción) ──
  const nameById = {}; creators.forEach((c) => { nameById[c.id] = c.full_name || 'Creadora'; });
  const queue = [];
  if (can('requests')) reqRows.filter((r) => r.status === 'pending').forEach((r) => queue.push({ key: 'r' + r.id, prio: 1, kind: 'pedido', creatorId: r.creator_id, title: r.title, when: r.created_at, reqId: r.id, claimedBy: r.producer_id }));
  if (can('feedback')) fbRows.filter((f) => f.kind === 'change' && !f.resolved).forEach((f) => queue.push({ key: 'f' + f.id, prio: 2, kind: 'cambio', creatorId: f.creator_id, title: (f.message && f.message.trim()) || 'Pidió un cambio', when: f.created_at }));
  if (can('requests')) reqRows.filter((r) => r.status === 'in_progress').forEach((r) => queue.push({ key: 'rp' + r.id, prio: 3, kind: 'produccion', creatorId: r.creator_id, title: r.title, when: r.created_at, reqId: r.id, claimedBy: r.producer_id }));
  queue.sort((a, b) => a.prio - b.prio || (b.when || '').localeCompare(a.when || ''));
  const QMETA = {
    pedido: { icon: Inbox, verb: 'Te pidieron', cls: 'bg-amber-500/15 text-amber-300', ring: 'border-amber-500/30' },
    cambio: { icon: RefreshCw, verb: 'Cambio pedido', cls: 'bg-rose-500/15 text-rose-300', ring: 'border-rose-500/30' },
    produccion: { icon: Clock, verb: 'En producción', cls: 'bg-sky-500/15 text-sky-300', ring: 'border-sky-500/30' },
  };
  const pendCount = queue.filter((q) => q.kind !== 'produccion').length;
  const prodCount = queue.length - pendCount;
  // Palpita al LLEGAR si hay pendientes; se calma al abrirla en esta visita.
  const colaPulse = queue.length > 0 && !colaSeen && !colaOpen;
  const staffName = {}; staff.forEach((s) => { staffName[s.id] = (s.full_name || '').split(' ')[0] || 'equipo'; });
  function toggleCola() { const n = !colaOpen; setColaOpen(n); if (n) setColaSeen(true); }
  async function openQueueItem(it) {
    setColaSeen(true);
    // Tomar el pedido: si nadie lo tiene, quedo yo como responsable (evita que
    // dos uploaders dupliquen). Si ya lo tomó otro, no se lo quito.
    if (it.reqId && !it.claimedBy && can('requests')) {
      await getSupabase().from('requests').update({ producer_id: me.id, status: 'in_progress' }).eq('id', it.reqId).is('producer_id', null);
      load();
    }
    const inRoster = creators.some((c) => c.id === it.creatorId);
    if (can('content') && inRoster) { setFocusCreator(it.creatorId); setTab('creadoras'); return; }
    // La creadora del ítem no está en tu roster: en vez de caer en un roster mudo,
    // te llevo al área donde SÍ puedes actuar sobre el ítem.
    if (it.kind === 'cambio' && can('feedback')) { setTab('feedback'); return; }
    if (can('requests')) { setTab('pedidos'); return; }
    if (can('content')) { setFocusCreator(null); setTab('creadoras'); }
  }

  const OPS_CARDS = [
    ...(can('content') ? [{ id: 'creadoras', icon: Users, label: 'Creadoras', value: nf(creators.length), sub: `${act} activas · ${proc} en proceso` }] : []),
    ...(can('add_creators') ? [{ id: 'altas', icon: UserPlus, label: can('content') ? 'Nueva creadora' : 'Creadoras', value: can('content') ? '+' : nf(creators.length), sub: 'Dar de alta una creadora' }] : []),
    ...(can('kyc') ? [{ id: 'verificaciones', icon: ShieldCheck, label: 'Verificaciones', value: nf(idPend), sub: idPend ? 'IDs esperando revisión' : 'nada por revisar', alert: idPend > 0 }] : []),
    ...(can('requests') ? [{ id: 'pedidos', icon: Inbox, label: 'Pedidos', value: nf((counts?.reqPend || 0) + (counts?.reqProg || 0)), sub: `${counts?.reqPend || 0} pendientes · ${counts?.reqProg || 0} en producción`, alert: (counts?.reqPend || 0) > 0 }] : []),
    ...(can('feedback') ? [{ id: 'feedback', icon: MessageSquare, label: 'Feedback', value: nf(counts?.fbOpen || 0), sub: counts?.fbOpen ? 'cambios sin resolver' : `al día · ${counts?.fbLove || 0} me encanta`, alert: (counts?.fbOpen || 0) > 0 }] : []),
    ...(can('content') ? [{ id: 'miproduccion', icon: TrendingUp, label: 'Mi producción', value: nf(mine.length), sub: `${myWeek} en 7 días · ${myMonth} este mes` }] : []),
  ];
  const BIZ_CARDS = [
    ...(can('metrics') ? [{ id: 'produccion', icon: ImageIcon, label: 'Producción', value: nf(books?.pieces || 0), sub: `piezas creadas en total` }] : []),
    ...(can('metrics') ? [{ id: 'ventas', href: '/sales', icon: DollarSign, label: 'Manual Sales', value: moneyCents(ms?.totalC || 0), sub: `${nf(ms?.count || 0)} ventas · ${moneyCents(ms?.monthC || 0)} este mes — abrir /sales` }] : []),
    // Con acceso 'agencies' la tarjeta es de GESTIÓN (crear + vincular modelos).
    // Sin él, pero con 'metrics', queda la vista de solo lectura.
    ...(can('agencies') ? [{ id: 'gestagencias', icon: Building2, label: 'Agencias', value: nf(agencies.length), sub: 'crear y asignar modelos' }]
        : can('metrics') ? [{ id: 'agencias', icon: Building2, label: 'Agencias', value: nf(books?.agencies || 0), sub: `${nf(books?.creators || 0)} creadoras en total` }] : []),
    ...(can('billing') ? [{ id: 'cobros', icon: CreditCard, label: 'Suscripciones', value: nf(bill.active), sub: `${nf(bill.active)} activas · ${nf(bill.soon)} por vencer`, alert: bill.soon > 0 }] : []),
    ...(can('team') ? [{ id: 'equipo', icon: UserCog, label: 'Equipo', value: nf(staff.length), sub: staffPend ? `${staffPend} por aprobar` : 'todos con acceso', alert: staffPend > 0 }] : []),
  ];

  const cardBtn = (k) => {
    // Every card CHANGES SCREEN — either a real route (href) or the in-page
    // area view (setTab). The arrow signals "enter", never "expand".
    return (
      <button key={k.id} onClick={() => { if (k.href) return router.push(k.href); setFocusCreator(null); setTab(k.id); }}
        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
          k.alert ? 'border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-400/50'
          : 'border-line bg-card hover:border-brand/40 hover:bg-card/80'}`}>
        <div className="flex items-center justify-between">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${k.alert ? 'bg-amber-500/15 text-amber-300' : 'bg-brand/10 text-brand'}`}>
            <k.icon size={17} />
          </span>
          <ChevronRight size={15} className="shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <div className="mt-3 font-display text-2xl font-semibold leading-none text-paper">{k.value}</div>
        <div className="mt-1.5 text-sm font-medium text-paper">{k.label}</div>
        <div className={`mt-0.5 truncate text-[11px] ${k.alert && !open ? 'text-amber-200' : 'text-paper-dim'}`}>{k.sub}</div>
      </button>
    );
  };

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <WelcomeTour storageKey="ls_tour_team_v1" steps={[
        { eyebrow: 'Bienvenido', title: 'Tu espacio de trabajo', body: 'Todo lo del día en un vistazo. Te mostramos por dónde empezar en 20 segundos.' },
        { eyebrow: 'Cola del día', title: 'Lo de hoy', body: 'Pedidos, verificaciones y feedback pendientes se juntan en la Cola del día.' },
        { eyebrow: 'Áreas', title: 'Entra a trabajar', body: 'Creadoras, Pedidos, Verificaciones… ves solo las áreas a las que tienes acceso.' },
        { eyebrow: 'Entrega', title: 'Entrega en 3 pasos', body: 'Sube el contenido a la creadora correcta de forma simple y guiada.' },
      ]} />
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="sm" />
            <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
              <Users size={12} /> Equipo interno
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Who am I + where — always visible */}
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
                <span className="block text-[10px] text-paper-dim">{me?.role === 'admin' ? 'Dueño' : (me?.job_title || 'Equipo')} · Equipo interno</span>
              </span>
            </div>
            {me?.role === 'admin' && (
              <Link href="/admin" className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
                Admin
              </Link>
            )}
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {!tab ? (
          /* ── PANEL: solo las tarjetas. Tocar una cambia de pantalla al área ── */
          <>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Espacio de trabajo</h1>
            <p className="mt-1 text-sm text-paper-mute">Todo tu trabajo en un vistazo. Toca una tarjeta para entrar a esa área.</p>

            {/* ── Cola del día: viene colapsada; palpita si hay algo sin ver ── */}
            {(can('content') || can('requests') || can('feedback')) && (
              <section className="mt-6">
                <button onClick={toggleCola}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                    colaPulse ? 'border-brand/50 bg-brand/[0.06] shadow-glow-sm' : 'border-line bg-card hover:border-brand/40'}`}>
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                    <ListChecks size={17} />
                    {colaPulse && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-paper">
                      Cola del día
                      {colaPulse && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">{queue.length} por atender</span>}
                    </span>
                    <span className="block truncate text-[11px] text-paper-dim">
                      {queue.length === 0 ? 'estás al día' : `${queue.length} por atender · ${pendCount} pedidos${prodCount ? ` · ${prodCount} en producción` : ''}`}
                    </span>
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform group-hover:text-paper ${colaOpen ? 'rotate-180' : ''}`} />
                </button>

                {colaOpen && (
                  queue.length === 0 ? (
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.04] p-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Check size={17} /></span>
                      <div>
                        <p className="text-sm font-medium text-paper">Estás al día</p>
                        <p className="text-[11px] text-paper-dim">Sin pedidos ni cambios pendientes.{can('content') ? ' Puedes adelantar contenido desde Creadoras.' : ''}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {queue.map((it) => {
                        const m = QMETA[it.kind];
                        return (
                          <button key={it.key} onClick={() => openQueueItem(it)}
                            className={`group flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-brand/40 ${m.ring}`}>
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${m.cls}`}><m.icon size={16} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
                                {m.verb}
                                {it.claimedBy && <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 normal-case text-sky-300">{it.claimedBy === me.id ? 'Lo tomaste tú' : `En manos de ${staffName[it.claimedBy] || 'el equipo'}`}</span>}
                              </span>
                              <span className="block truncate text-sm font-medium text-paper">{it.title}</span>
                              <span className="block truncate text-[11px] text-paper-dim">{nameById[it.creatorId] || 'Creadora'}{it.when ? ` · ${new Date(it.when).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}` : ''}</span>
                            </span>
                            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand sm:inline-flex">
                              <Upload size={12} /> {can('content') ? 'Subir' : 'Abrir'}
                            </span>
                            <ChevronRight size={16} className="shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </section>
            )}

            {OPS_CARDS.length > 0 && (
              <>
                <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Áreas · entra a trabajar</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{OPS_CARDS.map(cardBtn)}</div>
              </>
            )}
            {BIZ_CARDS.length > 0 && (
              <>
                <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Empresa · cómo vamos</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{BIZ_CARDS.map(cardBtn)}</div>
              </>
            )}
          </>
        ) : (
          /* ── PANTALLA DEL ÁREA: reemplaza el panel; "Panel" arriba para volver ── */
          <>
            {(() => {
              const k = [...OPS_CARDS, ...BIZ_CARDS].find((c) => c.id === tab);
              return (
                <>
                  <button onClick={() => setTab(null)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-paper-mute transition-colors hover:text-paper">
                    <ArrowLeft size={14} /> Panel
                  </button>
                  <h1 className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
                    {k?.icon && <k.icon size={18} className="text-brand" />} {k?.label || ''}
                  </h1>
                </>
              );
            })()}
            {tab === 'altas' && can('add_creators') && <AltasTab creators={creators} flash={flash} reload={load} />}
            {tab === 'creadoras' && can('content') && <CreadorasTab key={focusCreator || 'all'} initialCreatorId={focusCreator} creators={creators} me={me} flash={flash} />}
            {tab === 'miproduccion' && can('content') && <MiProduccionTab mine={mine} creators={creators} />}
            {tab === 'verificaciones' && can('kyc') && <KycTab flash={flash} />}
            {tab === 'pedidos' && can('requests') && <PedidosTab creators={creators} staff={staff} me={me} flash={flash} ping={reqPing} />}
            {tab === 'feedback' && can('feedback') && <ReactionsDashboard canResolve onResolved={load} creators={creators.map((c) => ({ id: c.id, name: c.full_name, avatar_url: c.avatar_url }))} />}
            {tab === 'produccion' && can('metrics') && <ProduccionTab books={books} />}
            {tab === 'agencias' && can('metrics') && <AgenciasTab books={books} />}
            {tab === 'gestagencias' && can('agencies') && <GestAgenciasTab agencies={agencies} creators={creators} flash={flash} reload={load} />}
            {tab === 'cobros' && can('billing') && <CobrosTab rows={billRows} flash={flash} reload={load} />}
            {tab === 'equipo' && can('team') && <EquipoTab staff={staff} me={me} flash={flash} reload={load} />}
          </>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 w-max max-w-[calc(100vw-2.5rem)] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-center text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Creadoras: folders + deliveries upload + LoRA view ─────────────────── */
// Which filter bucket a creator's onboarding_status falls into.
const CREATOR_CAT = {
  active: 'active', paid: 'active', info: 'info', id_pending: 'id_pending',
  id_rejected: 'id_rejected', id_approved: 'falta_pago', authorized: 'falta_pago', registered: 'registered',
};
const CREATOR_FILTERS = [
  ['all', 'Todas'], ['active', 'Activas'], ['info', 'Falta ID'], ['id_pending', 'En revisión'],
  ['id_rejected', 'Rechazado'], ['falta_pago', 'Falta pago'], ['registered', 'Registrada'],
];

// ¿La creadora tiene suscripción activa (está pagando)?
function isPaying(c) {
  return c?.payment_status === 'paid' || ['active', 'paid'].includes(c?.onboarding_status);
}
function SubBadge({ creator, size = 'sm' }) {
  const paying = isPaying(creator);
  const plan = creator?.plan ? creator.plan.charAt(0).toUpperCase() + creator.plan.slice(1) : null;
  const pad = size === 'lg' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]';
  return paying ? (
    <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 font-semibold uppercase tracking-wide text-emerald-300 ${pad}`}>
      <CreditCard size={11} /> Suscripción activa{plan ? ` · ${plan}` : ''}
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1 rounded-full border border-line bg-hair/5 font-semibold uppercase tracking-wide text-paper-dim ${pad}`}>
      <CreditCard size={11} /> Sin suscripción
    </span>
  );
}

// Alta de creadoras para el equipo con el acceso «Dar de alta creadoras».
// MISMO formulario completo que el admin: acceso, perfil público, identidad,
// suscripción, cortesía y nota. Los campos extra los aplica create-user con
// service role (el empleado no puede escribir el perfil directo por RLS).
function AltasTab({ creators, flash, reload }) {
  const [open, setOpen] = useState(false);
  const blank = { full_name: '', email: '', stage_name: '', handle: '', phone: '', country: '', legal_first_name: '', legal_last_name: '', date_of_birth: '', plan: '', activate: false, ends_at: '', comp: false, comp_until: '', billing_note: '' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState(null);
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function create(e) {
    e.preventDefault();
    setErr(''); setCreds(null);
    if (!f.full_name.trim()) { setErr('Pon al menos el nombre.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: {
        full_name: f.full_name.trim(), email: f.email.trim(), password: pw, role: 'creator',
        profile: {
          stage_name: f.stage_name, handle: f.handle, phone: f.phone, country: f.country,
          legal_first_name: f.legal_first_name, legal_last_name: f.legal_last_name, date_of_birth: f.date_of_birth || undefined,
          plan: f.plan, activate: f.activate, ends_at: f.ends_at || undefined,
          comp: f.comp, comp_until: f.comp_until || undefined, billing_note: f.billing_note,
        },
      },
    });
    setBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo dar de alta.'); return; }
    if (out.generated_email) setCreds({ email: out.login_email, password: pw });
    else { flash(`Creadora dada de alta${out.invited ? ` — invitación enviada a ${out.login_email || f.email.trim()}` : ''}`); setOpen(false); }
    setF(blank);
    reload && reload();
  }

  const inputCls = 'w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60';
  const lbl = 'mb-1 block text-[11px] font-medium text-paper-dim';
  const sec = 'text-[11px] font-semibold uppercase tracking-wider text-brand/80';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-paper">Creadoras</h2>
          <p className="text-xs text-paper-dim">Da de alta una creadora nueva — el mismo formulario completo del administrador.</p>
        </div>
        {!open && (
          <button onClick={() => { setOpen(true); setErr(''); setCreds(null); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
            <UserPlus size={15} /> Dar de alta creadora
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={create} className="space-y-5 rounded-2xl border border-line bg-card p-5">
          {/* Acceso */}
          <div>
            <p className={sec}>Acceso a la plataforma</p>
            <div className="mt-2"><label className={lbl}>Nombre *</label>
              <input value={f.full_name} onChange={(e) => upd('full_name', e.target.value)} placeholder="Ej. Valentina Ríos" autoFocus className={inputCls} /></div>
            <div className="mt-3"><label className={lbl}>Correo (opcional — con correo le llega invitación)</label>
              <input type="email" value={f.email} onChange={(e) => upd('email', e.target.value)} placeholder="correo@ejemplo.com" className={inputCls} /></div>
          </div>
          {/* Perfil público */}
          <div>
            <p className={sec}>Perfil público</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div><label className={lbl}>Nombre artístico</label><input value={f.stage_name} onChange={(e) => upd('stage_name', e.target.value)} placeholder="Como se hace llamar" className={inputCls} /></div>
              <div><label className={lbl}>Usuario (@)</label><input value={f.handle} onChange={(e) => upd('handle', e.target.value)} placeholder="valentina.rios" className={inputCls} /></div>
              <div><label className={lbl}>Teléfono</label><input value={f.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+1 555…" className={inputCls} /></div>
              <div><label className={lbl}>País</label><input value={f.country} onChange={(e) => upd('country', e.target.value)} placeholder="US, MX, CO…" className={inputCls} /></div>
            </div>
          </div>
          {/* Identidad */}
          <div>
            <p className={sec}>Identidad</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div><label className={lbl}>Nombre legal</label><input value={f.legal_first_name} onChange={(e) => upd('legal_first_name', e.target.value)} className={inputCls} /></div>
              <div><label className={lbl}>Apellido legal</label><input value={f.legal_last_name} onChange={(e) => upd('legal_last_name', e.target.value)} className={inputCls} /></div>
              <div><label className={lbl}>Nacimiento</label><input type="date" value={f.date_of_birth} onChange={(e) => upd('date_of_birth', e.target.value)} className={inputCls} /></div>
            </div>
            <p className="mt-1 text-[11px] text-paper-dim">La foto del ID se sube después desde su perfil.</p>
          </div>
          {/* Suscripción */}
          <div>
            <p className={sec}>Suscripción</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PACKS.map((p) => { const on = f.plan === p.key; return (
                <button key={p.key} type="button" onClick={() => upd('plan', on ? '' : p.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/40'}`}>
                  <div className="flex items-center justify-between"><span className={`text-xs font-semibold ${on ? 'text-brand' : 'text-paper'}`}>{p.name}</span>{on && <Check size={13} className="text-brand" />}</div>
                  <div className="mt-1 font-display text-lg font-bold text-paper">${p.m}<span className="text-[10px] font-normal text-paper-dim">/mes</span></div>
                  <div className="text-[10px] text-paper-dim">{p.photos} fotos · {p.videos} vid</div>
                </button>
              ); })}
            </div>
            <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-ink-2 p-3">
              <input type="checkbox" checked={f.activate} onChange={(e) => upd('activate', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line bg-ink-2 text-brand focus:ring-brand" />
              <span className="text-sm text-paper">Activar suscripción ya <span className="text-paper-dim">(ya pagó a mano)</span></span>
            </label>
            {f.activate && !f.comp && (
              <div className="mt-2"><label className={lbl}>Vence el · próximo cobro</label><input type="date" value={f.ends_at} onChange={(e) => upd('ends_at', e.target.value)} className={inputCls} /></div>
            )}
            <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
              <input type="checkbox" checked={f.comp} onChange={(e) => upd('comp', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line bg-ink-2 text-amber-400 focus:ring-amber-400" />
              <span className="text-sm text-paper">Cortesía <span className="text-paper-dim">(gratis — no pagó)</span></span>
            </label>
            {f.comp && (
              <div className="mt-2"><label className={lbl}>Gratis hasta</label><input type="date" value={f.comp_until} onChange={(e) => upd('comp_until', e.target.value)} className={inputCls} /></div>
            )}
            <div className="mt-3"><label className={lbl}>Nota (opcional) — ej. «1 mes gratis de cortesía»</label>
              <input value={f.billing_note} onChange={(e) => upd('billing_note', e.target.value)} placeholder="Qué se le dio / por qué" className={inputCls} /></div>
          </div>

          {err && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
          {creds && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] p-3.5 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-300"><Check size={14} /> Creadora creada — comparte estos datos</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-2 px-3 py-2"><span className="text-paper-dim">Login</span><span className="truncate font-medium text-paper">{creds.email}</span></div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-2 px-3 py-2"><span className="text-paper-dim">Contraseña</span><span className="truncate font-medium text-paper">{creds.password}</span></div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); setErr(''); setCreds(null); }} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cerrar</button>
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={15} />} Dar de alta
            </button>
          </div>
        </form>
      )}

      {/* Creadoras existentes (referencia) */}
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Creadoras registradas · {creators.length}</p>
        {creators.length === 0 ? (
          <p className="text-sm text-paper-dim">Todavía no hay creadoras. Da de alta la primera.</p>
        ) : (
          <div className="space-y-1.5">
            {creators.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 px-3 py-2">
                <Avatar src={c.avatar_url} name={c.full_name} size="sm" />
                <div className="min-w-0"><p className="truncate text-sm text-paper">{c.stage_name || c.full_name || 'Creadora'}</p><p className="truncate text-[11px] text-paper-dim">{c.email}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreadorasTab({ creators, me, flash, initialCreatorId }) {
  const [sel, setSel] = useState(() => (initialCreatorId ? creators.find((c) => c.id === initialCreatorId) || null : null));
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('all');

  // Inside a creator you get her full-width library; back returns to the roster.
  if (sel) return <CreatorDetail key={sel.id} creator={sel} me={me} flash={flash} onBack={() => setSel(null)} />;

  const catOf = (c) => CREATOR_CAT[c.onboarding_status] || 'registered';
  const view = creators.filter((c) => {
    if (fCat !== 'all' && catOf(c) !== fCat) return false;
    const t = q.trim().toLowerCase();
    if (t && !(`${c.full_name || ''} ${c.handle || ''}`.toLowerCase().includes(t))) return false;
    return true;
  });
  const active = view.filter((c) => catOf(c) === 'active');
  const others = view.filter((c) => catOf(c) !== 'active');

  const card = (c) => (
    <button key={c.id} onClick={() => setSel(c)}
      className="group flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-brand/40">
      <Avatar src={c.avatar_url} name={c.full_name} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-semibold text-paper">{c.full_name || '—'}</span>
        {c.handle && <span className="block truncate text-xs text-paper-dim">@{c.handle}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            ['active', 'paid'].includes(c.onboarding_status) ? 'bg-brand/15 text-brand' : 'bg-amber-500/10 text-amber-300'}`}>
            {OB_LABEL[c.onboarding_status] || c.onboarding_status}
          </span>
          <SubBadge creator={c} />
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  );

  return (
    <div className="mt-6">
      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar creadora por nombre o @…"
          className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CREATOR_FILTERS.map(([v, l]) => {
          const n = v === 'all' ? creators.length : creators.filter((c) => catOf(c) === v).length;
          if (v !== 'all' && n === 0) return null;
          return (
            <button key={v} onClick={() => setFCat(v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                fCat === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
              {l} · {n}
            </button>
          );
        })}
      </div>

      {view.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{creators.length === 0 ? 'No hay creadoras todavía.' : 'Ninguna creadora coincide con tu búsqueda.'}</p>}
      {active.length > 0 && (
        <>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Activas · {active.length} — entra para ver su biblioteca y subirle</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{active.map(card)}</div>
        </>
      )}
      {others.length > 0 && (
        <>
          <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{active.length > 0 ? 'En proceso' : 'Resultados'} · {others.length}</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{others.map(card)}</div>
        </>
      )}
    </div>
  );
}

function CreatorDetail({ creator, me, flash, onBack }) {
  const [folders, setFolders] = useState(null);
  const [folderSel, setFolderSel] = useState(null); // null = biblioteca (carpetas); id = dentro de la carpeta
  const [urls, setUrls] = useState({});             // storage_path -> signed url (miniaturas)
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState('');
  const [purpose, setPurpose] = useState(''); // "por qué se hizo" — se guarda en cada foto de la entrega
  const [openReqs, setOpenReqs] = useState([]); // pedidos abiertos de esta modelo
  const [reqSel, setReqSel] = useState('');     // pedido al que corresponde esta entrega
  const [lora, setLora] = useState(null); // {total, groups: [{key,label,slug,items:[{url,ext}]}]}
  const [showLora, setShowLora] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data }, { data: reqs }] = await Promise.all([
      supabase.from('folders')
        .select('id, name, kind, assets(id, storage_path, type, title, deliver_date, created_at)')
        .eq('creator_id', creator.id).order('created_at'),
      supabase.from('requests').select('id, title, status').eq('creator_id', creator.id).neq('status', 'delivered').order('created_at', { ascending: false }),
    ]);
    const fols = data || [];
    // Sign private storage paths so thumbnails render (demo mixes /public paths).
    const toSign = [...new Set(fols.flatMap((f) => f.assets || []).filter((a) => !isDirect(a.storage_path)).map((a) => a.storage_path))];
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries').createSignedUrls(toSign, 3600);
      const map = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i]] = s.signedUrl; });
      setUrls(map);
    }
    setFolders(fols);
    setOpenReqs(reqs || []);
  }, [creator.id]);

  const srcOf = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.storage_path] || ''));

  // Borrar una pieza subida por error (staff). El asset cascadea feedback/notas;
  // el objeto de storage se quita aparte. Con confirmación, no se puede deshacer.
  const [delId, setDelId] = useState('');
  async function delAsset(a) {
    if (!window.confirm('¿Borrar esta pieza? No se puede deshacer.')) return;
    setDelId(a.id);
    const supabase = getSupabase();
    if (!isDirect(a.storage_path)) { await supabase.storage.from('deliveries').remove([a.storage_path]); }
    const { error } = await supabase.from('assets').delete().eq('id', a.id);
    setDelId('');
    if (error) { flash('No se pudo borrar: ' + error.message); return; }
    flash('Pieza borrada'); await load();
  }

  useEffect(() => { load(); }, [load]);

  async function createFolder(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await getSupabase().from('folders').insert({ creator_id: creator.id, name: newName.trim() });
    setCreating(false);
    if (error) { flash('Error: ' + error.message); return; }
    setNewName(''); load(); flash('Entrega creada');
  }

  // Bulk-friendly: uploads in a small concurrency pool, survives per-file
  // failures (reports how many), and only closes the pedido if something landed.
  async function uploadFiles(list) {
    if (!folderSel) { flash('Elige primero una entrega.'); return; }
    // Fotos y videos JUNTOS: clasifica por MIME y, si el navegador lo deja en
    // blanco (típico en HEIC/MOV de iPhone), por la extensión del archivo.
    const IMG_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'bmp', 'tiff'];
    const VID_EXT = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'hevc', '3gp', 'qt'];
    const kindOf = (f) => {
      if (f.type.startsWith('image/')) return 'photo';
      if (f.type.startsWith('video/')) return 'video';
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (IMG_EXT.includes(ext)) return 'photo';
      if (VID_EXT.includes(ext)) return 'video';
      return null;
    };
    const kinded = Array.from(list).map((f) => ({ f, k: kindOf(f) })).filter((x) => x.k);
    const files = kinded.map((x) => x.f);
    if (!files.length) { flash('Arrastra fotos o videos.'); return; }
    const nPhotos = kinded.filter((x) => x.k === 'photo').length;
    const nVideos = files.length - nPhotos;
    const supabase = getSupabase();
    const purposeNow = purpose.trim() || null;
    const reqNow = reqSel;
    const total = files.length;
    let done = 0, failed = 0;
    setUploading(`0/${total}`);

    async function uploadOne(file) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${creator.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('deliveries').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('assets').insert({
          creator_id: creator.id, folder_id: folderSel, storage_path: path,
          type: kindOf(file) === 'video' ? 'video' : 'photo', uploaded_by: me.id,
          added_by: me.full_name || null, purpose: purposeNow,
        });
        if (dbErr) throw dbErr;
      } catch { failed++; }
      finally { done++; setUploading(`${done}/${total}`); }
    }

    const queue = [...files];
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) { const f = queue.shift(); if (f) await uploadOne(f); }
    });
    await Promise.all(workers);

    const ok = total - failed;
    if (ok > 0) {
      const folderName = (folders || []).find((f) => f.id === folderSel)?.name || '';
      sendEmail('delivery', creator.id, folderName);
      // Avisa a la modelo Y a su agencia (RPC SECURITY DEFINER: el uploader no
      // puede leer agency_creators por RLS).
      await supabase.rpc('notify_delivery', { p_creator: creator.id, p_folder: folderName });
      // Solo cerramos el pedido cuando TODO subió — si algo falló, queda abierto
      // para que puedas reintentar y amarrarlo, no se marca «Completado» a medias.
      if (reqNow && failed === 0) {
        await supabase.from('requests').update({
          status: 'delivered', delivered_at: new Date().toISOString(), producer_id: me.id,
        }).eq('id', reqNow);
      }
    }
    setUploading('');
    if (fileRef.current) fileRef.current.value = '';
    setPurpose('');
    setReqSel('');
    await load();
    const mix = [nPhotos && `${nPhotos} ${nPhotos === 1 ? 'foto' : 'fotos'}`, nVideos && `${nVideos} ${nVideos === 1 ? 'video' : 'videos'}`].filter(Boolean).join(' · ');
    flash(failed
      ? `${ok} de ${total} subidas · ${failed} fallaron${reqNow ? ' · el pedido sigue abierto, reintenta' : ', reinténtalas'}`
      : reqNow ? `Subido: ${mix} · pedido entregado`
      : `Subido: ${mix} — separados solos`);
  }

  async function toggleLora() {
    if (showLora) { setShowLora(false); return; }
    if (!lora) {
      const supabase = getSupabase();
      const { data: rows } = await supabase.from('lora_photos')
        .select('storage_path, category').eq('user_id', creator.id).order('created_at');
      const paths = (rows || []).map((r) => r.storage_path);
      const urls = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('lora').createSignedUrls(paths, 3600);
        (signed || []).forEach((s, i) => { if (s?.signedUrl) urls[paths[i]] = s.signedUrl; });
      }
      // Group by category, in LORA_CATS order, so the staff view and the bulk
      // download land organized for Higgsfield.
      const groups = [];
      for (const [key, meta] of Object.entries(LORA_CATS)) {
        const items = (rows || []).filter((r) => (LORA_CATS[r.category] ? r.category : 'front') === key)
          .map((r) => ({ url: urls[r.storage_path] || '', ext: (r.storage_path.split('.').pop() || 'jpg').toLowerCase() }))
          .filter((x) => x.url);
        if (items.length) groups.push({ key, label: meta.label, slug: meta.slug, items });
      }
      setLora({ total: paths.length, groups });
    }
    setShowLora(true);
  }

  async function downloadAllLora() {
    if (!lora?.total || downloading) return;
    let i = 0;
    for (const g of lora.groups) {
      for (let j = 0; j < g.items.length; j++) {
        i++;
        setDownloading(`${i}/${lora.total}`);
        try {
          const res = await fetch(g.items[j].url);
          const blob = await res.blob();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${g.slug}-${String(j + 1).padStart(2, '0')}.${g.items[j].ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(a.href);
          await new Promise((r) => setTimeout(r, 250));
        } catch { /* skip failed file, keep going */ }
      }
    }
    setDownloading('');
    flash(`${lora.total} fotos descargadas — organizadas por categoría, listas para Higgsfield`);
  }

  const folder = (folders || []).find((f) => f.id === folderSel) || null;

  return (
    <section className="mt-6 min-w-0">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-paper">
        <ArrowLeft size={15} /> Todas las creadoras
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={creator.avatar_url} name={creator.full_name} size="lg" />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight">{creator.full_name}</h2>
            {creator.handle && <p className="text-xs text-paper-dim">@{creator.handle}</p>}
            <div className="mt-1.5"><SubBadge creator={creator} /></div>
          </div>
        </div>
        <button onClick={toggleLora}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
          <Sparkles size={14} /> Fotos LoRA {showLora ? '▴' : '▾'}
        </button>
      </div>

      {/* Lo que ella tiene pendiente — el trabajador lo ve de entrada */}
      {openReqs.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-200">
            <Inbox size={13} /> Pedidos abiertos de {creator.full_name} · {openReqs.length} — súbele la entrega y márcalo abajo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openReqs.map((r) => (
              <span key={r.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${REQ_STATUS[r.status]?.cls || 'border-line text-paper-mute'}`}>
                {r.title} · {REQ_STATUS[r.status]?.l || r.status}
              </span>
            ))}
          </div>
        </div>
      )}

      {showLora && (
        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          {!lora ? <p className="text-sm text-paper-dim">Cargando…</p> : lora.total === 0 ? (
            <p className="text-sm text-paper-dim">Aún no ha subido fotos para su clon.</p>
          ) : (
            <>
              {/* Progreso vs mínimo/máximo de la LoRA + descarga masiva */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${lora.total >= LORA_MIN ? 'text-brand' : 'text-paper'}`}>
                      {lora.total} fotos {lora.total >= LORA_MIN ? '· mínimo listo' : `· faltan ${LORA_MIN - lora.total} para el mínimo`}
                    </span>
                    <span className="text-xs text-paper-dim">mín. {LORA_MIN} · máx. {LORA_MAX}</span>
                  </div>
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (lora.total / LORA_MAX) * 100)}%` }} />
                    <span className="absolute inset-y-0 w-0.5 bg-paper/60" style={{ left: `${(LORA_MIN / LORA_MAX) * 100}%` }} aria-hidden />
                  </div>
                </div>
                <button onClick={downloadAllLora} disabled={!!downloading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
                  {downloading ? <><Loader2 size={14} className="animate-spin" /> {downloading}</> : <><Download size={14} /> Descargar todas ({lora.total})</>}
                </button>
              </div>

              {lora.groups.map((g) => (
                <div key={g.key} className="mb-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">{g.label} · {g.items.length}</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                    {g.items.map((it, i) => (
                      <a key={i} href={it.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Su biblioteca: carpetas con portada → dentro, subir + ver fotos ── */}
      {!folder ? (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
            Biblioteca de {creator.full_name} · {(folders || []).length} carpetas — toca una para ver y subir
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(folders || []).map((f) => {
              const as = f.assets || [];
              const nV = as.filter((a) => a.type === 'video').length;
              const nP = as.length - nV;
              const cover = as.find((a) => a.type !== 'video' && srcOf(a)) || as.find((a) => srcOf(a)) || as[0];
              return (
                <button key={f.id} onClick={() => setFolderSel(f.id)}
                  className="group overflow-hidden rounded-2xl border border-line bg-card text-left transition-colors hover:border-brand/40">
                  <div className="relative aspect-[4/3] w-full bg-ink-2">
                    {cover && srcOf(cover) ? (
                      cover.type === 'video'
                        ? <video src={srcOf(cover)} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={srcOf(cover)} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-paper-dim"><Folder size={26} /></div>
                    )}
                    <div className="absolute left-1.5 top-1.5 flex gap-1">
                      {nP > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-bold text-sky-100 backdrop-blur"><ImageIcon size={10} /> {nP}</span>}
                      {nV > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-500/25 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-100 backdrop-blur"><Film size={10} /> {nV}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-2.5">
                    <Folder size={13} className="shrink-0 text-brand" />
                    <span className="truncate text-sm font-medium text-paper">{f.name}</span>
                  </div>
                </button>
              );
            })}
            {/* Nueva entrega — fotos y videos juntos, se separan solos */}
            <form onSubmit={createFolder} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ink-2/50 p-4">
              <FolderPlus size={20} className="text-paper-dim" />
              <p className="flex items-center gap-1 text-[10px] font-medium text-paper-dim"><ImageIcon size={11} className="text-sky-300" /><Film size={11} className="text-fuchsia-300" /> Fotos y videos juntos</p>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nueva entrega…"
                className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-center text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <button type="submit" disabled={creating || !newName.trim()}
                className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-40">
                {creating ? 'Creando…' : 'Crear entrega'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => setFolderSel(null)} className="inline-flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-paper">
              <ArrowLeft size={15} /> Carpetas de {creator.full_name}
            </button>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-paper">
              <span className="text-paper">{folder.name}</span>
              {(() => { const as = folder.assets || []; const nV = as.filter((a) => a.type === 'video').length; const nP = as.length - nV; return (
                <span className="flex items-center gap-2 text-[11px] font-medium text-paper-mute">
                  <span className="inline-flex items-center gap-1"><ImageIcon size={12} className="text-sky-300" /> {nP} fotos</span>
                  <span className="inline-flex items-center gap-1"><Film size={12} className="text-fuchsia-300" /> {nV} videos</span>
                </span>
              ); })()}
            </div>
          </div>

          {/* Subida comodísima — la carpeta ya está elegida */}
          <div className="mt-3 rounded-2xl border border-brand/25 bg-brand/[0.04] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {openReqs.length > 0 && (
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">¿Responde a un pedido? — se marca entregado solo</span>
                  <select value={reqSel} onChange={(e) => setReqSel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
                    <option value="">No — entrega libre</option>
                    {openReqs.map((r) => <option key={r.id} value={r.id}>{r.title} · {REQ_STATUS[r.status]?.l || r.status}</option>)}
                  </select>
                </label>
              )}
              <label className={`block ${openReqs.length > 0 ? '' : 'sm:col-span-2'}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">¿Para qué se hizo? — la creadora lo ve</span>
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ej. Pack PPV de bienvenida para la lista"
                  className="mt-1.5 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!!uploading}
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading && e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files); }}
              className={`mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition-colors disabled:opacity-60 ${
                dragOver ? 'border-brand bg-brand/10' : 'border-brand/30 bg-ink-2 hover:border-brand/60'}`}>
              {uploading ? (
                <>
                  <span className="flex items-center gap-2 text-sm font-medium text-paper"><Loader2 size={17} className="animate-spin" /> Subiendo {uploading} para {creator.full_name}…</span>
                  <span className="text-[11px] text-paper-dim">No cierres esta ventana hasta que termine</span>
                </>
              ) : (
                <>
                  <span className={`grid h-11 w-11 place-items-center rounded-full ${dragOver ? 'bg-brand text-on-accent' : 'bg-brand/10 text-brand'}`}><Upload size={20} /></span>
                  <span className="flex items-center gap-2">
                    <Avatar src={creator.avatar_url} name={creator.full_name} size="xs" />
                    <span className="text-sm font-medium text-paper">{dragOver ? 'Suelta para subir' : <>Arrastra fotos y videos aquí o haz clic — «{folder.name}» de <span className="text-brand">{creator.full_name}</span></>}</span>
                  </span>
                  <span className="text-[11px] text-paper-dim">Fotos y videos JUNTOS · el sistema los separa solo · puedes soltar muchos a la vez · le llega al instante a ella{creator.handle ? ` (@${creator.handle})` : ''} y a su agencia</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
          </div>

          {/* Lo que ya vive en la entrega — separado en Fotos y Videos */}
          {(folder.assets || []).length > 0 ? (() => {
            const as = [...(folder.assets || [])].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || ''));
            const photos = as.filter((a) => a.type !== 'video');
            const videos = as.filter((a) => a.type === 'video');
            const Grid = ({ label, Icon, items, color }) => items.length === 0 ? null : (
              <div className="mt-4">
                <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${color}`}><Icon size={12} /> {label} · {items.length}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((a) => (
                    <div key={a.id} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                      {a.type === 'video'
                        ? <video src={srcOf(a)} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={srcOf(a)} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                      {a.type === 'video' && <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fuchsia-200 backdrop-blur">Video</span>}
                      <button onClick={() => delAsset(a)} disabled={delId === a.id} title="Borrar pieza"
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-ink/70 text-paper-dim opacity-0 backdrop-blur transition-all hover:bg-rose-500/80 hover:text-white group-hover:opacity-100 disabled:opacity-100">
                        {delId === a.id ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
                      </button>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/60 to-transparent p-2 pt-6">
                        <p className="truncate text-[11px] font-medium text-paper">{a.title || 'Sin título'}</p>
                        {a.deliver_date && <p className="text-[10px] text-paper-dim">{new Date(a.deliver_date).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
            return (<>
              <Grid label="Fotos" Icon={ImageIcon} items={photos} color="text-sky-300" />
              <Grid label="Videos" Icon={Film} items={videos} color="text-fuchsia-300" />
            </>);
          })() : (
            <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-paper-dim">Entrega vacía — sube fotos y videos arriba.</p>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Mi producción: cuánto ha subido ESTE uploader (rango + por creadora) ── */
function MiProduccionTab({ mine, creators }) {
  const [range, setRange] = useState('week'); // week | month | all
  const nameById = {}; creators.forEach((c) => { nameById[c.id] = c.full_name || 'Creadora'; });
  const weekAgoISO = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);
  const rows = mine.filter((a) => {
    const d = a.created_at || '';
    if (range === 'week') return d.slice(0, 10) >= weekAgoISO;
    if (range === 'month') return d.slice(0, 7) === monthKey;
    return true;
  });
  const photos = rows.filter((a) => a.type !== 'video').length;
  const videos = rows.length - photos;
  const per = {};
  rows.forEach((a) => { const k = a.creator_id; if (!per[k]) per[k] = { id: k, n: 0 }; per[k].n++; });
  const perList = Object.values(per).sort((a, b) => b.n - a.n);
  const rangeLabel = range === 'week' ? 'últimos 7 días' : range === 'month' ? 'este mes' : 'todo el histórico';

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {[['week', '7 días'], ['month', 'Este mes'], ['all', 'Todo']].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${range === v ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Sparkles} label="Piezas subidas" value={nf(rows.length)} sub={rangeLabel} />
        <Stat icon={ImageIcon} label="Fotos" value={nf(photos)} />
        <Stat icon={Film} label="Videos" value={nf(videos)} />
      </div>
      <div className="mt-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Por creadora · de más a menos</div>
        {perList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Todavía no subiste nada en este rango.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            {perList.map((m, i) => (
              <div key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <span className="min-w-0 truncate text-sm font-medium text-paper">{nameById[m.id] || 'Creadora'}</span>
                <span className="shrink-0 font-display text-sm font-bold text-brand">{nf(m.n)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Verificaciones: recibir y aprobar/rechazar IDs (capacidad 'kyc') ───── */
function KycTab({ flash }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    // profiles read is self-or-admin, so use the capability-gated RPC to list
    // the pending queue (works for any staff with the 'kyc' capability).
    const { data: pend } = await supabase.rpc('kyc_queue');
    const out = [];
    for (const p of pend || []) {
      const { data: docs } = await supabase.from('kyc_documents').select('doc_type, storage_path').eq('user_id', p.id);
      const imgs = {};
      for (const d of docs || []) {
        if (!d.storage_path) continue;
        if (d.storage_path.startsWith('/') || d.storage_path.startsWith('http')) { imgs[d.doc_type] = d.storage_path; continue; }
        const { data: s } = await supabase.storage.from('kyc').createSignedUrl(d.storage_path, 600);
        if (s?.signedUrl) imgs[d.doc_type] = s.signedUrl;
      }
      out.push({ ...p, docs: imgs });
    }
    setList(out);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function review(userId, approve) {
    let reason = null;
    if (!approve) { reason = window.prompt('Motivo del rechazo (lo verá la creadora):', ''); if (reason === null) return; }
    setBusy(userId);
    const { error } = await getSupabase().rpc('review_kyc', { target: userId, approve, reason: approve ? null : reason });
    setBusy(null);
    if (error) { flash('Error: ' + error.message); return; }
    setList((l) => l.filter((u) => u.id !== userId));
    sendEmail(approve ? 'approved' : 'rejected', userId, approve ? '' : (reason || ''));
    await getSupabase().from('notifications').insert({ user_id: userId, kind: approve ? 'approved' : 'rejected', meta: approve ? {} : { reason: reason || '' } });
    flash(approve ? 'Identidad aprobada' : 'Identidad rechazada');
  }

  const DOC_LABEL = { id_front: 'ID frente', id_back: 'ID reverso', selfie_id: 'Selfie con ID' };
  if (list === null) return <p className="mt-6 text-sm text-paper-dim">Cargando…</p>;

  const t = q.trim().toLowerCase();
  const view = list.filter((u) => !t || `${u.legal_first_name || ''} ${u.legal_last_name || ''} ${u.full_name || ''} ${u.stage_name || ''} ${u.country || ''}`.toLowerCase().includes(t));

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-paper-mute">Identidades por revisar. Aprueba o rechaza con un motivo.</p>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">{list.length} en cola</span>
      </div>
      {list.length > 0 && (
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, alias o país…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
      )}
      {list.length === 0 && <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-paper-dim">No hay identidades pendientes. Todo al día.</p>}
      {list.length > 0 && view.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Ninguna coincide con tu búsqueda.</p>}
      {view.map((u) => (
        <div key={u.id} className="rounded-2xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-paper">{u.legal_first_name || u.full_name} {u.legal_last_name || ''}</p>
              <p className="mt-0.5 text-xs text-paper-dim">
                {u.stage_name && <>«{u.stage_name}» · </>}{u.country || '—'}{u.date_of_birth ? ` · ${u.date_of_birth}` : ''}
                {u.consent_at ? ' · Consentimiento firmado' : ' · Sin consentimiento'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => review(u.id, false)} disabled={busy === u.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60">
                <X size={15} /> Rechazar
              </button>
              <button onClick={() => review(u.id, true)} disabled={busy === u.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
                {busy === u.id ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Aprobar</>}
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {['id_front', 'id_back', 'selfie_id'].map((k) => (
              <div key={k}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">{DOC_LABEL[k]}</p>
                {u.docs[k] ? (
                  <a href={u.docs[k]} target="_blank" rel="noreferrer" className="block aspect-[3/2] overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.docs[k]} alt={DOC_LABEL[k]} className="h-full w-full object-cover transition-transform hover:scale-105" />
                  </a>
                ) : (
                  <div className="grid aspect-[3/2] place-items-center rounded-xl border border-dashed border-line text-xs text-paper-dim">Falta</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Pedidos: entrantes de agencias/creadoras · el equipo toma/entrega ──── */
function PedidosTab({ creators, staff, me, flash, ping }) {
  const [requests, setRequests] = useState(null);
  const [q, setQ] = useState('');            // buscador
  const [fStatus, setFStatus] = useState('all');
  const [fModel, setFModel] = useState('all');
  const nameOf = (id) => creators.find((c) => c.id === id)?.full_name
    || staff.find((s) => s.id === id)?.full_name || '—';

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data }, { data: msgs }] = await Promise.all([
      supabase.from('requests')
        .select('id, creator_id, chatter_id, producer_id, title, description, status, due_date, created_at, ref_images')
        .order('created_at', { ascending: false }),
      supabase.from('request_messages').select('*').order('created_at'),
    ]);
    const rows = data || [];
    // Sign reference photos so the worker can see the examples.
    const allPaths = rows.flatMap((r) => r.ref_images || []);
    let urlMap = {};
    if (allPaths.length) {
      const { data: signed } = await supabase.storage.from('request-refs').createSignedUrls(allPaths, 3600);
      (signed || []).forEach((s) => { if (s.signedUrl) urlMap[s.path] = s.signedUrl; });
    }
    const byReq = {};
    (msgs || []).forEach((m) => { (byReq[m.request_id] = byReq[m.request_id] || []).push(m); });
    setRequests(rows.map((r) => ({ ...r, _refUrls: (r.ref_images || []).map((p) => urlMap[p]).filter(Boolean), _msgs: byReq[r.id] || [] })));
  }, []);

  useEffect(() => { load(); }, [load, ping]);

  async function setStatus(req, status) {
    const patch = { status };
    if (status === 'in_progress' && !req.producer_id) patch.producer_id = me.id;
    if (status === 'delivered') patch.delivered_at = new Date().toISOString();
    const { error } = await getSupabase().from('requests').update(patch).eq('id', req.id);
    if (error) { flash('Error: ' + error.message); return; }
    // La modelo (y su agencia) ven el cambio de estado al instante en sus cuentas.
    flash(status === 'in_progress' ? 'Pedido tomado — ella lo ve «En proceso»' : 'Pedido completado — ella lo ve «Completado»');
    load();
  }

  // Pregunta/mensaje del equipo → copia a la modelo Y su agencia (RPC notifica).
  async function sendMsg(req, body, clear) {
    if (!body.trim()) return;
    const { error } = await getSupabase().rpc('post_request_message', { rid: req.id, body_text: body.trim() });
    if (error) { flash('Error: ' + error.message); return; }
    clear();
    flash('Enviado a la modelo y su agencia');
    load();
  }

  // Buscador + filtros: por texto, estado y modelo.
  const view = (requests || []).filter((r) => {
    if (fStatus !== 'all' && r.status !== fStatus) return false;
    if (fModel !== 'all' && r.creator_id !== fModel) return false;
    const t = q.trim().toLowerCase();
    if (t && !(`${r.title} ${r.description || ''} ${nameOf(r.creator_id)}`.toLowerCase().includes(t))) return false;
    return true;
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pedido, detalle o modelo…"
            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        </div>
        <select value={fModel} onChange={(e) => setFModel(e.target.value)}
          className="rounded-full border border-line bg-card px-3.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
          <option value="all">Todas las modelos</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[['all', 'Todos'], ['pending', 'Pendientes'], ['in_progress', 'En producción'], ['delivered', 'Entregados']].map(([v, l]) => {
          const n = v === 'all' ? (requests || []).length : (requests || []).filter((r) => r.status === v).length;
          return (
            <button key={v} onClick={() => setFStatus(v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                fStatus === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
              {l} · {n}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {requests === null && <p className="text-paper-dim">Cargando…</p>}
        {requests?.length === 0 && <p className="rounded-2xl border border-line bg-card p-8 text-center text-paper-dim">No hay pedidos entrantes todavía.</p>}
        {requests?.length > 0 && view.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Ningún pedido coincide con tu búsqueda.</p>}
        {view.map((r) => {
          const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
          return (
            <div key={r.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-paper">{r.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.l}</span>
                  </div>
                  <div className="mt-1 text-xs text-paper-dim">
                    Para <span className="text-paper-mute">{nameOf(r.creator_id)}</span>
                    {' · '}{r.chatter_id === r.creator_id ? 'lo pidió ella' : 'lo pidió su agencia'}
                    {' · '}{new Date(r.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}
                    {r.due_date && <> · para el {r.due_date}</>}
                  </div>
                  {r.description && <p className="mt-1.5 text-sm text-paper-mute">{r.description}</p>}
                  {r._refUrls?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r._refUrls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-14 w-14 overflow-hidden rounded-lg border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="referencia" className="h-full w-full object-cover transition-transform hover:scale-105" />
                        </a>
                      ))}
                      <span className="self-center text-[11px] text-paper-dim">ejemplos de lo que quiere</span>
                    </div>
                  )}
                </div>
                {/* Un solo botón por etapa — imposible confundirse:
                    Enviado → Tomar pedido · En proceso → Marcar completado · Completado → nada */}
                {r.status === 'pending' && (
                  <button onClick={() => setStatus(r, 'in_progress')}
                    className="shrink-0 rounded-full bg-sky-500/90 px-4 py-2.5 text-xs font-semibold text-ink shadow-glow-sm transition-transform hover:scale-[1.03]">
                    Tomar pedido →
                  </button>
                )}
                {r.status === 'in_progress' && (
                  <button onClick={() => setStatus(r, 'delivered')}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-4 py-2.5 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
                    <Check size={13} /> Marcar completado
                  </button>
                )}
              </div>

              {r.status === 'in_progress' && r.producer_id && (
                <p className="mt-2 text-[11px] text-sky-300">En manos de {nameOf(r.producer_id)} — al completarlo, súbele el contenido desde Creadoras y amárralo a este pedido.</p>
              )}

              {/* Mensajes del pedido — llegan a la modelo Y a su agencia, siempre */}
              <ReqThread req={r} onSend={sendMsg} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hilo de mensajes de un pedido: preguntas del equipo y respuestas de la
// modelo/agencia. Cada mensaje notifica a todas las partes (RPC).
function ReqThread({ req, onSend }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const n = req._msgs?.length || 0;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper-mute transition-colors hover:text-paper">
        <MessageSquare size={13} className={n ? 'text-brand' : ''} />
        {n ? `${n} mensaje${n === 1 ? '' : 's'}` : 'Preguntar a la modelo y su agencia'} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {(req._msgs || []).map((m) => (
            <div key={m.id} className={`rounded-xl border p-2.5 text-sm ${m.author_role === 'team' ? 'border-brand/25 bg-brand/[0.05]' : 'border-line bg-ink-2'}`}>
              <div className="mb-0.5 flex items-center gap-2 text-[11px] text-paper-dim">
                <span className="font-semibold text-paper-mute">{MSG_FROM[m.author_role] || m.author_role}</span>
                {m.author_name && <span>· {m.author_name}</span>}
                <span>· {new Date(m.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</span>
              </div>
              <p className="text-paper-mute">{m.body}</p>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onSend(req, body, () => setBody('')); }}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pregunta o aclaración — le llega a la modelo y a su agencia…"
              className="min-w-0 flex-1 rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <button type="submit" disabled={!body.trim()}
              className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm disabled:opacity-50">Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Feedback de creadoras ──────────────────────────────────────────────── */
function FeedbackTab({ creators, flash }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [fKind, setFKind] = useState('all');
  const nameOf = (id) => creators.find((c) => c.id === id)?.full_name || '—';

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('feedback')
      .select('id, creator_id, kind, message, resolved, created_at, asset_id, author_role')
      .order('created_at', { ascending: false });
    // Connect each feedback to ITS photo so the worker sees exactly which piece.
    const ids = [...new Set((data || []).map((f) => f.asset_id).filter(Boolean))];
    const assetMap = {};
    if (ids.length) {
      const { data: as } = await supabase.from('assets').select('id, storage_path, type, title').in('id', ids);
      const toSign = (as || []).filter((a) => !isDirect(a.storage_path)).map((a) => a.storage_path);
      const urlMap = {};
      if (toSign.length) {
        const { data: signed } = await supabase.storage.from('deliveries').createSignedUrls(toSign, 3600);
        (signed || []).forEach((s, i) => { if (s?.signedUrl) urlMap[toSign[i]] = s.signedUrl; });
      }
      (as || []).forEach((a) => { assetMap[a.id] = { ...a, url: isDirect(a.storage_path) ? a.storage_path : (urlMap[a.storage_path] || '') }; });
    }
    setItems((data || []).map((f) => ({ ...f, _asset: assetMap[f.asset_id] || null })));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(f) {
    const supabase = getSupabase();
    const { error } = await supabase.from('feedback').update({ resolved: !f.resolved }).eq('id', f.id);
    if (error) { flash('Error: ' + error.message); return; }
    if (!f.resolved) {
      await supabase.from('notifications').insert({ user_id: f.creator_id, kind: 'feedback_resolved', meta: {} });
    }
    load();
  }

  const t = q.trim().toLowerCase();
  const view = (items || []).filter((f) => {
    if (fKind === 'love' && f.kind !== 'love') return false;
    if (fKind === 'change' && f.kind === 'love') return false;
    if (fKind === 'open' && (f.resolved || f.kind === 'love')) return false;
    if (t && !(`${nameOf(f.creator_id)} ${f.message || ''} ${f._asset?.title || ''}`.toLowerCase().includes(t))) return false;
    return true;
  });

  return (
    <div className="mt-6 space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en feedback por creadora, mensaje o pieza…"
          className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[['all', 'Todo'], ['open', 'Cambios sin resolver'], ['change', 'Piden cambio'], ['love', 'Les encantó']].map(([v, l]) => {
          const n = v === 'all' ? (items || []).length
            : v === 'open' ? (items || []).filter((f) => !f.resolved && f.kind !== 'love').length
            : v === 'change' ? (items || []).filter((f) => f.kind !== 'love').length
            : (items || []).filter((f) => f.kind === 'love').length;
          return (
            <button key={v} onClick={() => setFKind(v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                fKind === v ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
              {l} · {n}
            </button>
          );
        })}
      </div>
      {items === null && <p className="text-paper-dim">Cargando…</p>}
      {items?.length === 0 && <p className="rounded-2xl border border-line bg-card p-8 text-center text-paper-dim">Sin feedback todavía.</p>}
      {items?.length > 0 && view.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Nada coincide con tu búsqueda.</p>}
      {view.map((f) => (
        <div key={f.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${f.resolved ? 'border-line bg-card/50 opacity-70' : f.kind !== 'love' ? 'border-amber-500/25 bg-card' : 'border-line bg-card'}`}>
          <div className="flex min-w-0 items-start gap-3">
            {/* La foto exacta a la que le dio love / pidió el cambio */}
            {f._asset?.url && (
              f._asset.type === 'video'
                ? <video src={f._asset.url} className="h-20 w-16 shrink-0 rounded-lg border border-line object-cover" muted playsInline preload="metadata" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={f._asset.url} alt={f._asset.title || ''} className="h-20 w-16 shrink-0 rounded-lg border border-line object-cover" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-paper">{nameOf(f.creator_id)}</span>
                {f.kind === 'love' ? (
                  <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] text-brand">Le encantó</span>
                ) : (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">Pide cambio</span>
                )}
                <span className="rounded-full bg-hair/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-paper-dim">{f.author_role === 'agency' ? 'Agencia' : 'Modelo'}</span>
                <span className="text-[11px] text-paper-dim">
                  {f._asset?.title ? `«${f._asset.title}» · ` : ''}{new Date(f.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {f.message && <p className="mt-1.5 text-sm text-paper-mute">{f.message}</p>}
            </div>
          </div>
          <button onClick={() => toggle(f)}
            className={`shrink-0 rounded-full border px-3 py-2.5 text-xs font-semibold transition-colors ${
              f.resolved ? 'border-line text-paper-dim hover:text-paper' : 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20'}`}>
            {f.resolved ? 'Reabrir' : 'Resuelto'}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Métricas: embudo de creadoras + pedidos (función 'metrics') ────────── */
// Small stat tile with an optional month-over-month delta chip.
function Stat({ icon: Icon, label, value, sub, delta }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={17} /></span>
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${delta >= 0 ? 'text-brand' : 'text-rose-300'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-2xl font-semibold leading-none text-paper">{value}</div>
      <div className="mt-1.5 text-sm font-medium text-paper">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-paper-dim">{sub}</div>}
    </div>
  );
}

function AgencyRow({ r, total }) {
  const share = total > 0 ? Math.round((Number(r.revenue) / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar src={r.avatar_url} name={r.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-paper">{r.name}</span>
            {r.handle && <span className="truncate text-[11px] text-paper-dim">@{r.handle}</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-paper-dim">{nf(r.models)} modelos · {nf(r.pieces)} piezas</div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand/15"><span className="block h-full rounded-full bg-brand" style={{ width: `${share}%` }} /></span>
            <span className="text-[10px] font-semibold text-paper-dim">{share}%</span>
          </div>
        </div>
        <div className="shrink-0 text-right font-display text-lg font-semibold text-paper">{money(r.revenue)}</div>
      </div>
    </div>
  );
}

/* ── Producción: seccionado — este mes · histórico · por modelo ─────────── */
function ProduccionTab({ books }) {
  if (!books) return <p className="mt-6 text-sm text-paper-dim">Cargando…</p>;
  const delta = books.prev_pieces > 0 ? Math.round(((books.month_pieces - books.prev_pieces) / books.prev_pieces) * 100) : null;
  const top = [...(books.top_creators || [])].filter((c) => c.pieces > 0).sort((a, b) => b.pieces - a.pieces);
  const max = top[0]?.pieces || 1;
  return (
    <div className="mt-6 space-y-6">
      {/* Este mes */}
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Este mes</p>
        <div className="rounded-2xl border border-brand/25 bg-brand/[0.05] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-display text-3xl font-semibold text-paper">{nf(books.month_pieces)}</div>
              <div className="mt-1 text-xs text-paper-dim">piezas producidas este mes</div>
            </div>
            <div className="text-right">
              {delta !== null && (
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${delta >= 0 ? 'text-brand' : 'text-rose-300'}`}>
                  {delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{delta >= 0 ? '+' : ''}{delta}%
                </span>
              )}
              <div className="mt-0.5 text-[11px] text-paper-dim">vs. {nf(books.prev_pieces)} el mes pasado</div>
            </div>
          </div>
        </div>
      </section>

      {/* Histórico */}
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Histórico de la empresa</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={ImageIcon} label="Piezas totales" value={nf(books.pieces)} sub="creadas desde el inicio" />
          <Stat icon={ImageIcon} label="Fotos" value={nf(books.photos)} sub="entregadas" />
          <Stat icon={Film} label="Videos" value={nf(books.videos)} sub="clips entregados" />
        </div>
      </section>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Producción por modelo · quién genera más contenido</p>
        <div className="space-y-2">
          {top.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Aún no hay producción.</p>}
          {top.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
              <Avatar src={c.avatar_url} name={c.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-paper">{c.name}</span>{c.handle && <span className="truncate text-[11px] text-paper-dim">@{c.handle}</span>}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand/15"><span className="block h-full rounded-full bg-brand" style={{ width: `${(c.pieces / max) * 100}%` }} /></div>
              </div>
              <div className="shrink-0 text-right"><span className="font-display text-base font-semibold text-paper">{nf(c.pieces)}</span><span className="block text-[10px] text-paper-dim">piezas</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Gestionar agencias (acceso 'agencies'): crear + vincular modelos ───── */
// Una creadora = una sola agencia. Al tocar un chip se abre un pop-up de
// seguridad que avisa si la modelo va a SALIR de su agencia actual.
function GestAgenciasTab({ agencies, creators, flash, reload }) {
  const supabase = getSupabase();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState(null);
  const [confirm, setConfirm] = useState(null); // { creatorId, creatorName, toAgencyId, toAgencyName, fromAgencyName, action }
  const [saving, setSaving] = useState(false);

  const inputCls = 'w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60';

  // creatorId → { agencyId, agencyName } de su agencia actual (si tiene una).
  const agencyOfCreator = {};
  agencies.forEach((a) => (a.creator_ids || []).forEach((cid) => { agencyOfCreator[cid] = { id: a.id, name: a.full_name }; }));
  const nameOfCreator = (id) => { const c = creators.find((x) => x.id === id); return c ? c.full_name : 'Creadora'; };

  async function createAgency(e) {
    e.preventDefault();
    setErr(''); setCreds(null);
    if (!f.full_name.trim()) { setErr('Pon el nombre de la agencia.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { full_name: f.full_name.trim(), email: f.email.trim(), password: pw, role: 'agency' },
    });
    setBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo crear la agencia.'); return; }
    if (out.generated_email) setCreds({ email: out.login_email, password: pw });
    else { flash(`Agencia creada${out.invited ? ` — invitación enviada a ${out.login_email || f.email.trim()}` : ''}`); setOpen(false); }
    setF({ full_name: '', email: '' });
    reload && reload();
  }

  async function doAssign() {
    if (!confirm) return;
    setSaving(true);
    const { error } = await supabase.rpc('staff_set_creator_agency', { p_creator: confirm.creatorId, p_agency: confirm.toAgencyId });
    setSaving(false);
    if (error) { flash('Error: ' + error.message); return; }
    flash(confirm.action === 'remove' ? `${confirm.creatorName} quedó sin agencia`
        : confirm.action === 'move' ? `${confirm.creatorName}: de ${confirm.fromAgencyName} a ${confirm.toAgencyName}`
        : `${confirm.creatorName} asignada a ${confirm.toAgencyName}`);
    setConfirm(null);
    reload && reload();
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-paper">Agencias</h2>
          <p className="text-xs text-paper-dim">Crea agencias y decide qué modelos maneja cada una. Cada creadora pertenece a una sola agencia.</p>
        </div>
        {!open && (
          <button onClick={() => { setOpen(true); setErr(''); setCreds(null); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
            <Building2 size={15} /> Crear agencia
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={createAgency} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-paper-dim">Nombre de la agencia</label>
              <input value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} placeholder="ej. Nova Management" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-paper-dim">Correo (para la invitación) — opcional</label>
              <input value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} type="email" placeholder="agencia@correo.com" className={inputCls} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-paper-dim">Con correo le llega una invitación para poner su contraseña y entrar como agencia. Sin correo te damos un login y clave temporal para entregar a mano.</p>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          {creds && (
            <div className="mt-3 rounded-xl border border-brand/30 bg-ink-2 p-3 text-xs text-paper">
              <p className="font-semibold text-brand">Cuenta creada — entrega estos datos:</p>
              <p className="mt-1">Login: <span className="font-mono">{creds.email}</span></p>
              <p>Clave temporal: <span className="font-mono">{creds.password}</span></p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Crear agencia
            </button>
            <button type="button" onClick={() => { setOpen(false); setErr(''); setCreds(null); }} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
          </div>
        </form>
      )}

      {agencies.length === 0 && !open && (
        <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Aún no hay agencias. Crea la primera con el botón de arriba.</p>
      )}

      <div className="space-y-3">
        {agencies.map((ag) => {
          const set = new Set(ag.creator_ids || []);
          return (
            <div key={ag.id} className="rounded-2xl border border-line bg-card/60 p-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-brand" />
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold text-paper">{ag.full_name}</p>
                  <p className="truncate text-[11px] text-paper-dim">{ag.email} · {set.size} modelo{set.size === 1 ? '' : 's'}</p>
                </div>
              </div>
              <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Modelos que maneja</p>
              <div className="flex flex-wrap gap-2">
                {creators.map((cr) => {
                  const on = set.has(cr.id);
                  const other = !on ? agencyOfCreator[cr.id] : null; // pertenece a OTRA agencia
                  return (
                    <button key={cr.id}
                      onClick={() => setConfirm({
                        creatorId: cr.id,
                        creatorName: cr.full_name || 'Creadora',
                        toAgencyId: on ? null : ag.id,
                        toAgencyName: ag.full_name,
                        fromAgencyName: on ? ag.full_name : (other ? other.name : null),
                        action: on ? 'remove' : (other ? 'move' : 'assign'),
                      })}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
                      {on ? <Check size={12} /> : <Plus size={12} />}
                      {cr.full_name}
                      {other && <span className="text-amber-400">· {other.name}</span>}
                    </button>
                  );
                })}
                {creators.length === 0 && <span className="text-xs text-paper-dim">No hay creadoras todavía.</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pop-up de seguridad: asignar / mover (avisa que sale) / quitar. */}
      {confirm && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-black/70 p-4" onClick={() => !saving && setConfirm(null)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
              <Building2 size={13} /> {confirm.action === 'remove' ? 'Quitar de la agencia' : confirm.action === 'move' ? 'Mover de agencia' : 'Asignar a la agencia'}
            </div>
            <h3 className="font-display text-xl font-semibold text-paper">
              {confirm.action === 'remove' ? `¿Quitar a ${confirm.creatorName}?`
                : confirm.action === 'move' ? `¿Mover a ${confirm.creatorName}?`
                : `¿Asignar a ${confirm.creatorName}?`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-paper-mute">
              {confirm.action === 'remove' ? <>{confirm.creatorName} dejará de ser gestionada por <span className="font-semibold text-paper">{confirm.fromAgencyName}</span>. Quedará sin agencia.</>
                : confirm.action === 'move' ? <>{confirm.creatorName} <span className="font-semibold text-amber-400">saldrá de {confirm.fromAgencyName}</span> y pasará a <span className="font-semibold text-paper">{confirm.toAgencyName}</span>. Una creadora solo puede estar en una agencia.</>
                : <>{confirm.creatorName} pasará a ser gestionada por <span className="font-semibold text-paper">{confirm.toAgencyName}</span>, que verá su contenido, hará pedidos y registrará sus ventas.</>}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} disabled={saving} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
              <button onClick={doAssign} disabled={saving}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60 ${confirm.action === 'remove' ? 'bg-red-500/90 text-white' : 'bg-brand text-on-accent'}`}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : confirm.action === 'remove' ? <X size={15} /> : <Check size={15} />}
                {confirm.action === 'remove' ? 'Sí, quitar' : confirm.action === 'move' ? 'Sí, mover' : 'Sí, asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Suscripciones y cobros (acceso 'billing'): planes, cortesías, vencimiento ─ */
function CobrosTab({ rows, flash, reload }) {
  const supabase = getSupabase();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const todayISO = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  async function act(creator, action, extra = {}, msg) {
    setSavingId(creator);
    const { error } = await supabase.rpc('staff_set_subscription', { p_creator: creator, p_action: action, ...extra });
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return; }
    flash(msg || 'Suscripción actualizada');
    reload && reload();
  }

  const list = rows.filter((c) => !q.trim() || (c.full_name || '').toLowerCase().includes(q.toLowerCase()) || (c.handle || '').toLowerCase().includes(q.toLowerCase()));
  const daysLeft = (c) => { if (!c.subscription_ends_at) return null; return Math.floor((new Date(c.subscription_ends_at + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 864e5); };
  const isPaid = (c) => c.payment_status === 'paid' || ['active', 'paid'].includes(c.onboarding_status);

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper">Suscripciones y cobros</h2>
        <p className="text-xs text-paper-dim">Activa planes, da cortesías y ajusta fechas de vencimiento — igual que el administrador.</p>
      </div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar creadora…"
          className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      </div>

      <div className="space-y-2">
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">No hay creadoras que coincidan.</p>}
        {list.map((c) => {
          const d = daysLeft(c);
          const paid = isPaid(c);
          const expOpen = openId === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-line bg-card/60">
              <button onClick={() => setOpenId(expOpen ? null : c.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <Avatar url={c.avatar_url} name={c.full_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-paper">{c.full_name}</p>
                  <p className="truncate text-[11px] text-paper-dim">
                    {paid ? <span className="text-emerald-400">Activa</span> : <span className="text-paper-dim">Inactiva</span>}
                    {c.plan && <> · {c.plan.toUpperCase()}</>}
                    {c.comp_until && <> · <span className="text-amber-400">Cortesía</span></>}
                    {d != null && <> · vence en {d} día{d === 1 ? '' : 's'}</>}
                  </p>
                </div>
                {savingId === c.id ? <Loader2 size={15} className="animate-spin text-brand" /> : <ChevronDown size={16} className={`text-paper-dim transition-transform ${expOpen ? 'rotate-180' : ''}`} />}
              </button>

              {expOpen && (
                <div className="space-y-4 border-t border-line p-4">
                  {/* Plan */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Plan</p>
                    <div className="flex flex-wrap gap-2">
                      {PACKS.map((p) => (
                        <button key={p.key} disabled={savingId === c.id}
                          onClick={() => act(c.id, 'plan', { p_plan: p.key, p_ends_at: c.subscription_ends_at || in30 }, `Plan: ${p.name}`)}
                          className={`rounded-full border px-3 py-1.5 text-xs ${c.plan === p.key ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:text-paper'}`}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Vencimiento + estado */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Vence el</p>
                      <input type="date" defaultValue={c.subscription_ends_at || ''} disabled={savingId === c.id}
                        onChange={(e) => act(c.id, 'ends_at', { p_ends_at: e.target.value || null }, 'Fecha de vencimiento actualizada')}
                        className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Cortesía (gratis) hasta</p>
                      <input type="date" defaultValue={c.comp_until || ''} disabled={savingId === c.id}
                        onChange={(e) => act(c.id, 'comp', { p_comp_until: e.target.value || null }, 'Cortesía actualizada')}
                        className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
                    </div>
                  </div>
                  {/* Nota */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Nota de facturación</p>
                    <input defaultValue={c.billing_note || ''} disabled={savingId === c.id} placeholder="ej. 1 mes gratis de cortesía"
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (c.billing_note || '')) act(c.id, 'note', { p_note: v }, 'Nota guardada'); }}
                      className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  </div>
                  {/* Activar / desactivar */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!paid ? (
                      <button disabled={savingId === c.id} onClick={() => act(c.id, 'activate', { p_ends_at: c.subscription_ends_at || in30 }, 'Suscripción ACTIVADA')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        <Check size={15} /> Activar suscripción
                      </button>
                    ) : (
                      <button disabled={savingId === c.id} onClick={() => act(c.id, 'deactivate', {}, 'Suscripción marcada INACTIVA')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-60">
                        <X size={15} /> Marcar inactiva
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Agencias: cuántas hay y qué gestiona cada una ──────────────────────── */
function AgenciasTab({ books }) {
  if (!books) return <p className="mt-6 text-sm text-paper-dim">Cargando…</p>;
  const rows = [...(books.agency_rows || [])];
  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Building2} label="Agencias" value={nf(books.agencies)} sub="en la plataforma" />
        <Stat icon={Users} label="Creadoras" value={nf(books.creators)} sub="en la plataforma" />
        <Stat icon={ImageIcon} label="Contenido" value={nf(books.pieces)} sub="piezas producidas" />
        <Stat icon={DollarSign} label="Ingresos" value={money(books.revenue)} sub="generados en total" />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Cada agencia · modelos, contenido e ingresos</p>
        <div className="space-y-2">
          {rows.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Aún no hay agencias.</p>}
          {rows.map((r) => <AgencyRow key={r.id} r={r} total={Number(books.revenue)} />)}
        </div>
      </div>
    </div>
  );
}

/* ── Equipo: crear puestos y asignar funciones (función 'team') ─────────── */
// 'datos' = ver perfil/datos SIN documentos; 'kyc' = ver ID + verificar.
// Platform functions, mapped by SECTION → function (lib/caps.js is the single
// source of truth shared with /admin).
const TEAM_CAPS = CAPS;

function EquipoTab({ staff, me, flash, reload }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: '', job_title: '', email: '', password: '' });
  const [newCaps, setNewCaps] = useState([]); // accesos elegidos AL crear la cuenta
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState(null);

  async function createPuesto(e) {
    e.preventDefault();
    setErr('');
    if (!form.email || !form.password) { setErr('Completa correo y contraseña.'); return; }
    if (form.password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!newCaps.length) { setErr('Elige al menos una función para este puesto.'); return; }
    setCreating(true);
    // The account is born WITH its accesses — you pick them function by function below.
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { ...form, role: 'supervisor', capabilities: newCaps },
    });
    setCreating(false);
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo crear la cuenta.'); return; }
    setForm({ full_name: '', job_title: '', email: '', password: '' });
    setNewCaps([]);
    setShowCreate(false);
    flash(`Cuenta creada con ${newCaps.length} acceso${newCaps.length === 1 ? '' : 's'}`);
    reload();
  }

  async function toggleFn(member, cap) {
    const cur = new Set(member.capabilities || []);
    if (cur.has(cap)) cur.delete(cap); else cur.add(cap);
    const { error } = await getSupabase().rpc('set_staff_functions', { target: member.id, caps: [...cur] });
    if (error) { flash('Error: ' + error.message); return; }
    flash('Accesos actualizados');
    reload();
  }

  const team = (staff || []).filter((s) => s.role !== 'admin');
  const admins = (staff || []).filter((s) => s.role === 'admin');

  return (
    <div className="mt-6 space-y-6">
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-5 py-4 font-display font-semibold text-brand transition-colors hover:bg-brand/20">
          <UserPlus size={18} /> Crear cuenta de empleado
        </button>
      ) : (
        <form onSubmit={createPuesto} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display font-semibold text-paper">
              <UserPlus size={18} className="text-brand" /> Crear cuenta de empleado
            </div>
            <button type="button" onClick={() => { setShowCreate(false); setErr(''); }}
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={15} /></button>
          </div>
          <p className="mb-3 text-xs text-paper-dim">Tú creas el puesto: nombre, cargo y sus accesos función por función. La cuenta nace lista para trabajar.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.full_name} onChange={(e) => setForm((v) => ({ ...v, full_name: e.target.value }))} placeholder="Nombre (ej. Camila)"
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <input value={form.job_title} onChange={(e) => setForm((v) => ({ ...v, job_title: e.target.value }))} placeholder="Puesto / cargo (ej. Verificación)"
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <input type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} placeholder="correo@ejemplo.com"
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <input type="text" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} placeholder="Contraseña (mín. 8)"
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          </div>

          <div className="mt-4 space-y-4">
            {CAP_SECTIONS.map((sec) => (
              <div key={sec.id}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/80">{sec.name}</div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {sec.caps.map((c) => {
                    const on = newCaps.includes(c.v);
                    return (
                      <button type="button" key={c.v}
                        onClick={() => setNewCaps((v) => (on ? v.filter((x) => x !== c.v) : [...v, c.v]))}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${on ? 'border-brand/50 bg-brand/10' : 'border-line bg-ink-2 hover:border-hair'}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-on-accent' : 'border-line text-paper-dim'}`}>
                          {on ? <Check size={13} /> : <Plus size={13} />}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${on ? 'text-brand' : 'text-paper'}`}>{c.l}</span>
                          <span className="block text-[11px] text-paper-dim">{c.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={creating}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Crear cuenta con {newCaps.length} acceso{newCaps.length === 1 ? '' : 's'}
          </button>
          {err && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
        </form>
      )}

      <div className="space-y-3">
        {admins.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card p-4">
            <p className="font-medium text-paper">{u.full_name || '—'} <span className="text-xs font-normal text-paper-dim">· Admin (dueño)</span></p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
              <ShieldCheck size={13} /> Todas las funciones
            </span>
          </div>
        ))}
        {team.map((u) => {
          const open = expanded === u.id;
          const caps = u.capabilities || [];
          const granted = TEAM_CAPS.filter((c) => caps.includes(c.v)).map((c) => c.l);
          return (
            <div key={u.id} className="overflow-hidden rounded-2xl border border-line bg-card">
              <button onClick={() => setExpanded(open ? null : u.id)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-hair/[0.04]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-paper">{u.full_name || '—'}
                    {u.job_title && <span className="ml-2 rounded-full bg-hair/10 px-2 py-0.5 text-[11px] font-normal text-paper-dim">{u.job_title}</span>}
                  </p>
                  <p className="truncate text-[11px] text-paper-dim">{granted.length ? `${granted.length} acceso${granted.length === 1 ? '' : 's'}: ${granted.join(' · ')}` : 'Sin accesos'}</p>
                </div>
                {!granted.length && <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">Sin accesos</span>}
                <ChevronRight size={18} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-90' : ''}`} />
              </button>
              {open && (
                <div className="grid gap-2 border-t border-line px-4 pb-4 pt-3 sm:grid-cols-2">
                  {TEAM_CAPS.map((c) => {
                    const on = caps.includes(c.v);
                    return (
                      <button key={c.v} onClick={() => toggleFn(u, c.v)} disabled={u.id === me.id && c.v === 'team'}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-50 ${on ? 'border-brand/50 bg-brand/10' : 'border-line bg-ink-2 hover:border-hair'}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-on-accent' : 'border-line text-paper-dim'}`}>
                          {on ? <Check size={13} /> : <Plus size={13} />}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${on ? 'text-brand' : 'text-paper'}`}>{c.l}</span>
                          <span className="block text-[11px] text-paper-dim">{c.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
