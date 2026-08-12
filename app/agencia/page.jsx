'use client';

// Agency / manager workspace. An agency manages a set of creators:
//  · sees the content the team delivered to each model (with its purpose)
//  · records what each piece sold — the platform keeps the agency's books
//  · makes content requests for its models
// Sales live HERE (attributed to the agency), not on the creator's own panel.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Users, ImageIcon, ShoppingBag, DollarSign, Building2, Target, Film,
  Sparkles, X, TrendingUp, TrendingDown, Plus, Clock, Loader2, ChevronRight,
  ChevronLeft, ChevronDown, Send, CheckCircle2, NotebookPen, Heart, KeyRound,
  UserPlus, Trash2, Check, Mail,
} from 'lucide-react';
import { getUserProfile, signOut, homeForRole } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { ymOf, ymLabel, shiftYm, aggregate, pct, initials } from '@/lib/portal-stats';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';
import ReactionsDashboard from '@/components/ReactionsDashboard';
import WelcomeTour from '@/components/WelcomeTour';

function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Mismo lenguaje que la modelo y el equipo: Enviado → En proceso → Completado.
const REQ_STATUS = {
  pending: { label: 'Enviado', cls: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
  in_progress: { label: 'En proceso', cls: 'text-sky border-sky/30 bg-sky/10' },
  delivered: { label: 'Completado', cls: 'text-brand border-brand/30 bg-brand/10' },
};
const MSG_FROM = { team: 'Equipo LetShoot', creator: 'Modelo', agency: 'Agencia' };

// Completion checklist for a model (agency sees status only, mirrors admin/staff).
// Reads the same creator_profile fields the detail view uses.
function completion(p) {
  if (!p) return { done: 0, total: 4 };
  const s = p.onboarding_status;
  const oks = [
    s !== 'registered',
    ['id_approved', 'active', 'paid', 'authorized'].includes(s),
    p.payment_status === 'paid' || ['active', 'paid'].includes(s),
    (p.lora_count || 0) >= 50,
  ];
  return { done: oks.filter(Boolean).length, total: 4 };
}

// The agency can set a temporary password for one of ITS models (server verifies the
// agency_creators link). She can change it later from her own account whenever she wants.
function AgencyResetPasswordBox({ userId, name }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  async function reset() {
    setMsg(''); setOk(false);
    if (pw.length < 8) { setMsg('Mínimo 8 caracteres.'); return; }
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('reset-password', { body: { user_id: userId, password: pw } });
    setBusy(false);
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setMsg(out?.error || 'No se pudo resetear.'); return; }
    setOk(true); setMsg(`Contraseña actualizada. Compártesela a ${name || 'tu modelo'}.`); setPw('');
  }
  if (!open) return (
    <button onClick={() => { setOpen(true); setMsg(''); setOk(false); }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
      <KeyRound size={15} /> Resetear contraseña
    </button>
  );
  return (
    <div className="w-full rounded-2xl border border-line bg-ink-2 p-4">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-paper"><KeyRound size={15} className="text-brand" /> Contraseña de {name}</h4>
      <p className="mb-3 text-[11px] text-paper-dim">Ponle una temporal y compártesela. Ella podrá cambiarla desde su cuenta cuando quiera.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="text" placeholder="Nueva contraseña (mín. 8)"
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        <button onClick={() => { setOpen(false); setPw(''); setMsg(''); }} className="rounded-lg border border-line px-3 py-2 text-xs text-paper-mute hover:text-paper">Cancelar</button>
        <button onClick={reset} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-on-accent disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Guardar
        </button>
      </div>
      {msg && <p className={`mt-2 text-[11px] ${ok ? 'text-emerald-300' : 'text-paper-mute'}`}>{msg}</p>}
    </div>
  );
}

export default function AgenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  // Contexto de agencia: si soy dueño o empleado, de qué agencia, y mis funciones.
  const [ctx, setCtx] = useState({ agencyId: null, agencyName: '', isOwner: true, caps: ['content', 'sales', 'requests', 'metrics'] });
  const can = (c) => ctx.caps.includes(c);
  const [models, setModels] = useState([]);       // [{id, name, status, assets:[...]}]
  const [folders, setFolders] = useState({});     // folderId -> name
  const [requests, setRequests] = useState([]);
  const [urls, setUrls] = useState({});
  const [sel, setSel] = useState(null);           // selected creator id
  const [month, setMonth] = useState(null);       // 'YYYY-MM' for the selected model
  const [mtab, setMtab] = useState('content');    // content | pedidos
  const [detail, setDetail] = useState(null);     // asset being edited
  const [toast, setToast] = useState('');
  const [reqOpen, setReqOpen] = useState(false);
  const [modelProfile, setModelProfile] = useState(null); // creator_profile of the selected model (status only)
  const [atab, setAtab] = useState(null);         // null (cerrado) | modelos | contenido | ingresos | reacciones
  const [likeCount, setLikeCount] = useState(0);  // total de likes + comentarios de sus modelos
  const [checklists, setChecklists] = useState({}); // creator_id -> creator_profile (roster glance)
  const [invites, setInvites] = useState([]);      // pending model-invite links
  const [addOpen, setAddOpen] = useState(false);   // "agregar modelo" modal
  const [newLink, setNewLink] = useState('');      // freshly-created invite URL
  const [copied, setCopied] = useState('');        // token just copied
  const [cFilter, setCFilter] = useState('all');   // Contenido tab: model filter

  // Select a model and jump to its latest delivery month.
  function pickModel(m) {
    setSel(m.id); setReqOpen(false); setMtab('content');
    const latest = (m.assets || []).reduce((mx, a) => (a.deliver_date && a.deliver_date > mx ? a.deliver_date : mx), '');
    setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
  }

  // Load the selected model's completion checklist (status only — no docs/legal data).
  useEffect(() => {
    if (!sel) { setModelProfile(null); return; }
    (async () => {
      const { data } = await getSupabase().rpc('creator_profile', { target: sel });
      setModelProfile(Array.isArray(data) ? data[0] : data || null);
    })();
  }, [sel]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async (agencyId, isOwner = true) => {
    const supabase = getSupabase();
    // Dueño: todos los modelos de su agencia. Empleado: SOLO los asignados
    // (agency_member_creators — RLS le deja leer los suyos).
    let ids = [];
    if (isOwner) {
      const { data: links } = await supabase.from('agency_creators').select('creator_id').eq('agency_id', agencyId);
      ids = (links || []).map((l) => l.creator_id);
    } else {
      const { data: mine } = await supabase.from('agency_member_creators').select('creator_id');
      ids = (mine || []).map((l) => l.creator_id);
    }
    if (!ids.length) { setModels([]); setRequests([]); return; }

    const [{ data: profs }, { data: assets }, { data: fols }, { data: reqs }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, stage_name, onboarding_status, payment_status, handle, avatar_url').in('id', ids),
      supabase.from('assets')
        .select('id, creator_id, folder_id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, reach, interactions')
        .in('creator_id', ids),
      supabase.from('folders').select('id, name').in('creator_id', ids),
      // TODOS los pedidos de tus modelos — los tuyos y los que ellas hacen.
      supabase.from('requests')
        .select('id, creator_id, chatter_id, title, description, status, due_date, created_at')
        .in('creator_id', ids).order('created_at', { ascending: false }),
    ]);
    const { data: reqMsgs } = await supabase.from('request_messages').select('*').order('created_at');
    const msgsByReq = {};
    (reqMsgs || []).forEach((m) => { (msgsByReq[m.request_id] = msgsByReq[m.request_id] || []).push(m); });

    const folderMap = {};
    (fols || []).forEach((f) => { folderMap[f.id] = f.name; });

    const list = (profs || []).map((p) => ({
      id: p.id,
      name: p.stage_name || p.full_name || 'Modelo',
      handle: p.handle,
      avatar_url: p.avatar_url,
      status: p.onboarding_status,
      assets: (assets || []).filter((a) => a.creator_id === p.id),
    }));

    // Sign any private-bucket paths (demo uses /public, so usually none).
    const toSign = (assets || []).filter((a) => !isDirect(a.storage_path));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries')
        .createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; });
      setUrls(map);
    }
    // Pending model-invite links this agency has generated.
    const { data: invs } = await supabase.from('staff_invites')
      .select('id, token, status, created_at, expires_at, used_by')
      .eq('agency_id', agencyId).eq('target_role', 'creator')
      .order('created_at', { ascending: false });

    setFolders(folderMap);
    setModels(list);
    setRequests((reqs || []).map((r) => ({ ...r, _msgs: msgsByReq[r.id] || [] })));
    setInvites(invs || []);
    const { count: fbCount } = await supabase.from('feedback').select('id', { count: 'exact', head: true });
    setLikeCount(fbCount || 0);
  }, []);

  // Roster glance: load each model's completion checklist (status only).
  useEffect(() => {
    if (!models.length) { setChecklists({}); return; }
    let alive = true;
    (async () => {
      const supabase = getSupabase();
      const entries = await Promise.all(models.map(async (m) => {
        const { data } = await supabase.rpc('creator_profile', { target: m.id });
        return [m.id, Array.isArray(data) ? data[0] : data || null];
      }));
      if (alive) setChecklists(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, [models]);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role !== 'agency') { router.replace(homeForRole(up.profile?.role)); return; }
      // Agencia externa que se registró por link: espera aprobación del admin.
      if (up.profile?.staff_status === 'pending') { setMe(up.profile); setLoading(false); return; }
      // ¿Soy dueño de la agencia o empleado del sub-equipo? Resuelve agencia + funciones.
      const { data: cx } = await getSupabase().rpc('my_agency_context');
      const c = Array.isArray(cx) ? cx[0] : cx;
      const context = c ? { agencyId: c.agency_id, agencyName: c.agency_name, isOwner: c.is_owner, caps: c.capabilities || [] } : { agencyId: up.user.id, agencyName: up.profile.full_name, isOwner: true, caps: ['content', 'sales', 'requests', 'metrics'] };
      setCtx(context);
      await load(context.agencyId, context.isOwner);
      setMe(up.profile);
      setLoading(false);
    })();
  }, [router, load]);

  const refresh = useCallback(async () => { if (ctx.agencyId) await load(ctx.agencyId, ctx.isOwner); }, [ctx.agencyId, ctx.isOwner, load]);

  // Add a model to the roster by generating a personal invite link. She registers
  // herself, does her own onboarding, and is auto-linked to this agency on redeem.
  async function createModelInvite() {
    if (!me?.id) return;
    const token = (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
    const { error } = await getSupabase().from('staff_invites')
      .insert({ token, agency_id: me.id, created_by: me.id, target_role: 'creator' });
    if (error) { flash('No se pudo crear la invitación.'); return; }
    const url = `${window.location.origin}/unirse/${token}`;
    setNewLink(url);
    await refresh();
    try { await navigator.clipboard.writeText(url); setCopied(token); flash('Enlace copiado.'); }
    catch { flash('Enlace de invitación creado.'); }
  }

  async function copyLink(token) {
    const url = `${window.location.origin}/unirse/${token}`;
    try { await navigator.clipboard.writeText(url); setCopied(token); flash('Enlace copiado.'); setTimeout(() => setCopied(''), 2000); }
    catch { flash('No se pudo copiar.'); }
  }

  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));

  // Every delivered piece across all models — for the Contenido tab.
  const allContent = useMemo(() => {
    const rows = models.flatMap((m) => m.assets.map((a) => ({ ...a, modelName: m.name, modelHandle: m.handle, modelAvatar: m.avatar_url })));
    return rows.sort((x, y) => (y.deliver_date || '').localeCompare(x.deliver_date || ''));
  }, [models]);

  // Per-model income roll-up — for the Ingresos tab.
  const income = useMemo(() => {
    const rows = models.map((m) => {
      const sales = m.assets.reduce((s, a) => s + (a.sales_count || 0), 0);
      const revenue = m.assets.reduce((s, a) => s + Number(a.revenue || 0), 0);
      return { id: m.id, name: m.name, handle: m.handle, avatar_url: m.avatar_url,
        delivered: m.assets.length, sales, revenue };
    }).sort((a, b) => b.revenue - a.revenue);
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    return { rows, total };
  }, [models]);

  // Agency-wide books.
  const books = useMemo(() => {
    const all = models.flatMap((m) => m.assets);
    return {
      models: models.length,
      delivered: all.length,
      sales: all.reduce((s, a) => s + (a.sales_count || 0), 0),
      revenue: all.reduce((s, a) => s + Number(a.revenue || 0), 0),
      reach: all.reduce((s, a) => s + (a.reach || 0), 0),
    };
  }, [models]);

  if (loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Agencia registrada por link, aún sin aprobar por el admin.
  if (me?.staff_status === 'pending') {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-ink px-5 text-center text-paper">
        <div className="max-w-sm">
          <Logo size="lg" />
          <Clock className="mx-auto mt-8 mb-3 text-brand" size={38} />
          <h1 className="font-display text-2xl font-semibold">Tu agencia está en revisión</h1>
          <p className="mt-2 text-sm leading-relaxed text-paper-mute">
            Ya quedaste registrada. El administrador debe <span className="text-paper">aprobar tu acceso</span> para que puedas gestionar a tus modelos. Te avisaremos en cuanto esté lista.
          </p>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    );
  }

  const model = models.find((m) => m.id === sel) || null;
  const monthAssets = model ? model.assets.filter((a) => ymOf(a.deliver_date) === month) : [];
  const prevAssets = model ? model.assets.filter((a) => ymOf(a.deliver_date) === shiftYm(month || '2026-01', -1)) : [];
  const cur = aggregate(monthAssets);
  const prev = aggregate(prevAssets);
  const curPhotos = monthAssets.filter((a) => a.type !== 'video').length;
  const curVideos = monthAssets.filter((a) => a.type === 'video').length;
  const prevPhotos = prevAssets.filter((a) => a.type !== 'video').length;
  const prevVideos = prevAssets.filter((a) => a.type === 'video').length;
  const modelRequests = model ? requests.filter((r) => r.creator_id === model.id) : requests;

  // The summary cards ARE the navigation: tap one to open its view (closed by default).
  // Se muestran según las funciones del empleado (el dueño las tiene todas).
  const BOOK_KPIS = [
    { icon: Users, label: 'Modelos', value: nf(books.models), sub: 'que gestionas', view: 'modelos' },
    ...(can('content') ? [{ icon: ImageIcon, label: 'Contenido entregado', value: nf(books.delivered), sub: 'piezas del equipo', view: 'contenido' }] : []),
    ...(can('metrics') ? [{ icon: ShoppingBag, label: 'Piezas vendidas', value: nf(books.sales), sub: 'unidades', view: 'ingresos' }] : []),
    ...(can('metrics') ? [{ icon: DollarSign, label: 'Ingresos generados', value: money(books.revenue), sub: 'total histórico', view: 'ingresos' }] : []),
    ...(can('content') ? [{ icon: Heart, label: 'Reacciones', value: nf(likeCount), sub: 'likes y comentarios', view: 'reacciones' }] : []),
    ...(ctx.isOwner ? [{ icon: UserPlus, label: 'Equipo', value: '+', sub: 'empleados y accesos', view: 'equipo' }] : []),
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <WelcomeTour storageKey="ls_tour_agency_v1" steps={[
        { eyebrow: 'Bienvenida', title: 'Tu panel de agencia', body: 'Gestiona a todas tus modelos desde un solo lugar. Te mostramos lo básico en 20 segundos.' },
        { eyebrow: 'Modelos', title: 'Tus modelos', body: 'Entra a cada modelo para ver su contenido, su estado y todo lo que le falta.' },
        { eyebrow: 'Contenido e ingresos', title: 'Contenido y ventas', body: 'Revisa todo lo entregado y registra las ventas de cada modelo, mes a mes.' },
        { eyebrow: 'Pedidos', title: 'Pide sets', body: 'Solicita contenido específico para una modelo y el equipo de LetShoot lo produce.' },
      ]} />
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="sm" />
            <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
              <Building2 size={12} /> Agencia · Manager
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
                <span className="block text-[10px] text-paper-dim">Administra a tus modelos</span>
              </span>
            </div>
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Tus cuentas</h1>
            <p className="mt-1 text-sm text-paper-mute">Gestiona a tus modelos, revisa el contenido entregado, registra ventas y haz pedidos.</p>
          </div>
          {/* La agencia NO agrega modelos — el admin conecta modelo con agencia. */}
        </div>

        {/* Resumen: solo las tarjetas. Tocar una CAMBIA de pantalla al área. */}
        {!atab && (
          <>
            <div className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Resumen de tu agencia · histórico — toca una tarjeta para abrirla</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {BOOK_KPIS.map((k) => (
                <button key={k.label}
                  onClick={() => { setAtab(k.view); if (k.view !== 'modelos') setSel(null); }}
                  className="group rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-brand/40">
                  <div className="flex items-center justify-between gap-2 text-paper-dim">
                    <span className="flex items-center gap-2">
                      <k.icon size={15} className="text-brand" />
                      <span className="text-xs font-medium">{k.label}</span>
                    </span>
                    <ChevronRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold text-paper sm:text-3xl">{k.value}</div>
                  <div className="mt-0.5 text-[11px] text-paper-dim">{k.sub}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Pantalla de área — reemplaza el resumen; "Resumen" arriba para volver. */}
        {atab && (
          <div className="mb-1 mt-6">
            <button onClick={() => { setAtab(null); setSel(null); }} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-paper-mute transition-colors hover:text-paper">
              <ChevronLeft size={15} /> Resumen
            </button>
            <h2 className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
              {(() => { const k = BOOK_KPIS.find((x) => x.view === atab); const Ic = k?.icon; return <>{Ic && <Ic size={18} className="text-brand" />} {k?.label || ''}</>; })()}
            </h2>
          </div>
        )}

        {atab === 'modelos' && (
        <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Models list */}
          <aside className="space-y-1.5">
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-paper-dim">Tus modelos · {models.length}</div>
            {models.length === 0 && <p className="rounded-xl border border-line bg-card p-4 text-sm text-paper-dim">Aún no tienes modelos. El administrador de LetShoot conecta cada modelo con tu agencia.</p>}
            {models.map((m) => {
              const sales = m.assets.reduce((s, a) => s + (a.sales_count || 0), 0);
              const rev = m.assets.reduce((s, a) => s + Number(a.revenue || 0), 0);
              const activeSel = sel === m.id;
              const ck = completion(checklists[m.id]);
              return (
                <button key={m.id} onClick={() => pickModel(m)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    activeSel ? 'border-brand/50 bg-brand/10' : 'border-line bg-card hover:border-brand/30'}`}>
                  <Avatar src={m.avatar_url} name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-paper">{m.name}</span>
                      {m.status === 'active'
                        ? <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand">Activa</span>
                        : <span className="rounded-full bg-hair/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-paper-dim">Onboarding</span>}
                    </div>
                    {m.handle && <div className="truncate text-[11px] text-paper-dim">@{m.handle}</div>}
                    <div className="mt-0.5 text-[11px] text-paper-dim">{m.assets.length} entregadas · {nf(sales)} ventas · {money(rev)}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${ck.done === ck.total ? 'bg-brand/20' : 'bg-amber-500/20'}`}>
                        <span className={`block h-full rounded-full ${ck.done === ck.total ? 'bg-brand' : 'bg-amber-400'}`} style={{ width: `${(ck.done / ck.total) * 100}%` }} />
                      </span>
                      <span className={`text-[10px] font-semibold ${ck.done === ck.total ? 'text-brand' : 'text-amber-300'}`}>{ck.done}/{ck.total}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={activeSel ? 'text-brand' : 'text-paper-dim'} />
                </button>
              );
            })}
          </aside>

          {/* Selected model */}
          <section className="min-w-0">
            {!model ? (
              <div className="grid h-full min-h-[240px] place-items-center rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-paper-dim">
                Elige una modelo para ver su contenido, registrar ventas y hacer pedidos.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold">{model.name}</h2>
                  <button onClick={() => setReqOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
                    <Plus size={15} /> Nueva petición
                  </button>
                </div>

                {/* La agencia puede resetear la clave de SU modelo cuando quiera. */}
                <div className="mt-3"><AgencyResetPasswordBox userId={model.id} name={model.name} /></div>

                {/* Account completion — what the model still needs (status only) */}
                {modelProfile && (() => {
                  const s = modelProfile.onboarding_status;
                  const items = [
                    { k: 'Datos', done: s !== 'registered', note: s !== 'registered' ? 'Listos' : 'Faltan' },
                    { k: 'Identidad', done: ['id_approved', 'active', 'paid', 'authorized'].includes(s),
                      note: ['id_approved', 'active', 'paid', 'authorized'].includes(s) ? 'Aprobada'
                        : s === 'id_pending' ? 'En revisión' : s === 'id_rejected' ? 'Rechazada'
                        : modelProfile.has_id_docs ? 'Enviada' : 'Falta' },
                    { k: 'Suscripción', done: modelProfile.payment_status === 'paid' || ['active', 'paid'].includes(s),
                      note: (modelProfile.payment_status === 'paid' || ['active', 'paid'].includes(s)) ? 'Al día' : 'Falta pago' },
                    { k: 'Fotos del clon', done: (modelProfile.lora_count || 0) >= 50, note: `${modelProfile.lora_count || 0}/50` },
                  ];
                  const complete = items.every((i) => i.done);
                  return (
                    <div className={`mt-4 rounded-2xl border p-4 ${complete ? 'border-brand/25 bg-brand/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
                      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-paper">
                        {complete ? <CheckCircle2 size={15} className="text-brand" /> : <Clock size={15} className="text-amber-300" />}
                        {complete ? 'Cuenta completa' : 'Le falta para completar su cuenta'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {items.map((i) => (
                          <div key={i.k} className={`rounded-xl border px-3 py-2 ${i.done ? 'border-line bg-ink-2' : 'border-amber-500/30 bg-amber-500/[0.06]'}`}>
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-paper-dim">
                              {i.done ? <CheckCircle2 size={12} className="text-brand" /> : <span className="grid h-3 w-3 place-items-center rounded-full border border-amber-400/50 text-[8px] text-amber-300">!</span>}
                              {i.k}
                            </div>
                            <div className={`mt-0.5 text-sm font-semibold ${i.done ? 'text-paper' : 'text-amber-200'}`}>{i.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Month accounting — this month vs last month */}
                <div className="mt-4 flex items-center justify-between">
                  <button onClick={() => setMonth(shiftYm(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronLeft size={17} /></button>
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold">{ymLabel(month, 'es-US')}</div>
                    <div className="text-[11px] text-paper-dim">vs. {ymLabel(shiftYm(month || '2026-01', -1), 'es-US')}</div>
                  </div>
                  <button onClick={() => setMonth(shiftYm(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronRight size={17} /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard icon={ImageIcon} label="Fotos este mes" value={nf(curPhotos)} d={pct(curPhotos, prevPhotos)} />
                  <StatCard icon={Film} label="Videos este mes" value={nf(curVideos)} d={pct(curVideos, prevVideos)} />
                  <StatCard icon={ShoppingBag} label="Vendidas" value={nf(cur.sales)} d={pct(cur.sales, prev.sales)} />
                  <StatCard icon={DollarSign} label="Ingresos" value={money(cur.revenue)} d={pct(cur.revenue, prev.revenue)} />
                </div>

                {/* Per-model sub-nav: content vs orders */}
                <div className="mt-6 inline-flex rounded-full border border-line bg-card p-1">
                  {[{ id: 'content', l: 'Contenido', Ic: ImageIcon }, { id: 'pedidos', l: 'Pedidos', Ic: Clock }].map((tb) => (
                    <button key={tb.id} onClick={() => setMtab(tb.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mtab === tb.id ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
                      <tb.Ic size={15} /> {tb.l}
                      {tb.id === 'pedidos' && modelRequests.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${mtab === tb.id ? 'bg-on-accent/20' : 'bg-brand/15 text-brand'}`}>{modelRequests.length}</span>}
                    </button>
                  ))}
                </div>

                {mtab === 'pedidos' && (
                  <div className="mt-4 space-y-5">
                    {modelRequests.length === 0 && <p className="rounded-xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Sin pedidos. Usa «Pedir contenido» para crear uno.</p>}
                    {[
                      { key: 'in_progress', title: 'En proceso', hint: 'El equipo ya está trabajando en esto' },
                      { key: 'pending', title: 'Enviados', hint: 'El equipo ya lo recibió, aún no empieza' },
                      { key: 'delivered', title: 'Completados', hint: 'Listos y subidos' },
                    ].map((grp) => {
                      const rows = modelRequests.filter((r) => (r.status || 'pending') === grp.key);
                      if (!rows.length) return null;
                      const st = REQ_STATUS[grp.key];
                      return (
                        <div key={grp.key}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${st.cls}`}>{grp.title}</span>
                            <span className="text-[11px] text-paper-dim">{rows.length} · {grp.hint}</span>
                          </div>
                          <div className="space-y-2">
                            {rows.map((r) => (
                              <div key={r.id} className="rounded-xl border border-line bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-semibold text-paper">{r.title}</p>
                                  <span className="shrink-0 text-[11px] text-paper-dim">{new Date(r.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-paper-dim">{r.chatter_id === r.creator_id ? 'Lo pidió ella' : 'Lo pediste tú'}</p>
                                {r.description && <p className="mt-1 text-xs leading-relaxed text-paper-mute">{r.description}</p>}
                                {r.due_date && <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-paper-dim"><Clock size={11} /> para el {r.due_date}</p>}
                                <AgencyReqThread req={r} onSent={refresh} flash={flash} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Delivered content this month — team uploads, agency records sales/price */}
                {mtab === 'content' && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-paper-dim"><ImageIcon size={12} /> Contenido de {ymLabel(month, 'es-US')} · toca para poner precio y ventas</div>
                  {monthAssets.length === 0 ? (
                    <p className="rounded-xl border border-line bg-card p-5 text-sm text-paper-dim">No hay contenido entregado en este mes.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {[...monthAssets].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || '')).map((a) => (
                        <button key={a.id} onClick={() => setDetail(a)}
                          className="group relative overflow-hidden rounded-xl border border-line bg-card text-left">
                          {a.type === 'video'
                            ? <video src={srcFor(a)} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={srcFor(a)} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                            {a.sales_count > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur">
                                <ShoppingBag size={10} className="text-brand" /> {nf(a.sales_count)}
                              </span>
                            )}
                            {Number(a.revenue) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur">
                                <DollarSign size={10} className="text-brand" /> {money(a.revenue)}
                              </span>
                            )}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
                            {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
                            {a.folder_id && <p className="mt-0.5 truncate text-[11px] text-paper-mute">{folders[a.folder_id]}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </section>
        </div>
        )}

        {/* ── Contenido: every delivered piece across all models ────────────── */}
        {atab === 'contenido' && (
        <div className="mt-6">
          {allContent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-paper-dim">Aún no hay contenido entregado para tus modelos.</p>
          ) : (
            (() => {
              const filtered = allContent.filter((a) => cFilter === 'all' || a.creator_id === cFilter);
              // Agrupar por día (calendario) — allContent ya viene ordenado desc por fecha.
              const groups = []; const idx = {};
              for (const a of filtered) {
                const key = a.deliver_date ? a.deliver_date.slice(0, 10) : 'sin';
                if (idx[key] == null) { idx[key] = groups.length; groups.push({ key, items: [] }); }
                groups[idx[key]].items.push(a);
              }
              const dayLabel = (k) => {
                if (k === 'sin') return 'Sin fecha';
                const s = new Date(k + 'T00:00:00').toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                return s.charAt(0).toUpperCase() + s.slice(1);
              };
              const Card = (a) => (
                <button key={a.id} onClick={() => setDetail(a)}
                  className="group relative overflow-hidden rounded-xl border border-line bg-card text-left">
                  {a.type === 'video'
                    ? <video src={srcFor(a)} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={srcFor(a)} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper backdrop-blur">{a.type === 'video' ? 'Video' : 'Foto'}</span>
                  <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                    {a.sales_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><ShoppingBag size={10} className="text-brand" /> {nf(a.sales_count)}</span>
                    )}
                    {Number(a.revenue) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><DollarSign size={10} className="text-brand" /> {money(a.revenue)}</span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
                    <div className="flex items-center gap-1.5">
                      <Avatar src={a.modelAvatar} name={a.modelName} size="xs" />
                      <p className="truncate text-xs font-semibold text-paper">{a.modelName}</p>
                    </div>
                    {a.title && <p className="mt-0.5 truncate text-[11px] text-paper-mute">{a.title}</p>}
                  </div>
                </button>
              );
              return (
                <>
                  {/* Filtro por modelo — dropdown (escala con muchas modelos) */}
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-paper-dim">Modelo:</span>
                    <div className="relative">
                      <select value={cFilter} onChange={(e) => setCFilter(e.target.value)}
                        className="appearance-none rounded-full border border-line bg-card py-2 pl-3.5 pr-9 text-xs font-medium text-paper outline-none focus:border-brand/60">
                        <option value="all">Todas las modelos</option>
                        {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                    </div>
                    <span className="text-xs text-paper-dim">{filtered.length} pieza{filtered.length === 1 ? '' : 's'} · toca una para precio y ventas</span>
                  </div>

                  {/* Calendario: agrupado por día, lo más reciente arriba */}
                  <div className="space-y-6">
                    {groups.map((g) => (
                      <div key={g.key}>
                        <div className="mb-2 flex items-center gap-2">
                          <Clock size={13} className="text-brand" />
                          <span className="text-sm font-semibold text-paper">{dayLabel(g.key)}</span>
                          <span className="text-xs text-paper-dim">· {g.items.length} pieza{g.items.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {g.items.map(Card)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()
          )}
        </div>
        )}

        {/* ── Reacciones: likes + comentarios de las modelos, filtrable ── */}
        {atab === 'reacciones' && (
          <ReactionsDashboard creators={models.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }))} />
        )}

        {/* ── Ingresos: per-model roll-up with detail (los totales ya están arriba) ── */}
        {atab === 'ingresos' && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-paper-dim">Ingresos por modelo · quién genera qué</div>
          {income.rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-paper-dim">Aún no hay ventas registradas.</p>
          ) : (
            <div className="space-y-2">
              {income.rows.map((r) => {
                const share = income.total > 0 ? Math.round((r.revenue / income.total) * 100) : 0;
                return (
                  <div key={r.id} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={r.avatar_url} name={r.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-paper">{r.name}</span>
                          {r.handle && <span className="truncate text-[11px] text-paper-dim">@{r.handle}</span>}
                        </div>
                        <div className="mt-0.5 text-[11px] text-paper-dim">{r.delivered} entregadas · {nf(r.sales)} ventas</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand/15"><span className="block h-full rounded-full bg-brand" style={{ width: `${share}%` }} /></span>
                          <span className="text-[10px] font-semibold text-paper-dim">{share}%</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-lg font-semibold text-paper">{money(r.revenue)}</div>
                        <button onClick={() => { const m = models.find((x) => x.id === r.id); if (m) { setAtab('modelos'); pickModel(m); } }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                          Ver detalle <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* ── Equipo: sub-equipo de la agencia (solo el dueño) ─────────────── */}
        {atab === 'equipo' && ctx.isOwner && (
          <AgencyTeamTab agencyId={ctx.agencyId} models={models} flash={flash} />
        )}
      </main>

      {detail && (
        <RecordSale
          asset={detail} src={srcFor(detail)} folderName={folders[detail.folder_id]}
          agencyId={ctx.agencyId} soldBy={me.id} canSell={can('sales')} agencyName={me.full_name} agencyHandle={me.handle} agencyEmail={me.email}
          onClose={() => setDetail(null)}
          onSaved={async (patch) => { flash('Guardado'); setDetail((d) => (d ? { ...d, ...patch } : d)); await refresh(); }}
        />
      )}

      {/* New request — pop-up */}
      {reqOpen && model && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm" onClick={() => setReqOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-glow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-paper">Nueva petición</h3>
                <p className="text-xs text-paper-dim">Para <span className="text-paper-mute">{model.name}</span> · le llega al equipo al instante</p>
              </div>
              <button onClick={() => setReqOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
            </div>
            <NewRequest creatorId={model.id} agencyId={me.id}
              onDone={async () => { setReqOpen(false); await refresh(); flash('Pedido enviado al equipo'); }} />
          </div>
        </div>
      )}

      {/* Agregar modelo — invite by link */}
      {addOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-glow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-paper">Agregar modelo</h3>
              <button onClick={() => setAddOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-paper-mute">Genera un enlace personal de invitación. La modelo se registra ella misma, hace su propio onboarding (identidad y consentimiento son personales) y queda vinculada a tu agencia automáticamente.</p>

            <button onClick={createModelInvite}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01]">
              <Plus size={16} /> Crear enlace de invitación
            </button>

            {newLink && (
              <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/[0.05] p-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Enlace listo · cópialo y compártelo</div>
                <div className="flex items-center gap-2">
                  <input readOnly value={newLink} onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-xs text-paper" />
                  <button onClick={() => copyLink(newLink.split('/unirse/')[1])}
                    className="shrink-0 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/20">Copiar</button>
                </div>
              </div>
            )}

            {invites.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Invitaciones generadas</div>
                <div className="space-y-1.5">
                  {invites.map((iv) => {
                    const used = iv.status === 'accepted' || iv.used_by;
                    const expired = !used && iv.expires_at && new Date(iv.expires_at) < new Date();
                    return (
                      <div key={iv.id} className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${used ? 'bg-brand' : expired ? 'bg-rose-400' : 'bg-amber-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-paper">{used ? 'Aceptada · ya se registró' : expired ? 'Expirada' : 'Pendiente de registro'}</div>
                          <div className="truncate text-[10px] text-paper-dim">{new Date(iv.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        {!used && !expired && (
                          <button onClick={() => copyLink(iv.token)}
                            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-paper-mute hover:border-brand/40 hover:text-paper">
                            {copied === iv.token ? 'Copiado' : 'Copiar enlace'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

// KPI card with a month-over-month delta chip.
function StatCard({ icon: Icon, label, value, d }) {
  const chip = d === null
    ? { txt: 'nuevo', cls: 'text-brand', Ic: TrendingUp }
    : d > 0 ? { txt: `+${d}%`, cls: 'text-brand', Ic: TrendingUp }
    : d < 0 ? { txt: `${d}%`, cls: 'text-rose-300', Ic: TrendingDown }
    : { txt: '0%', cls: 'text-paper-dim', Ic: TrendingUp };
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between text-paper-dim">
        <span className="flex items-center gap-1.5"><Icon size={14} className="text-brand" /><span className="text-[11px] font-medium">{label}</span></span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${chip.cls}`}><chip.Ic size={12} /> {chip.txt}</span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold text-paper sm:text-3xl">{value}</div>
    </div>
  );
}

// New content request from the agency to the team — what you want, how you need
// it, and reference photos. No date (delivery timing is automatic).
// Hilo del pedido: la agencia ve las preguntas del equipo y responde.
// Cada mensaje llega también a la modelo (copia siempre, transparencia).
function AgencyReqThread({ req, onSent, flash }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const n = req._msgs?.length || 0;

  async function send(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const { error } = await getSupabase().rpc('post_request_message', { rid: req.id, body_text: body.trim() });
    setSending(false);
    if (error) { flash('Error: ' + error.message); return; }
    setBody('');
    flash('Respuesta enviada — el equipo y la modelo la ven');
    onSent?.();
  }

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper-mute transition-colors hover:text-paper">
        <Send size={11} className={n ? 'text-brand' : ''} />
        {n ? `${n} mensaje${n === 1 ? '' : 's'} con el equipo` : 'Escribir al equipo'} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {(req._msgs || []).map((m) => (
            <div key={m.id} className={`rounded-lg border p-2 text-xs ${m.author_role === 'agency' ? 'border-brand/25 bg-brand/[0.05]' : 'border-line bg-ink-2'}`}>
              <div className="mb-0.5 text-[10px] text-paper-dim">
                <span className="font-semibold text-paper-mute">{MSG_FROM[m.author_role] || m.author_role}</span>
                {m.author_name ? ` · ${m.author_name}` : ''} · {new Date(m.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}
              </div>
              <p className="text-paper-mute">{m.body}</p>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={send}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Responde o aclara — lo ven el equipo y la modelo…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <button type="submit" disabled={sending || !body.trim()}
              className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-accent disabled:opacity-50">
              {sending ? '…' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewRequest({ creatorId, agencyId, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refFiles, setRefFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const refInput = useRef(null);
  const addFiles = (list) => setRefFiles((prev) => [...prev, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 6));

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = getSupabase();
    // Client-generated id so reference photos upload under it, then one insert.
    const reqId = crypto.randomUUID();
    const paths = [];
    for (const f of refFiles) {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${agencyId}/${reqId}/${crypto.randomUUID()}.${ext}`;
      const { error: up } = await supabase.storage.from('request-refs').upload(path, f, { contentType: f.type });
      if (!up) paths.push(path);
    }
    const { error } = await supabase.from('requests').insert({
      id: reqId, creator_id: creatorId, chatter_id: agencyId, title: title.trim(),
      description: description.trim() || null, status: 'pending', ref_images: paths.length ? paths : null,
    });
    setSaving(false);
    if (error) { console.error(error); return; }
    // Reach the team that attends requests: in-app pop-up + email.
    supabase.functions.invoke('notify-request', { body: { request_id: reqId } }).catch(() => {});
    onDone();
  }

  return (
    <form onSubmit={submit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué necesitas? (ej. Set de lencería para PPV)"
        className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Cómo lo necesitas: escena, outfit, tono…"
        className="mt-2 w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-paper-dim">Fotos de referencia (opcional)</p>
        <p className="text-[11px] text-paper-dim">Sube ejemplos de lo que quieres. El equipo las verá.</p>
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

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Enviar petición</>}
        </button>
      </div>
    </form>
  );
}

// Agency records what a piece sold + keeps a day-by-day notes journal.
// agencyId = la AGENCIA (para agency_sales.agency_id); soldBy = quien registra
// (auth.uid(): dueño o empleado, para sold_by / author_id). canSell gatea las
// acciones de venta (un empleado sin la función 'sales' solo mira).
function RecordSale({ asset, src, folderName, agencyId, soldBy, canSell = true, agencyName, agencyHandle, agencyEmail, onClose, onSaved }) {
  const [sales, setSales] = useState(asset.sales_count || 0);
  const [revenue, setRevenue] = useState(asset.revenue || 0);
  // Precio por venta (el promedio) — arranca con lo que ya se vio y se puede cambiar.
  const [price, setPrice] = useState(asset.sales_count > 0 ? String(Math.round((asset.revenue || 0) / asset.sales_count)) : '');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loved, setLoved] = useState(false);

  // Like de la agencia sobre la pieza — el trigger de feedback avisa al equipo.
  async function sendLove() {
    if (loved) return;
    const { error } = await getSupabase().from('feedback').upsert({
      creator_id: asset.creator_id, asset_id: asset.id, kind: 'love',
      author_id: soldBy, author_role: 'agency', resolved: true,
    }, { onConflict: 'asset_id,author_id' });
    if (!error) setLoved(true);
  }

  const loadNotes = useCallback(async () => {
    const { data } = await getSupabase().from('asset_notes')
      .select('id, note, note_date, author_name, author_handle').eq('asset_id', asset.id)
      .order('note_date', { ascending: false }).order('created_at', { ascending: false });
    setNotes(data || []);
  }, [asset.id]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  const priceNum = () => Math.max(0, parseFloat(price) || 0);
  const avg = sales > 0 ? `$${Math.round(revenue / sales).toLocaleString('en-US')}` : '—';
  const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

  // Persiste el conteo. Cada +1 / −1 es un récord real que la modelo y el admin ven.
  async function persist(nSales, nRev) {
    setSaving(true);
    const { error } = await getSupabase().rpc('agency_set_stats', {
      aid: asset.id, p_sales: nSales, p_revenue: nRev,
      p_reach: asset.reach || 0, p_interactions: asset.interactions || 0,
    });
    setSaving(false);
    if (error) { console.error(error); return; }
    onSaved({ sales_count: nSales, revenue: nRev });
  }
  function inc() {
    const nS = sales + 1;
    const nR = Math.round((Number(revenue) + priceNum()) * 100) / 100;
    setSales(nS); setRevenue(nR); persist(nS, nR);
    // Libro de ventas: cada +1 deja una fila auditable (fecha, pieza, precio, quién).
    getSupabase().from('agency_sales').insert({
      creator_id: asset.creator_id, agency_id: agencyId, asset_id: asset.id,
      amount_cents: Math.round(priceNum() * 100), sold_by: soldBy,
    }).then(() => {}, () => {});
  }
  async function dec() {
    if (sales <= 0) return;
    const nS = sales - 1;
    const nR = Math.max(0, Math.round((Number(revenue) - priceNum()) * 100) / 100);
    setSales(nS); setRevenue(nR); persist(nS, nR);
    // Deshacer: borra la última venta registrada de esta pieza por esta agencia.
    const supabase = getSupabase();
    const { data } = await supabase.from('agency_sales').select('id')
      .eq('asset_id', asset.id).eq('agency_id', agencyId)
      .order('created_at', { ascending: false }).limit(1);
    if (data?.[0]) await supabase.from('agency_sales').delete().eq('id', data[0].id);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const { error } = await getSupabase().from('asset_notes').insert({
      asset_id: asset.id, author_id: soldBy, author_name: agencyName, author_handle: agencyHandle || null, author_email: agencyEmail || null, note: newNote.trim(),
    });
    setAddingNote(false);
    if (error) { console.error(error); return; }
    setNewNote(''); loadNotes();
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand">
          <X size={18} />
        </button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="bg-ink">
            {asset.type === 'video'
              ? <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" controls autoPlay loop playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={src} alt={asset.title || ''} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" />}
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[85vh]">
            <div>
              {asset.deliver_date && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 text-[11px] font-medium text-paper-dim">
                  <Sparkles size={11} className="text-brand" /> {folderName || 'Entrega'} · {fmtDate(asset.deliver_date)}
                </span>
              )}
              {asset.title && <h3 className="mt-2 font-display text-xl font-semibold text-paper">{asset.title}</h3>}
              {/* Like de la agencia — el equipo lo ve en Feedback como «Agencia» */}
              <button onClick={sendLove} disabled={loved}
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  loved ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
                <Heart size={13} className={loved ? 'fill-current' : ''} /> {loved ? 'Le diste like — el equipo lo ve' : 'Nos encantó'}
              </button>
            </div>
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} /> Por qué se hizo</div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || 'Sin propósito asignado'}</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-paper">Registrar venta</div>
              <p className="mt-0.5 text-xs text-paper-dim">Como una maquinita: cada vez que se vende en OnlyFans, le das <span className="font-semibold text-paper">+1</span>. Lleva el conteo y suma los ingresos solo.</p>

              {/* Precio por venta — el promedio, editable */}
              <label className="mt-3 block">
                <span className="text-[11px] font-medium text-paper-dim">Precio por venta ($) — el promedio, lo puedes cambiar</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej. 15"
                  className="mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/50" />
              </label>

              {/* Contador — el récord real de esta pieza */}
              <div className="mt-3 rounded-2xl border border-line bg-ink-2 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-display text-4xl font-bold leading-none text-paper">{sales}</div>
                    <div className="mt-1 text-[11px] text-paper-dim">veces vendida</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold leading-none text-brand">{money(revenue)}</div>
                    <div className="mt-1 text-[11px] text-paper-dim">ingresos · prom. {avg}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={dec} disabled={saving || sales <= 0} aria-label="Quitar una venta"
                    className="grid h-11 w-12 shrink-0 place-items-center rounded-xl border border-line text-lg font-bold text-paper-mute transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-40">−1</button>
                  <button onClick={inc} disabled={saving}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={17} /> +1 venta</>}
                  </button>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-dim"><CheckCircle2 size={12} className="text-brand" /> Cada venta es un récord — se atribuye a tu agencia y la ven la modelo y el admin.</p>
            </div>

            {/* Day-by-day notes journal */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-paper"><NotebookPen size={15} className="text-brand" /> Bitácora de notas</div>
              <div className="flex gap-2">
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                  placeholder="Escribe una nota de hoy…"
                  className="flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
                <button onClick={addNote} disabled={addingNote || !newNote.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.03] disabled:opacity-50">
                  {addingNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {notes.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-paper-dim">Aún no hay notas. Empieza tu bitácora del día.</p>}
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-line bg-ink-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{initials(n.author_name)}</span>
                      <span className="truncate text-xs font-semibold text-paper">{n.author_name || 'Equipo'}{n.author_handle ? <span className="font-normal text-paper-dim"> · @{n.author_handle}</span> : null}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-paper-dim">{fmtDate(n.note_date)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-paper">{n.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-equipo de la agencia: invitar empleados con funciones + modelos ──────
const AGENCY_FUNCS = [
  { v: 'content', l: 'Ver contenido' },
  { v: 'sales', l: 'Registrar ventas y precios' },
  { v: 'requests', l: 'Hacer pedidos' },
  { v: 'metrics', l: 'Ver ingresos y números' },
];

function AgencyTeamTab({ agencyId, models, flash }) {
  const [team, setTeam] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', email: '', caps: [], creators: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().rpc('agency_team');
    setTeam(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const nameOf = (id) => (models.find((m) => m.id === id)?.name) || 'Modelo';

  async function invite(e) {
    e.preventDefault();
    setErr(''); setCreds(null);
    if (!f.email.trim()) { setErr('Pon el correo del empleado.'); return; }
    if (!f.caps.length) { setErr('Elige al menos una función.'); return; }
    if (!f.creators.length) { setErr('Asigna al menos una modelo.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { role: 'agency', agency_member: true, email: f.email.trim(), password: pw, full_name: f.full_name.trim(), member_caps: f.caps, member_creator_ids: f.creators },
    });
    setBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo invitar al empleado.'); return; }
    flash(out.invited ? `Invitación enviada a ${f.email.trim()}` : 'Empleado creado');
    setF({ full_name: '', email: '', caps: [], creators: [] });
    setOpen(false);
    load();
  }

  async function removeMember(mid, name) {
    if (!window.confirm(`¿Quitar a ${name}? Pierde el acceso a la agencia.`)) return;
    const { error } = await getSupabase().from('agency_members').delete().eq('member_id', mid);
    if (error) { flash('Error: ' + error.message); return; }
    flash('Empleado quitado');
    load();
  }

  const inputCls = 'w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60';

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-paper">Tu equipo</h2>
          <p className="text-xs text-paper-dim">Invita empleados y dales funciones y modelos. Tú (dueño) siempre tienes acceso total.</p>
        </div>
        {!open && (
          <button onClick={() => { setOpen(true); setErr(''); setCreds(null); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
            <UserPlus size={15} /> Invitar empleado
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={invite} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-paper-dim">Nombre</label>
              <input value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} placeholder="Nombre del empleado" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-paper-dim">Correo (le llega la invitación)</label>
              <input value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} type="email" placeholder="empleado@correo.com" className={inputCls} />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand/80">Funciones</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {AGENCY_FUNCS.map((c) => {
                const on = f.caps.includes(c.v);
                return (
                  <button key={c.v} type="button" onClick={() => toggle('caps', c.v)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${on ? 'border-brand/60 bg-brand/10 text-paper' : 'border-line bg-ink-2 text-paper-mute hover:border-paper/20'}`}>
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-brand bg-brand text-on-accent' : 'border-paper-dim'}`}>{on && <Check size={11} />}</span>
                    {c.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand/80">Modelos que puede gestionar</p>
            {models.length === 0 ? (
              <p className="text-xs text-paper-dim">Aún no tienes modelos en la agencia.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {models.map((m) => {
                  const on = f.creators.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggle('creators', m.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:text-paper'}`}>
                      {on ? <Check size={12} /> : <Plus size={12} />} {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {err && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Enviar invitación
            </button>
            <button type="button" onClick={() => { setOpen(false); setErr(''); }} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
          </div>
        </form>
      )}

      {team.length === 0 && !open && (
        <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Aún no tienes empleados. Invita al primero con el botón de arriba.</p>
      )}

      <div className="space-y-2">
        {team.map((mem) => (
          <div key={mem.member_id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display font-semibold text-paper">{mem.full_name}</p>
                <p className="truncate text-[11px] text-paper-dim">{mem.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(mem.capabilities || []).map((c) => (
                    <span key={c} className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                      {(AGENCY_FUNCS.find((x) => x.v === c) || {}).l || c}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-paper-dim">
                  {(mem.creator_ids || []).length === 0 ? 'Sin modelos asignadas' : `${mem.creator_ids.length} modelo${mem.creator_ids.length === 1 ? '' : 's'}: ${mem.creator_ids.map(nameOf).join(', ')}`}
                </p>
              </div>
              <button onClick={() => removeMember(mem.member_id, mem.full_name)} title="Quitar empleado"
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10">
                <Trash2 size={13} /> Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
