'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShieldCheck, Check, Plus, X, RefreshCw, IdCard, Clock, UserPlus, ClipboardList, AlertTriangle, BarChart3, Building2, CreditCard, Sparkles, Link2, Copy, Search } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
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
// are split on purpose: 'datos' = see the creator's profile/legal data WITHOUT
// her ID documents; 'kyc' = also see + verify the identity documents. So
// "datos con identificación" = datos + kyc, "datos sin identificación" = datos.
const CAPS = [
  { v: 'datos', l: 'Ver datos de la creadora', hint: 'Perfil y datos (sin documentos de ID)' },
  { v: 'kyc', l: 'Verificar identidad', hint: 'Ver documentos de ID + aprobar / rechazar' },
  { v: 'content', l: 'Subir entregas', hint: 'Entregar fotos y videos' },
  { v: 'requests', l: 'Atender pedidos', hint: 'Tomar y entregar pedidos' },
  { v: 'feedback', l: 'Responder feedback', hint: 'Contestar el feedback de la creadora' },
  { v: 'metrics', l: 'Ver métricas', hint: 'Embudo y estados' },
  { v: 'team', l: 'Gestionar equipo', hint: 'Crear puestos y dar accesos' },
];
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
  const [regFilter, setRegFilter] = useState(null);  // null = cerrado (solo cajitas) | all | id_pending | proceso | activas
  const [regQuery, setRegQuery] = useState('');       // buscador de registros

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
      supabase.from('profiles').select('id, full_name, job_title, email, role, onboarding_status, staff_status, created_at, capabilities, handle, avatar_url, stage_name, legal_first_name, legal_last_name, date_of_birth, country, phone, payment_status, plan, lora_status, consent_at, id_rejection_reason, id_reviewed_at').order('role'),
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
              const shown = cr.filter((p) => inCat(p, regFilter))
                .filter((p) => !q || `${p.full_name || ''} ${p.handle || ''} ${p.email || ''} ${p.stage_name || ''}`.toLowerCase().includes(q));
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
                        <button onClick={() => { setRegFilter(null); setRegQuery(''); }}
                          className="rounded-full border border-line px-3.5 py-2 text-xs font-semibold text-paper-mute transition-colors hover:text-paper">Cerrar</button>
                        <span className="text-xs text-paper-dim">{shown.length} de {cr.length}</span>
                      </div>

                      <p className="mt-3 text-xs text-paper-dim">Haz clic en cualquier creadora para abrir su perfil: ves todo lo que tiene y le falta, y revisas su identidad.</p>
                      <div className="mt-2 overflow-x-auto rounded-2xl border border-line">
                        <div className="grid min-w-[540px] grid-cols-[1.3fr_1.2fr_1fr_auto] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                          <span>Creadora</span><span>Correo</span><span>Estado</span><span></span>
                        </div>
                        {cr.length === 0 && <p className="px-5 py-6 text-paper-dim">Nadie se ha registrado todavía.</p>}
                        {cr.length > 0 && shown.length === 0 && <p className="px-5 py-6 text-paper-dim">Ninguna creadora coincide con el filtro.</p>}
                        {shown.map((u) => {
                          const st = OB[u.onboarding_status] || OB.registered;
                          return (
                            <button key={u.id} onClick={() => setSelCreator(u.id)}
                              className="grid w-full min-w-[540px] grid-cols-[1.3fr_1.2fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04]">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-paper">{u.full_name || '—'}</span>
                                  {u.handle && <span className="block truncate text-[11px] text-paper-dim">@{u.handle}</span>}
                                </span>
                              </span>
                              <span className="truncate text-paper-mute">{u.email}</span>
                              <span><span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span></span>
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
                </div>
              );
            })()}
          </div>
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

                {/* Las funciones de la plataforma, desmenuzadas — marcas qué puede hacer ESTE puesto */}
                {nu.role === 'supervisor' && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Accesos de este puesto — función por función</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {CAPS.map((c) => {
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
              const rows = assetStats.filter((a) => linked.includes(a.creator_id));
              const sales = rows.reduce((s, a) => s + (a.sales_count || 0), 0);
              const revenue = rows.reduce((s, a) => s + Number(a.revenue || 0), 0);
              return (
                <div key={ag.id} className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display font-semibold text-paper"><Building2 size={16} className="text-brand" /> {ag.full_name || '—'}</p>
                      <p className="mt-0.5 truncate text-xs text-paper-mute">{ag.email}</p>
                    </div>
                    <div className="text-xs text-paper-dim">{linked.length} modelo{linked.length === 1 ? '' : 's'} · {nf(sales)} ventas · {money(revenue)}</div>
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
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      {selCreator && (
        <CreatorProfile
          creator={profiles.find((p) => p.id === selCreator)}
          onClose={() => setSelCreator(null)}
          onReview={reviewKyc}
          savingId={savingId}
          flash={flash}
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

function CreatorProfile({ creator, onClose, onReview, savingId, flash }) {
  const [docs, setDocs] = useState(null); // { id_front, id_back, selfie_id }
  const [loraCount, setLoraCount] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

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

        <div className="space-y-3 p-5">
          {/* 1 · Datos */}
          <Row done={datosDone} icon={Users} title="Datos personales">
            {datosDone ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre legal</dt><dd className="text-paper">{creator.legal_first_name} {creator.legal_last_name}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nacimiento</dt><dd className="text-paper">{fmtDate(creator.date_of_birth)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">País</dt><dd className="text-paper">{creator.country || '—'}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Teléfono</dt><dd className="text-paper">{creator.phone || '—'}</dd></div>
              </dl>
            ) : <p className="text-sm text-paper-dim">La creadora aún no completó sus datos personales.</p>}
          </Row>

          {/* 2 · Identidad + professional review */}
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

          {/* 3 · Suscripción */}
          <Row done={paid} icon={CreditCard} title="Suscripción">
            <p className="text-sm text-paper">{paid ? <>Plan <span className="font-medium">{creator.plan || '—'}</span> · pago al día</> : <span className="text-paper-dim">Aún no ha pagado{creator.plan ? ` (eligió ${creator.plan})` : ''}.</span>}</p>
          </Row>

          {/* 4 · Fotos del clon */}
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
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAPS.map((c) => {
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
