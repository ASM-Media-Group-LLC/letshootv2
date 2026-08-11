'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShieldCheck, Check, Plus, X, RefreshCw, IdCard, Clock, UserPlus, ClipboardList, AlertTriangle, BarChart3, Building2, CreditCard, Sparkles, Link2, Copy, Search, Loader2, ChevronDown, SlidersHorizontal, ArrowUpDown, Upload, Heart, KeyRound } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
import { CAPS, CAP_SECTIONS } from '@/lib/caps';
import { PACKS } from '@/lib/packs';
import ReactionsDashboard from '@/components/ReactionsDashboard';
import Logo from '@/components/Logo';

// Roles: admin = dueño (todo) · supervisor = equipo interno (funciones por
// asignar) · agency = agencia/manager (pide contenido, gestiona modelos) ·
// creator = creadora. 'producer'/'chatter' son legacy → etiqueta "Equipo".
const ROLES = [
  { v: 'admin', l: 'Admin (dueño)' },
  { v: 'supervisor', l: 'Equipo' },
  { v: 'agency', l: 'Agencia / Manager' },
  { v: 'creator', l: 'Creadora' },
];
const ROLE_LABEL = { ...Object.fromEntries(ROLES.map((r) => [r.v, r.l])), producer: 'Equipo', chatter: 'Equipo' };

// Dynamic staff functions — assigned one by one to internal team members.
// Only the admin has all functions implicitly. There is NO "servicio al
// cliente": los pedidos los hacen la agencia/manager o la propia creadora.
// You build the puesto and grant access function by function. 'datos' and 'kyc'
// The platform functions live in lib/caps.js — mapped by SECTION → function
// (single source of truth for /admin and /trabajo).
// "datos con identificación" = datos + kyc, "datos sin identificación" = datos.
const LORA_MIN = 50; // house minimum clone photos
const MANAGER_ROLES = ['admin'];
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Creator onboarding status → human label + tone
// Flow: registered → info → id_pending → id_approved → active (pago al final).
const OB = {
  registered:  { label: 'Solo registrada',          tone: 'zinc' },
  info:        { label: 'Datos listos · falta ID',  tone: 'zinc' },
  id_pending:  { label: 'Por revisar',              tone: 'amber' },
  id_rejected: { label: 'ID rechazado',             tone: 'rose' },
  id_approved: { label: 'Aprobada · falta pago',    tone: 'sky' },
  authorized:  { label: 'Aprobada · falta pago',    tone: 'sky' }, // legacy
  paid:        { label: 'Activa',                   tone: 'brand' }, // legacy
  active:      { label: 'Activa',                   tone: 'brand' },
};
const TONE = {
  zinc:  'border-line bg-hair/5 text-paper-mute',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  rose:  'border-rose-500/40 bg-rose-500/10 text-rose-300',
  sky:   'border-sky-500/40 bg-sky-500/10 text-sky-300',
  brand: 'border-brand/40 bg-brand/10 text-brand',
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('registros');
  const [profiles, setProfiles] = useState([]);
  const [kyc, setKyc] = useState([]); // pending verifications w/ signed doc urls
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');
  const [nu, setNu] = useState({ full_name: '', job_title: '', email: '', password: '', role: 'supervisor' });
  const [nuCaps, setNuCaps] = useState([]); // accesos del puesto, elegidos AL crear
  const [selCreator, setSelCreator] = useState(null); // creator id whose profile drawer is open
  const [selStaff, setSelStaff] = useState(null);      // team member id whose profile drawer is open
  const [agencyLinks, setAgencyLinks] = useState([]); // agency_creators rows
  const [assetStats, setAssetStats] = useState([]);   // per-creator sales/revenue for agency numbers
  const [invites, setInvites] = useState([]);         // pending staff invite links
  const [invBusy, setInvBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [equipoPanel, setEquipoPanel] = useState(null); // null | 'invite' | 'create' — keep the tab calm
  const [metrics, setMetrics] = useState({ requests: [], lora: 0 });
  const [creating, setCreating] = useState(false);
  const [nuError, setNuError] = useState('');
  const [regFilter, setRegFilter] = useState('all'); // abierto por defecto | null = cerrado | id_pending | proceso | activas
  const [regQuery, setRegQuery] = useState('');       // buscador de registros
  const [regSort, setRegSort] = useState('recent');   // recent | oldest | photos | plan — cómo ordenar el registro
  const [regSub, setRegSub] = useState('active');     // por defecto: solo suscripción activa | all | inactive | id_pending | falta_pago
  const [newCreator, setNewCreator] = useState(null); // null | {full_name, email, password} — modal de alta manual
  const [ncBusy, setNcBusy] = useState(false);
  const [ncErr, setNcErr] = useState('');

  const loadKyc = useCallback(async () => {
    const supabase = getSupabase();
    const { data: pend } = await supabase.from('profiles')
      .select('id, full_name, email, legal_first_name, legal_last_name, date_of_birth, country, stage_name, created_at, consent_at')
      .eq('onboarding_status', 'id_pending')
      .order('created_at');
    const list = [];
    for (const p of pend || []) {
      const { data: docs } = await supabase.from('kyc_documents').select('doc_type, storage_path').eq('user_id', p.id);
      const signed = {};
      for (const d of docs || []) {
        if (!d.storage_path) continue;
        // Demo/seed docs use a bundled /public (or full URL) path — show directly.
        if (d.storage_path.startsWith('/') || d.storage_path.startsWith('http')) { signed[d.doc_type] = d.storage_path; continue; }
        const { data: s } = await supabase.storage.from('kyc').createSignedUrl(d.storage_path, 600);
        if (s?.signedUrl) signed[d.doc_type] = s.signedUrl;
      }
      list.push({ ...p, docs: signed });
    }
    setKyc(list);
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    setLoading(true);
    const [{ data: profs }, { data: reqs }, { count: loraCount }, { data: agLinks }, { data: assetRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, job_title, email, role, onboarding_status, staff_status, created_at, capabilities, handle, avatar_url, stage_name, legal_first_name, legal_last_name, date_of_birth, country, phone, payment_status, plan, lora_status, consent_at, id_rejection_reason, id_reviewed_at, subscription_ends_at').order('role'),
      supabase.from('requests').select('id, status, created_at'),
      supabase.from('lora_photos').select('id', { count: 'exact', head: true }),
      supabase.from('agency_creators').select('agency_id, creator_id'),
      supabase.from('assets').select('creator_id, sales_count, revenue'),
    ]);
    setProfiles(profs || []);
    setAgencyLinks(agLinks || []);
    setAssetStats(assetRows || []);
    const { data: inv } = await supabase.from('staff_invites').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setInvites(inv || []);
    setMetrics({ requests: reqs || [], lora: loraCount || 0 });
    await loadKyc();
    setLoading(false);
  }, [loadKyc]);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role !== 'admin') { setMe(up.profile); return; } // non-admin staff: limited view
      setMe(up.profile);
      load();
    })();
  }, [router, load]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function changeRole(id, role) {
    setSavingId(id);
    const { error } = await getSupabase().from('profiles').update({ role }).eq('id', id);
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return; }
    setProfiles((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));
    flash('Rol actualizado');
  }

  async function toggleCap(id, cap, on) {
    const u = profiles.find((x) => x.id === id);
    const caps = new Set(u?.capabilities || []);
    if (on) caps.add(cap); else caps.delete(cap);
    const next = [...caps];
    setProfiles((p) => p.map((x) => (x.id === id ? { ...x, capabilities: next } : x)));
    const { error } = await getSupabase().from('profiles').update({ capabilities: next }).eq('id', id);
    if (error) { flash('Error: ' + error.message); load(); return; }
    flash('Funciones actualizadas');
  }

  async function createUser(e) {
    e.preventDefault();
    setNuError('');
    if (!nu.email || !nu.password || !nu.role) { setNuError('Completa correo, contraseña y rol.'); return; }
    if (nu.password.length < 8) { setNuError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (nu.role === 'supervisor' && nuCaps.length === 0) { setNuError('Marca al menos una función para este puesto.'); return; }
    setCreating(true);
    // Supabase Edge Function 'create-user' runs with the service role (injected
    // by Supabase) and verifies the caller is admin. functions.invoke sends the
    // signed-in user's JWT automatically. The puesto is born WITH the accesses
    // the admin checks below — no "empty then configure" dance.
    const caps = nu.role === 'supervisor' ? nuCaps : [];
    const { data, error } = await getSupabase().functions.invoke('create-user', { body: { ...nu, capabilities: caps } });
    setCreating(false);
    let out = data;
    if (error && !out) {
      try { out = await error.context.json(); } catch { out = { error: error.message }; }
    }
    if (!out?.ok) { setNuError(out?.error || 'No se pudo crear el usuario.'); return; }
    const createdRole = nu.role;
    setNu({ full_name: '', job_title: '', email: '', password: '', role: 'supervisor' });
    setNuCaps([]);
    setEquipoPanel(null);
    flash(createdRole === 'supervisor' ? `Puesto creado con ${caps.length} acceso${caps.length === 1 ? '' : 's'}` : 'Cuenta creada');
    await load();
  }

  // Dar de alta una creadora a mano — el equipo la deja lista con TODOS los
  // datos que ya tiene (plan, artístico, teléfono, país, nombre legal,
  // nacimiento). Si activate=true nace ya con la suscripción activa.
  async function createCreator(e) {
    e.preventDefault();
    setNcErr('');
    const f = newCreator || {};
    if (!f.full_name?.trim() || !f.email?.trim() || !f.password) { setNcErr('Completa nombre, correo y contraseña.'); return; }
    if (f.password.length < 8) { setNcErr('La contraseña debe tener al menos 8 caracteres.'); return; }
    setNcBusy(true);
    // 1) Crear cuenta auth + perfil base vía la edge function (role creator).
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { full_name: f.full_name.trim(), email: f.email.trim().toLowerCase(), password: f.password, role: 'creator' },
    });
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setNcBusy(false); setNcErr(out?.error || 'No se pudo dar de alta la creadora.'); return; }

    // 2) Llenar el resto del perfil con lo que ya tenemos (admin puede update).
    const patch = {};
    if (f.stage_name?.trim())        patch.stage_name = f.stage_name.trim();
    if (f.handle?.trim())            patch.handle = f.handle.trim().replace(/^@/, '');
    if (f.phone?.trim())             patch.phone = f.phone.trim();
    if (f.country?.trim())           patch.country = f.country.trim();
    if (f.legal_first_name?.trim())  patch.legal_first_name = f.legal_first_name.trim();
    if (f.legal_last_name?.trim())   patch.legal_last_name = f.legal_last_name.trim();
    if (f.date_of_birth)             patch.date_of_birth = f.date_of_birth;
    if (f.plan)                      patch.plan = f.plan;
    if (f.activate) {
      patch.payment_status = 'paid';
      patch.onboarding_status = 'active';
      if (!patch.plan) patch.plan = 'core';
      patch.subscription_ends_at = f.ends_at || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    } else {
      // Armada por el admin pero aún sin pagar: la deja lista (no repite datos),
      // pendiente de pago. Sigue paywalled hasta que actives la suscripción.
      patch.onboarding_status = 'authorized';
    }
    if (Object.keys(patch).length) {
      const { error: upErr } = await getSupabase().from('profiles').update(patch).eq('id', out.id);
      if (upErr) { setNcBusy(false); setNcErr('Cuenta creada, pero fallaron los datos extra: ' + upErr.message); await load(); return; }
    }
    setNcBusy(false);
    setNewCreator(null);
    flash(f.activate
      ? 'Creadora dada de alta y ACTIVA — lista para trabajar'
      : 'Creadora creada (inactiva) — actívala en Suscripción cuando pague para que la vea ella y su agencia');
    await load();
  }

  // ── Team invitations ──────────────────────────────────────────────────
  async function createInvite() {
    setInvBusy(true);
    const token = (crypto.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e9)}`).replace(/-/g, '');
    const { data, error } = await getSupabase().from('staff_invites').insert({ token, created_by: me.id }).select().single();
    setInvBusy(false);
    if (error) { flash('Error: ' + error.message); return; }
    setInvites((v) => [data, ...v]);
    const link = `${window.location.origin}/unirse/${token}`;
    try { await navigator.clipboard.writeText(link); setCopied(data.id); setTimeout(() => setCopied(''), 2000); flash('Link copiado'); } catch { flash('Link creado'); }
  }
  async function copyInvite(inv) {
    const link = `${window.location.origin}/unirse/${inv.token}`;
    try { await navigator.clipboard.writeText(link); setCopied(inv.id); setTimeout(() => setCopied(''), 2000); flash('Link copiado'); } catch { flash(link); }
  }
  async function revokeInvite(inv) {
    const { error } = await getSupabase().from('staff_invites').update({ status: 'revoked' }).eq('id', inv.id);
    if (error) { flash('Error: ' + error.message); return; }
    setInvites((v) => v.filter((x) => x.id !== inv.id));
    flash('Invitación cancelada');
  }
  async function approveStaff(id) {
    setSavingId(id);
    const { error } = await getSupabase().rpc('approve_staff', { target: id });
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return; }
    setProfiles((ps) => ps.map((u) => (u.id === id ? { ...u, staff_status: 'approved' } : u)));
    flash('Aprobado — ahora asígnale sus accesos');
  }

  // Which models an agency manages (admin marks them here).
  async function toggleAgencyModel(agencyId, creatorId, on) {
    const supabase = getSupabase();
    if (on) {
      const { error } = await supabase.from('agency_creators').insert({ agency_id: agencyId, creator_id: creatorId });
      if (error) return flash('Error: ' + error.message);
      setAgencyLinks((l) => [...l, { agency_id: agencyId, creator_id: creatorId }]);
    } else {
      const { error } = await supabase.from('agency_creators').delete().eq('agency_id', agencyId).eq('creator_id', creatorId);
      if (error) return flash('Error: ' + error.message);
      setAgencyLinks((l) => l.filter((x) => !(x.agency_id === agencyId && x.creator_id === creatorId)));
    }
    flash('Agencia actualizada');
  }

  // Professional review — approve unlocks payment (nothing charged yet); reject
  // sends the creator back to the ID step with the reason. Updates both the
  // pending queue and the full profiles list so the profile drawer stays in sync.
  async function reviewKyc(userId, approve, reason = null) {
    setSavingId(userId);
    const { error } = await getSupabase().rpc('review_kyc', { target: userId, approve, reason: approve ? null : reason });
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return false; }
    const newStatus = approve ? 'id_approved' : 'id_rejected';
    setProfiles((ps) => ps.map((u) => (u.id === userId
      ? { ...u, onboarding_status: newStatus, id_rejection_reason: approve ? null : reason, id_reviewed_at: new Date().toISOString() }
      : u)));
    setKyc((k) => k.filter((u) => u.id !== userId));
    sendEmail(approve ? 'approved' : 'rejected', userId, approve ? '' : (reason || ''));
    await getSupabase().from('notifications').insert({
      user_id: userId, kind: approve ? 'approved' : 'rejected', meta: approve ? {} : { reason: reason || '' },
    });
    flash(approve ? 'Aprobada — ya puede pagar' : 'Verificación rechazada');
    return true;
  }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Non-admin staff work in /trabajo.
  if (me?.role !== 'admin') { router.replace('/trabajo'); return null; }

  const creators = profiles.filter((p) => p.role === 'creator');

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <Header me={me} router={router} />

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Administración</h1>
            <p className="mt-1 text-sm text-paper-mute">Registros, verificaciones y tu equipo interno — todo desde aquí.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm text-paper-mute hover:text-paper">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
          {[
            { id: 'registros', label: 'Registros', icon: ClipboardList },
            { id: 'metricas', label: 'Métricas', icon: BarChart3 },
            { id: 'reacciones', label: 'Reacciones', icon: Heart },
            { id: 'verificaciones', label: 'Verificaciones', icon: IdCard, badge: kyc.length },
            { id: 'equipo', label: 'Equipo interno', icon: Users },
            { id: 'agencias', label: 'Agencias', icon: Building2 },
          ].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${tab === tb.id ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}>
              <tb.icon size={15} /> {tb.label}
              {tb.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-accent">{tb.badge}</span> : null}
              {tab === tb.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-paper-dim">Cargando datos…</p>
        ) : tab === 'registros' ? (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-paper-mute">Toca una tarjeta para ver esas creadoras, o da de alta una nueva.</p>
              <button onClick={() => { const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10); setNewCreator({ full_name: '', stage_name: '', handle: '', email: '', password: '', phone: '', country: '', legal_first_name: '', legal_last_name: '', date_of_birth: '', plan: '', activate: false, ends_at: in30 }); setNcErr(''); }}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
                <UserPlus size={15} /> Add creator
              </button>
            </div>
            {(() => {
              const cr = profiles.filter((p) => p.role === 'creator');
              const inCat = (p, cat) => cat === 'all' ? true
                : cat === 'id_pending' ? p.onboarding_status === 'id_pending'
                : cat === 'proceso' ? ['info', 'id_rejected', 'id_approved', 'authorized'].includes(p.onboarding_status)
                : cat === 'activas' ? ['active', 'paid'].includes(p.onboarding_status) : true;
              const stats = [
                { key: 'all', label: 'Registradas', value: cr.length, tone: 'zinc' },
                { key: 'id_pending', label: 'Por revisar', value: cr.filter((p) => inCat(p, 'id_pending')).length, tone: 'amber' },
                { key: 'proceso', label: 'En proceso', value: cr.filter((p) => inCat(p, 'proceso')).length, tone: 'sky' },
                { key: 'activas', label: 'Activas', value: cr.filter((p) => inCat(p, 'activas')).length, tone: 'brand' },
              ];
              const q = regQuery.trim().toLowerCase();
              // Fotos por creadora — assetStats ya trae una fila por foto con su creator_id.
              const photoCount = {};
              for (const a of assetStats) photoCount[a.creator_id] = (photoCount[a.creator_id] || 0) + 1;
              const planRankOf = (p) => ({ pro: 3, core: 2, test: 1 }[p.plan] || 0);
              const sorters = {
                recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
                oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
                photos: (a, b) => (photoCount[b.id] || 0) - (photoCount[a.id] || 0) || new Date(b.created_at) - new Date(a.created_at),
                plan:   (a, b) => planRankOf(b) - planRankOf(a) || (photoCount[b.id] || 0) - (photoCount[a.id] || 0),
              };
              const isPaying = (p) => p.payment_status === 'paid' || ['active', 'paid'].includes(p.onboarding_status);
              const todayISO = new Date().toISOString().slice(0, 10);
              const daysUntil = (p) => {
                if (!p.subscription_ends_at) return null;
                return Math.floor((new Date(p.subscription_ends_at + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 864e5);
              };
              const dueSoonList = cr.filter((p) => { const d = daysUntil(p); return isPaying(p) && d !== null && d >= 0 && d <= 7; });
              const overdueList = cr.filter((p) => { const d = daysUntil(p); return isPaying(p) && d !== null && d < 0; });
              const subOk = (p) => {
                if (regSub === 'all') return true;
                if (regSub === 'active') return isPaying(p);
                if (regSub === 'inactive') return !isPaying(p);
                if (regSub === 'id_pending') return p.onboarding_status === 'id_pending';
                if (regSub === 'falta_pago') return ['id_approved', 'authorized'].includes(p.onboarding_status) && !isPaying(p);
                if (regSub === 'due_soon') { const d = daysUntil(p); return isPaying(p) && d !== null && d >= 0 && d <= 7; }
                if (regSub === 'overdue') { const d = daysUntil(p); return isPaying(p) && d !== null && d < 0; }
                return true;
              };
              const shown = cr.filter((p) => inCat(p, regFilter))
                .filter(subOk)
                .filter((p) => !q || `${p.full_name || ''} ${p.handle || ''} ${p.email || ''} ${p.stage_name || ''}`.toLowerCase().includes(q))
                .sort(sorters[regSort] || sorters.recent);
              return (
                <>
                  {/* Dashboard limpio: solo las cajitas. Tocas una → se abre su lista; tocas de nuevo → se cierra. */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((s) => {
                      const active = regFilter === s.key;
                      return (
                        <button key={s.key} onClick={() => { setRegFilter(active ? null : s.key); if (active) setRegQuery(''); }}
                          className={`rounded-2xl border p-4 text-left transition-all ${TONE[s.tone]} ${active ? 'ring-2 ring-brand/60 ring-offset-2 ring-offset-ink' : 'opacity-90 hover:opacity-100'}`}>
                          <div className="flex items-start justify-between">
                            <div className="font-display text-3xl font-bold">{s.value}</div>
                            <span className={`mt-1 text-[10px] transition-transform ${active ? 'rotate-180' : ''}`}>▾</span>
                          </div>
                          <div className="text-xs opacity-80">{s.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  {!regFilter && <p className="mt-3 text-xs text-paper-dim">Toca una tarjeta para ver esas creadoras.</p>}

                  {regFilter && (
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                          <input value={regQuery} onChange={(e) => setRegQuery(e.target.value)} placeholder="Buscar por nombre, @ o correo…"
                            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                        </div>
                        <span className="text-xs text-paper-dim">{shown.length} de {cr.length} · toca la tarjeta para cerrar</span>
                      </div>

                      {/* Notificador de vencimientos — el dueño lo ve arriba y toca para ir a esa lista */}
                      {(overdueList.length > 0 || dueSoonList.length > 0) && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {overdueList.length > 0 && (
                            <button onClick={() => setRegSub('overdue')}
                              className="group flex items-center justify-between gap-3 rounded-2xl border border-rose-500/50 bg-rose-500/[0.08] p-3.5 text-left transition-colors hover:bg-rose-500/[0.14]">
                              <div>
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-300">
                                  <AlertTriangle size={13} /> Vencidas
                                </div>
                                <p className="mt-1 text-sm text-paper">{overdueList.length} cuenta{overdueList.length === 1 ? '' : 's'} vencida{overdueList.length === 1 ? '' : 's'} — cobra o desactiva</p>
                              </div>
                              <span className="text-xs font-semibold text-rose-300">Ver →</span>
                            </button>
                          )}
                          {dueSoonList.length > 0 && (
                            <button onClick={() => setRegSub('due_soon')}
                              className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/[0.06] p-3.5 text-left transition-colors hover:bg-amber-500/[0.12]">
                              <div>
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                                  <Clock size={13} /> Vencen pronto
                                </div>
                                <p className="mt-1 text-sm text-paper">{dueSoonList.length} cuenta{dueSoonList.length === 1 ? '' : 's'} en ≤7 días — avisa y cobra</p>
                              </div>
                              <span className="text-xs font-semibold text-amber-300">Ver →</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Filtrar + Ordenar — dropdowns compactos, no botones abiertos. */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Dropdown icon={SlidersHorizontal} label="Filtrar" value={regSub} onChange={setRegSub}
                          options={[
                            { value: 'all', label: 'Todas' },
                            { value: 'active', label: 'Suscripción activa' },
                            { value: 'due_soon', label: 'Vencen en ≤7 días' },
                            { value: 'overdue', label: 'Vencidas' },
                            { value: 'inactive', label: 'Sin suscripción' },
                            { value: 'falta_pago', label: 'Aprobada · falta pago' },
                            { value: 'id_pending', label: 'ID por revisar' },
                          ]} />
                        <Dropdown icon={ArrowUpDown} label="Ordenar" value={regSort} onChange={setRegSort}
                          options={[
                            { value: 'recent', label: 'Más recientes' },
                            { value: 'oldest', label: 'Más antiguas' },
                            { value: 'photos', label: 'Más fotos' },
                            { value: 'plan', label: 'Suscripción más alta' },
                          ]} />
                        {regSub !== 'all' && (
                          <button onClick={() => setRegSub('all')} className="text-xs font-medium text-paper-dim hover:text-paper">Limpiar filtro</button>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-paper-dim">Haz clic en cualquier creadora para abrir su perfil: ves todo lo que tiene y le falta, y revisas su identidad.</p>
                      <div className="mt-2 overflow-x-auto rounded-2xl border border-line">
                        <div className="grid min-w-[720px] grid-cols-[1.4fr_0.6fr_0.5fr_0.9fr_1fr_auto] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                          <span>Creadora</span><span>Entró</span><span>Fotos</span><span>Vence</span><span>Estado</span><span></span>
                        </div>
                        {cr.length === 0 && <p className="px-5 py-6 text-paper-dim">Nadie se ha registrado todavía.</p>}
                        {cr.length > 0 && shown.length === 0 && <p className="px-5 py-6 text-paper-dim">Ninguna creadora coincide con el filtro.</p>}
                        {shown.map((u) => {
                          const st = OB[u.onboarding_status] || OB.registered;
                          const nFotos = photoCount[u.id] || 0;
                          const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' }) : '—';
                          const planLabel = u.plan ? u.plan.charAt(0).toUpperCase() + u.plan.slice(1) : null;
                          return (
                            <button key={u.id} onClick={() => setSelCreator(u.id)}
                              className="grid w-full min-w-[720px] grid-cols-[1.4fr_0.6fr_0.5fr_0.9fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04]">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-paper">{u.full_name || 'Sin nombre aún'}</span>
                                  <span className="block truncate text-[11px] text-paper-dim">{u.handle ? `@${u.handle}` : u.email}</span>
                                </span>
                              </span>
                              <span className="text-paper-mute">{joined}</span>
                              <span className={nFotos ? 'font-medium text-paper' : 'text-paper-dim'}>{nFotos}</span>
                              <span className="text-xs">
                                {(() => {
                                  const d = daysUntil(u);
                                  if (!isPaying(u) || d === null) return <span className="text-paper-dim">—</span>;
                                  const dateLabel = new Date(u.subscription_ends_at + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short' });
                                  if (d < 0) return <span className="inline-block rounded-full border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-300">Venció {dateLabel}</span>;
                                  if (d <= 7) return <span className="inline-block rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300">{d}d · {dateLabel}</span>;
                                  return <span className="text-paper-mute">{dateLabel}</span>;
                                })()}
                              </span>
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span>
                                {planLabel && <span className="inline-block rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">{planLabel}</span>}
                              </span>
                              <span className="flex items-center justify-end gap-1.5 text-xs font-semibold text-brand">
                                {u.onboarding_status === 'id_pending' && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">Revisar</span>}
                                Abrir →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        ) : tab === 'metricas' ? (
          <div className="mt-6">
            {(() => {
              const cr = profiles.filter((p) => p.role === 'creator');
              // Funnel: how far creators get through onboarding.
              const FUNNEL = [
                { l: 'Registradas', f: () => cr.length },
                { l: 'Datos completos', f: () => cr.filter((p) => p.onboarding_status !== 'registered').length },
                { l: 'ID enviado', f: () => cr.filter((p) => ['id_pending', 'id_approved', 'authorized', 'paid', 'active'].includes(p.onboarding_status)).length },
                { l: 'Aprobadas', f: () => cr.filter((p) => ['id_approved', 'authorized', 'paid', 'active'].includes(p.onboarding_status)).length },
                { l: 'Activas (pagando)', f: () => cr.filter((p) => ['active', 'paid'].includes(p.onboarding_status)).length },
              ].map((x) => ({ l: x.l, v: x.f() }));
              const max = Math.max(1, ...FUNNEL.map((x) => x.v));
              // Weekly signups, last 6 weeks.
              const now = Date.now();
              const weeks = Array.from({ length: 6 }, (_, i) => {
                const from = now - (6 - i) * 7 * 864e5;
                const to = now - (5 - i) * 7 * 864e5;
                const v = cr.filter((p) => { const d = new Date(p.created_at).getTime(); return d >= from && d < to; }).length;
                return { label: i === 5 ? 'Esta sem.' : `-${5 - i} sem`, v };
              });
              const wmax = Math.max(1, ...weeks.map((w) => w.v));
              const reqPending = metrics.requests.filter((r) => r.status === 'pending').length;
              const reqDelivered = metrics.requests.filter((r) => r.status === 'delivered').length;
              return (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-card p-5">
                    <h3 className="mb-4 font-display font-semibold text-paper">Funnel de registro</h3>
                    <div className="space-y-3">
                      {FUNNEL.map((x) => (
                        <div key={x.l}>
                          <div className="mb-1 flex justify-between text-xs text-paper-mute"><span>{x.l}</span><span className="font-mono text-paper">{x.v}</span></div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(x.v / max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line bg-card p-5">
                    <h3 className="mb-4 font-display font-semibold text-paper">Registros por semana</h3>
                    <div className="flex h-36 items-end gap-2">
                      {weeks.map((w, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <span className="font-mono text-[11px] text-paper-mute">{w.v}</span>
                          <div className="w-full rounded-t-lg bg-brand/70" style={{ height: `${Math.max(4, (w.v / wmax) * 100)}%` }} />
                          <span className="text-[10px] text-paper-dim">{w.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-2">
                    {[
                      { l: 'Pedidos pendientes', v: reqPending, tone: 'amber' },
                      { l: 'Pedidos entregados', v: reqDelivered, tone: 'brand' },
                      { l: 'Fotos LoRA subidas', v: metrics.lora, tone: 'sky' },
                    ].map((x) => (
                      <div key={x.l} className={`rounded-2xl border p-4 ${TONE[x.tone]}`}>
                        <div className="font-display text-3xl font-bold">{x.v}</div>
                        <div className="text-xs opacity-80">{x.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Libro de ventas real (manual_sales) — vive en /sales */}
                  <button onClick={() => router.push('/sales')}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5 text-left transition-colors hover:border-brand/40 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><CreditCard size={20} /></span>
                      <div>
                        <div className="font-display font-semibold text-paper">Ventas · libro de ingresos</div>
                        <div className="mt-0.5 text-xs text-paper-dim">Registro manual exacto de ventas y rebills (en centavos). Aquí vive el dinero real.</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand">Abrir /sales →</span>
                  </button>
                </div>
              );
            })()}
          </div>
        ) : tab === 'reacciones' ? (
          <ReactionsDashboard creators={creators.map((c) => ({ id: c.id, name: c.stage_name || c.full_name, avatar_url: c.avatar_url }))} />
        ) : tab === 'verificaciones' ? (
          <div className="mt-6 space-y-4">
            {kyc.length === 0 && (
              <div className="rounded-2xl border border-line bg-card p-10 text-center">
                <Clock className="mx-auto mb-3 text-paper-dim" />
                <p className="text-paper-mute">No hay verificaciones pendientes.</p>
              </div>
            )}
            {kyc.length > 0 && <p className="text-sm text-paper-mute">{kyc.length} identidad{kyc.length === 1 ? '' : 'es'} por revisar. Abre cada una para ver sus documentos y aprobar o rechazar.</p>}
            {kyc.map((u) => (
              <button key={u.id} onClick={() => setSelCreator(u.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 text-left transition-colors hover:border-amber-500/50">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {['id_front', 'id_back', 'selfie_id'].map((k) => (
                      u.docs[k]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img key={k} src={u.docs[k]} alt="" className="h-12 w-10 rounded-md object-cover ring-1 ring-line" />
                        : <span key={k} className="grid h-12 w-10 place-items-center rounded-md border border-dashed border-line text-[9px] text-paper-dim">falta</span>
                    ))}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-paper">{u.legal_first_name} {u.legal_last_name}
                      {u.stage_name && <span className="ml-2 text-xs font-normal text-paper-dim">· "{u.stage_name}"</span>}</div>
                    <div className="mt-0.5 text-xs text-paper-dim">{u.email} · {u.country || '—'}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm">
                  <ShieldCheck size={15} /> Revisar identidad →
                </span>
              </button>
            ))}
          </div>
        ) : tab === 'equipo' ? (
          <div className="mt-6 space-y-4">
            {/* Calm action bar — the forms stay hidden until you ask for them */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-paper">Tu equipo interno</h3>
                <p className="text-xs text-paper-dim">Quienes suben el contenido y verifican identidades. Toca a alguien para ver su perfil y accesos.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEquipoPanel(equipoPanel === 'invite' ? null : 'invite')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${equipoPanel === 'invite' ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-mute hover:text-paper'}`}>
                  <Link2 size={15} /> Invitar por link
                </button>
                <button onClick={() => setEquipoPanel(equipoPanel === 'create' ? null : 'create')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
                  <Plus size={15} /> Crear puesto
                </button>
              </div>
            </div>

            {/* Invite panel (collapsed by default) */}
            {equipoPanel === 'invite' && (
              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-paper-mute">Genera un link y mándaselo. La persona se registra sola; luego la <strong className="text-paper">apruebas</strong> y le das puesto y accesos.</p>
                  <button onClick={createInvite} disabled={invBusy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
                    {invBusy ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} Crear link
                  </button>
                </div>
                {invites.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2">
                        <code className="min-w-0 flex-1 truncate text-xs text-paper-mute">/unirse/{inv.token}</code>
                        <button onClick={() => copyInvite(inv)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-paper-mute hover:text-paper">
                          {copied === inv.id ? <Check size={13} className="text-brand" /> : <Copy size={13} />} {copied === inv.id ? 'Copiado' : 'Copiar'}
                        </button>
                        <button onClick={() => revokeInvite(inv)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-paper-dim hover:text-rose-300">Cancelar</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-3 text-xs text-paper-dim">No hay links activos. Crea uno y cópialo.</p>}
              </div>
            )}

            {/* Create panel (collapsed by default) */}
            {equipoPanel === 'create' && (
              <form onSubmit={createUser} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
                {/* Preset Uploader — el único rol pre-armado; luego agregas/quitas accesos igual */}
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/[0.06] p-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Preset</span>
                  <button type="button"
                    onClick={() => { setNu((v) => ({ ...v, role: 'supervisor', job_title: v.job_title || 'Uploader' })); setNuCaps(['content', 'requests', 'feedback']); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
                    <Upload size={13} /> Uploader (sube contenido)
                  </button>
                  <span className="text-[11px] text-paper-dim">Marca contenido · pedidos · feedback. Puedes ajustar los accesos abajo.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={nu.full_name} onChange={(e) => setNu((v) => ({ ...v, full_name: e.target.value }))} placeholder="Nombre (ej. Camila)"
                    className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  {nu.role === 'supervisor' ? (
                    <input value={nu.job_title} onChange={(e) => setNu((v) => ({ ...v, job_title: e.target.value }))} placeholder="Puesto / cargo (ej. Verificación)"
                      className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  ) : <div className="hidden sm:block" />}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="email" value={nu.email} onChange={(e) => setNu((v) => ({ ...v, email: e.target.value }))} placeholder="correo@ejemplo.com"
                    className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  <input type="text" value={nu.password} onChange={(e) => setNu((v) => ({ ...v, password: e.target.value }))} placeholder="Contraseña (mín. 8)"
                    className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  <select value={nu.role} onChange={(e) => setNu((v) => ({ ...v, role: e.target.value }))}
                    className="rounded-xl border border-line bg-ink-2 px-2.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>

                {/* Las funciones de la plataforma, por SECCIÓN → función — marcas qué puede hacer ESTE puesto */}
                {nu.role === 'supervisor' && (
                  <div className="mt-4 space-y-4">
                    {CAP_SECTIONS.map((sec) => (
                      <div key={sec.id}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/80">{sec.name}</div>
                        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                          {sec.caps.map((c) => {
                            const on = nuCaps.includes(c.v);
                            return (
                              <button type="button" key={c.v}
                                onClick={() => setNuCaps((v) => (on ? v.filter((x) => x !== c.v) : [...v, c.v]))}
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
                )}

                <button type="submit" disabled={creating}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
                  {creating ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                  {nu.role === 'supervisor' ? `Crear puesto con ${nuCaps.length} acceso${nuCaps.length === 1 ? '' : 's'}` : 'Crear cuenta'}
                </button>
                {nuError && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{nuError}</p>}
              </form>
            )}

            {/* Pending approval (only when there are any) */}
            {profiles.filter((u) => u.staff_status === 'pending' && u.role !== 'admin').length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-paper"><Clock size={15} className="text-amber-300" /> Pendientes de aprobar</div>
                <div className="space-y-2">
                  {profiles.filter((u) => u.staff_status === 'pending' && u.role !== 'admin').map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line bg-ink-2 p-3">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-paper">{u.full_name || '—'}</p>
                        <p className="truncate text-xs text-paper-mute">{u.email}{u.job_title ? ` · ${u.job_title}` : ''}</p>
                      </div>
                      <button onClick={async () => { await approveStaff(u.id); setSelStaff(u.id); }} disabled={savingId === u.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-50">
                        {savingId === u.id ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} Aprobar y configurar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
            {profiles.filter((u) => u.role !== 'creator' && u.role !== 'agency' && u.staff_status !== 'pending').map((u) => {
              const isMgr = MANAGER_ROLES.includes(u.role);
              const caps = u.capabilities || [];
              const grantedLabels = CAPS.filter((c) => caps.includes(c.v)).map((c) => c.l);
              return (
                <button key={u.id} onClick={() => setSelStaff(u.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-brand/30 hover:bg-hair/[0.04]">
                  <Avatar src={u.avatar_url} name={u.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-paper">{u.full_name || '—'}
                      <span className="ml-2 rounded-full bg-hair/10 px-2 py-0.5 text-[11px] font-normal text-paper-dim">{isMgr ? 'Dueño' : (u.job_title || 'Equipo')}</span>
                    </p>
                    <p className="truncate text-xs text-paper-mute">{u.email}</p>
                    <p className="mt-0.5 truncate text-[11px] text-paper-dim">
                      {isMgr ? 'Todas las funciones'
                        : grantedLabels.length ? `${grantedLabels.length} acceso${grantedLabels.length === 1 ? '' : 's'}: ${grantedLabels.join(' · ')}`
                        : 'Sin accesos'}
                    </p>
                  </div>
                  {!isMgr && !grantedLabels.length && <span className="hidden shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 sm:inline">Sin accesos</span>}
                  <span className="shrink-0 text-xs font-semibold text-brand">Abrir →</span>
                </button>
              );
            })}
            </div>
          </div>
        ) : tab === 'agencias' ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-paper-mute">
              Cada agencia / manager entra a <em>todas</em> sus modelos, hace pedidos y registra las ventas.
              Aquí marcas qué modelos maneja cada una. Para crear una agencia nueva, usa «Crear puesto / usuario» en Equipo interno con tipo «Agencia / Manager».
            </p>
            {profiles.filter((p) => p.role === 'agency').length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">No hay agencias todavía.</p>
            )}
            {profiles.filter((p) => p.role === 'agency').map((ag) => {
              const linked = agencyLinks.filter((l) => l.agency_id === ag.id).map((l) => l.creator_id);
              return (
                <div key={ag.id} className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display font-semibold text-paper"><Building2 size={16} className="text-brand" /> {ag.full_name || '—'}</p>
                      <p className="mt-0.5 truncate text-xs text-paper-mute">{ag.email}</p>
                    </div>
                    <div className="text-xs text-paper-dim">{linked.length} modelo{linked.length === 1 ? '' : 's'}</div>
                  </div>
                  <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Modelos que maneja</p>
                  <div className="flex flex-wrap gap-2">
                    {creators.length === 0 && <span className="text-sm text-paper-dim">No hay creadoras registradas todavía.</span>}
                    {creators.map((cr) => {
                      const on = linked.includes(cr.id);
                      return (
                        <button key={cr.id} onClick={() => toggleAgencyModel(ag.id, cr.id, !on)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:text-paper'}`}>
                          {on ? <Check size={14} /> : <Plus size={14} />} {cr.full_name || cr.email}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4"><ResetPasswordBox userId={ag.id} /></div>
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      {newCreator && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 py-8 backdrop-blur-sm" onClick={() => !ncBusy && setNewCreator(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={createCreator}
            className="mx-5 w-full max-w-2xl rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-paper"><UserPlus size={18} className="text-brand" /> Add creator</h3>
                <p className="mt-1 text-sm text-paper-mute">Deja la cuenta lista con lo que ya sepas: acceso, contacto, identidad y suscripción. Todo es opcional menos el acceso.</p>
              </div>
              <button type="button" onClick={() => setNewCreator(null)} className="rounded-full p-1 text-paper-dim hover:text-paper"><X size={18} /></button>
            </div>

            {/* Acceso — lo único obligatorio */}
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Acceso a la plataforma</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Nombre <span className="text-rose-300">*</span></label>
                  <input autoFocus value={newCreator.full_name} onChange={(e) => setNewCreator((v) => ({ ...v, full_name: e.target.value }))}
                    placeholder="Ej. Valentina Ríos" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Correo <span className="text-rose-300">*</span></label>
                  <input type="email" value={newCreator.email} onChange={(e) => setNewCreator((v) => ({ ...v, email: e.target.value }))}
                    placeholder="correo@ejemplo.com" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Contraseña temporal <span className="text-rose-300">*</span></label>
                  <input value={newCreator.password} onChange={(e) => setNewCreator((v) => ({ ...v, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
              </div>
            </div>

            {/* Perfil público */}
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Perfil público</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Nombre artístico</label>
                  <input value={newCreator.stage_name} onChange={(e) => setNewCreator((v) => ({ ...v, stage_name: e.target.value }))}
                    placeholder="Como se hace llamar" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Usuario (@)</label>
                  <input value={newCreator.handle} onChange={(e) => setNewCreator((v) => ({ ...v, handle: e.target.value }))}
                    placeholder="valentina.rios" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Teléfono</label>
                  <input value={newCreator.phone} onChange={(e) => setNewCreator((v) => ({ ...v, phone: e.target.value }))}
                    placeholder="+1 555…" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">País</label>
                  <input value={newCreator.country} onChange={(e) => setNewCreator((v) => ({ ...v, country: e.target.value }))}
                    placeholder="US, MX, CO…" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
              </div>
            </div>

            {/* Identidad (opcional en este paso) */}
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Identidad</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Nombre legal</label>
                  <input value={newCreator.legal_first_name} onChange={(e) => setNewCreator((v) => ({ ...v, legal_first_name: e.target.value }))}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Apellido legal</label>
                  <input value={newCreator.legal_last_name} onChange={(e) => setNewCreator((v) => ({ ...v, legal_last_name: e.target.value }))}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Nacimiento</label>
                  <input type="date" value={newCreator.date_of_birth} onChange={(e) => setNewCreator((v) => ({ ...v, date_of_birth: e.target.value }))}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
                </div>
              </div>
              <p className="text-[11px] text-paper-dim">La foto del ID se sube después desde su perfil (pestaña Identidad).</p>
            </div>

            {/* Suscripción — conectada al pricing */}
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Suscripción</div>
              <div className="grid grid-cols-3 gap-2">
                {PACKS.map((p) => {
                  const on = newCreator.plan === p.key;
                  return (
                    <button key={p.key} type="button" onClick={() => setNewCreator((v) => ({ ...v, plan: on ? '' : p.key }))}
                      className={`rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/40'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${on ? 'text-brand' : 'text-paper'}`}>{p.name}</span>
                        {on && <Check size={13} className="text-brand" />}
                      </div>
                      <div className="mt-1 font-display text-lg font-bold text-paper">${p.m}<span className="text-[10px] font-normal text-paper-dim">/mes</span></div>
                      <div className="text-[10px] text-paper-dim">{p.photos} fotos · {p.videos} vid</div>
                    </button>
                  );
                })}
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-ink-2 p-3">
                <input type="checkbox" checked={!!newCreator.activate} onChange={(e) => setNewCreator((v) => ({ ...v, activate: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-line bg-ink-2 text-brand focus:ring-brand" />
                <span className="min-w-0 text-sm text-paper">
                  Activar suscripción ya <span className="text-paper-dim">(ya pagó a mano)</span>
                  <span className="mt-0.5 block text-[11px] text-paper-dim">La cuenta nace «Activa» y la ve la modelo, la agencia y los uploaders. Si no, queda esperando pago.</span>
                </span>
              </label>
              {newCreator.activate && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3">
                  <label className="mb-1 block text-xs font-medium text-emerald-200">Vence el · próximo cobro</label>
                  <input type="date" value={newCreator.ends_at || ''} onChange={(e) => setNewCreator((v) => ({ ...v, ends_at: e.target.value }))}
                    className="w-full rounded-lg border border-emerald-500/40 bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-emerald-400" />
                  <p className="mt-1 text-[11px] text-emerald-200/80">El admin te avisa (banner) cuando esté por vencer o vencida. El cobro es manual: al vencer la marcas inactiva a mano y deja de verla la modelo y la agencia.</p>
                </div>
              )}
            </div>

            {ncErr && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{ncErr}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setNewCreator(null)} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
              <button type="submit" disabled={ncBusy}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
                {ncBusy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={15} />} Add creator
              </button>
            </div>
          </form>
        </div>
      )}

      {selCreator && (
        <CreatorProfile
          creator={profiles.find((p) => p.id === selCreator)}
          onClose={() => setSelCreator(null)}
          onReview={reviewKyc}
          savingId={savingId}
          flash={flash}
          onSaved={load}
        />
      )}

      {selStaff && (
        <EmployeeProfile
          staff={profiles.find((p) => p.id === selStaff)}
          isSelf={selStaff === me.id}
          onClose={() => setSelStaff(null)}
          onToggleCap={toggleCap}
          onChangeRole={changeRole}
          savingId={savingId}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] w-max max-w-[calc(100vw-2.5rem)] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-center text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Creator profile drawer — full checklist + professional ID review ───────── */
const OB2 = {
  registered:  { label: 'Solo registrada',          tone: 'zinc' },
  info:        { label: 'Datos listos · falta ID',  tone: 'zinc' },
  id_pending:  { label: 'Por revisar',              tone: 'amber' },
  id_rejected: { label: 'ID rechazado',             tone: 'rose' },
  id_approved: { label: 'Aprobada · falta pago',    tone: 'sky' },
  authorized:  { label: 'Aprobada · falta pago',    tone: 'sky' },
  paid:        { label: 'Activa',                   tone: 'brand' },
  active:      { label: 'Activa',                   tone: 'brand' },
};
const TONE2 = {
  zinc:  'border-line bg-hair/5 text-paper-mute',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  rose:  'border-rose-500/40 bg-rose-500/10 text-rose-300',
  sky:   'border-sky-500/40 bg-sky-500/10 text-sky-300',
  brand: 'border-brand/40 bg-brand/10 text-brand',
};

// Resetear contraseña — el admin le pone una temporal a la cuenta (edge fn).
function ResetPasswordBox({ userId }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function reset() {
    setMsg('');
    if (pw.length < 8) { setMsg('La contraseña debe tener al menos 8 caracteres.'); return; }
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('reset-password', { body: { user_id: userId, password: pw } });
    setBusy(false);
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setMsg(out?.error || 'No se pudo resetear.'); return; }
    setMsg('ok'); setPw('');
  }
  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-4">
      <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><KeyRound size={15} className="text-brand" /> Contraseña</h4>
      <p className="mb-3 text-[11px] text-paper-dim">Ponle una temporal y compártesela. La persona podrá cambiarla desde su cuenta.</p>
      {!open ? (
        <button onClick={() => { setOpen(true); setMsg(''); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
          <KeyRound size={13} /> Resetear contraseña
        </button>
      ) : (
        <div className="space-y-2">
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña temporal (mín. 8)"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpen(false); setPw(''); setMsg(''); }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
            <button onClick={reset} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar contraseña
            </button>
          </div>
        </div>
      )}
      {msg === 'ok'
        ? <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand"><Check size={12} /> Contraseña actualizada — compártesela.</p>
        : msg && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">{msg}</p>}
    </div>
  );
}

// Dropdown compacto (filtrar / ordenar) — un botón que abre su menú.
function Dropdown({ icon: Icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${open ? 'border-brand/60 text-paper' : 'border-line text-paper-mute hover:text-paper'}`}>
        {Icon && <Icon size={14} />}
        <span className="text-paper-dim">{label}:</span>
        <span className="font-semibold text-paper">{cur?.label || '—'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1.5 min-w-[210px] overflow-hidden rounded-2xl border border-line bg-card p-1 shadow-glow-sm">
            {options.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  value === o.value ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:bg-hair/[0.06] hover:text-paper'}`}>
                {o.label}
                {value === o.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreatorProfile({ creator, onClose, onReview, savingId, flash, onSaved }) {
  const [docs, setDocs] = useState(null); // { id_front, id_back, selfie_id }
  const [loraCount, setLoraCount] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);       // editar datos personales
  const [form, setForm] = useState(null);              // borrador de datos al editar
  const [tab, setTab] = useState('datos');             // datos | identidad | suscripcion | clon

  // Actualiza el perfil (admin puede escribir cualquier campo) y refresca la lista.
  async function patch(fields, msg) {
    setSaving(true);
    const { error } = await getSupabase().from('profiles').update(fields).eq('id', creator.id);
    setSaving(false);
    if (error) { flash('Error: ' + error.message); return false; }
    if (msg) flash(msg);
    onSaved && onSaved();
    return true;
  }
  async function saveData() {
    const ok = await patch({
      full_name: form.full_name?.trim() || null,
      stage_name: form.stage_name?.trim() || null,
      handle: form.handle?.trim().replace(/^@/, '') || null,
      legal_first_name: form.legal_first_name?.trim() || null,
      legal_last_name: form.legal_last_name?.trim() || null,
      date_of_birth: form.date_of_birth || null,
      country: form.country?.trim() || null,
      phone: form.phone?.trim() || null,
    }, 'Datos guardados');
    if (ok) setEditing(false);
  }

  useEffect(() => {
    if (!creator) return;
    (async () => {
      const supabase = getSupabase();
      const [{ data: kd }, { count }] = await Promise.all([
        supabase.from('kyc_documents').select('doc_type, storage_path').eq('user_id', creator.id),
        supabase.from('lora_photos').select('id', { count: 'exact', head: true }).eq('user_id', creator.id),
      ]);
      const signed = {};
      for (const d of kd || []) {
        if (!d.storage_path) continue;
        if (d.storage_path.startsWith('/') || d.storage_path.startsWith('http')) { signed[d.doc_type] = d.storage_path; continue; }
        const { data: s } = await supabase.storage.from('kyc').createSignedUrl(d.storage_path, 600);
        if (s?.signedUrl) signed[d.doc_type] = s.signedUrl;
      }
      setDocs(signed);
      setLoraCount(count || 0);
    })();
  }, [creator]);

  if (!creator) return null;
  const st = OB2[creator.onboarding_status] || OB2.registered;
  const datosDone = !!(creator.legal_first_name && creator.legal_last_name && creator.date_of_birth && creator.country);
  const idApproved = ['id_approved', 'active', 'paid', 'authorized'].includes(creator.onboarding_status);
  const idPending = creator.onboarding_status === 'id_pending';
  const idRejected = creator.onboarding_status === 'id_rejected';
  const hasDocs = docs && (docs.id_front || docs.id_back || docs.selfie_id);
  const paid = creator.payment_status === 'paid' || ['active', 'paid'].includes(creator.onboarding_status);
  const lc = loraCount ?? 0;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const idState = idApproved ? { label: 'Aprobada', tone: 'brand' }
    : idPending ? { label: 'Por revisar', tone: 'amber' }
    : idRejected ? { label: 'Rechazada', tone: 'rose' }
    : hasDocs ? { label: 'Documentos subidos', tone: 'sky' }
    : { label: 'Sin documentos', tone: 'zinc' };

  async function doReview(approve) {
    if (!approve) {
      if (!rejecting) { setRejecting(true); return; }
      const ok = await onReview(creator.id, false, reason.trim() || 'Documento ilegible o no coincide.');
      if (ok) { setRejecting(false); setReason(''); onClose(); }
      return;
    }
    const ok = await onReview(creator.id, true);
    if (ok) onClose();
  }

  const Row = ({ done, warn, icon: Icon, title, children }) => (
    <div className="rounded-2xl border border-line bg-ink-2 p-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-brand/15 text-brand' : warn ? 'bg-rose-500/15 text-rose-300' : 'bg-hair/10 text-paper-dim'}`}>
          {done ? <Check size={16} /> : <Icon size={15} />}
        </span>
        <h4 className="flex-1 font-display font-semibold text-paper">{title}</h4>
        {done
          ? <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">Completo</span>
          : <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${warn ? TONE2.rose : 'border-line bg-hair/5 text-paper-dim'}`}>Falta</span>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/70 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-ink" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ink/90 px-5 py-4 backdrop-blur">
          <Avatar src={creator.avatar_url} name={creator.full_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-paper">{creator.stage_name || creator.full_name || '—'}</p>
            <p className="truncate text-xs text-paper-dim">{creator.handle ? `@${creator.handle} · ` : ''}{creator.email}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${TONE2[st.tone]}`}>{st.label}</span>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
        </div>

        {/* Pestañas — entra solo a lo que quieres, sin congestión */}
        <div className="sticky top-[73px] z-10 flex gap-1 overflow-x-auto border-b border-line bg-ink/90 px-3 py-2 backdrop-blur">
          {[
            { id: 'datos', label: 'Datos', icon: Users, state: datosDone ? 'ok' : 'todo' },
            { id: 'identidad', label: 'Identidad', icon: IdCard, state: idApproved ? 'ok' : idRejected ? 'bad' : idPending ? 'warn' : 'todo' },
            { id: 'suscripcion', label: 'Suscripción', icon: CreditCard, state: paid ? 'ok' : 'todo' },
            { id: 'clon', label: 'Clon', icon: Sparkles, state: lc >= LORA_MIN ? 'ok' : 'todo' },
          ].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === tb.id ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:text-paper'}`}>
              <tb.icon size={15} /> {tb.label}
              <span className={`h-1.5 w-1.5 rounded-full ${tb.state === 'ok' ? 'bg-emerald-400' : tb.state === 'bad' ? 'bg-rose-400' : tb.state === 'warn' ? 'bg-amber-400' : 'bg-paper-dim/40'}`} />
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── DATOS ── */}
          {tab === 'datos' && (
          <div className="space-y-3">
          <Row done={datosDone} icon={Users} title="Datos personales">
            {editing ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ['full_name', 'Nombre', 'text'], ['stage_name', 'Nombre artístico', 'text'],
                    ['handle', 'Usuario (@)', 'text'], ['phone', 'Teléfono', 'text'],
                    ['legal_first_name', 'Nombre legal', 'text'], ['legal_last_name', 'Apellido legal', 'text'],
                    ['date_of_birth', 'Nacimiento', 'date'], ['country', 'País', 'text'],
                  ].map(([k, l, tp]) => (
                    <label key={k} className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-paper-dim">{l}</span>
                      <input type={tp} value={form?.[k] || ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="w-full rounded-lg border border-line bg-ink-2 px-2.5 py-2 text-sm text-paper outline-none focus:border-brand/60" />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(false)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
                  <button onClick={saveData} disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar datos
                  </button>
                </div>
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre legal</dt><dd className="text-paper">{creator.legal_first_name || creator.legal_last_name ? `${creator.legal_first_name || ''} ${creator.legal_last_name || ''}` : '—'}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nacimiento</dt><dd className="text-paper">{fmtDate(creator.date_of_birth)}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">País</dt><dd className="text-paper">{creator.country || '—'}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Teléfono</dt><dd className="text-paper">{creator.phone || '—'}</dd></div>
                </dl>
                <button onClick={() => { setForm({
                  full_name: creator.full_name || '', stage_name: creator.stage_name || '', handle: creator.handle || '',
                  phone: creator.phone || '', legal_first_name: creator.legal_first_name || '', legal_last_name: creator.legal_last_name || '',
                  date_of_birth: creator.date_of_birth || '', country: creator.country || '',
                }); setEditing(true); }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                  <UserPlus size={13} /> Editar / llenar datos
                </button>
              </>
            )}
          </Row>

          {/* Estado de la cuenta — el admin la mueve por los pasos manualmente */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><Clock size={15} className="text-brand" /> Paso de la cuenta</h4>
            <p className="mb-3 text-[11px] text-paper-dim">Muévela manualmente. «Activa» se maneja abajo en Suscripción.</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                ['registered', 'Registrada'], ['info', 'Datos'], ['id_pending', 'ID por revisar'], ['id_approved', 'ID aprobada'],
              ].map(([v, l]) => (
                <button key={v} onClick={() => patch({ onboarding_status: v }, `Movida a «${l}»`)} disabled={saving}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    creator.onboarding_status === v ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line text-paper-mute hover:text-paper'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Contraseña — resetear */}
          <ResetPasswordBox userId={creator.id} />
          </div>
          )}

          {/* ── IDENTIDAD ── */}
          {tab === 'identidad' && (
          <div className="space-y-3">
          <Row done={idApproved} warn={idRejected} icon={IdCard} title="Identidad">
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONE2[idState.tone]}`}>{idState.label}</span>
              {creator.consent_at && <span className="inline-flex items-center gap-1 text-[11px] text-paper-dim"><ShieldCheck size={12} className="text-brand" /> Consentimiento {fmtDate(creator.consent_at)}</span>}
            </div>
            {idRejected && creator.id_rejection_reason && (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">Motivo del último rechazo: {creator.id_rejection_reason}</p>
            )}
            {docs === null ? (
              <p className="text-sm text-paper-dim">Cargando documentos…</p>
            ) : hasDocs ? (
              <div className="grid grid-cols-3 gap-2">
                {[{ k: 'id_front', l: 'ID frente' }, { k: 'id_back', l: 'ID reverso' }, { k: 'selfie_id', l: 'Selfie con ID' }].map((d) => (
                  <div key={d.k}>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-paper-dim">{d.l}</p>
                    {docs[d.k] ? (
                      <a href={docs[d.k]} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden rounded-lg border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docs[d.k]} alt={d.l} className="h-full w-full object-cover transition-transform hover:scale-105" />
                      </a>
                    ) : <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-line text-[10px] text-paper-dim">Falta</div>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-paper-dim">Todavía no subió sus documentos de identidad.</p>}

            {/* Review actions */}
            {hasDocs && (idPending || idRejected || idApproved) && (
              <div className="mt-4 rounded-xl border border-line bg-card p-3">
                {rejecting ? (
                  <div className="space-y-2">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus
                      placeholder="Motivo del rechazo (lo verá la creadora)…"
                      className="w-full resize-none rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                    <div className="flex gap-2">
                      <button onClick={() => { setRejecting(false); setReason(''); }} className="rounded-lg border border-line px-3 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
                      <button onClick={() => doReview(false)} disabled={savingId === creator.id}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
                        {savingId === creator.id ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />} Confirmar rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => doReview(false)} disabled={savingId === creator.id}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
                        <X size={15} /> Rechazar
                      </button>
                      <button onClick={() => doReview(true)} disabled={savingId === creator.id || idApproved}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-50">
                        {savingId === creator.id ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} {idApproved ? 'Aprobada' : 'Aprobar'}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-paper-dim">
                      Al <strong className="text-paper-mute">aprobar</strong>, la creadora pasa a «Aprobada · falta pago» y al pagar queda <strong className="text-paper-mute">Activa</strong>. Los documentos quedan guardados y cifrados (solo los ve quien tenga «Verificar identidad»). Al <strong className="text-paper-mute">rechazar</strong>, vuelve al paso de identidad con tu motivo.
                    </p>
                  </>
                )}
              </div>
            )}
          </Row>

          </div>
          )}

          {/* ── SUSCRIPCIÓN — solo el dueño (admin) puede tocarla ── */}
          {tab === 'suscripcion' && (() => {
            const pack = PACKS.find((p) => p.key === creator.plan);
            const ends = creator.subscription_ends_at ? new Date(creator.subscription_ends_at + 'T00:00:00') : null;
            const daysLeft = ends ? Math.floor((ends - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 864e5) : null;
            const dueSoon = paid && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
            const overdue = paid && daysLeft !== null && daysLeft < 0;
            const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
            return (
            <div className="space-y-4">
              {/* Estado actual */}
              <div className={`rounded-2xl border p-4 ${overdue ? 'border-rose-500/50 bg-rose-500/[0.08]' : dueSoon ? 'border-amber-500/50 bg-amber-500/[0.07]' : paid ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-line bg-ink-2'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard size={16} className={overdue ? 'text-rose-300' : dueSoon ? 'text-amber-300' : paid ? 'text-emerald-300' : 'text-paper-dim'} />
                  <span className={overdue ? 'text-rose-300' : dueSoon ? 'text-amber-300' : paid ? 'text-emerald-300' : 'text-paper-dim'}>
                    {overdue ? `Vencida hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) === 1 ? '' : 's'}` : dueSoon ? `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : paid ? 'Suscripción activa' : 'Sin suscripción activa'}
                  </span>
                </div>
                {paid ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-paper">{pack ? `$${pack.m}` : '—'}</span>
                      <span className="text-sm text-paper-mute">/mes · {pack ? pack.name : (creator.plan || 'sin plan')}</span>
                    </div>
                    {ends && <p className="mt-1 text-[11px] text-paper-dim">Próximo cobro: {ends.toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-paper-dim">No ha pagado. Elige su plan y actívala cuando pague.</p>
                )}
                {pack && <p className="mt-1 text-[11px] text-paper-dim">Incluye {pack.photos} fotos · {pack.videos} video{pack.videos === 1 ? '' : 's'} al mes</p>}
              </div>

              {/* Fecha de vencimiento — solo si activa */}
              {paid && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-paper-dim">Vence el · próximo cobro</label>
                  <input type="date" value={creator.subscription_ends_at || ''} disabled={saving}
                    onChange={(e) => patch({ subscription_ends_at: e.target.value || null }, 'Fecha de vencimiento actualizada')}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60 disabled:cursor-not-allowed disabled:opacity-60" />
                  <p className="mt-1 text-[11px] text-paper-dim">Al entrar al admin, el banner te avisa las que están por vencer o vencidas. El cobro es manual: al vencer NO se inactiva sola — márcala inactiva a mano abajo cuando confirmes que no pagó.</p>
                </div>
              )}

              {/* Elegir plan — solo dueño */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-paper-dim">Plan que pagó</p>
                <div className="grid grid-cols-3 gap-2">
                  {PACKS.map((p) => {
                    const on = creator.plan === p.key;
                    return (
                      <button key={p.key} onClick={() => patch({ plan: p.key }, `Plan: ${p.name}`)} disabled={saving}
                        className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/40'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${on ? 'text-brand' : 'text-paper'}`}>{p.name}</span>
                          {on && <Check size={13} className="text-brand" />}
                        </div>
                        <div className="mt-1 font-display text-lg font-bold text-paper">${p.m}<span className="text-[10px] font-normal text-paper-dim">/mes</span></div>
                        <div className="text-[10px] text-paper-dim">{p.photos} fotos · {p.videos} vid</div>
                      </button>
                    );
                  })}
                </div>
                {creator.plan && (
                  <button onClick={() => patch({ plan: null }, 'Plan quitado')} disabled={saving}
                    className="mt-2 text-[11px] font-medium text-paper-dim hover:text-paper disabled:opacity-50">Quitar plan</button>
                )}
              </div>

              {/* Activar / desactivar */}
              {paid ? (
                <button onClick={() => patch({ payment_status: 'unpaid', subscription_ends_at: null, onboarding_status: ['active', 'paid'].includes(creator.onboarding_status) ? 'id_approved' : creator.onboarding_status }, 'Suscripción marcada INACTIVA')}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Marcar inactiva (dejó de pagar)
                </button>
              ) : (
                <button onClick={() => patch({ payment_status: 'paid', plan: creator.plan || 'core', onboarding_status: 'active', subscription_ends_at: creator.subscription_ends_at || in30 }, 'Suscripción ACTIVADA')}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Activar suscripción (pagó a mano)
                </button>
              )}

              <p className="text-[11px] text-paper-dim">Cobro manual por ahora. Al activarla queda «Activa» y se ve en la modelo, la agencia y los uploaders. Las ventas reales se llevan en <span className="font-mono">/sales</span>.</p>
            </div>
            );
          })()}

          {/* ── CLON ── */}
          {tab === 'clon' && (
          <Row done={lc >= LORA_MIN} icon={Sparkles} title="Fotos del clon">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-paper">{loraCount === null ? '…' : lc} / {LORA_MIN} fotos</span>
                <span className="text-[11px] text-paper-dim">mínimo para entrenar</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-hair/10">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (lc / LORA_MIN) * 100)}%` }} />
              </div>
            </div>
          </Row>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Employee profile drawer — full staff view: identity, access, activity ── */
function EmployeeProfile({ staff, isSelf, onClose, onToggleCap, onChangeRole, savingId }) {
  const [activity, setActivity] = useState(null); // { deliveries, idsReviewed }

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const supabase = getSupabase();
      const [{ count: deliveries }, { count: idsReviewed }] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact', head: true }).eq('uploaded_by', staff.id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('id_reviewed_by', staff.id),
      ]);
      setActivity({ deliveries: deliveries || 0, idsReviewed: idsReviewed || 0 });
    })();
  }, [staff]);

  if (!staff) return null;
  const isMgr = staff.role === 'admin';
  const caps = staff.capabilities || [];
  const memberSince = staff.created_at ? new Date(staff.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/70 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-ink" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ink/90 px-5 py-4 backdrop-blur">
          <Avatar src={staff.avatar_url} name={staff.full_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-paper">{staff.full_name || '—'}</p>
            <p className="truncate text-xs text-paper-dim">{staff.email}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${isMgr ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-hair/5 text-paper-mute'}`}>
            {isMgr ? 'Admin (dueño)' : (staff.job_title || 'Equipo')}
          </span>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
        </div>

        <div className="space-y-3 p-5">
          {/* Identity */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-display font-semibold text-paper"><Users size={15} className="text-brand" /> Identidad</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre</dt><dd className="text-paper">{staff.full_name || '—'}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Puesto</dt><dd className="text-paper">{isMgr ? 'Dueño' : (staff.job_title || '—')}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Correo</dt><dd className="truncate text-paper">{staff.email}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Miembro desde</dt><dd className="text-paper">{memberSince}</dd></div>
            </dl>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Tipo</span>
              <select value={isMgr ? 'admin' : 'supervisor'} onChange={(e) => onChangeRole(staff.id, e.target.value)} disabled={isSelf}
                className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                <option value="admin">Admin (dueño)</option>
                <option value="supervisor">Equipo</option>
              </select>
              {savingId === staff.id && <RefreshCw size={14} className="animate-spin text-brand" />}
            </div>
          </div>

          {/* Access */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><ShieldCheck size={15} className="text-brand" /> Accesos</h4>
            {isMgr ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand"><ShieldCheck size={13} /> El dueño tiene todas las funciones</p>
            ) : (
              <>
                <p className="mb-3 text-[11px] text-paper-dim">Enciende solo lo que este puesto puede hacer. «Ver datos» + «Verificar identidad» = acceso a datos con identificación.</p>
                <div className="space-y-3">
                  {CAP_SECTIONS.map((sec) => (
                    <div key={sec.id}>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/80">{sec.name}</div>
                      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                        {sec.caps.map((c) => {
                          const on = caps.includes(c.v);
                          return (
                            <button key={c.v} onClick={() => onToggleCap(staff.id, c.v, !on)} disabled={isSelf && c.v === 'team'}
                              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-50 ${on ? 'border-brand/50 bg-brand/10' : 'border-line bg-ink hover:border-hair'}`}>
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
              </>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-display font-semibold text-paper"><BarChart3 size={15} className="text-brand" /> Actividad</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-ink p-3">
                <div className="font-display text-2xl font-semibold text-paper">{activity === null ? '…' : activity.deliveries}</div>
                <div className="text-[11px] text-paper-dim">Entregas subidas</div>
              </div>
              <div className="rounded-xl border border-line bg-ink p-3">
                <div className="font-display text-2xl font-semibold text-paper">{activity === null ? '…' : activity.idsReviewed}</div>
                <div className="text-[11px] text-paper-dim">IDs revisados</div>
              </div>
            </div>
          </div>

          {/* Contraseña — resetear (no aplica a tu propia cuenta) */}
          {!isSelf && <ResetPasswordBox userId={staff.id} />}
        </div>
      </div>
    </div>
  );
}

function Header({ me, router }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="sm" />
          <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
            <ShieldCheck size={12} /> Administración
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
            <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
              <span className="block text-[10px] text-paper-dim">Dueño · Administración</span>
            </span>
          </div>
          <a href="/trabajo" className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">Trabajo</a>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
