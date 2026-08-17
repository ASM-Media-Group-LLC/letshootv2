'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Users, ShieldCheck, Check, Plus, X, RefreshCw, IdCard, Clock, UserPlus, ClipboardList, AlertTriangle, BarChart3, Building2, CreditCard, Sparkles, Link2, Copy, Search, Loader2, ChevronDown, SlidersHorizontal, ArrowUpDown, Upload, Heart, KeyRound, Activity, Mail, Send, Monitor, Smartphone, Eye, Pencil, Trash2, Info, Phone, MapPin, Calendar, MoreVertical } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
import { CAPS, CAP_SECTIONS } from '@/lib/caps';
import { PACKS } from '@/lib/packs';

// Format an integer amount of cents as USD, e.g. 12999 -> "$129.99".
const moneyCents = (c) => `$${((Number(c) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
import ReactionsDashboard from '@/components/ReactionsDashboard';
import Logo from '@/components/Logo';

// Roles: admin = dueño (todo) · supervisor = equipo interno (funciones por
// asignar) · agency = agencia/manager (pide contenido, gestiona modelos) ·
// creator = creadora. 'producer'/'chatter' son legacy → etiqueta "Equipo".
// "Dueño" (owner) is NOT a role — it's a single protected account (see OWNER_EMAIL).
// Everyone else with full access is a plain "Admin". That keeps owner ≠ admin.
const ROLES = [
  { v: 'admin', l: 'Admin (acceso total)' },
  { v: 'supervisor', l: 'Empleado' },
  { v: 'agency', l: 'Agencia / Manager' },
  { v: 'creator', l: 'Creadora' },
];
const ROLE_LABEL = { ...Object.fromEntries(ROLES.map((r) => [r.v, r.l])), producer: 'Empleado', chatter: 'Empleado' };
// The owner account — shown as "Dueño", protected from role change and deletion. The rest
// of the admins are just "Admin". No DB column needed (DDL is locked); the app designates it.
const OWNER_EMAIL = 'rusin24@gmail.com';
const isOwnerAccount = (u) => !!u && u.email === OWNER_EMAIL;

// Presets de puesto: cada uno arma un rol de equipo listo (título + accesos). El admin
// elige uno y puede ajustar los accesos abajo. «Personalizado» parte de cero.
const TEAM_PRESETS = [
  { id: 'uploader', label: 'Uploader', icon: Upload,        title: 'Uploader',            caps: ['content', 'requests', 'feedback'] },
  { id: 'kyc',      label: 'Verificación', icon: IdCard,    title: 'Verificación',        caps: ['datos', 'kyc'] },
  { id: 'soporte',  label: 'Servicio al cliente', icon: Users, title: 'Servicio al cliente', caps: ['requests', 'feedback'] },
  { id: 'manager',  label: 'Manager (todo)', icon: ShieldCheck, title: 'Manager',          caps: ['datos', 'kyc', 'content', 'requests', 'feedback', 'metrics', 'team'] },
  { id: 'custom',   label: 'Personalizado', icon: SlidersHorizontal, title: '',            caps: [] },
];

// Dynamic staff functions — assigned one by one to internal team members.
// Only the admin has all functions implicitly. There is NO "servicio al
// cliente": los pedidos los hacen la agencia/manager o la propia creadora.
// You build the puesto and grant access function by function. 'datos' and 'kyc'
// The platform functions live in lib/caps.js — mapped by SECTION → function
// (single source of truth for /admin and /trabajo).
// "datos con identificación" = datos + kyc, "datos sin identificación" = datos.
const LORA_MIN = 50; // house minimum clone photos
const MANAGER_ROLES = ['admin'];

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
  const [nu, setNu] = useState({ first_name: '', last_name: '', job_title: '', email: '', password: '', role: 'supervisor' });
  const [nuCaps, setNuCaps] = useState([]); // accesos del puesto — se marcan a mano (sin preset)
  const [nuPreset, setNuPreset] = useState('uploader'); // preset de puesto seleccionado
  const [createdCreds, setCreatedCreds] = useState(null); // { email, password } para mostrar tras crear
  const [selCreator, setSelCreator] = useState(null); // creator id whose profile drawer is open
  const [selStaff, setSelStaff] = useState(null);      // team member id whose profile drawer is open
  const [agencyLinks, setAgencyLinks] = useState([]); // agency_creators rows
  const [assetStats, setAssetStats] = useState([]);   // per-creator sales/revenue for agency numbers
  const [agencySales, setAgencySales] = useState([]); // libro de ventas por venta (agency_sales)
  const [audit, setAudit] = useState([]);             // bitácora (audit_log)
  const [invites, setInvites] = useState([]);         // pending staff invite links
  const [invBusy, setInvBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(''); // optional: email the invite link
  const [teamQuery, setTeamQuery] = useState('');     // buscador del equipo interno
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
  // Cuando el correo ya existe: guardamos la persona (si está cargada en `profiles`)
  // para ofrecer acciones directas (reenviar correo de acceso, abrir su perfil)
  // en vez de forzar a inventar otro correo.
  const [dupUser, setDupUser] = useState(null);
  const [dupBusy, setDupBusy] = useState(false);
  const [infoUser, setInfoUser] = useState(null); // creadora cuyo modal de info (hora de registro, etc.) está abierto
  const [newAgency, setNewAgency] = useState(null);   // null | {full_name, email, password} — alta de agencia
  const [naBusy, setNaBusy] = useState(false);
  const [naErr, setNaErr] = useState('');
  const [agConfirm, setAgConfirm] = useState(null);   // confirmación de asignar/mover/quitar creadora↔agencia
  const [agBusy, setAgBusy] = useState(false);

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
    const [{ data: profs }, { data: reqs }, { count: loraCount }, { data: agLinks }, { data: assetRows }, { data: agSales }, { data: auditRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, job_title, email, role, onboarding_status, staff_status, created_at, capabilities, handle, avatar_url, stage_name, legal_first_name, legal_last_name, date_of_birth, country, phone, payment_status, plan, lora_status, consent_at, id_rejection_reason, id_reviewed_at, subscription_ends_at, billing_note, comp_until, is_test').order('role'),
      supabase.from('requests').select('id, status, created_at'),
      supabase.from('lora_photos').select('id', { count: 'exact', head: true }),
      supabase.from('agency_creators').select('agency_id, creator_id'),
      supabase.from('assets').select('creator_id, sales_count, revenue'),
      supabase.from('agency_sales').select('id, agency_id, creator_id, amount_cents, created_at').order('created_at', { ascending: false }).limit(400),
      supabase.from('audit_log').select('id, actor_id, action, target_id, meta, created_at').order('created_at', { ascending: false }).limit(200),
    ]);
    setProfiles(profs || []);
    setAgencyLinks(agLinks || []);
    setAssetStats(assetRows || []);
    setAgencySales(agSales || []);
    setAudit(auditRows || []);
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
    setNuError(''); setCreatedCreds(null);
    // Only the essentials: name + (optional) email. No password field — the person sets
    // their own via the invitation email. We always mint a throwaway password internally
    // (they'll replace it); if there's no real email we surface it as a temp login instead.
    const fullName = [nu.first_name, nu.last_name].map((s) => s.trim()).filter(Boolean).join(' ');
    if (!fullName) { setNuError('Pon al menos el nombre.'); return; }
    if (nu.role === 'supervisor' && nuCaps.length === 0) { setNuError('Marca al menos un acceso.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setCreating(true);
    // Supabase Edge Function 'create-user' runs with the service role and verifies the
    // caller is admin. The puesto is born WITH the accesses the admin picked.
    const caps = nu.role === 'supervisor' ? nuCaps : [];
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { full_name: fullName, job_title: nu.job_title.trim(), email: nu.email.trim(), password: pw, role: nu.role, capabilities: caps },
    });
    setCreating(false);
    let out = data;
    if (error && !out) {
      try { out = await error.context.json(); } catch { out = { error: error.message }; }
    }
    if (!out?.ok) { setNuError(out?.error || 'No se pudo crear el usuario.'); return; }
    const createdRole = nu.role;
    // No real email → show the generated company login + temp password to hand over.
    // Real email → an invitation went out; nothing to copy, just confirm.
    const showCreds = out.generated_email;
    if (showCreds) setCreatedCreds({ email: out.login_email || nu.email.trim(), password: pw, generated: true });
    setNu({ first_name: '', last_name: '', job_title: '', email: '', password: '', role: 'supervisor' });
    setNuCaps([]); setNuPreset('custom');
    if (!showCreds) setEquipoPanel(null);
    // Tell the admin exactly what happened + WHERE the account landed (agency/creator don't
    // live in this Equipo interno roster, so "created" would otherwise look like nothing).
    const invitedNote = out.invited ? ` — invitación enviada a ${out.login_email || nu.email.trim()}` : '';
    flash(
      showCreds ? 'Cuenta creada — comparte el login y la clave temporal'
      : createdRole === 'supervisor' ? `Empleado creado${invitedNote}`
      : createdRole === 'agency' ? `Agencia creada${invitedNote} — la ves en la pestaña «Agencias»`
      : createdRole === 'creator' ? `Creadora creada${invitedNote} — la ves en «Registros» (quita el filtro si no aparece)`
      : createdRole === 'admin' ? `Admin creado${invitedNote}`
      : 'Cuenta creada'
    );
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
    if (!out?.ok) {
      setNcBusy(false);
      // Si el correo ya existe, en vez de forzar a inventar otro correo, buscamos
      // esa persona en la lista y ofrecemos acciones directas (reenviar acceso /
      // abrir su perfil). Si no está cargada, cae al texto normal del error.
      const dup = /Ya existe una cuenta/i.test(out?.error || '');
      const emailLower = (f.email || '').trim().toLowerCase();
      const existing = dup ? profiles.find((p) => (p.email || '').toLowerCase() === emailLower) : null;
      if (existing) { setDupUser(existing); setNcErr(''); }
      else { setNcErr(out?.error || 'No se pudo dar de alta la creadora.'); }
      return;
    }

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
    if (f.billing_note?.trim())      patch.billing_note = f.billing_note.trim();
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    if (f.comp) {
      // Cortesía: nace activa, sin cobro, gratis hasta la fecha elegida (dinámica).
      patch.comp_until = f.comp_until || in30;
      patch.payment_status = 'paid';
      patch.onboarding_status = 'active';
      if (!patch.plan) patch.plan = 'core';
      patch.subscription_ends_at = f.comp_until || in30;
      if (!patch.billing_note) patch.billing_note = 'Cortesía (gratis)';
    } else if (f.activate) {
      patch.payment_status = 'paid';
      patch.onboarding_status = 'active';
      if (!patch.plan) patch.plan = 'core';
      patch.subscription_ends_at = f.ends_at || in30;
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
    flash(f.comp
      ? 'Creadora dada de alta en CORTESÍA (gratis) — queda registrada'
      : f.activate
      ? 'Creadora dada de alta y ACTIVA — lista para trabajar'
      : 'Creadora creada (inactiva) — actívala en Suscripción cuando pague para que la vea ella y su agencia');
    await load();
  }

  // Alta de agencia — la agencia entra a sus modelos, pide y registra ventas.
  // Con correo real le llega la invitación para poner su clave; con contraseña
  // temporal escrita, nace con esa clave (útil para recrear la agencia demo).
  async function createAgency(e) {
    e.preventDefault();
    setNaErr('');
    const f = newAgency || {};
    if (!f.full_name?.trim()) { setNaErr('Pon el nombre de la agencia.'); return; }
    if (f.password && f.password.length < 8) { setNaErr('La contraseña debe tener al menos 8 caracteres.'); return; }
    const pw = f.password?.trim() || `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setNaBusy(true);
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { full_name: f.full_name.trim(), email: (f.email || '').trim(), password: pw, role: 'agency' },
    });
    setNaBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setNaErr(out?.error || 'No se pudo crear la agencia.'); return; }
    if (out.generated_email || f.password?.trim()) {
      flash(`Agencia creada — login: ${out.login_email || f.email.trim()}${f.password?.trim() ? ` · clave: ${pw}` : ''}`);
    } else {
      flash(`Agencia creada — invitación enviada a ${out.login_email || f.email.trim()}`);
    }
    setNewAgency(null);
    await load();
  }

  // ── Team invitations ──────────────────────────────────────────────────
  async function createInvite(targetRole = 'supervisor', email = '') {
    setInvBusy(true);
    const token = (crypto.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e9)}`).replace(/-/g, '');
    const { data, error } = await getSupabase().from('staff_invites').insert({ token, created_by: me.id, target_role: targetRole }).select().single();
    if (error) { setInvBusy(false); flash('Error: ' + error.message); return; }
    setInvites((v) => [data, ...v]);
    const em = (email || '').trim();
    // If an email was given, send the branded invitation with the join link; otherwise copy it.
    if (em) {
      const roleLabel = targetRole === 'agency' ? 'Agencia' : 'Equipo';
      const { data: out, error: mailErr } = await getSupabase().functions.invoke('send-email', {
        body: { template: 'join', to: em, action_url: `https://letshoot.ai/unirse/${token}`, extra: roleLabel, lang: 'es' },
      });
      setInvBusy(false); setInviteEmail('');
      if (!mailErr && out?.ok) { flash(`Invitación enviada a ${em}`); } else { flash('Link creado (no se pudo enviar el correo — cópialo abajo)'); }
      return;
    }
    setInvBusy(false);
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
  // Una creadora pertenece a UNA sola agencia. Asignarla a otra la MUEVE (quita el
  // vínculo anterior). `on=false` la deja sin agencia. Todo pasa por aquí para que la
  // logística de mover quede consistente en un solo lugar.
  async function setCreatorAgency(creatorId, agencyId /* null = sin agencia */) {
    const supabase = getSupabase();
    const nameOf = (id) => profiles.find((p) => p.id === id)?.full_name || 'agencia';
    const prev = agencyLinks.find((x) => x.creator_id === creatorId)?.agency_id || null;
    if (prev === agencyId) return; // sin cambio
    // Quita cualquier vínculo previo de esta creadora (solo puede tener uno).
    if (prev) {
      const { error } = await supabase.from('agency_creators').delete().eq('creator_id', creatorId);
      if (error) return flash('Error: ' + error.message);
    }
    if (agencyId) {
      const { error } = await supabase.from('agency_creators').insert({ agency_id: agencyId, creator_id: creatorId });
      if (error) return flash('Error: ' + error.message);
    }
    setAgencyLinks((l) => {
      const without = l.filter((x) => x.creator_id !== creatorId);
      return agencyId ? [...without, { agency_id: agencyId, creator_id: creatorId }] : without;
    });
    flash(!agencyId ? 'Creadora sin agencia'
      : prev ? `Movida de ${nameOf(prev)} a ${nameOf(agencyId)}`
      : `Asignada a ${nameOf(agencyId)}`);
  }
  // Compat: el toggle por agencia usa el reasignador (marcar = mover a esta; desmarcar = quitar).
  function toggleAgencyModel(agencyId, creatorId, on) {
    return setCreatorAgency(creatorId, on ? agencyId : null);
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
    // Correo a la creadora.
    sendEmail(approve ? 'approved' : 'rejected', userId, approve ? '' : (reason || ''));
    await getSupabase().from('notifications').insert({
      user_id: userId, kind: approve ? 'approved' : 'rejected', meta: approve ? {} : { reason: reason || '' },
    });
    // Si la creadora tiene agencia, avísale también a la agencia (ambas partes).
    try {
      const { data: link } = await getSupabase().from('agency_creators').select('agency_id').eq('creator_id', userId).maybeSingle();
      if (link?.agency_id) {
        const cr = profiles.find((p) => p.id === userId);
        const modelName = cr?.stage_name || cr?.full_name || 'tu modelo';
        sendEmail(approve ? 'model_approved' : 'model_rejected', link.agency_id, modelName);
      }
    } catch { /* no bloquear la revisión si falla el aviso a la agencia */ }
    flash(approve ? 'Aprobada — ya puede pagar' : 'Verificación rechazada');
    return true;
  }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Non-admin staff work in /trabajo.
  if (me?.role !== 'admin') { router.replace('/trabajo'); return null; }

  const creators = profiles.filter((p) => p.role === 'creator');

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <Header me={me} router={router} creators={creators} />

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
            { id: 'actividad', label: 'Actividad', icon: Activity },
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
              <p className="text-sm text-paper-mute">Da de alta una creadora o una agencia — le llega su invitación por correo.</p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => { setNewAgency({ full_name: '', email: '', password: '' }); setNaErr(''); }}
                  className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
                  <Building2 size={15} /> Crear agencia
                </button>
                <button onClick={() => { const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10); setNewCreator({ full_name: '', stage_name: '', handle: '', email: '', password: '', phone: '', country: '', legal_first_name: '', legal_last_name: '', date_of_birth: '', plan: '', activate: false, ends_at: in30 }); setNcErr(''); }}
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
                  <UserPlus size={15} /> Add creator
                </button>
              </div>
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
                          const joinedFull = u.created_at ? new Date(u.created_at).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
                          return (
                            <div key={u.id} role="button" tabIndex={0} onClick={() => setSelCreator(u.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setSelCreator(u.id); }}
                              className="grid w-full min-w-[720px] cursor-pointer grid-cols-[1.4fr_0.6fr_0.5fr_0.9fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04]">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-paper">{u.full_name || 'Sin nombre aún'}</span>
                                  <span className="block truncate text-[11px] text-paper-dim">{u.handle ? `@${u.handle}` : u.email}</span>
                                </span>
                              </span>
                              {/* ENTRÓ: fecha corta visible + hora exacta en el tooltip */}
                              <span className="text-paper-mute" title={joinedFull}>{joined}</span>
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
                              {/* ESTADO: solo los badges — limpio y alineado siempre */}
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span>
                                {planLabel && <span className="inline-block rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">{planLabel}</span>}
                                {u.is_test && <span className="inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Prueba</span>}
                              </span>
                              {/* Acciones: «Ver como ella» siempre visible (abre su panel en otra pestaña) + menú ⋯ */}
                              <span className="flex items-center justify-end gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); window.open(`/panel?as=${u.id}`, '_blank', 'noopener'); }}
                                  title="Ver el panel como ella lo ve (solo lectura, otra pestaña)"
                                  className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-paper-mute transition-colors hover:border-brand/50 hover:text-brand">
                                  <Eye size={12} /> <span className="hidden sm:inline">Ver como ella</span>
                                </button>
                                <RowActions items={[
                                  { label: 'Abrir perfil', icon: IdCard, onClick: () => setSelCreator(u.id) },
                                  { label: 'Ver información', icon: Info, onClick: () => setInfoUser(u) },
                                  ...(u.onboarding_status === 'id_pending' ? [{ label: 'Revisar identidad', icon: ShieldCheck, tone: 'amber', onClick: () => setSelCreator(u.id) }] : []),
                                ]} />
                              </span>
                            </div>
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
                <p className="text-sm text-paper-mute">Escribe un correo y te enviamos la invitación con diseño, o déjalo vacío para solo copiar el link. La persona se registra sola; luego la <strong className="text-paper">apruebas</strong>. Equipo: le das puesto y accesos. Agencia: entra a gestionar sus modelos.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="Correo (opcional — para enviar la invitación)"
                    className="min-w-[240px] flex-1 rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  <button onClick={() => createInvite('supervisor', inviteEmail)} disabled={invBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
                    {invBusy ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} {inviteEmail.trim() ? 'Enviar a equipo' : 'Link de equipo'}
                  </button>
                  <button onClick={() => createInvite('agency', inviteEmail)} disabled={invBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
                    <Building2 size={15} /> {inviteEmail.trim() ? 'Enviar a agencia' : 'Link de agencia'}
                  </button>
                </div>
                {invites.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${inv.target_role === 'agency' ? 'bg-brand/15 text-brand' : 'bg-hair/10 text-paper-dim'}`}>{inv.target_role === 'agency' ? 'Agencia' : 'Equipo'}</span>
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

            {/* Create panel — a focused modal so it never buries the roster below (edit). */}
            {equipoPanel === 'create' && (
              <div className="fixed inset-0 z-50 grid place-items-start justify-center overflow-y-auto bg-ink/70 py-8 backdrop-blur-sm" onClick={() => !creating && setEquipoPanel(null)}>
              <form onSubmit={createUser} onClick={(e) => e.stopPropagation()} className="mx-5 w-full max-w-2xl rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-paper"><UserPlus size={18} className="text-brand" /> Crear puesto / usuario</h3>
                    <p className="mt-0.5 text-xs text-paper-dim">Nombre, apellido y (opcional) correo. Elige el tipo y marca sus accesos.</p>
                  </div>
                  <button type="button" onClick={() => setEquipoPanel(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-paper-dim transition-colors hover:text-paper"><X size={16} /></button>
                </div>
                {/* Lo primordial: nombre, apellido, correo de empresa (opcional). */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={nu.first_name} onChange={(e) => setNu((v) => ({ ...v, first_name: e.target.value }))} placeholder="Nombre"
                    className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  <input value={nu.last_name} onChange={(e) => setNu((v) => ({ ...v, last_name: e.target.value }))} placeholder="Apellido"
                    className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                {/* Este modal crea SOLO empleados (equipo interno). Agencias y creadoras se
                    crean del otro lado (Registros / Agencias). Por eso no hay selector de rol:
                    aquí solo pones el puesto y marcas sus accesos. Para volver a alguien Admin,
                    se cambia después desde su perfil (Tipo). */}
                <input value={nu.job_title} onChange={(e) => setNu((v) => ({ ...v, job_title: e.target.value }))} placeholder="Puesto / cargo (opcional, ej. Coordinación)"
                  className="mt-3 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                {/* Sin campo de contraseña: la persona la pone ella misma por invitación (correo). */}
                <input type="email" value={nu.email} onChange={(e) => setNu((v) => ({ ...v, email: e.target.value }))} placeholder="Correo (opcional)"
                  className="mt-3 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <p className="mt-2 text-[11px] text-paper-dim">Con correo, le llega una <span className="text-paper-mute">invitación para poner su propia contraseña</span> — tú no la manejas. Sin correo, le generamos un login de empresa con una clave temporal para compartir.</p>

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
                {createdCreds && (
                  <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-300"><Check size={14} /> Cuenta creada — comparte estos datos</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-2 px-3 py-2">
                        <span className="text-paper-dim">Login</span>
                        <span className="min-w-0 flex-1 truncate text-right font-medium text-paper">{createdCreds.email}</span>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(createdCreds.email)} className="shrink-0 text-paper-dim hover:text-brand"><Copy size={13} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-2 px-3 py-2">
                        <span className="text-paper-dim">Contraseña</span>
                        <span className="min-w-0 flex-1 truncate text-right font-medium text-paper">{createdCreds.password}</span>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(createdCreds.password)} className="shrink-0 text-paper-dim hover:text-brand"><Copy size={13} /></button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-paper-dim">{createdCreds.generated ? 'Login de empresa generado (no hace falta correo real).' : 'Contraseña generada.'} La persona puede cambiar su clave luego desde su cuenta.</p>
                    <button type="button" onClick={() => { setCreatedCreds(null); setEquipoPanel(null); }} className="mt-2 text-xs font-medium text-brand hover:underline">Listo, cerrar</button>
                  </div>
                )}
              </form>
              </div>
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
                        <p className="flex items-center gap-1.5 truncate font-medium text-paper">
                          {u.full_name || '—'}
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${u.role === 'agency' ? 'bg-brand/15 text-brand' : 'bg-hair/10 text-paper-dim'}`}>{u.role === 'agency' ? 'Agencia' : 'Equipo'}</span>
                        </p>
                        <p className="truncate text-xs text-paper-mute">{u.email}{u.job_title ? ` · ${u.job_title}` : ''}</p>
                      </div>
                      <button onClick={async () => { await approveStaff(u.id); if (u.role !== 'agency') setSelStaff(u.id); }} disabled={savingId === u.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-50">
                        {savingId === u.id ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} {u.role === 'agency' ? 'Aprobar agencia' : 'Aprobar y configurar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Buscador del equipo — filtra por nombre, correo o puesto. */}
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} placeholder="Buscar por nombre, correo o puesto…"
                className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-10 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            {(() => {
              const q = teamQuery.trim().toLowerCase();
              const roster = profiles
                .filter((u) => u.role !== 'creator' && u.role !== 'agency' && u.staff_status !== 'pending')
                .filter((u) => !q || [u.full_name, u.email, u.job_title].some((f) => (f || '').toLowerCase().includes(q)));
              if (roster.length === 0) return <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Nadie coincide con «{teamQuery}».</p>;
              return (
            <div className="space-y-3">
            {roster.map((u) => {
              const isMgr = MANAGER_ROLES.includes(u.role);
              const owner = isOwnerAccount(u);
              const caps = u.capabilities || [];
              const grantedLabels = CAPS.filter((c) => caps.includes(c.v)).map((c) => c.l);
              return (
                <button key={u.id} onClick={() => setSelStaff(u.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-brand/30 hover:bg-hair/[0.04]">
                  <Avatar src={u.avatar_url} name={u.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-paper">{u.full_name || '—'}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-normal ${owner ? 'bg-amber-400/10 text-amber-300' : 'bg-hair/10 text-paper-dim'}`}>{owner ? 'Dueño' : isMgr ? 'Admin' : (u.job_title || 'Empleado')}</span>
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
              );
            })()}
          </div>
        ) : tab === 'agencias' ? (
          <AgenciasTab agencies={profiles.filter((p) => p.role === 'agency')} creators={creators} agencyLinks={agencyLinks} agencySales={agencySales} profiles={profiles} onAssign={setAgConfirm} onDeleted={load} />
        ) : tab === 'actividad' ? (
          <div className="mt-6">
            <EmailStudio defaultTo="rusin24@gmail.com" />
            <p className="mb-3 mt-8 text-sm text-paper-mute">Registro automático de acciones sensibles sobre las cuentas: quién y cuándo. Se guarda solo.</p>
            {audit.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Sin actividad registrada todavía. Cuando actives/desactives una suscripción, cambies un plan o apruebes una identidad, aparecerá aquí.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line">
                {audit.map((a, i) => {
                  const actor = profiles.find((p) => p.id === a.actor_id);
                  const target = profiles.find((p) => p.id === a.target_id);
                  const who = actor ? (actor.full_name || actor.email) : 'Sistema';
                  const onWhom = target ? (target.stage_name || target.full_name || target.email) : '—';
                  return (
                    <div key={a.id} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm text-paper"><span className="font-semibold">{who}</span> · {a.action} · <span className="text-paper-mute">{onWhom}</span></p>
                        {a.meta?.old != null && <p className="text-[11px] text-paper-dim">{String(a.meta.old)} → {String(a.meta.new)}</p>}
                      </div>
                      <span className="shrink-0 text-[11px] text-paper-dim">{new Date(a.created_at).toLocaleString('es-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {agConfirm && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-ink/75 p-5 backdrop-blur-sm" onClick={() => !agBusy && setAgConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${agConfirm.action === 'move' ? 'bg-amber-400/10 text-amber-300' : agConfirm.action === 'remove' ? 'bg-rose-500/10 text-rose-300' : 'bg-brand/10 text-brand'}`}>
              {agConfirm.action === 'move' ? <><ArrowUpDown size={13} /> Mover de agencia</> : agConfirm.action === 'remove' ? <><X size={13} /> Quitar de la agencia</> : <><Building2 size={13} /> Asignar a la agencia</>}
            </div>
            <h3 className="font-display text-lg font-semibold text-paper">
              {agConfirm.action === 'move' ? `¿Mover a ${agConfirm.creatorName}?`
                : agConfirm.action === 'remove' ? `¿Quitar a ${agConfirm.creatorName}?`
                : `¿Asignar a ${agConfirm.creatorName}?`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-paper-mute">
              {agConfirm.action === 'move' ? <>
                Una creadora solo puede estar en <strong className="text-paper">una agencia</strong>. Al asignarla a <strong className="text-paper">{agConfirm.toAgencyName}</strong>, <strong className="text-amber-300">saldrá de {agConfirm.fromAgencyName}</strong> — la agencia anterior deja de verla y de gestionarla al instante.
              </> : agConfirm.action === 'remove' ? <>
                Quedará <strong className="text-paper">sin agencia</strong>: {agConfirm.fromAgencyName} deja de verla y de gestionar su contenido. Su cuenta y su contenido no se borran.
              </> : <>
                {agConfirm.creatorName} pasará a ser gestionada por <strong className="text-paper">{agConfirm.toAgencyName}</strong>, que verá su contenido, hará pedidos y registrará sus ventas.
              </>}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAgConfirm(null)} disabled={agBusy} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper disabled:opacity-60">Cancelar</button>
              <button disabled={agBusy}
                onClick={async () => { setAgBusy(true); await setCreatorAgency(agConfirm.creatorId, agConfirm.toAgencyId); setAgBusy(false); setAgConfirm(null); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60 ${agConfirm.action === 'remove' ? 'bg-rose-600 text-white' : 'bg-brand text-on-accent'}`}>
                {agBusy ? <Loader2 size={15} className="animate-spin" /> : agConfirm.action === 'move' ? <ArrowUpDown size={15} /> : agConfirm.action === 'remove' ? <X size={15} /> : <Check size={15} />}
                {agConfirm.action === 'move' ? 'Sí, mover' : agConfirm.action === 'remove' ? 'Sí, quitar' : 'Sí, asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newAgency && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 py-8 backdrop-blur-sm" onClick={() => !naBusy && setNewAgency(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={createAgency}
            className="mx-5 w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-paper"><Building2 size={18} className="text-brand" /> Crear agencia</h3>
                <p className="mt-1 text-sm text-paper-mute">Con correo, le llega una invitación para poner su clave y entrar como agencia. Luego le asignas sus modelos.</p>
              </div>
              <button type="button" onClick={() => setNewAgency(null)} className="rounded-full p-1 text-paper-dim hover:text-paper"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input autoFocus value={newAgency.full_name} onChange={(e) => setNewAgency((v) => ({ ...v, full_name: e.target.value }))} placeholder="Nombre de la agencia"
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <input type="email" value={newAgency.email} onChange={(e) => setNewAgency((v) => ({ ...v, email: e.target.value }))} placeholder="Correo (opcional — le llega la invitación)"
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <input type="text" value={newAgency.password} onChange={(e) => setNewAgency((v) => ({ ...v, password: e.target.value }))} placeholder="Contraseña (opcional — normalmente vacío)"
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            <p className="mt-2 text-[11px] text-paper-dim">Con correo → invitación para que ponga su propia clave. Sin correo → login de empresa con clave temporal. La contraseña manual es solo para cuentas de prueba.</p>
            {naErr && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{naErr}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNewAgency(null)} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
              <button type="submit" disabled={naBusy}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
                {naBusy ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={15} />} Crear agencia
              </button>
            </div>
          </form>
        </div>
      )}

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
              {newCreator.activate && !newCreator.comp && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3">
                  <label className="mb-1 block text-xs font-medium text-emerald-200">Vence el · próximo cobro</label>
                  <input type="date" value={newCreator.ends_at || ''} onChange={(e) => setNewCreator((v) => ({ ...v, ends_at: e.target.value }))}
                    className="w-full rounded-lg border border-emerald-500/40 bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-emerald-400" />
                  <p className="mt-1 text-[11px] text-emerald-200/80">El admin te avisa (banner) cuando esté por vencer o vencida. El cobro es manual: al vencer la marcas inactiva a mano y deja de verla la modelo y la agencia.</p>
                </div>
              )}

              {/* Cortesía dinámica — regalar acceso gratis hasta una fecha que tú eliges. */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
                <input type="checkbox" checked={!!newCreator.comp} onChange={(e) => setNewCreator((v) => ({ ...v, comp: e.target.checked, activate: e.target.checked ? true : v.activate }))}
                  className="mt-0.5 h-4 w-4 rounded border-line bg-ink-2 text-amber-400 focus:ring-amber-400" />
                <span className="min-w-0 text-sm text-paper">
                  Cortesía <span className="text-paper-dim">(gratis — no pagó)</span>
                  <span className="mt-0.5 block text-[11px] text-paper-dim">Nace activa sin cobro. Elige hasta cuándo es gratis; queda registrado que fue cortesía.</span>
                </span>
              </label>
              {newCreator.comp && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-3">
                  <label className="mb-1 block text-xs font-medium text-amber-200">Gratis hasta</label>
                  <input type="date" value={newCreator.comp_until || ''} onChange={(e) => setNewCreator((v) => ({ ...v, comp_until: e.target.value }))}
                    className="w-full rounded-lg border border-amber-400/40 bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-amber-300" />
                </div>
              )}

              {/* Nota de facturación — qué se le dio / por qué (visible en su perfil). */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-paper-dim">Nota (opcional) — ej. «1 mes gratis de cortesía»</label>
                <input value={newCreator.billing_note || ''} onChange={(e) => setNewCreator((v) => ({ ...v, billing_note: e.target.value }))} placeholder="Qué se le dio / por qué"
                  className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </div>
            </div>

            {ncErr && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{ncErr}</p>}

            {dupUser && (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-3.5">
                <p className="text-[13px] leading-snug text-paper">
                  Ya existe una cuenta con <span className="font-semibold">{dupUser.email}</span>{dupUser.full_name ? <> — <span className="text-paper">{dupUser.full_name}</span></> : null}. En vez de inventar otro correo, actúa sobre esa cuenta:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={dupBusy}
                    onClick={async () => {
                      setDupBusy(true);
                      const { data, error: e2 } = await getSupabase().functions.invoke('reset-password', { body: { user_id: dupUser.id, send_email: true } });
                      let o = data; if (e2 && !o) { try { o = await e2.context.json(); } catch { o = { error: e2.message }; } }
                      setDupBusy(false);
                      if (o?.ok) { flash(`Correo de acceso reenviado a ${dupUser.email}`); setDupUser(null); setNewCreator(null); }
                      else { setNcErr(o?.error || 'No se pudo reenviar el correo.'); }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                    {dupBusy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Reenviar correo de acceso
                  </button>
                  {dupUser.role === 'creator' ? (
                    <button type="button" onClick={() => { setSelCreator(dupUser.id); setNewCreator(null); setDupUser(null); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-paper hover:border-brand/50">
                      <IdCard size={13} /> Abrir su perfil
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setSelStaff(dupUser.id); setNewCreator(null); setDupUser(null); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-paper hover:border-brand/50">
                      <IdCard size={13} /> Abrir su perfil
                    </button>
                  )}
                  <button type="button" onClick={() => setDupUser(null)} className="rounded-full border border-line px-3.5 py-1.5 text-xs text-paper-mute hover:text-paper">Ignorar</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setNewCreator(null); setDupUser(null); setNcErr(''); }} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper">Cancelar</button>
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
          onDeleted={() => { setSelCreator(null); load(); }}
        />
      )}

      {selStaff && (
        <EmployeeProfile
          staff={profiles.find((p) => p.id === selStaff)}
          isSelf={selStaff === me.id}
          onClose={() => setSelStaff(null)}
          onToggleCap={toggleCap}
          onChangeRole={changeRole}
          onSaved={load}
          onDeleted={() => { setSelStaff(null); load(); }}
          savingId={savingId}
        />
      )}

      {infoUser && <CreatorInfoModal u={infoUser} onClose={() => setInfoUser(null)} onOpenProfile={() => { setSelCreator(infoUser.id); setInfoUser(null); }} onView={() => window.open(`/panel?as=${infoUser.id}`, '_blank', 'noopener')} />}

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

// Correos — the email dashboard: pick a template, see a live preview (desktop/phone),
// manage the recipient list, send (one template or the whole test batch), and read the
// history of everything that went out (email_log). Every send is branded via Resend.
// scope: 'externo' (creadora/agencia) | 'interno' (equipo). who: quién lo recibe.
const EMAIL_TEMPLATES = [
  { id: 'welcome',  label: 'Bienvenida',              extra: '',                                      scope: 'externo', who: 'La creadora',       when: 'Al registrarse una creadora' },
  { id: 'invite',   label: 'Invitación (crear clave)', extra: '',                                     scope: 'externo', who: 'Creadora o agencia', when: 'Al crearle la cuenta desde admin' },
  { id: 'approved', label: 'ID aprobado',             extra: '',                                      scope: 'externo', who: 'La creadora',       when: 'Cuando aprueban su identidad' },
  { id: 'rejected', label: 'ID rechazado',            extra: 'la foto de tu documento salió borrosa', scope: 'externo', who: 'La creadora',       when: 'Cuando rechazan su identidad' },
  { id: 'delivery', label: 'Contenido nuevo',         extra: 'Set de agosto',                          scope: 'externo', who: 'La creadora',       when: 'Cuando le suben contenido' },
  { id: 'expiring', label: 'Suscripción por vencer',  extra: '20 de agosto',                           scope: 'externo', who: 'La creadora',       when: 'Días antes de vencer su plan' },
  { id: 'join',     label: 'Invitación a unirse',     extra: 'Equipo',                                 scope: 'interno', who: 'Equipo o agencia',  when: 'Al invitar por correo a unirse' },
];
const EMAIL_LABEL = (id) => EMAIL_TEMPLATES.find((t) => t.id === id)?.label || id;
const EMAIL_EXTRA = (id) => EMAIL_TEMPLATES.find((t) => t.id === id)?.extra || '';
const EMAIL_META = (id) => EMAIL_TEMPLATES.find((t) => t.id === id) || {};

function EmailStudio({ defaultTo = '' }) {
  const [tpl, setTpl] = useState('welcome');
  const [recips, setRecips] = useState(defaultTo ? [defaultTo] : []);
  const [input, setInput] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [pvBusy, setPvBusy] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [log, setLog] = useState([]);

  const loadPreview = useCallback(async (id) => {
    setPvBusy(true);
    const { data, error } = await getSupabase().functions.invoke('send-email', {
      body: { template: id, lang: 'es', preview: true, name: 'Álvaro', extra: EMAIL_EXTRA(id) },
    });
    setPvBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = null; } }
    if (out?.ok && out?.html) { setPreviewHtml(out.html); setPreviewSubject(out.subject || ''); }
    else { setPreviewHtml(''); setPreviewSubject(''); }
  }, []);

  const loadLog = useCallback(async () => {
    const { data } = await getSupabase().from('email_log').select('*').order('created_at', { ascending: false }).limit(40);
    setLog(data || []);
  }, []);

  useEffect(() => { loadPreview(tpl); }, [tpl, loadPreview]);
  useEffect(() => { loadLog(); }, [loadLog]);

  function addRecip() {
    const e = input.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setOk(false); setMsg('Ese correo no parece válido.'); return; }
    if (!recips.includes(e)) setRecips((r) => [...r, e]);
    setInput(''); setMsg('');
  }
  const removeRecip = (e) => setRecips((r) => r.filter((x) => x !== e));

  async function sendOne(id, to) {
    const { data, error } = await getSupabase().functions.invoke('send-email', {
      body: { template: id, to, lang: 'es', name: 'Álvaro', extra: EMAIL_EXTRA(id) },
    });
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    return { ok: !!out?.ok, error: out?.error };
  }

  async function sendSelected() {
    if (!recips.length) { setOk(false); setMsg('Agrega al menos un destinatario.'); return; }
    setBusy(true); setMsg(''); setOk(false);
    let good = 0; let lastErr = '';
    for (const to of recips) { const r = await sendOne(tpl, to); if (r.ok) good++; else lastErr = r.error || ''; }
    setBusy(false); setOk(good === recips.length);
    setMsg(good === recips.length ? `Enviado «${EMAIL_LABEL(tpl)}» a ${good} destinatario(s).` : `Enviados ${good}/${recips.length}. ${lastErr}`);
    loadLog();
  }

  async function sendBatch() {
    if (!recips.length) { setOk(false); setMsg('Agrega un destinatario para la tanda.'); return; }
    setBusy(true); setMsg(''); setOk(false);
    let good = 0; const total = EMAIL_TEMPLATES.length * recips.length;
    for (const t of EMAIL_TEMPLATES) { for (const to of recips) { const r = await sendOne(t.id, to); if (r.ok) good++; } }
    setBusy(false); setOk(good === total);
    setMsg(`Tanda de prueba: ${good}/${total} correos enviados (${EMAIL_TEMPLATES.length} plantillas).`);
    loadLog();
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/15 text-brand"><Mail size={16} /></span>
        <div>
          <h3 className="font-display text-lg font-semibold text-paper">Correos</h3>
          <p className="text-[11px] text-paper-dim">Elige una plantilla, revisa el preview, arma la lista y envía. Todo sale con diseño desde letshoot.ai.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        {/* Compose */}
        <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-paper-dim">Plantilla · quién la recibe</div>
            {[['externo', 'Externos · creadora / agencia'], ['interno', 'Internos · equipo']].map(([sc, lbl]) => (
              <div key={sc} className="mb-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-paper-dim/70">{lbl}</div>
                <div className="flex flex-wrap gap-1.5">
                  {EMAIL_TEMPLATES.filter((t) => t.scope === sc).map((t) => (
                    <button key={t.id} onClick={() => setTpl(t.id)} title={`${t.who} — ${t.when}`}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${tpl === t.id ? 'border-brand/60 bg-brand/15' : 'border-line hover:border-brand/30'}`}>
                      <span className={`block text-xs font-medium ${tpl === t.id ? 'text-brand' : 'text-paper'}`}>{t.label}</span>
                      <span className="block text-[10px] text-paper-dim">{t.who}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-paper-dim">Destinatarios · {recips.length}</div>
            {recips.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {recips.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 py-1 pl-3 pr-1.5 text-xs text-paper">
                    {e}
                    <button onClick={() => removeRecip(e)} className="grid h-4 w-4 place-items-center rounded-full text-paper-dim hover:bg-hair/10 hover:text-rose-300"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecip(); } }}
                type="email" placeholder="correo@ejemplo.com"
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <button onClick={addRecip} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-medium text-paper-mute hover:border-brand/40 hover:text-paper"><Plus size={13} /> Agregar</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button onClick={sendSelected} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar «{EMAIL_LABEL(tpl)}»
            </button>
            <button onClick={sendBatch} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
              <Sparkles size={14} /> Tanda de prueba ({EMAIL_TEMPLATES.length})
            </button>
          </div>
          {msg && <p className={`text-xs ${ok ? 'text-emerald-300' : 'text-paper-mute'}`}>{msg}</p>}
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye size={14} className="shrink-0 text-brand" />
                <span className="truncate text-sm font-medium text-paper">{previewSubject || 'Vista previa'}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-6">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${EMAIL_META(tpl).scope === 'interno' ? 'bg-hair/10 text-paper-dim' : 'bg-brand/10 text-brand'}`}>{EMAIL_META(tpl).scope === 'interno' ? 'Interno' : 'Externo'}</span>
                <span className="text-[11px] text-paper-dim">Lo recibe: <span className="text-paper-mute">{EMAIL_META(tpl).who}</span> · {EMAIL_META(tpl).when}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-line p-0.5">
              <button onClick={() => setDevice('desktop')} title="Computadora"
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${device === 'desktop' ? 'bg-brand/15 text-brand' : 'text-paper-dim hover:text-paper'}`}><Monitor size={14} /></button>
              <button onClick={() => setDevice('mobile')} title="Teléfono"
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${device === 'mobile' ? 'bg-brand/15 text-brand' : 'text-paper-dim hover:text-paper'}`}><Smartphone size={14} /></button>
            </div>
          </div>
          <div className="flex justify-center rounded-xl border border-line bg-[#070a0f] p-3" style={{ minHeight: 420 }}>
            {pvBusy && !previewHtml ? (
              <div className="grid w-full place-items-center py-20 text-paper-dim"><Loader2 size={20} className="animate-spin" /></div>
            ) : previewHtml ? (
              device === 'mobile' ? (
                // A real phone: narrow body + bezel so it never reads as a tablet.
                <div style={{ width: 320, padding: 10, borderRadius: 34, background: '#0d1319', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
                  <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: '#070a0f' }}>
                    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 90, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.14)', zIndex: 2 }} />
                    <iframe title="Vista previa del correo (teléfono)" srcDoc={previewHtml}
                      style={{ width: 300, height: 600, border: 0, background: '#070a0f', display: 'block' }} />
                  </div>
                </div>
              ) : (
                <iframe title="Vista previa del correo" srcDoc={previewHtml}
                  style={{ width: '100%', maxWidth: '100%', height: 620, border: 0, borderRadius: 12, background: '#070a0f' }} />
              )
            ) : (
              <div className="grid w-full place-items-center py-20 text-center text-xs text-paper-dim">No se pudo cargar el preview.</div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-paper"><Clock size={14} className="text-brand" /> Historial de envíos</h4>
          <button onClick={loadLog} className="inline-flex items-center gap-1 text-xs text-paper-dim hover:text-paper"><RefreshCw size={12} /> Actualizar</button>
        </div>
        {log.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-ink-2/40 p-6 text-center text-xs text-paper-dim">Todavía no se ha enviado ningún correo. Los que mandes desde aquí (y los automáticos) aparecerán en esta lista.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            {log.map((e, i) => (
              <div key={e.id} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="min-w-0">
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">{EMAIL_LABEL(e.template)}</span>
                  <span className="ml-2 text-sm text-paper">{e.recipient}</span>
                </div>
                <span className="shrink-0 text-[11px] text-paper-dim">{new Date(e.created_at).toLocaleString('es-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Ficha rápida de la creadora: la HORA EXACTA de registro (importante ahora que
// entra gente real) + datos clave, sin abrir el perfil completo. Se abre desde el
// botón de info junto a los estados (Activa/Core).
// Menú de acciones por fila (⋯). Posición fija calculada del botón para no
// recortarse dentro del contenedor con scroll horizontal. Cierra al tocar fuera.
function RowActions({ items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  function toggle(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const width = 208;
      setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 8), left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)) });
    }
    setOpen((o) => !o);
  }
  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label="Acciones"
        className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${open ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-paper-dim hover:border-brand/50 hover:text-paper'}`}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="fixed w-52 overflow-hidden rounded-xl border border-line bg-card shadow-glow-sm"
            style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            {items.map((it, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-hair/[0.06] ${i > 0 ? 'border-t border-line/60' : ''} ${it.tone === 'amber' ? 'text-amber-300' : 'text-paper'}`}>
                <it.icon size={15} className={it.tone === 'amber' ? 'text-amber-300' : 'text-paper-dim'} /> {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Pestaña Agencias — escalable: buscador arriba, cada agencia colapsada
// (nombre · # modelos · $ ventas). Se abre para gestionar sus modelos.
function AgenciasTab({ agencies, creators, agencyLinks, agencySales, profiles, onAssign, onDeleted }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');   // all | with | without | sales
  const [sort, setSort] = useState('name');       // name | models | sales

  // Métricas por agencia para filtrar/ordenar.
  const meta = (a) => {
    const models = agencyLinks.filter((l) => l.agency_id === a.id).length;
    const cents = agencySales.filter((s) => s.agency_id === a.id).reduce((s, r) => s + (r.amount_cents || 0), 0);
    return { models, cents };
  };
  const selCount = { all: agencies.length };

  let list = agencies.filter((a) => !q.trim() || ((a.full_name || '') + (a.email || '')).toLowerCase().includes(q.toLowerCase()));
  list = list.filter((a) => {
    const m = meta(a);
    if (filter === 'with') return m.models > 0;
    if (filter === 'without') return m.models === 0;
    if (filter === 'sales') return m.cents > 0;
    return true;
  });
  list = [...list].sort((a, b) => {
    const ma = meta(a), mb = meta(b);
    if (sort === 'models') return mb.models - ma.models;
    if (sort === 'sales') return mb.cents - ma.cents;
    return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
  });

  const selCls = 'appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-8 text-xs font-semibold text-paper-mute outline-none transition-colors focus:border-brand/60';

  return (
    <div className="mt-6 space-y-3">
      <p className="max-w-3xl text-sm text-paper-mute">
        Cada agencia entra a <em>sus</em> modelos, hace pedidos y registra ventas. Abre una para gestionar qué modelos maneja. Para crear una agencia usa <span className="text-paper-mute">«Crear agencia»</span> en <span className="text-paper-mute">Registros</span>.
      </p>

      {/* Buscador + filtros + orden — siempre visibles */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar agencia por nombre o correo…"
          className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-paper-dim"><SlidersHorizontal size={13} /> Filtrar:</span>
        <div className="relative">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selCls}>
            <option value="all">Todas</option>
            <option value="with">Con modelos</option>
            <option value="without">Sin modelos</option>
            <option value="sales">Con ventas</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
        </div>
        <span className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-paper-dim"><ArrowUpDown size={13} /> Ordenar:</span>
        <div className="relative">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selCls}>
            <option value="name">Nombre (A–Z)</option>
            <option value="models">Más modelos</option>
            <option value="sales">Más ventas</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
        </div>
        <span className="ml-auto text-[11px] text-paper-dim">{list.length} de {selCount.all}</span>
      </div>

      {agencies.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">No hay agencias todavía. Créala desde «Registros → Crear agencia».</p>
      )}
      {agencies.length > 0 && list.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Ninguna agencia coincide con el filtro.</p>
      )}
      {list.map((ag) => (
        <AgencyAdminCard key={ag.id} ag={ag} creators={creators} agencyLinks={agencyLinks} agencySales={agencySales} profiles={profiles} onAssign={onAssign} onDeleted={onDeleted} />
      ))}
    </div>
  );
}

function AgencyAdminCard({ ag, creators, agencyLinks, agencySales, profiles, onAssign, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [showBook, setShowBook] = useState(false);
  const linkedIds = agencyLinks.filter((l) => l.agency_id === ag.id).map((l) => l.creator_id);
  const linked = creators.filter((c) => linkedIds.includes(c.id));
  const salesRows = agencySales.filter((s) => s.agency_id === ag.id);
  const cents = salesRows.reduce((s, r) => s + (r.amount_cents || 0), 0);
  const nameOf = (cid) => { const c = profiles.find((p) => p.id === cid); return c?.stage_name || c?.full_name || 'Modelo'; };
  const crName = (cr) => cr.full_name || cr.stage_name || cr.email;
  // Buscar modelos para AGREGAR (excluye las que ya maneja esta agencia).
  const results = q.trim()
    ? creators.filter((c) => !linkedIds.includes(c.id) && ((c.full_name || '') + (c.stage_name || '') + (c.email || '') + (c.handle || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="rounded-2xl border border-line bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-hair/[0.03]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Building2 size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-semibold text-paper">{ag.full_name || '—'}</span>
          <span className="block truncate text-[11px] text-paper-dim">{ag.email}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold text-paper">{linked.length} <span className="text-xs font-normal text-paper-dim">modelo{linked.length === 1 ? '' : 's'}</span></span>
          <span className="block text-[11px] text-brand">{moneyCents(cents)}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          {/* Modelos que maneja — removibles */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Modelos que maneja · {linked.length}</p>
            {linked.length === 0 ? (
              <p className="text-xs text-paper-dim">Ninguna todavía. Búscala abajo para agregarla.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {linked.map((cr) => (
                  <button key={cr.id} title="Quitar de esta agencia"
                    onClick={() => onAssign({ creatorId: cr.id, creatorName: crName(cr), toAgencyId: null, toAgencyName: ag.full_name || 'esta agencia', fromAgencyName: ag.full_name || 'esta agencia', action: 'remove' })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm text-brand transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300">
                    {crName(cr)} <X size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Agregar modelo — buscador (escala a cientos) */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Agregar modelo</p>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, @ o correo…"
                className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            {q.trim() && (
              <div className="mt-2 space-y-1">
                {results.length === 0 && <p className="px-1 text-xs text-paper-dim">Sin resultados.</p>}
                {results.map((cr) => {
                  const otherId = agencyLinks.find((x) => x.creator_id === cr.id && x.agency_id !== ag.id)?.agency_id;
                  const otherName = otherId ? (profiles.find((p) => p.id === otherId)?.full_name || 'otra agencia') : null;
                  return (
                    <button key={cr.id}
                      onClick={() => { onAssign({ creatorId: cr.id, creatorName: crName(cr), toAgencyId: ag.id, toAgencyName: ag.full_name || 'esta agencia', fromAgencyName: otherName, action: otherName ? 'move' : 'assign' }); setQ(''); }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2 text-left text-sm transition-colors hover:border-brand/40">
                      <span className="min-w-0 truncate text-paper">{crName(cr)}
                        {otherName && <span className="ml-1.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">con {otherName}</span>}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand"><Plus size={13} /> {otherName ? 'Mover' : 'Agregar'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Libro de ventas — compacto, se despliega si lo pides */}
          <div className="rounded-xl border border-line bg-ink-2">
            <button onClick={() => setShowBook((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim"><CreditCard size={13} className="text-brand" /> Libro de ventas</span>
              <span className="inline-flex items-center gap-2 text-xs">
                <span className="text-paper-dim">{salesRows.length} venta{salesRows.length === 1 ? '' : 's'}</span>
                <span className="font-semibold text-brand">{moneyCents(cents)}</span>
                {salesRows.length > 0 && <ChevronDown size={13} className={`text-paper-dim transition-transform ${showBook ? 'rotate-180' : ''}`} />}
              </span>
            </button>
            {showBook && salesRows.length > 0 && (
              <div className="border-t border-line">
                {salesRows.slice(0, 8).map((r, i) => (
                  <div key={r.id} className={`flex items-center justify-between gap-3 px-3.5 py-2 text-xs ${i > 0 ? 'border-t border-line/60' : ''}`}>
                    <span className="min-w-0 truncate text-paper">{nameOf(r.creator_id)}</span>
                    <span className="flex shrink-0 items-center gap-3 text-paper-dim">
                      <span>{new Date(r.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</span>
                      <span className="font-semibold text-brand">{moneyCents(r.amount_cents)}</span>
                    </span>
                  </div>
                ))}
                {salesRows.length > 8 && <div className="border-t border-line px-3 py-1.5 text-center text-[10px] text-paper-dim">+{salesRows.length - 8} más</div>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <ResetPasswordBox userId={ag.id} email={ag.email} />
            <DeleteAccountButton userId={ag.id} label="agencia" onDeleted={onDeleted} />
          </div>
        </div>
      )}
    </div>
  );
}

function CreatorInfoModal({ u, onClose, onOpenProfile, onView }) {
  const dt = (v, withTime) => {
    if (!v) return '—';
    const d = new Date(v);
    return d.toLocaleString('es-US', withTime
      ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const dOnly = (v) => (v ? new Date(v + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
  const planLabel = u.plan ? u.plan.charAt(0).toUpperCase() + u.plan.slice(1) : '—';
  const paid = u.payment_status === 'paid' || ['active', 'paid'].includes(u.onboarding_status);
  const Row = ({ icon: Icon, label, value, accent }) => (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="flex items-center gap-2 text-[13px] text-paper-dim"><Icon size={14} className="shrink-0 text-paper-dim" /> {label}</span>
      <span className={`text-right text-[13px] font-medium ${accent || 'text-paper'}`}>{value}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={u.avatar_url} name={u.full_name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-paper">{u.full_name || 'Sin nombre aún'}</p>
            <p className="truncate text-[11px] text-paper-dim">{u.handle ? `@${u.handle} · ` : ''}{u.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-line text-paper-dim hover:text-paper"><X size={15} /></button>
        </div>

        <div className="rounded-xl border border-brand/25 bg-brand/[0.05] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand"><Clock size={13} /> Se registró</div>
          <div className="mt-1 text-sm font-medium text-paper">{dt(u.created_at, true)}</div>
        </div>

        <div className="mt-3">
          <Row icon={CreditCard} label="Suscripción" value={paid ? `${planLabel} · Activa` : `${planLabel} · Inactiva`} accent={paid ? 'text-emerald-300' : 'text-paper-dim'} />
          <Row icon={Calendar} label="Vence" value={dOnly(u.subscription_ends_at)} />
          {u.comp_until && <Row icon={Sparkles} label="Cortesía hasta" value={dOnly(u.comp_until)} accent="text-amber-300" />}
          <Row icon={ShieldCheck} label="Estado" value={(OB[u.onboarding_status] || OB.registered).label} />
          <Row icon={MapPin} label="País" value={u.country || '—'} />
          <Row icon={Phone} label="Teléfono" value={u.phone || '—'} />
          <Row icon={Calendar} label="Nacimiento" value={dOnly(u.date_of_birth)} />
          {u.billing_note && <Row icon={Info} label="Nota" value={u.billing_note} />}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onView} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-paper hover:border-brand/50">
            <Eye size={14} /> Ver su panel
          </button>
          <button onClick={onOpenProfile} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent">
            Abrir perfil →
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact hard-delete control (fully removes the account so its email frees up).
// Confirmación de DOS toques (sin escribir «ELIMINAR» — era demasiada fricción y
// se dejaba de borrar por rabia). El primer click abre el panel rojo; el segundo
// llama a delete-user. Se muestra el error real (FK, permisos) si falla.
function DeleteAccountButton({ userId, label = 'cuenta', onDeleted }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setErr(''); setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('delete-user', { body: { user_id: userId } });
    setBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo eliminar.'); return; }
    onDeleted && onDeleted();
  }
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setErr(''); }}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10">
        <Trash2 size={13} /> Eliminar {label}
      </button>
    );
  }
  return (
    <div className="w-full rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-3">
      <p className="mb-2 text-[11px] leading-relaxed text-paper-dim">Borra la {label} para siempre y libera su correo. No se puede deshacer.</p>
      {err && <p className="mb-2 text-[11px] text-rose-300">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => { setOpen(false); setErr(''); }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
        <button onClick={go} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sí, eliminar para siempre
        </button>
      </div>
    </div>
  );
}

function ResetPasswordBox({ userId, email = '', allowEmail = true }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  // A real email can receive the self-serve reset; internal @equipo.letshoot.ai logins can't.
  const realEmail = !!email && !email.endsWith('@equipo.letshoot.ai');
  const canEmail = allowEmail && realEmail;

  async function sendResetEmail() {
    setMsg(''); setOkMsg(''); setEmailBusy(true);
    const { data, error } = await getSupabase().functions.invoke('reset-password', { body: { user_id: userId, send_email: true } });
    setEmailBusy(false);
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setMsg(out?.error || 'No se pudo enviar el correo.'); return; }
    setOkMsg(`Correo enviado a ${out.email || email}. Pondrá su propia contraseña desde ese correo.`);
  }
  async function reset() {
    setMsg(''); setOkMsg('');
    if (pw.length < 8) { setMsg('La contraseña debe tener al menos 8 caracteres.'); return; }
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('reset-password', { body: { user_id: userId, password: pw } });
    setBusy(false);
    let out = data;
    if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setMsg(out?.error || 'No se pudo resetear.'); return; }
    setOkMsg('Contraseña temporal lista — compártesela.'); setPw(''); setOpen(false);
  }
  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-4">
      <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><KeyRound size={15} className="text-brand" /> Contraseña</h4>
      <p className="mb-3 text-[11px] text-paper-dim">
        {canEmail
          ? 'Le llega un correo para que ponga su propia contraseña. No manejas su clave.'
          : 'Esta cuenta no tiene un correo real, así que ponle una contraseña temporal y compártesela.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {canEmail ? (
          // Cuenta con correo real: una sola acción, limpio. La persona pone su propia clave.
          <button onClick={sendResetEmail} disabled={emailBusy}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
            {emailBusy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Enviar correo para que ponga su clave
          </button>
        ) : (!open && (
          // Sin correo real (login de empresa): la única vía es una temporal.
          <button onClick={() => { setOpen(true); setMsg(''); setOkMsg(''); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <KeyRound size={13} /> Poner contraseña temporal
          </button>
        ))}
      </div>
      {!canEmail && open && (
        <div className="mt-2 space-y-2">
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
      {okMsg && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand"><Check size={12} /> {okMsg}</p>}
      {msg && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">{msg}</p>}
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

function CreatorProfile({ creator, onClose, onReview, savingId, flash, onSaved, onDeleted }) {
  const [docs, setDocs] = useState(null); // { id_front, id_back, selfie_id }
  const [loraCount, setLoraCount] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);       // editar datos personales
  const [form, setForm] = useState(null);              // borrador de datos al editar
  const [tab, setTab] = useState('datos');             // datos | identidad | suscripcion | clon
  // Danger zone — hard delete (fully removes the account so the email frees up).
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');
  async function doDelete() {
    setDelErr(''); setDelBusy(true);
    const { data, error } = await getSupabase().functions.invoke('delete-user', { body: { user_id: creator.id } });
    setDelBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setDelErr(out?.error || 'No se pudo eliminar.'); return; }
    onDeleted && onDeleted();
  }

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
          {creator.is_test && <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">Prueba</span>}
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

          {/* Modelo de prueba — no cuenta en contabilidad (solo el dueño) */}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300"><AlertTriangle size={13} /> Modelo de prueba</div>
                <p className="mt-1 text-[11px] text-paper-dim">Si está activo, esta cuenta NO cuenta en el ingreso estimado ni en el desglose de contabilidad. Úsalo para demos y cuentas internas.</p>
              </div>
              <button onClick={() => patch({ is_test: !creator.is_test }, creator.is_test ? 'Ya no es modelo de prueba' : 'Marcada como modelo de prueba')} disabled={saving}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${creator.is_test ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-line text-paper-mute hover:border-amber-400/40 hover:text-amber-300'}`}>
                {creator.is_test ? <><Check size={13} /> Es de prueba</> : 'Marcar como prueba'}
              </button>
            </div>
          </div>

          {/* Contraseña — resetear */}
          <ResetPasswordBox userId={creator.id} email={creator.email} />
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

              {/* Cortesía (gratis) + nota — para ver qué se le dio y por qué */}
              <div className="rounded-2xl border border-line bg-ink-2 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-paper-dim"><Sparkles size={13} className="text-amber-300" /> Cortesía y nota</div>
                {creator.comp_until && (
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    Cortesía (gratis) hasta {new Date(creator.comp_until + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
                <label className="mb-1 block text-[11px] text-paper-dim">Gratis hasta (cortesía) — vacío = no es cortesía</label>
                <input type="date" defaultValue={creator.comp_until || ''} disabled={saving}
                  onBlur={(e) => { const v = e.target.value || null; if (v !== (creator.comp_until || null)) patch(v ? { comp_until: v, payment_status: 'paid', onboarding_status: 'active', subscription_ends_at: v, plan: creator.plan || 'core' } : { comp_until: null }, 'Cortesía actualizada'); }}
                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-amber-400/60" />
                <label className="mb-1 mt-3 block text-[11px] text-paper-dim">Nota</label>
                <input defaultValue={creator.billing_note || ''} disabled={saving} placeholder="ej. 1 mes gratis de cortesía"
                  onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (creator.billing_note || null)) patch({ billing_note: v }, 'Nota guardada'); }}
                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
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

          {/* Danger zone — eliminar la creadora por completo (libera su correo). */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
            <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-rose-300"><Trash2 size={15} /> Eliminar creadora</h4>
            <p className="text-[11px] leading-relaxed text-paper-dim">
              Borra esta cuenta para siempre con todo lo suyo (contenido, carpetas, identidad, pedidos, ventas). Libera su correo para volver a usarlo. No se puede deshacer.
            </p>
            {!delOpen ? (
              <button onClick={() => { setDelOpen(true); setDelErr(''); }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10">
                <Trash2 size={13} /> Eliminar esta creadora
              </button>
            ) : (
              <div className="mt-3 space-y-2.5">
                <p className="text-[11px] leading-relaxed text-paper-dim">Se borran <span className="text-paper">para siempre</span> su cuenta, contenido, identidad y notificaciones. Su correo queda libre para reusarse. No se puede deshacer.</p>
                {delErr && <p className="text-[11px] text-rose-300">{delErr}</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setDelOpen(false); setDelErr(''); }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
                  <button onClick={doDelete} disabled={delBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
                    {delBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sí, eliminar para siempre
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Employee profile drawer — full staff view: identity, access, activity ── */
function EmployeeProfile({ staff, isSelf, onClose, onToggleCap, onChangeRole, onSaved, onDeleted, savingId }) {
  const [activity, setActivity] = useState(null); // { deliveries, idsReviewed }
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [eBusy, setEBusy] = useState(false);
  const [eErr, setEErr] = useState('');
  // Danger zone — hard delete. Requires typing the confirm word so it can't be a misclick.
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');
  async function doDelete() {
    setDelErr(''); setDelBusy(true);
    const { data, error } = await getSupabase().functions.invoke('delete-user', { body: { user_id: staff.id } });
    setDelBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setDelErr(out?.error || 'No se pudo eliminar.'); return; }
    onDeleted && onDeleted();
  }
  function openEdit() { setEName(staff.full_name || ''); setEEmail(staff.email || ''); setEErr(''); setEditing(true); }
  async function saveEdit() {
    setEErr(''); setEBusy(true);
    const { data, error } = await getSupabase().functions.invoke('update-user', { body: { user_id: staff.id, full_name: eName.trim(), email: eEmail.trim() } });
    setEBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setEErr(out?.error || 'No se pudo guardar.'); return; }
    setEditing(false);
    onSaved && onSaved();
  }

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
  const owner = isOwnerAccount(staff);          // the protected Dueño account
  const roleBadge = owner ? 'Dueño' : isMgr ? 'Admin' : (staff.job_title || 'Empleado');
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
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${owner ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : isMgr ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-hair/5 text-paper-mute'}`}>
            {roleBadge}
          </span>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
        </div>

        <div className="space-y-3 p-5">
          {/* Identity */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-display font-semibold text-paper"><Users size={15} className="text-brand" /> Identidad</h4>
              {!editing && !isMgr && (
                <button onClick={openEdit} className="inline-flex items-center gap-1 text-xs font-medium text-paper-dim transition-colors hover:text-brand"><Pencil size={12} /> Editar</button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre</label>
                  <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Nombre y apellido"
                    className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-paper-dim">Correo / login</label>
                  <input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="correo@empresa.com"
                    className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  <p className="mt-1 text-[11px] text-paper-dim">Cambiar el correo también cambia con qué inicia sesión.</p>
                </div>
                {eErr && <p className="text-[11px] text-rose-300">{eErr}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEditing(false)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
                  <button onClick={saveEdit} disabled={eBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                    {eBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                  </button>
                </div>
              </div>
            ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre</dt><dd className="text-paper">{staff.full_name || '—'}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Puesto</dt><dd className="text-paper">{roleBadge === 'Empleado' ? (staff.job_title || '—') : roleBadge}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Correo</dt><dd className="truncate text-paper">{staff.email}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Miembro desde</dt><dd className="text-paper">{memberSince}</dd></div>
            </dl>
            )}
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Tipo</span>
              {owner ? (
                <span className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-sm text-amber-300">Dueño (no se cambia)</span>
              ) : (
              <select value={isMgr ? 'admin' : 'supervisor'} onChange={(e) => onChangeRole(staff.id, e.target.value)} disabled={isSelf}
                className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                <option value="admin">Admin (acceso total)</option>
                <option value="supervisor">Empleado</option>
              </select>
              )}
              {savingId === staff.id && <RefreshCw size={14} className="animate-spin text-brand" />}
            </div>
          </div>

          {/* Contraseña — right under Identity so it's easy to find (no hay que bajar hasta abajo). */}
          {!isSelf && <ResetPasswordBox userId={staff.id} email={staff.email} />}

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

          {/* Danger zone — eliminar cuenta. No aparece para ti mismo. */}
          {!isSelf && !owner && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
              <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-rose-300"><Trash2 size={15} /> Eliminar cuenta</h4>
              <p className="text-[11px] leading-relaxed text-paper-dim">
                Borra esta cuenta para siempre, junto con todo lo que le pertenece (contenido, carpetas, identidad, pedidos, ventas y notificaciones). No se puede deshacer.
              </p>
              {!delOpen ? (
                <button onClick={() => { setDelOpen(true); setDelErr(''); }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10">
                  <Trash2 size={13} /> Eliminar esta cuenta
                </button>
              ) : (
                <div className="mt-3 space-y-2.5">
                  <p className="text-[11px] leading-relaxed text-paper-dim">Se borra <span className="text-paper">para siempre</span>. Su correo queda libre para reusarse. No se puede deshacer.</p>
                  {delErr && <p className="text-[11px] text-rose-300">{delErr}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setDelOpen(false); setDelErr(''); }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
                    <button onClick={doDelete} disabled={delBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
                      {delBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sí, eliminar para siempre
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Header({ me, router, creators }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin" aria-label="Ir al inicio de Administración" className="flex shrink-0 items-center transition-opacity hover:opacity-80"><Logo size="sm" /></Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
            <ShieldCheck size={12} /> Administración
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 md:flex">
            <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
              <span className="block text-[10px] text-paper-dim">Dueño · Administración</span>
            </span>
          </div>
          <ImpersonateMenu creators={creators} />
          <a href="/trabajo" className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 sm:px-3.5">Trabajo</a>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper sm:px-3.5">
            <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// «Ver como creadora» centralizado — dropdown con lista buscable de todas las
// creadoras. Un clic abre su panel en otra pestaña (impersonate read-only).
function ImpersonateMenu({ creators }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const list = (creators || []).filter((c) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return `${c.full_name || ''} ${c.handle || ''} ${c.email || ''}`.toLowerCase().includes(t);
  }).slice(0, 12);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:px-3.5">
        <Eye size={14} /> <span className="hidden sm:inline">Ver como…</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-ink shadow-glow-sm">
          <div className="border-b border-line p-2.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar creadora…"
                className="w-full rounded-lg border border-line bg-ink-2 py-1.5 pl-7 pr-2 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            <p className="mt-1.5 text-[10px] text-paper-dim">Abre su panel en otra pestaña, tal como ella lo ve.</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <p className="px-3 py-4 text-center text-xs text-paper-dim">Ninguna coincide.</p>}
            {list.map((c) => (
              <button key={c.id}
                onClick={() => { window.open(`/panel?as=${c.id}`, '_blank', 'noopener'); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-hair/[0.06]">
                <Avatar src={c.avatar_url} name={c.full_name} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-paper">{c.full_name || 'Sin nombre'}</span>
                  <span className="block truncate text-[10px] text-paper-dim">{c.handle ? `@${c.handle}` : c.email}</span>
                </span>
                <Eye size={12} className="shrink-0 text-paper-dim" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
