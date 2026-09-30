'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Users, ShieldCheck, Check, Plus, X, RefreshCw, IdCard, Clock, UserPlus, ClipboardList, AlertTriangle, BarChart3, Building2, CreditCard, Sparkles, Link2, Copy, Search, Loader2, ChevronDown, SlidersHorizontal, ArrowUpDown, Upload, Heart, KeyRound, Activity, Mail, Send, Monitor, Smartphone, Eye, Pencil, Trash2, Info, Phone, MapPin, Calendar, MoreVertical, Inbox, ChevronsLeft, ChevronsRight, Plug, ChefHat, Mic, AudioLines, UploadCloud, Play, Pause, Wand2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import StatusDot from '@/components/StatusDot';
import PortalHeader from '@/components/PortalHeader';
import ImpersonateMenu from '@/components/ImpersonateMenu';
import ProposalEditor from '@/components/ProposalEditor';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
import { CAPS, CAP_SECTIONS, ROLE_CAPS, ROLE_PICKER, STAFF_ROLES } from '@/lib/caps';
import { PACKS } from '@/lib/packs';

import ReactionsDashboard from '@/components/ReactionsDashboard';
import AdminPropuestas from '@/components/AdminPropuestas';
import AdminPeticiones from '@/components/AdminPeticiones';
import { CADENCIAS, deliveryState, cadenceLabel, nextDelivery } from '@/lib/cadence';
import { COUNTRIES, flagEmoji } from '@/lib/countries';
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
  { v: 'agent',  l: 'Agente vendedor' },
  { v: 'creator', l: 'Creadora' },
];
const ROLE_LABEL = { ...Object.fromEntries(ROLES.map((r) => [r.v, r.l])), producer: 'Empleado', chatter: 'Empleado' };
// The owner account — shown as "Dueño", protected from role change and deletion. The rest
// of the admins are just "Admin". No DB column needed (DDL is locked); the app designates it.
const OWNER_EMAIL = 'rusin24@gmail.com';
const isOwnerAccount = (u) => !!u && u.email === OWNER_EMAIL;

// Etiqueta corta de la última entrega (assets) — para la lista de Creadoras.
const lastDelivLabel = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short' });
};

// Edge function `voice` (ElevenLabs): voz fija por modelo. Mismo patrón que
// callFn de /kitchen → siempre devuelve { ok, ... } o { ok:false, error, ...flags }.
async function callVoice(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('voice', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}


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
  id_approved: { label: 'Aprobada · sin activar',   tone: 'sky' },
  authorized:  { label: 'Aprobada · sin activar',   tone: 'sky' }, // legacy
  paid:        { label: 'Activa',                   tone: 'brand' }, // legacy
  active:      { label: 'Activa',                   tone: 'brand' },
};
// Cada KPI card combina TONE (color acento del borde/texto) con la clase
// 3D correspondiente (card3d / card3d-warn / card3d-bad / card3d-ok) que
// aporta el gradiente + biseles + sombras. Están en globals.css y aplican
// a toda la plataforma.
const TONE = {
  zinc:  'border-line text-paper-mute',
  amber: 'border-amber-500/40 text-amber-300 card3d-warn',
  rose:  'border-rose-500/40 text-rose-300 card3d-bad',
  sky:   'border-brand/40 text-brand card3d-active',
  brand: 'border-brand/40 text-brand card3d-active',
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('propuestas'); // el admin abre SIEMPRE en Propuestas (deep-link ?tab= lo cambia)
  const [navOpen, setNavOpen] = useState(true); // sidebar abierto (labels) o colapsado (solo íconos)
  const [mobNav, setMobNav] = useState(false);  // móvil: menú de secciones desplegable abierto
  const [propCounts, setPropCounts] = useState({ backlog: 0 }); // backlog de propuestas (lo reporta AdminPropuestas)
  // Permite abrir /admin directo en una pestaña por URL (?tab=propuestas, etc.).
  // + la cartilla de una creadora en una pestaña suya: ?tab=registros&creator=<id>&ctab=voz ('creadoras' = alias de 'registros').
  const deepCreatorRef = useRef(null); // { id, ctab } — se abre cuando cargan los perfiles
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      let q = sp.get('tab');
      if (q === 'creadoras') q = 'registros';
      const valid = ['registros', 'metricas', 'reacciones', 'verificaciones', 'equipo', 'agencias', 'actividad', 'propuestas', 'peticiones'];
      if (q && valid.includes(q)) setTab(q);
      const c = sp.get('creator');
      if (c) deepCreatorRef.current = { id: c, ctab: sp.get('ctab') || null };
    } catch {}
  }, []);
  const [profiles, setProfiles] = useState([]);
  const [kyc, setKyc] = useState([]); // pending verifications w/ signed doc urls
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');
  const [nu, setNu] = useState({ first_name: '', last_name: '', job_title: '', email: '', password: '', role: 'supervisor' });
  const [nuCaps, setNuCaps] = useState(ROLE_CAPS.supervisor); // accesos del puesto — se auto-marcan según el rol elegido (ajustables)
  // Elegir un rol auto-marca sus accesos por defecto (auto-seccionado); el admin puede tocarlos.
  const pickRole = (role) => { setNu((v) => ({ ...v, role })); setNuCaps(ROLE_CAPS[role] || []); };
  const [createdCreds, setCreatedCreds] = useState(null); // { email, password } para mostrar tras crear
  const [selCreator, setSelCreator] = useState(null); // creator id whose profile drawer is open
  const [selCreatorTab, setSelCreatorTab] = useState(null); // pestaña con la que abre la cartilla (deep link ?ctab=)
  const [selStaff, setSelStaff] = useState(null);      // team member id whose profile drawer is open
  const [agencyLinks, setAgencyLinks] = useState([]); // agency_creators rows
  const [agencyMembers, setAgencyMembers] = useState([]); // agency_members rows (empleados de cada agencia)
  const [agencyLeads, setAgencyLeads] = useState([]);     // solicitudes desde el landing /agency
  const [assetStats, setAssetStats] = useState([]);   // una fila por foto entregada (conteo de producción)
  const [lastDelivByCreator, setLastDelivByCreator] = useState({}); // { creatorId: última entrega ISO } — semáforo de cadencia
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
  const [regSub, setRegSub] = useState('all');        // suscripción (los tiles de arriba); default 'all' (no se usa como filtro principal)
  const [regDeliv, setRegDeliv] = useState('all');    // FILTRO principal: por ENTREGABLE (cadencia) — all | daily | thrice_week | weekly | biweekly | monthly | none
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
    const [{ data: profs, error: profErr }, { data: reqs }, { count: loraCount }, { data: agLinks }, { data: agMembers }, { data: assetRows }, { data: auditRows }, { data: lastDeliv }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, job_title, email, role, onboarding_status, staff_status, created_at, capabilities, handle, avatar_url, stage_name, legal_first_name, legal_last_name, date_of_birth, country, phone, payment_status, plan, lora_status, consent_at, id_rejection_reason, id_reviewed_at, subscription_ends_at, billing_note, comp_until, is_test, delivery_cadence, manager_emails, consent_voice').order('role'),
      supabase.from('requests').select('id, status, created_at'),
      supabase.from('lora_photos').select('id', { count: 'exact', head: true }),
      supabase.from('agency_creators').select('agency_id, creator_id'),
      supabase.from('agency_members').select('agency_id, member_id, capabilities'),
      supabase.from('assets').select('creator_id'),
      supabase.from('audit_log').select('id, actor_id, action, target_id, meta, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.rpc('last_delivery_by_creator'),
    ]);
    // Si la query base de perfiles falla (RLS/red), no pintamos listas vacías
    // como si la DB estuviera vacía — el admin toma decisiones de facturación
    // desde acá. Avisamos y cortamos la carga.
    if (profErr) { flash && flash('Error cargando datos: ' + profErr.message); return; }
    setProfiles(profs || []);
    setAgencyLinks(agLinks || []);
    setAgencyMembers(agMembers || []);
    setAssetStats(assetRows || []);
    setAudit(auditRows || []);
    const ldMap = {};
    (Array.isArray(lastDeliv) ? lastDeliv : []).forEach((r) => { if (r?.creator_id) ldMap[r.creator_id] = r.last_at; });
    setLastDelivByCreator(ldMap);
    const { data: inv } = await supabase.from('staff_invites').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setInvites(inv || []);
    // Solicitudes de registro de agencia (landing /agency) — pendientes de revisar.
    const { data: leads } = await supabase.from('agency_leads').select('*').eq('status', 'new').order('created_at', { ascending: false });
    setAgencyLeads(leads || []);
    setMetrics({ requests: reqs || [], lora: loraCount || 0 });
    // Backlog de propuestas (badge de la pestaña, siempre fresco): lo que se está
    // atrasando = pendientes de aprobación + vencidas sin respuesta. Externas (no
    // internas), no borradores.
    try {
      const [{ data: propsRows }, { data: fbRows }] = await Promise.all([
        supabase.from('photo_proposals').select('id, status, approval_required, approval_status, recipient_kind, expires_at'),
        supabase.from('photo_proposal_feedback').select('proposal_id'),
      ]);
      const fbset = new Set((fbRows || []).map((f) => f.proposal_id));
      const now = Date.now();
      let backlog = 0;
      for (const p of (propsRows || [])) {
        if (p.status === 'draft' || p.recipient_kind === 'internal') continue;
        const sinAprobar = p.approval_required && (p.approval_status || 'pending') === 'pending';
        const overdue = p.expires_at && new Date(p.expires_at).getTime() < now;
        const sinResponder = !fbset.has(p.id);
        if (sinAprobar || (overdue && sinResponder)) backlog += 1;
      }
      setPropCounts({ backlog });
    } catch { /* si falla la query, dejamos el badge en 0 sin romper el panel */ }
    await loadKyc();
    setLoading(false);
  }, [loadKyc]);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      // Acceso a /admin: dueño (rol admin) o supervisor con caps de gestión
      // (agencies, team, billing) — así management (Cheryl/Grace) tiene visibilidad
      // del panel principal y puede invitar empleados a agencias.
      const canAccess = up.profile?.role === 'admin' || (
        up.profile?.role === 'supervisor'
        && Array.isArray(up.profile?.capabilities)
        && up.profile.capabilities.some((c) => ['agencies', 'team', 'billing'].includes(c))
      );
      if (!canAccess) { setMe(up.profile); return; }
      setMe(up.profile);
      load();
    })();
  }, [router, load]);

  // Deep link ?creator=<id>&ctab=voz: cuando ya cargaron los perfiles se abre SU cartilla en esa pestaña
  // (una sola vez) y se limpian esos parámetros de la URL, así recargar no la vuelve a abrir.
  useEffect(() => {
    const d = deepCreatorRef.current;
    if (!d || loading) return;
    deepCreatorRef.current = null;
    if (profiles.some((p) => p.id === d.id && p.role === 'creator')) { setSelCreatorTab(d.ctab); setSelCreator(d.id); }
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.delete('creator'); sp.delete('ctab');
      const qs = sp.toString();
      // null (no history.state): así Next sincroniza su router con la URL nueva (con __NA la trata como interna y la ignora).
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    } catch {}
  }, [loading, profiles]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  // Fija/quita la cadencia de una creadora (desde Peticiones). Fuente única de
  // verdad = profiles state, así la lista de Creadoras y la ficha quedan al día.
  async function setCadence(creatorId, cadenceId) {
    setProfiles((p) => p.map((u) => (u.id === creatorId ? { ...u, delivery_cadence: cadenceId } : u)));
    const { error } = await getSupabase().from('profiles').update({ delivery_cadence: cadenceId }).eq('id', creatorId);
    if (error) { flash('Error: ' + error.message); load(); return; }
    flash(cadenceId ? 'Cadencia actualizada' : 'Cadencia quitada');
  }

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
    if (STAFF_ROLES.includes(nu.role) && nuCaps.length === 0) { setNuError('Marca al menos un acceso.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setCreating(true);
    // Supabase Edge Function 'create-user' runs with the service role and verifies the
    // caller is admin. El puesto nace CON el rol elegido y sus accesos.
    const caps = STAFF_ROLES.includes(nu.role) ? nuCaps : [];
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
    setNuCaps(ROLE_CAPS.supervisor);
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
      : createdRole === 'agent' ? `Agente creado${invitedNote} — entra a /agente para referir modelos`
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
    if (!f.full_name?.trim() || !f.email?.trim()) { setNcErr('Completa nombre y correo.'); return; }
    if (f.password && f.password.length < 8) { setNcErr('Si pones contraseña, mínimo 8 caracteres.'); return; }
    setNcBusy(true);
    const nombre = f.full_name.trim();
    const apellido = (f.last_name || '').trim();
    const fullName = [nombre, apellido].filter(Boolean).join(' ');
    // Sin contraseña escrita → una aleatoria; a ella igual le llega la invitación
    // por correo (create-user) para poner la SUYA. El equipo no maneja su clave.
    const pw = f.password?.trim() || `LS-${Math.random().toString(36).slice(2, 10)}${Math.floor(10 + Math.random() * 89)}`;
    // @usuario AUTOMÁTICO a partir del nombre (sin acentos, único vs los existentes).
    const base = fullName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 22) || 'creadora';
    const takenHandles = new Set(profiles.map((p) => (p.handle || '').toLowerCase()));
    let handle = base, hi = 1;
    while (takenHandles.has(handle)) handle = `${base}${hi++}`;
    // 1) Crear cuenta auth + perfil base vía la edge function (role creator).
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { full_name: fullName, email: f.email.trim().toLowerCase(), password: pw, role: 'creator' },
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

    // 2) Completar el perfil: @usuario auto, nombre/apellido legal, país (ISO).
    const patch = { handle, legal_first_name: nombre };
    if (apellido)  patch.legal_last_name = apellido;
    if (f.country) patch.country = f.country; // código ISO-2 (ej. 'MX') → bandera
    // Sin suscripción (por ahora): la creadora nace ACTIVA y usable de inmediato —
    // la ve ella, su agencia y el equipo. Nada de plan/pago/vencimiento.
    patch.payment_status = 'paid';
    patch.onboarding_status = 'active';
    if (Object.keys(patch).length) {
      const { error: upErr } = await getSupabase().from('profiles').update(patch).eq('id', out.id);
      if (upErr) { setNcBusy(false); setNcErr('Cuenta creada, pero fallaron los datos extra: ' + upErr.message); await load(); return; }
    }
    setNcBusy(false);
    setNewCreator(null);
    flash(out.invited
      ? `Creadora dada de alta — le mandamos invitación a ${f.email.trim().toLowerCase()} para que ponga su contraseña`
      : 'Creadora dada de alta y ACTIVA — lista para trabajar');
    await load();
  }

  // Alta de agencia — la agencia entra a sus modelos y pide contenido.
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
    flash(approve ? 'Aprobada — lista para activar' : 'Verificación rechazada');
    return true;
  }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Non-admin staff work in /trabajo.
  const canAccessAdmin = me?.role === 'admin' || (
    me?.role === 'supervisor'
    && Array.isArray(me?.capabilities)
    && me.capabilities.some((c) => ['agencies', 'team', 'billing'].includes(c))
  );
  if (!canAccessAdmin) { router.replace('/trabajo'); return null; }

  const creators = profiles.filter((p) => p.role === 'creator');

  // Entregas pendientes AHORITA (cola de Peticiones): por cada creadora con
  // entregable, su próxima entrega. `due` = toca ya (atrasada o primera vez);
  // `overdue` = ya venció. Dos números en la pestaña: atrasadas · pendientes.
  let delivOverdue = 0, delivPending = 0;
  for (const c of creators) {
    if (!c.delivery_cadence) continue;
    const nd = nextDelivery(c.delivery_cadence, lastDelivByCreator[c.id]);
    if (nd?.due) { delivPending += 1; if (nd.overdue) delivOverdue += 1; }
  }

  // Secciones del panel — una sola fuente para el sidebar (desktop) y el
  // selector desplegable (móvil). Propuestas primero (lo más usado).
  // `badges`: pills con contador (tono bad=rojo urgente, warn=ámbar, brand=azul).
  const NAV_TABS = [
    { id: 'propuestas', label: 'Propuestas', icon: Send, badges: propCounts.backlog ? [{ n: propCounts.backlog, tone: 'bad' }] : [] },
    { id: 'kitchen', label: 'Cocinar', icon: ChefHat, badges: [], href: '/kitchen' },
    { id: 'peticiones', label: 'Peticiones', icon: Inbox, badges: [
      ...(delivOverdue ? [{ n: delivOverdue, tone: 'bad' }] : []),
      ...(delivPending ? [{ n: delivPending, tone: 'brand' }] : []),
    ] },
    { id: 'registros', label: 'Creadoras', icon: ClipboardList, badges: [] },
    { id: 'verificaciones', label: 'Verificaciones', icon: IdCard, badges: kyc.length ? [{ n: kyc.length, tone: 'brand' }] : [] },
    { id: 'equipo', label: 'Equipo interno', icon: Users, badges: [] },
    { id: 'agencias', label: 'Agencias', icon: Building2, badges: agencyLeads.length ? [{ n: agencyLeads.length, tone: 'brand' }] : [] },
    { id: 'reacciones', label: 'Reacciones', icon: Heart, badges: [] },
    { id: 'metricas', label: 'Métricas', icon: BarChart3, badges: [] },
    { id: 'actividad', label: 'Actividad', icon: Activity, badges: [] },
    // Conexión (llaves/API) = SOLO el dueño. Los demás admin no la ven.
    ...(isOwnerAccount(me) ? [{ id: 'conexion', label: 'Conexión', icon: Plug, badges: [], href: '/conexion' }] : []),
  ];
  const activeTab = NAV_TABS.find((t) => t.id === tab) || NAV_TABS[0];
  // Rojo MATE (no neón — el rose-500 sólido lastima la vista): tinte suave con
  // aro fino, el mismo rojo apagado que usan los avisos de la app. Azul se queda.
  const badgeCls = { bad: 'bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-500/40', warn: 'bg-amber-400 text-[#04222f]', brand: 'bg-brand text-on-accent' };

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <Header me={me} router={router} creators={creators} />

      <main className="mx-auto max-w-6xl px-5 py-6">
        {/* Header: título + acciones a la derecha. Sin el chip "en producción". */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-paper">Administración</h1>
          <button onClick={load} title="Actualizar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Navegación. Desktop: barra lateral vertical. Móvil: menú desplegable
            (sin scroll horizontal) — un botón dice la sección y abre la lista. */}
        <div className="mt-5 lg:flex lg:items-start lg:gap-6">
          {/* ── Móvil: selector de sección desplegable ── */}
          <div className="relative mb-4 lg:hidden">
            <button onClick={() => setMobNav((o) => !o)} aria-haspopup="menu" aria-expanded={mobNav}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors ${mobNav ? 'border-brand/50' : 'border-line'}`}>
              <span className="flex min-w-0 items-center gap-2.5 font-semibold text-paper">
                <activeTab.icon size={18} className="shrink-0 text-brand" /> <span className="truncate">{activeTab.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {activeTab.badges.map((b, i) => <span key={i} className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${badgeCls[b.tone]}`}>{b.n}</span>)}
                <ChevronDown size={18} className={`ml-0.5 text-paper-dim transition-transform ${mobNav ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {mobNav && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobNav(false)} />
                <div role="menu" className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-line bg-card p-1 shadow-glow-sm">
                  {NAV_TABS.map((tb) => (
                    <button key={tb.id} onClick={() => { tb.href ? router.push(tb.href) : setTab(tb.id); setMobNav(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                        tab === tb.id ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:bg-hair/[0.06] hover:text-paper'}`}>
                      <tb.icon size={17} className="shrink-0" />
                      <span className="flex-1">{tb.label}</span>
                      {tb.badges.length
                        ? <span className="flex items-center gap-1.5">{tb.badges.map((b, i) => <span key={i} className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${badgeCls[b.tone]}`}>{b.n}</span>)}</span>
                        : tab === tb.id ? <Check size={16} /> : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Desktop: barra lateral vertical ── */}
          <nav className={`hidden lg:flex lg:shrink-0 lg:flex-col lg:gap-1 lg:border-r lg:border-line ${navOpen ? 'lg:w-56 lg:pr-3' : 'lg:w-[3.75rem] lg:pr-0'}`}>
            <button onClick={() => setNavOpen((o) => !o)} title={navOpen ? 'Colapsar menú' : 'Expandir menú'}
              className={`mb-1 flex h-9 items-center rounded-lg px-3 text-paper-mute transition-colors hover:bg-hair/[0.05] hover:text-paper ${navOpen ? 'justify-end' : 'justify-center'}`}>
              {navOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
            </button>
            {NAV_TABS.map((tb) => (
              <button key={tb.id} title={tb.label}
                onClick={() => (tb.href ? router.push(tb.href) : setTab(tb.id))}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${!navOpen ? 'justify-center px-2' : ''} ${
                  tab === tb.id ? 'bg-brand/15 text-brand' : 'text-paper-mute hover:bg-hair/[0.05] hover:text-paper'}`}>
                <span className="relative shrink-0">
                  <tb.icon size={16} />
                  {tb.badges.length && !navOpen ? <span className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ${tb.badges[0].tone === 'bad' ? 'bg-rose-400' : tb.badges[0].tone === 'warn' ? 'bg-amber-400' : 'bg-brand'}`} /> : null}
                </span>
                <span className={navOpen ? '' : 'hidden'}>{tb.label}</span>
                {tb.badges.length && navOpen ? <span className="ml-auto flex items-center gap-1">{tb.badges.map((b, i) => <span key={i} className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${badgeCls[b.tone]}`}>{b.n}</span>)}</span> : null}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
        {loading ? (
          <p className="mt-8 text-paper-dim">Cargando datos…</p>
        ) : tab === 'registros' ? (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-paper-mute">Todas las creadoras registradas — clic en una para ver su perfil.</p>
              <button onClick={() => { setNewCreator({ full_name: '', last_name: '', email: '', password: '', country: '' }); setNcErr(''); }}
                className="btn3d inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
                <UserPlus size={14} /> Alta de creadora
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
              const delivOk = (p) => regDeliv === 'all' ? true : regDeliv === 'none' ? !p.delivery_cadence : p.delivery_cadence === regDeliv;
              const shown = cr.filter((p) => inCat(p, regFilter))
                .filter(subOk)
                .filter(delivOk)
                .filter((p) => !q || `${p.full_name || ''} ${p.handle || ''} ${p.email || ''} ${p.stage_name || ''}`.toLowerCase().includes(q))
                .sort(sorters[regSort] || sorters.recent);
              return (
                <>
                  {/* MetricStrip — 1 sola fila densa, tipo Linear/Vercel: KPIs
                      + alerts de vencimiento en el mismo bloque, divisores
                      verticales, click filtra la lista. Cero cards separadas. */}
                  {/* gap-px + bg-line = divisores hairline en 2D: se ven bien en
                      una sola fila (desktop) y también cuando envuelven a 2 columnas
                      (móvil). Sin bordes por-índice que quedan colgando al envolver. */}
                  <div className="card3d flex flex-wrap items-stretch gap-px overflow-hidden rounded-2xl border border-line bg-line">
                    {stats.map((s, i) => {
                      const active = regFilter === s.key;
                      const dotTone = s.tone === 'brand' ? 'brand' : s.tone === 'amber' ? 'warn' : s.tone === 'rose' ? 'bad' : s.tone === 'sky' ? 'brand' : 'zinc';
                      return (
                        <button key={s.key} onClick={() => { setRegFilter(s.key); setRegSub('all'); setRegQuery(''); }}
                          className={`group relative min-w-[136px] flex-1 px-4 py-4 text-left transition-colors sm:px-5 ${active ? 'bg-brand/[0.06]' : 'bg-card hover:bg-hair/[0.04]'}`}>
                          <div className={`font-display text-[28px] font-bold leading-none tabular-nums ${active ? 'text-brand' : 'text-paper'}`}>{s.value}</div>
                          <div className="mt-2"><StatusDot tone={dotTone} pulse={active}>{s.label}</StatusDot></div>
                          {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand shadow-[0_0_10px_rgba(0,177,246,0.7)]" />}
                        </button>
                      );
                    })}
                    {/* Alerts embedded en la strip como items extras si hay */}
                    {overdueList.length > 0 && (
                      <button onClick={() => { setRegSub('overdue'); setRegFilter('all'); }}
                        className={`group relative min-w-[136px] flex-1 px-4 py-4 text-left transition-colors sm:px-5 ${regSub === 'overdue' ? 'bg-rose-500/[0.05]' : 'bg-card hover:bg-hair/[0.04]'}`}>
                        <div className="flex items-baseline gap-2">
                          <div className={`font-display text-[28px] font-bold leading-none tabular-nums ${regSub === 'overdue' ? 'text-rose-300' : 'text-paper'}`}>{overdueList.length}</div>
                          <AlertTriangle size={12} className="text-rose-300" />
                        </div>
                        <div className="mt-2"><StatusDot tone="bad" pulse={regSub === 'overdue'}>Vencidas</StatusDot></div>
                        {regSub === 'overdue' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />}
                      </button>
                    )}
                    {dueSoonList.length > 0 && (
                      <button onClick={() => { setRegSub('due_soon'); setRegFilter('all'); }}
                        className={`group relative min-w-[136px] flex-1 px-4 py-4 text-left transition-colors sm:px-5 ${regSub === 'due_soon' ? 'bg-amber-500/[0.05]' : 'bg-card hover:bg-hair/[0.04]'}`}>
                        <div className="flex items-baseline gap-2">
                          <div className={`font-display text-[28px] font-bold leading-none tabular-nums ${regSub === 'due_soon' ? 'text-amber-300' : 'text-paper'}`}>{dueSoonList.length}</div>
                          <Clock size={12} className="text-amber-300" />
                        </div>
                        <div className="mt-2"><StatusDot tone="warn" pulse={regSub === 'due_soon'}>Vencen pronto</StatusDot></div>
                        {regSub === 'due_soon' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]" />}
                      </button>
                    )}
                  </div>

                  {(
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                          <input value={regQuery} onChange={(e) => setRegQuery(e.target.value)} placeholder="Buscar por nombre, @ o correo…"
                            className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                        </div>
                        <span className="text-xs text-paper-dim">{shown.length} de {cr.length} · usa «Limpiar filtro» para ver todas</span>
                      </div>

                      {/* Alerts VENCIDAS/VENCEN PRONTO fusionados en la MetricStrip de arriba (adiós banners duplicados) */}
                      {false && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {overdueList.length > 0 && (
                            <span></span>
                          )}
                          {dueSoonList.length > 0 && (
                            <span></span>
                          )}
                        </div>
                      )}

                      {/* Filtrar + Ordenar — dropdowns compactos, no botones abiertos. */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Dropdown icon={SlidersHorizontal} label="Entregable" value={regDeliv} onChange={(v) => { setRegDeliv(v); setRegSub('all'); setRegFilter('all'); }}
                          options={[
                            { value: 'all', label: 'Todos los entregables' },
                            ...CADENCIAS.map((c) => ({ value: c.id, label: c.label })),
                            { value: 'none', label: 'Sin entregable' },
                          ]} />
                        <Dropdown icon={ArrowUpDown} label="Ordenar" value={regSort} onChange={setRegSort}
                          options={[
                            { value: 'recent', label: 'Más recientes' },
                            { value: 'oldest', label: 'Más antiguas' },
                            { value: 'photos', label: 'Más fotos' },
                          ]} />
                        {(regDeliv !== 'all' || regSub !== 'all') && (
                          <button onClick={() => { setRegDeliv('all'); setRegSub('all'); }} className="text-xs font-medium text-paper-dim hover:text-paper">Limpiar filtro</button>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-paper-dim">Haz clic en cualquier creadora para abrir su perfil: ves todo lo que tiene y le falta, y revisas su identidad.</p>
                      <div className="mt-2 overflow-hidden rounded-2xl border border-line">
                        <div className="hidden grid-cols-[1.6fr_0.9fr_0.9fr_auto] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim sm:grid">
                          <span>Creadora</span><span>Entregable</span><span>Última entrega</span><span></span>
                        </div>
                        {cr.length === 0 && <p className="px-5 py-6 text-paper-dim">Nadie se ha registrado todavía.</p>}
                        {cr.length > 0 && shown.length === 0 && <p className="px-5 py-6 text-paper-dim">Ninguna creadora coincide con el filtro.</p>}
                        {shown.map((u) => {
                          const st = OB[u.onboarding_status] || OB.registered;
                          // Estado del recorrido, en palabras claras (de un vistazo).
                          const flow = ({
                            registered:  { txt: 'Invitada',           cls: 'text-paper-dim' },
                            info:        { txt: 'Llenando datos',      cls: 'text-sky-300' },
                            id_rejected: { txt: 'ID rechazado',        cls: 'text-rose-300' },
                            id_pending:  { txt: 'Verificando ID',      cls: 'text-amber-300' },
                            id_approved: { txt: 'Lista para activar',  cls: 'text-sky-300' },
                            authorized:  { txt: 'Lista para activar',  cls: 'text-sky-300' },
                            active:      { txt: 'Activa',              cls: 'text-emerald-300' },
                            paid:        { txt: 'Activa',              cls: 'text-emerald-300' },
                          })[u.onboarding_status] || { txt: 'Invitada', cls: 'text-paper-dim' };
                          const nFotos = photoCount[u.id] || 0;
                          const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' }) : '—';
                          const planLabel = u.plan ? u.plan.charAt(0).toUpperCase() + u.plan.slice(1) : null;
                          const joinedFull = u.created_at ? new Date(u.created_at).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
                          return (
                            <div key={u.id} role="button" tabIndex={0} onClick={() => setSelCreator(u.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setSelCreator(u.id); }}
                              className="flex w-full cursor-pointer flex-col gap-2.5 border-b border-line px-4 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-hair/[0.04] sm:grid sm:grid-cols-[1.6fr_0.9fr_0.9fr_auto] sm:items-center sm:gap-3 sm:px-5 sm:py-3">
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-paper">{u.full_name || 'Sin nombre aún'}</span>
                                  {(() => {
                                    // Correo SIEMPRE visible (el principal de la modelo). Si no hay
                                    // correo real (vacío o placeholder interno) → badge ROJO bien visible.
                                    const noEmail = !u.email || /@equipo\.letshoot\.ai$/i.test(u.email);
                                    return (
                                      <span className="block truncate text-[11px] text-paper-dim">
                                        {u.handle ? `@${u.handle} · ` : ''}
                                        {noEmail
                                          ? <span className="inline-flex items-center gap-1 align-middle rounded-full border border-rose-500/60 bg-rose-500/15 px-1.5 py-px font-bold uppercase tracking-wide text-rose-300"><AlertTriangle size={10} /> Sin correo</span>
                                          : u.email}
                                      </span>
                                    );
                                  })()}
                                  <span className={`mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-medium ${flow.cls}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> {flow.txt}
                                  </span>
                                </span>
                              </span>
                              {/* ENTREGABLE: tag de cadencia (cada cuánto recibe) — para saber quién es quién de un vistazo */}
                              <span className="flex items-center gap-2">
                                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Entregable</span>
                                {u.delivery_cadence
                                  ? <span className="inline-flex items-center rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">{cadenceLabel(u.delivery_cadence)}</span>
                                  : <span className="text-[11px] text-paper-dim">— sin definir</span>}
                              </span>
                              {/* ÚLTIMA ENTREGA: cuándo se le entregó por última vez (assets) */}
                              <span className="flex items-center gap-2 text-xs text-paper-mute">
                                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-paper-dim sm:hidden">Última entrega</span>
                                {lastDelivByCreator[u.id]
                                  ? lastDelivLabel(lastDelivByCreator[u.id])
                                  : <span className="text-paper-dim">sin entregas</span>}
                                {u.is_test && <span className="ml-2 text-[11px] text-amber-300/80">prueba</span>}
                              </span>
                              {/* Acciones: «Ver como ella» siempre visible (abre su panel en otra pestaña) + menú ⋯ */}
                              <span className="flex items-center justify-start gap-1.5 sm:justify-end">
                                <button onClick={(e) => { e.stopPropagation(); window.open(`/panel?as=${u.id}`, '_blank', 'noopener'); }}
                                  title="Ver el panel como ella lo ve (solo lectura, otra pestaña)"
                                  className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-paper-mute transition-colors hover:border-brand/50 hover:text-brand">
                                  <Eye size={12} /> <span>Ver como ella</span>
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
                { l: 'Activas', f: () => cr.filter((p) => ['active', 'paid'].includes(p.onboarding_status)).length },
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
                    <div className="flex items-end gap-2">
                      {weeks.map((w, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <span className="font-mono text-[11px] text-paper-mute">{w.v}</span>
                          {/* track de altura fija: el % de la barra necesita un padre con altura definida */}
                          <div className="flex h-28 w-full items-end">
                            <div className="w-full rounded-t-lg bg-brand/70" style={{ height: `${Math.max(4, (w.v / wmax) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-paper-dim">{w.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-2">
                    {[
                      { l: 'Pedidos pendientes', v: reqPending, tone: 'warn' },
                      { l: 'Pedidos entregados', v: reqDelivered, tone: 'brand' },
                      { l: 'Fotos LoRA subidas', v: metrics.lora, tone: 'brand' },
                    ].map((x) => (
                      <div key={x.l} className="card3d rounded-2xl border border-line bg-card p-5">
                        <div className="font-display text-4xl font-bold tabular-nums text-paper">{x.v}</div>
                        <div className="mt-2"><StatusDot tone={x.tone}>{x.l}</StatusDot></div>
                      </div>
                    ))}
                  </div>
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
                className="flex w-full flex-col items-stretch gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 text-left transition-colors hover:border-amber-500/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 gap-1.5">
                    {['id_front', 'id_back', 'selfie_id'].map((k) => (
                      u.docs[k]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img key={k} src={u.docs[k]} alt="" className="h-12 w-10 rounded-md object-cover ring-1 ring-line" />
                        : <span key={k} className="grid h-12 w-10 place-items-center rounded-md border border-dashed border-line text-[9px] text-paper-dim">falta</span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display font-semibold text-paper">{u.legal_first_name} {u.legal_last_name}
                      {u.stage_name && <span className="ml-2 text-xs font-normal text-paper-dim">· "{u.stage_name}"</span>}</div>
                    <div className="mt-0.5 truncate text-xs text-paper-dim">{u.email} · {u.country || '—'}</div>
                  </div>
                </div>
                <span className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm sm:w-auto">
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
                {/* Selector de ROL real: PR / Editor / Manager / Finanzas / Agente. Al
                    elegir uno se auto-marcan sus accesos. Agencias y creadoras se crean
                    del otro lado (Registros / Agencias). */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {ROLE_PICKER.map((r) => {
                    const on = nu.role === r.v;
                    return (
                      <button type="button" key={r.v} onClick={() => pickRole(r.v)}
                        className={`rounded-xl border p-3 text-left transition-colors ${on ? 'border-brand/60 bg-brand/[0.08]' : 'border-line bg-ink-2 hover:border-hair'}`}>
                        <div className={`text-sm font-semibold ${on ? 'text-brand' : 'text-paper'}`}>{r.l}</div>
                        <div className="mt-0.5 text-[11px] text-paper-dim">{r.s}</div>
                      </button>
                    );
                  })}
                </div>
                {STAFF_ROLES.includes(nu.role) && (
                  <input value={nu.job_title} onChange={(e) => setNu((v) => ({ ...v, job_title: e.target.value }))} placeholder="Puesto / cargo (opcional, ej. Coordinación)"
                    className="mt-3 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                )}
                {/* Sin campo de contraseña: la persona la pone ella misma por invitación (correo). */}
                <input type="email" value={nu.email} onChange={(e) => setNu((v) => ({ ...v, email: e.target.value }))} placeholder="Correo (opcional)"
                  className="mt-3 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <p className="mt-2 text-[11px] text-paper-dim">Con correo, le llega una <span className="text-paper-mute">invitación para poner su propia contraseña</span> — tú no la manejas. Sin correo, le generamos un login de empresa con una clave temporal para compartir.</p>

                {/* Las funciones de la plataforma, por SECCIÓN → función. Vienen auto-marcadas
                    según el rol elegido; el admin puede ajustarlas. */}
                {STAFF_ROLES.includes(nu.role) && (
                  <div className="mt-4 space-y-4">
                    <p className="text-[11px] text-paper-dim">Accesos del rol <span className="text-paper-mute">{ROLE_PICKER.find((r) => r.v === nu.role)?.l}</span> — ya vienen marcados. Ajustá si querés.</p>
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
                  {STAFF_ROLES.includes(nu.role)
                    ? `Crear ${ROLE_PICKER.find((r) => r.v === nu.role)?.l || 'puesto'} con ${nuCaps.length} acceso${nuCaps.length === 1 ? '' : 's'}`
                    : nu.role === 'agent'
                    ? 'Crear cuenta de agente'
                    : 'Crear cuenta'}
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
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-paper-mute">Agencias y las modelos que gestionan.</p>
              <button onClick={() => { setNewAgency({ full_name: '', email: '', password: '' }); setNaErr(''); }}
                className="btn3d inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold">
                <Building2 size={14} /> Crear agencia
              </button>
            </div>
            <AgenciasTab agencies={profiles.filter((p) => p.role === 'agency')} creators={creators} agencyLinks={agencyLinks} agencyMembers={agencyMembers} profiles={profiles} agencyLeads={agencyLeads} onAssign={setAgConfirm} onDeleted={load} reload={load} flash={flash} />
          </div>
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
        ) : tab === 'propuestas' ? (
          <div className="mt-6">
            <AdminPropuestas />
          </div>
        ) : tab === 'peticiones' ? (
          <AdminPeticiones creators={creators} me={me} flash={flash}
            lastDeliv={lastDelivByCreator} onSetCadence={setCadence}
            canSetCadence={me?.role === 'admin' || isOwnerAccount(me)} />
        ) : null}
          </div>
        </div>
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
                {agConfirm.creatorName} pasará a ser gestionada por <strong className="text-paper">{agConfirm.toAgencyName}</strong>, que verá su contenido y hará sus pedidos.
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
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-paper"><UserPlus size={18} className="text-brand" /> Alta de creadora</h3>
                <p className="mt-1 text-sm text-paper-mute">Deja la cuenta lista con lo que ya sepas: acceso, contacto e identidad. Solo el acceso es obligatorio; entra activa al crearla.</p>
              </div>
              <button type="button" onClick={() => setNewCreator(null)} className="rounded-full p-1 text-paper-dim hover:text-paper"><X size={18} /></button>
            </div>

            {/* Acceso — nombre, apellido, correo y contraseña. Nada más. */}
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Acceso a la plataforma</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Nombre <span className="text-rose-300">*</span></label>
                  <input autoFocus value={newCreator.full_name} onChange={(e) => setNewCreator((v) => ({ ...v, full_name: e.target.value }))}
                    placeholder="Ej. Valentina" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Apellido</label>
                  <input value={newCreator.last_name || ''} onChange={(e) => setNewCreator((v) => ({ ...v, last_name: e.target.value }))}
                    placeholder="Ej. Ríos" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Correo <span className="text-rose-300">*</span></label>
                  <input type="email" value={newCreator.email} onChange={(e) => setNewCreator((v) => ({ ...v, email: e.target.value }))}
                    placeholder="correo@ejemplo.com" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  {/* Aviso «ya existe»: si el correo ya tiene cuenta, no se duplica. */}
                  {(() => {
                    const q = (newCreator.email || '').trim().toLowerCase();
                    if (q.length < 4 || !q.includes('@')) return null;
                    const dup = profiles.find((p) => (p.email || '').toLowerCase() === q);
                    return dup
                      ? <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-300"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Ya existe una cuenta con este correo{dup.full_name ? ` — ${dup.full_name}` : ''} ({dup.role === 'creator' ? 'creadora' : dup.role}). No se duplica.</p>
                      : null;
                  })()}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-paper-dim">Contraseña <span className="font-normal text-paper-dim/70">(opcional)</span></label>
                  <input value={newCreator.password} onChange={(e) => setNewCreator((v) => ({ ...v, password: e.target.value }))}
                    placeholder="Déjalo vacío — ella la pone" className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
              </div>
              <p className="text-[11px] text-paper-dim">Con solo el correo le llega una <b className="text-paper-mute">invitación</b> para que ponga su propia contraseña. No manejas su clave. (Si escribes una, nace con esa temporal.)</p>
            </div>

            {/* País — selector con banderita (opcional). Su @usuario se genera solo. */}
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-paper-dim">País <span className="font-normal text-paper-dim/70">(opcional)</span></label>
                <div className="relative">
                  <select value={newCreator.country || ''} onChange={(e) => setNewCreator((v) => ({ ...v, country: e.target.value }))}
                    className={`w-full appearance-none rounded-xl border border-line bg-ink-2 py-2.5 pl-3 pr-9 text-sm outline-none focus:border-brand/60 ${newCreator.country ? 'text-paper' : 'text-paper-dim'}`}>
                    <option value="" className="bg-ink text-paper-dim">Elegí el país…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-ink text-paper">{flagEmoji(c.code)}  {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                </div>
              </div>
              <p className="text-[11px] text-paper-dim">Su usuario <b className="text-paper-mute">@</b> se crea solo con su nombre. Fecha de nacimiento y foto del ID los completa ella al entrar.</p>
            </div>

            {/* Sin suscripción (por ahora): la creadora nace ACTIVA y lista para
                usarse — nada de planes/pagos/vencimiento. Entra fácil y rápido. */}
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
              <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span className="min-w-0 text-sm text-paper">
                Entra activa y lista de una
                <span className="mt-0.5 block text-[11px] text-paper-dim">Al crearla queda lista para usarse: la ve ella, su agencia y el equipo. Sin planes ni pagos.</span>
              </span>
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
                {ncBusy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={15} />} Alta de creadora
              </button>
            </div>
          </form>
        </div>
      )}

      {selCreator && (
        <CreatorProfile
          creator={profiles.find((p) => p.id === selCreator)}
          initialTab={selCreatorTab}
          onClose={() => { setSelCreator(null); setSelCreatorTab(null); }}
          onReview={reviewKyc}
          savingId={savingId}
          flash={flash}
          onSaved={load}
          onDeleted={() => { setSelCreator(null); setSelCreatorTab(null); load(); }}
          canSetCadence={me?.role === 'admin' || isOwnerAccount(me)}
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
  id_approved: { label: 'Aprobada · sin activar',   tone: 'sky' },
  authorized:  { label: 'Aprobada · sin activar',   tone: 'sky' },
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
// (nombre · # modelos). Se abre para gestionar sus modelos.
function AgenciasTab({ agencies, creators, agencyLinks, agencyMembers, profiles, agencyLeads = [], onAssign, onDeleted, reload, flash }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');   // all | with | without
  const [sort, setSort] = useState('name');       // name | models

  // Métricas por agencia para filtrar/ordenar.
  const meta = (a) => {
    const models = agencyLinks.filter((l) => l.agency_id === a.id).length;
    return { models };
  };
  const selCount = { all: agencies.length };

  let list = agencies.filter((a) => !q.trim() || ((a.full_name || '') + (a.email || '')).toLowerCase().includes(q.toLowerCase()));
  list = list.filter((a) => {
    const m = meta(a);
    if (filter === 'with') return m.models > 0;
    if (filter === 'without') return m.models === 0;
    return true;
  });
  list = [...list].sort((a, b) => {
    const ma = meta(a), mb = meta(b);
    if (sort === 'models') return mb.models - ma.models;
    return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
  });

  const selCls = 'appearance-none rounded-full border border-line bg-card py-1.5 pl-3 pr-8 text-xs font-semibold text-paper-mute outline-none transition-colors focus:border-brand/60';

  return (
    <div className="mt-6 space-y-3">
      <p className="max-w-3xl text-sm text-paper-mute">
        Cada agencia entra a <em>sus</em> modelos y hace pedidos de contenido. Abre una para gestionar qué modelos maneja. Para crear una agencia usa <span className="text-paper-mute">«Crear agencia»</span> en <span className="text-paper-mute">Registros</span>.
      </p>

      {/* Solicitudes de agencia — vienen del formulario público en /agency.
          Cada una queda en agency_leads status='new'. Aquí se aprueban (crea
          la cuenta de agencia y le manda invitación) o se archivan. */}
      {agencyLeads.length > 0 && (
        <div className="rounded-2xl border border-brand/40 bg-brand/[0.06] p-4 shadow-glow-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/15 text-brand"><Building2 size={15} /></span>
            <div>
              <p className="text-sm font-semibold text-paper">Solicitudes nuevas · {agencyLeads.length}</p>
              <p className="text-[11px] text-paper-dim">Agencias que aplicaron desde <span className="text-paper-mute">/agency</span> — aprueba para crear su cuenta y enviarle la invitación.</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {agencyLeads.map((l) => (
              <AgencyLeadRow key={l.id} lead={l} onDone={reload} flash={flash} />
            ))}
          </div>
        </div>
      )}

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
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
        </div>
        <span className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-paper-dim"><ArrowUpDown size={13} /> Ordenar:</span>
        <div className="relative">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selCls}>
            <option value="name">Nombre (A–Z)</option>
            <option value="models">Más modelos</option>
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
        <AgencyAdminCard key={ag.id} ag={ag} creators={creators} agencyLinks={agencyLinks} agencyMembers={agencyMembers} profiles={profiles} onAssign={onAssign} onDeleted={onDeleted} reload={reload} flash={flash} />
      ))}
    </div>
  );
}

function AgencyAdminCard({ ag, creators, agencyLinks, agencyMembers, profiles, onAssign, onDeleted, reload, flash }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const linkedIds = agencyLinks.filter((l) => l.agency_id === ag.id).map((l) => l.creator_id);
  const linked = creators.filter((c) => linkedIds.includes(c.id));
  // Empleados de esta agencia (usuarios rol 'agency' vinculados por agency_members).
  const memberRows = (agencyMembers || []).filter((m) => m.agency_id === ag.id);
  const memberProfiles = memberRows.map((m) => ({ ...(profiles.find((p) => p.id === m.member_id) || {}), _caps: m.capabilities || [] })).filter((p) => p.id);
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

          {/* Empleados de la agencia — el admin puede invitar y quitar en nombre de la agencia */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Empleados · {memberProfiles.length}</p>
              <button onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/20">
                <UserPlus size={13} /> Invitar empleado
              </button>
            </div>
            {memberProfiles.length === 0 ? (
              <p className="text-xs text-paper-dim">La agencia no tiene empleados todavía. Invita a alguien para que le llegue su correo.</p>
            ) : (
              <div className="space-y-1.5">
                {memberProfiles.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-paper">{m.full_name || m.email || 'Empleado'}</p>
                      <p className="truncate text-[11px] text-paper-dim">{m.email} {m._caps.length > 0 && <span className="ml-1 text-brand/80">· {m._caps.join(', ')}</span>}</p>
                    </div>
                    <button onClick={async () => {
                      if (!window.confirm(`¿Quitar a ${m.full_name || m.email} de ${ag.full_name || 'esta agencia'}? Pierde el acceso.`)) return;
                      const { error } = await getSupabase().from('agency_members').delete().eq('member_id', m.id);
                      if (error) { flash && flash('Error: ' + error.message); return; }
                      flash && flash('Empleado quitado');
                      reload && reload();
                    }}
                      className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-paper-mute transition-colors hover:border-rose-500/50 hover:text-rose-300">
                      <X size={11} /> Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <ResetPasswordBox userId={ag.id} email={ag.email} />
            <DeleteAccountButton userId={ag.id} label="agencia" onDeleted={onDeleted} />
          </div>

          {inviteOpen && (
            <InviteAgencyMemberModal ag={ag} agencyModels={linked} onClose={() => setInviteOpen(false)}
              onDone={(msg) => { setInviteOpen(false); flash && flash(msg); reload && reload(); }} />
          )}
        </div>
      )}
    </div>
  );
}

// Modal para que el admin invite un empleado a una agencia específica. Llama a la
// edge function `create-user` con `agency_member: true` y `agency_id` = la agencia
// destino. Si el correo es real le llega la invitación branded para poner su clave;
// si se deja vacío, se genera un login interno @equipo.letshoot.ai + contraseña
// temporal que se muestra al final para copiar y pegar.
const AGENCY_CAPS = [
  { key: 'content', label: 'Ver contenido' },
  { key: 'requests', label: 'Hacer pedidos' },
  { key: 'metrics', label: 'Ver métricas' },
];
function InviteAgencyMemberModal({ ag, agencyModels, onClose, onDone }) {
  const [f, setF] = useState({ full_name: '', email: '', caps: ['content', 'requests'], creators: agencyModels.map((c) => c.id) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState(null);
  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const crName = (c) => c.stage_name || c.full_name || c.email || 'Modelo';

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!f.caps.length) { setErr('Elige al menos una función.'); return; }
    if (!f.creators.length) { setErr('Asigna al menos una modelo.'); return; }
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    setBusy(true);
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: {
        role: 'agency', agency_member: true, agency_id: ag.id,
        email: f.email.trim(), password: pw, full_name: f.full_name.trim(),
        member_caps: f.caps, member_creator_ids: f.creators,
      },
    });
    setBusy(false);
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setErr(out?.error || 'No se pudo invitar al empleado.'); return; }
    // Si no había correo real, la function generó uno interno + tenemos la contraseña.
    if (out.generated_email) { setCreds({ email: out.login_email, password: pw }); return; }
    onDone(out.invited ? `Invitación enviada a ${f.email.trim()}` : 'Empleado creado');
  }

  const inputCls = 'w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60';

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/85 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
        {creds ? (
          <div>
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15 text-brand"><Check size={18} /></span>
              <div>
                <h3 className="font-display text-lg font-semibold text-paper">Empleado creado</h3>
                <p className="mt-0.5 text-sm text-paper-mute">Sin correo — comparte manualmente estos accesos con {f.full_name || 'la persona'}.</p>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-line bg-ink-2 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Correo (login)</p>
                <p className="mt-0.5 select-all font-mono text-sm text-paper">{creds.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Contraseña temporal</p>
                <p className="mt-0.5 select-all font-mono text-sm text-paper">{creds.password}</p>
              </div>
            </div>
            <button type="button" onClick={() => onDone('Empleado creado')}
              className="mt-5 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-brand/90">
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><UserPlus size={18} /></span>
              <div>
                <h3 className="font-display text-lg font-semibold text-paper">Invitar empleado</h3>
                <p className="mt-0.5 text-sm text-paper-mute">A <strong className="text-paper">{ag.full_name || 'esta agencia'}</strong>. Le llega su correo con un enlace para crear su contraseña.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-paper-dim">Nombre</label>
                <input value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} placeholder="Nombre del empleado" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-paper-dim">Correo <span className="text-paper-dim/70">(opcional)</span></label>
                <input type="email" value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} placeholder="persona@dominio.com" className={inputCls} />
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-paper-dim">Si dejas el correo vacío, generamos un login interno y te mostramos la contraseña para copiar.</p>

            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-medium text-paper-dim">Funciones</p>
              <div className="flex flex-wrap gap-2">
                {AGENCY_CAPS.map((c) => {
                  const on = f.caps.includes(c.key);
                  return (
                    <button type="button" key={c.key} onClick={() => toggle('caps', c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line text-paper-mute hover:border-brand/40'}`}>
                      {on && <Check size={12} />} {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-paper-dim">Modelos que puede gestionar · {f.creators.length}/{agencyModels.length}</p>
                {agencyModels.length > 0 && (
                  <button type="button" onClick={() => setF((s) => ({ ...s, creators: s.creators.length === agencyModels.length ? [] : agencyModels.map((c) => c.id) }))}
                    className="text-[11px] font-semibold text-brand hover:underline">
                    {f.creators.length === agencyModels.length ? 'Ninguna' : 'Todas'}
                  </button>
                )}
              </div>
              {agencyModels.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-paper-dim">Esta agencia no tiene modelos asignadas todavía. Asígnale modelos arriba para poder darle acceso al empleado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {agencyModels.map((c) => {
                    const on = f.creators.includes(c.id);
                    return (
                      <button type="button" key={c.id} onClick={() => toggle('creators', c.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${on ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line text-paper-mute hover:border-brand/40'}`}>
                        {on && <Check size={11} />} {crName(c)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {err && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:text-paper disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={busy || !f.caps.length || !f.creators.length}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-colors hover:bg-brand/90 disabled:opacity-50">
                {busy ? <><Loader2 size={14} className="animate-spin" /> Invitando…</> : <><UserPlus size={14} /> Invitar</>}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

// Fila para una solicitud de agencia (agency_leads). Muestra los datos que
// mandó, un botón «Aprobar» que crea la cuenta de agencia via create-user
// (con correo real, invitación automática), y un botón «Archivar» que
// simplemente marca la solicitud como revisada.
function AgencyLeadRow({ lead, onDone, flash }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  async function approve() {
    setBusy('approve'); setErr('');
    const pw = `LS-${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
    const { data, error } = await getSupabase().functions.invoke('create-user', {
      body: { role: 'agency', email: lead.contact_email, password: pw, full_name: lead.agency_name },
    });
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    if (!out?.ok) { setBusy(''); setErr(out?.error || 'No se pudo crear la agencia.'); return; }
    // La cuenta ya se creó. Si marcar la solicitud como aprobada falla, NO
    // mostramos éxito: el lead reaparecería en la cola y un segundo "Aprobar"
    // fallaría con "ya existe una cuenta". Avisamos y salimos.
    const { error: upErr } = await getSupabase().from('agency_leads').update({ status: 'approved' }).eq('id', lead.id);
    if (upErr) {
      setBusy('');
      setErr(`Cuenta creada, pero no se pudo marcar la solicitud como aprobada: ${upErr.message}`);
      onDone && onDone();
      return;
    }
    setBusy('');
    flash && flash(`Agencia ${lead.agency_name} creada — le llegó la invitación.`);
    onDone && onDone();
  }
  async function archive() {
    setBusy('archive'); setErr('');
    const { error } = await getSupabase().from('agency_leads').update({ status: 'archived' }).eq('id', lead.id);
    setBusy('');
    if (error) { setErr(error.message); return; }
    onDone && onDone();
  }
  const when = new Date(lead.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="rounded-xl border border-line bg-ink-2 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-paper">{lead.agency_name}</p>
          <p className="mt-0.5 truncate text-[11px] text-paper-dim">
            {lead.contact_email}
            {lead.creators_count ? <span className="ml-1.5 text-paper-mute">· {lead.creators_count} creadoras</span> : null}
            {lead.website ? <span className="ml-1.5 text-paper-mute">· {lead.website}</span> : null}
          </p>
          {lead.notes && <p className="mt-1.5 text-xs text-paper-mute">{lead.notes}</p>}
          <p className="mt-1 text-[10px] text-paper-dim">Recibida {when}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={approve} disabled={!!busy}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
            {busy === 'approve' ? <><Loader2 size={12} className="animate-spin" /> Creando…</> : <><Check size={12} /> Aprobar</>}
          </button>
          <button onClick={archive} disabled={!!busy}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:text-paper disabled:opacity-60">
            {busy === 'archive' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Archivar
          </button>
        </div>
      </div>
      {err && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">{err}</p>}
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
      <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><KeyRound size={15} className="text-brand" /> Acceso y contraseña</h4>
      <p className="mb-3 text-[11px] text-paper-dim">
        {canEmail
          ? 'Mandale un correo para que entre y ponga su propia clave (no manejás su clave), o ponele una vos directo y compartísela.'
          : 'Esta cuenta no tiene un correo real, así que ponle una contraseña vos y compartísela.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {canEmail && (
          // Cuenta con correo real: le llega el correo para entrar y poner su clave.
          <button onClick={sendResetEmail} disabled={emailBusy}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
            {emailBusy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Enviar correo para que ponga su clave
          </button>
        )}
        {!open && (
          // Poner una contraseña a mano — disponible SIEMPRE (con o sin correo).
          <button onClick={() => { setOpen(true); setMsg(''); setOkMsg(''); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <KeyRound size={13} /> {canEmail ? 'O ponerle una yo' : 'Poner contraseña'}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña (mín. 8)"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-paper-dim">Queda activa al instante — se la das vos.</span>
            <div className="flex gap-2">
              <button onClick={() => { setOpen(false); setPw(''); setMsg(''); }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
              <button onClick={reset} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-60">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar contraseña
              </button>
            </div>
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

const CREATOR_TABS = ['entregable', 'datos', 'identidad', 'suscripcion', 'clon', 'voz', 'propuesta'];
function CreatorProfile({ creator, initialTab = null, onClose, onReview, savingId, flash, onSaved, onDeleted, canSetCadence = false }) {
  const [docs, setDocs] = useState(null); // { id_front, id_back, selfie_id }
  const [kycZoom, setKycZoom] = useState(null); // { url, label } — foto de ID ampliada (visor con cerrar)
  useEffect(() => {
    if (!kycZoom) return;
    const onKey = (e) => { if (e.key === 'Escape') setKycZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kycZoom]);
  const [loraCount, setLoraCount] = useState(null);
  const [lastDelivery, setLastDelivery] = useState(undefined); // ISO | null | undefined(cargando)
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);       // editar datos personales
  const [form, setForm] = useState(null);              // borrador de datos al editar
  const [tab, setTab] = useState(() => (CREATOR_TABS.includes(initialTab) ? initialTab : 'datos')); // entregable | datos | identidad | suscripcion | clon | voz | propuesta
  const [hasVoice, setHasVoice] = useState(null);      // la pestaña Voz avisa si la modelo ya tiene voz (dot de la pestaña)
  const [cadDraft, setCadDraft] = useState(creator?.delivery_cadence || null); // borrador del entregable (elegir → Guardar)
  // Managers de la creadora (copia de propuestas) — se autocompletan en el wizard.
  const normMgrs = (arr) => Array.isArray(arr) ? arr.filter((m) => m?.email).map((m) => ({ email: String(m.email).toLowerCase(), role: m.role === 'decide' ? 'decide' : 'viewer' })) : [];
  const [mgrList, setMgrList] = useState(() => normMgrs(creator?.manager_emails));
  const [mgrInput, setMgrInput] = useState('');
  const [mgrDirty, setMgrDirty] = useState(false);
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const addMgr = (raw) => {
    const parts = String(raw || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e));
    if (!parts.length) return;
    setMgrList((s) => { const have = new Set(s.map((r) => r.email)); return [...s, ...parts.filter((e) => !have.has(e)).map((e) => ({ email: e, role: 'viewer' }))]; });
    setMgrInput(''); setMgrDirty(true);
  };
  const removeMgr = (email) => { setMgrList((s) => s.filter((r) => r.email !== email)); setMgrDirty(true); };
  const toggleMgrRole = (email) => { setMgrList((s) => s.map((r) => (r.email === email ? { ...r, role: r.role === 'decide' ? 'viewer' : 'decide' } : r))); setMgrDirty(true); };
  const saveMgrs = async () => { const ok = await patch({ manager_emails: mgrList }, 'Managers guardados'); if (ok) setMgrDirty(false); };
  useEffect(() => { setMgrList(normMgrs(creator?.manager_emails)); setMgrDirty(false); /* eslint-disable-next-line */ }, [creator?.id]);
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
    // El correo cambia el LOGIN (auth) + la ficha → va por la edge function
    // update-user (con service role). El resto son columnas normales del perfil.
    const newEmail = (form.email || '').trim().toLowerCase();
    const curEmail = (creator.email || '').toLowerCase();
    const emailChanged = !!newEmail && newEmail !== curEmail;
    if (newEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) { flash('Correo no válido.'); return; }
    let inviteSent = false;
    if (emailChanged) {
      setSaving(true);
      const { data, error } = await getSupabase().functions.invoke('update-user', { body: { user_id: creator.id, email: newEmail } });
      if (error || data?.ok === false) { setSaving(false); flash('No se pudo cambiar el correo: ' + (data?.error || error?.message || 'error')); return; }
      // Al NUEVO correo le mandamos la invitación para que entre y ponga su clave.
      const inv = await getSupabase().functions.invoke('reset-password', { body: { user_id: creator.id, send_email: true } }).catch(() => ({}));
      inviteSent = !!inv?.data?.ok;
      setSaving(false);
    }
    const ok = await patch({
      full_name: form.full_name?.trim() || null,
      stage_name: form.stage_name?.trim() || null,
      handle: form.handle?.trim().replace(/^@/, '') || null,
      legal_first_name: form.legal_first_name?.trim() || null,
      legal_last_name: form.legal_last_name?.trim() || null,
      date_of_birth: form.date_of_birth || null,
      country: form.country?.trim() || null,
      phone: form.phone?.trim() || null,
    }, emailChanged
        ? (inviteSent
            ? `Correo cambiado a ${newEmail} · le mandamos la invitación para que entre y ponga su clave`
            : `Correo cambiado a ${newEmail} · no salió la invitación, usá «Enviar correo para que ponga su clave»`)
        : 'Datos guardados');
    if (ok) setEditing(false);
  }
  // Abre el editor de datos con todo prellenado (usado por "Cambiar" del correo
  // y por "Editar / llenar datos").
  function openEditor() {
    setForm({
      email: creator.email || '',
      full_name: creator.full_name || '', stage_name: creator.stage_name || '', handle: creator.handle || '',
      phone: creator.phone || '', legal_first_name: creator.legal_first_name || '', legal_last_name: creator.legal_last_name || '',
      date_of_birth: creator.date_of_birth || '', country: creator.country || '',
    });
    setEditing(true);
  }

  // Sincroniza el borrador del entregable con lo guardado (al abrir o tras Guardar).
  useEffect(() => { setCadDraft(creator?.delivery_cadence || null); }, [creator?.delivery_cadence]);

  useEffect(() => {
    if (!creator) return;
    (async () => {
      const supabase = getSupabase();
      const [{ data: kd }, { count }, { data: lastA }] = await Promise.all([
        supabase.from('kyc_documents').select('doc_type, storage_path').eq('user_id', creator.id),
        supabase.from('lora_photos').select('id', { count: 'exact', head: true }).eq('user_id', creator.id),
        supabase.from('assets').select('created_at').eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setLastDelivery(lastA?.created_at || null);
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
            { id: 'entregable', label: 'Entregable', icon: Send, state: creator.delivery_cadence ? 'ok' : 'todo' },
            { id: 'datos', label: 'Datos', icon: Users, state: datosDone ? 'ok' : 'todo' },
            { id: 'identidad', label: 'Identidad', icon: IdCard, state: idApproved ? 'ok' : idRejected ? 'bad' : idPending ? 'warn' : 'todo' },
            { id: 'suscripcion', label: 'Suscripción', icon: CreditCard, state: paid ? 'ok' : 'todo' },
            { id: 'clon', label: 'Clon', icon: Sparkles, state: lc >= LORA_MIN ? 'ok' : 'todo' },
            { id: 'voz', label: 'Voz', icon: AudioLines, state: hasVoice ? 'ok' : 'todo' },
            { id: 'propuesta', label: 'Propuesta', icon: Sparkles, state: 'todo' },
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
          {/* ── ENTREGABLE ── cada cuánto recibe contenido (elegir → Guardar). Solo admin/dueño. */}
          {tab === 'entregable' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-line bg-ink-2 p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 font-display font-semibold text-paper"><Send size={15} className="text-brand" /> Entregable</h4>
                {(() => {
                  const ds = deliveryState(creator.delivery_cadence, lastDelivery);
                  if (!ds || lastDelivery === undefined) return null;
                  const tone = ds.tone === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : ds.tone === 'bad' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    : 'border-amber-400/40 bg-amber-400/10 text-amber-300';
                  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{ds.label}</span>;
                })()}
              </div>
              <p className="mb-3 text-[11px] text-paper-dim">Cada cuánto se le debe entregar contenido. Elegí y dale <b className="text-paper-mute">Guardar</b>. Marca el atraso según la última entrega.</p>
              {canSetCadence ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {CADENCIAS.map((c) => {
                      const on = cadDraft === c.id;
                      return (
                        <button key={c.id} type="button" disabled={saving}
                          onClick={() => setCadDraft(on ? null : c.id)}
                          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            on ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line text-paper-mute hover:text-paper'}`}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button type="button" disabled={saving || cadDraft === (creator.delivery_cadence || null)}
                      onClick={() => patch({ delivery_cadence: cadDraft }, cadDraft ? `Entregable: ${CADENCIAS.find((c) => c.id === cadDraft)?.label}` : 'Entregable quitado')}
                      className="btn3d inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                      <Check size={15} /> {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    {cadDraft !== (creator.delivery_cadence || null) && <span className="text-[11px] font-semibold text-amber-300/80">Cambios sin guardar</span>}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
                    creator.delivery_cadence ? 'border-brand/60 bg-brand/15 text-brand' : 'border-line text-paper-dim'}`}>
                    {CADENCIAS.find((c) => c.id === creator.delivery_cadence)?.label || 'Sin definir'}
                  </span>
                  <span className="text-[11px] text-paper-dim">Solo el admin o el dueño lo cambia.</span>
                </div>
              )}
              <p className="mt-3 text-[11px] text-paper-dim">
                Última entrega: {lastDelivery === undefined ? '…' : lastDelivery ? new Date(lastDelivery).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'sin entregas registradas'}
              </p>
            </div>
          </div>
          )}

          {/* ── DATOS ── */}
          {tab === 'datos' && (
          <div className="space-y-3">
          <Row done={datosDone} icon={Users} title="Datos personales">
            {editing ? (
              <div className="space-y-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-paper-dim">Correo <span className="text-paper-dim/70">· login + contacto (por aquí le llega la propuesta)</span></span>
                  <input type="email" value={form?.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="correo@modelo.com"
                    className="w-full rounded-lg border border-line bg-ink-2 px-2.5 py-2 text-sm text-paper outline-none focus:border-brand/60" />
                </label>
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
                {/* CORREO DE LA MODELO — caja destacada arriba de todo, imposible de
                    no ver, con "Cambiar" al lado. Es el correo principal por donde
                    le llega la propuesta. Rojo si falta. */}
                {(() => {
                  const noEmail = !creator.email || /@equipo\.letshoot\.ai$/i.test(creator.email);
                  return (
                    <div className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${noEmail ? 'border-rose-500/50 bg-rose-500/[0.07]' : 'border-brand/40 bg-brand/[0.07]'}`}>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${noEmail ? 'text-rose-300' : 'text-brand'}`}>Correo de la modelo · por aquí le llega la propuesta</p>
                        {noEmail
                          ? <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-rose-300"><AlertTriangle size={14} /> SIN CORREO — agrégalo</p>
                          : <p className="mt-1 break-all text-base font-bold text-paper">{creator.email}</p>}
                      </div>
                      <button onClick={openEditor}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/50 hover:text-brand">
                        <Pencil size={12} /> Cambiar
                      </button>
                    </div>
                  );
                })()}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nombre legal</dt><dd className="text-paper">{creator.legal_first_name || creator.legal_last_name ? `${creator.legal_first_name || ''} ${creator.legal_last_name || ''}` : '—'}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Nacimiento</dt><dd className="text-paper">{fmtDate(creator.date_of_birth)}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">País</dt><dd className="text-paper">{creator.country || '—'}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-wide text-paper-dim">Teléfono</dt><dd className="text-paper">{creator.phone || '—'}</dd></div>
                </dl>
                <button onClick={openEditor}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                  <UserPlus size={13} /> Editar / llenar datos
                </button>
              </>
            )}
          </Row>

          {/* Acceso y contraseña — JUNTO al correo, arriba de todo: mandar correo
              para que ponga su clave, o ponerle una a mano. */}
          <ResetPasswordBox userId={creator.id} email={creator.email} />

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

          {/* Managers (copia de propuestas) — se autocompletan en el wizard al elegirla. */}
          <div className="rounded-2xl border border-line bg-ink-2 p-4">
            <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-paper"><Mail size={15} className="text-brand" /> Managers <span className="text-[11px] font-normal text-paper-dim">(copia de propuestas)</span></h4>
            <p className="mb-3 text-[11px] text-paper-dim">Cuando le armes una propuesta, estos correos se ponen solos como copia. Tocá el rol: <span className="text-paper-mute">Mira</span> = solo ve · <span className="text-paper-mute">Decide</span> = puede aprobar/rechazar.</p>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-ink px-2.5 py-2 focus-within:border-brand/60">
              {mgrList.map((r) => (
                <span key={r.email} className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-paper">
                  {r.email}
                  <button type="button" onClick={() => toggleMgrRole(r.email)} title="Cambiar rol"
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide transition-colors ${r.role === 'decide' ? 'bg-brand text-on-accent' : 'bg-ink-2 text-paper-mute'}`}>
                    {r.role === 'decide' ? 'Decide' : 'Mira'}
                  </button>
                  <button type="button" onClick={() => removeMgr(r.email)} className="text-paper-mute transition-colors hover:text-rose-300"><X size={12} /></button>
                </span>
              ))}
              <input type="email" value={mgrInput} onChange={(e) => setMgrInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addMgr(mgrInput); } }}
                onBlur={() => addMgr(mgrInput)}
                placeholder={mgrList.length ? 'Agregar otro…' : 'manager@correo.com'}
                className="min-w-[150px] flex-1 bg-transparent px-1 py-1 text-sm text-paper placeholder:text-paper-dim outline-none" />
            </div>
            {mgrDirty && (
              <button onClick={saveMgrs} disabled={saving}
                className="btn3d mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar managers
              </button>
            )}
          </div>

          {/* Modelo de prueba — no cuenta en contabilidad (solo el dueño) */}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300"><AlertTriangle size={13} /> Modelo de prueba</div>
                <p className="mt-1 text-[11px] text-paper-dim">Si está activo, esta cuenta NO cuenta en los números administrativos. Úsalo para demos y cuentas internas.</p>
              </div>
              <button onClick={() => patch({ is_test: !creator.is_test }, creator.is_test ? 'Ya no es modelo de prueba' : 'Marcada como modelo de prueba')} disabled={saving}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${creator.is_test ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-line text-paper-mute hover:border-amber-400/40 hover:text-amber-300'}`}>
                {creator.is_test ? <><Check size={13} /> Es de prueba</> : 'Marcar como prueba'}
              </button>
            </div>
          </div>

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
                      <button type="button" onClick={() => setKycZoom({ url: docs[d.k], label: d.l })} className="block aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-lg border border-line" title="Ver grande">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docs[d.k]} alt={d.l} className="h-full w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    ) : <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-line text-[10px] text-paper-dim">Falta</div>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-paper-dim">Todavía no subió sus documentos de identidad.</p>}

            {/* Visor de ID a pantalla completa — clic afuera, botón X o Escape para cerrar */}
            {kycZoom && (
              <div onClick={() => setKycZoom(null)} className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
                <div className="mb-2 flex w-full max-w-lg items-center justify-between text-sm font-semibold text-white">
                  <span>{kycZoom.label}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setKycZoom(null); }} className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-white hover:bg-white/20"><X size={15} /> Cerrar</button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kycZoom.url} alt={kycZoom.label} onClick={(e) => e.stopPropagation()} className="max-h-[82vh] max-w-full rounded-xl border border-white/20 object-contain" />
                <p className="mt-2 text-[11px] text-white/60">Tocá afuera, el botón Cerrar o la tecla Esc para cerrar.</p>
              </div>
            )}

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
                      Al <strong className="text-paper-mute">aprobar</strong>, la creadora pasa a «Aprobada · sin activar» y al activar su suscripción queda <strong className="text-paper-mute">Activa</strong>. Los documentos quedan guardados y cifrados (solo los ve quien tenga «Verificar identidad»). Al <strong className="text-paper-mute">rechazar</strong>, vuelve al paso de identidad con tu motivo.
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
                      <span className="font-display text-2xl font-bold text-paper">{pack ? pack.name : (creator.plan || 'Sin plan')}</span>
                      <span className="text-sm text-paper-mute">plan mensual</span>
                    </div>
                    {ends && <p className="mt-1 text-[11px] text-paper-dim">Renueva: {ends.toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-paper-dim">Elige su plan y actívala cuando corresponda.</p>
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
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-paper-dim">Vence el</label>
                  <input type="date" value={creator.subscription_ends_at || ''} disabled={saving}
                    onChange={(e) => patch({ subscription_ends_at: e.target.value || null }, 'Fecha de vencimiento actualizada')}
                    className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60 disabled:cursor-not-allowed disabled:opacity-60" />
                  <p className="mt-1 text-[11px] text-paper-dim">Al entrar al admin, el banner te avisa las que están por vencer o vencidas. Al vencer NO se inactiva sola — márcala inactiva a mano abajo cuando corresponda.</p>
                </div>
              )}

              {/* Elegir plan — solo dueño */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-paper-dim">Plan de la cuenta</p>
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
                        <div className="mt-1 text-[10px] text-paper-dim">{p.photos} fotos · {p.videos} vid al mes</div>
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
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Marcar inactiva
                </button>
              ) : (
                <button onClick={() => patch({ payment_status: 'paid', plan: creator.plan || 'core', onboarding_status: 'active', subscription_ends_at: creator.subscription_ends_at || in30 }, 'Suscripción ACTIVADA')}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Activar suscripción
                </button>
              )}

              <p className="text-[11px] text-paper-dim">Al activarla queda «Activa» y se ve en la modelo, la agencia y los uploaders.</p>
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

          {/* ── VOZ ── voz fija de ElevenLabs: elegir de la biblioteca o clonar desde un clip. */}
          {tab === 'voz' && (
            <CreatorVoiceTab creator={creator} patch={patch} saving={saving} flash={flash} onVoiceState={setHasVoice} />
          )}

          {tab === 'propuesta' && (
            <ProposalEditor creator={creator} onClose={() => setTab('datos')} flash={flash} />
          )}

          {/* Danger zone — eliminar la creadora por completo (libera su correo). */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
            <h4 className="mb-1 flex items-center gap-2 font-display font-semibold text-rose-300"><Trash2 size={15} /> Eliminar creadora</h4>
            <p className="text-[11px] leading-relaxed text-paper-dim">
              Borra esta cuenta para siempre con todo lo suyo (contenido, carpetas, identidad, pedidos). Libera su correo para volver a usarlo. No se puede deshacer.
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

/* ── Voz de la modelo (pestaña «Voz» de la cartilla) — ElevenLabs vía edge `voice` ──
   Una sola voz FIJA por modelo (mismo voice_id + mismos ajustes → siempre suena igual).
   Dos caminos: (A) elegir una voz que ya está en la cuenta de ElevenLabs, (B) subir
   un clip de la creadora y clonarla acá. Clonar (y generar audios) exige consentimiento. */
const VOICE_CAT = { cloned: 'Clonada', professional: 'Profesional', premade: 'Biblioteca', generated: 'Diseñada' };
const VOICE_TEST_TEXT = 'Hola amor, qué bueno tenerte por acá… te preparé algo que te va a encantar.';
// Afinar: la MISMA frase en 3 tomas con 3 ajustes; el elegido queda FIJO para la modelo (todo lo cocinado sale igual).
const VOICE_PRESETS = [
  { id: 'estable', label: 'Estable', hint: 'La más parecida y pareja. Bienvenidas y PPV.', settings: { stability: 0.75, similarity_boost: 0.9, style: 0, use_speaker_boost: true, speed: 1 } },
  { id: 'natural', label: 'Natural', hint: 'Equilibrio entre parecido y emoción.', settings: { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 1 } },
  { id: 'expresiva', label: 'Expresiva', hint: 'Más emoción y juego. Coqueto y explícito.', settings: { stability: 0.3, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true, speed: 1 } },
];
const presetLabel = (id) => VOICE_PRESETS.find((p) => p.id === id)?.label || (id ? 'Personalizado' : 'Natural');
const VOICE_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac';
const VOICE_EXT_RE = /\.(mp3|wav|m4a|ogg|webm|flac)$/i;
const VOICE_MAX_FILES = 5;
const VOICE_MAX_MB = 10;
const VOICE_LANGS = [
  { id: 'es', flag: '🇪🇸', label: 'ES' }, { id: 'en', flag: '🇺🇸', label: 'EN' }, { id: 'pt', flag: '🇧🇷', label: 'PT' },
  { id: 'fr', flag: '🇫🇷', label: 'FR' }, { id: 'de', flag: '🇩🇪', label: 'DE' }, { id: 'it', flag: '🇮🇹', label: 'IT' },
];

// Ajustes en palabras ("estabilidad 0.50 · parecido 0.80 · estilo 0 · velocidad 1.0 · motor ElevenLabs v4").
function voiceSettingsText(s, motor) {
  const num = (v, d) => { const n = Number(v ?? d); return Number.isFinite(n) ? n : d; };
  const style = num(s?.style, 0);
  return [
    `estabilidad ${num(s?.stability, 0.5).toFixed(2)}`,
    `parecido ${num(s?.similarity_boost, 0.8).toFixed(2)}`,
    `estilo ${style === 0 ? '0' : style.toFixed(2)}`,
    `velocidad ${num(s?.speed, 1).toFixed(1)}`,
    motor ? `motor ${motor}` : null,
  ].filter(Boolean).join(' · ');
}

/* ── Casting de voz: voces de la biblioteca PÚBLICA de ElevenLabs diciendo las MISMAS frases de la modelo ──
   Escuchar no agrega nada a la cuenta (cast_take con allow_add:false → no ocupa lugares de voz); cada toma
   gasta créditos, por eso se genera solo al tocarla y queda guardada. "Elegir" (adopt_shared) recién ahí la
   agrega a la cuenta y la amarra como la voz fija de la modelo. */
// Lista sugerida curada: chica joven americana, vibra Florida (en este orden). c = cuántos la usan · p = muestra.
const CAST_SEEDS = [
  { voice_id: 'eXpIbVcVbLo8ZJQDlDnl', public_owner_id: 'ed3ea42f4eb1cfab34c8560d6ee55ef69a190a638cc33094a90d7d3f5ef77cda', name: 'Siren - Natural realistic conversational voice', hint: 'Natural y conversacional: casi no se nota que es IA.', cloned_by_count: 119640, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/cbfaa74d559547979fa92c07eae49b0f/voices/eXpIbVcVbLo8ZJQDlDnl/nvbKCMRoZnwNqgIhVjJE.mp3' },
  { voice_id: 'SaqYcK3ZpDKBAImA8AdW', public_owner_id: 'e9a6840c69b79812b77ea81fa11d55aaf80dcf1938fa0137bf7f514f67f75c99', name: 'Jane Doe - Intimate', hint: 'Íntima: joven, cálida, suave.', cloned_by_count: 62483, preview_url: 'https://api.us.elevenlabs.io/v1/voices/SaqYcK3ZpDKBAImA8AdW/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiIzZTM2MTk3MTE5ZTE0MGIzOWZiYmE2MGZkZDRjZTgzZCIsImZpbGVuYW1lIjoiYjdqRUFaZ2k1bmJkak94dlNGNU0ubXAzIiwidGltZXN0YW1wIjoxNzkwNzE1NjAwMDAwMDAwfQ%3D%3D' },
  { voice_id: 'vCHG6sKIqAbXWNNm5vpY', public_owner_id: '4989e475bffcca847fccb0ffdd45796b3f8612e23ad78051e6e206317ddb451c', name: 'Cindy - casual narrator (South Florida native)', hint: 'Nacida en el sur de Florida, natural.', cloned_by_count: 3296, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/Qae9t2058ERclThfdUOrfukGEfW2/voices/vCHG6sKIqAbXWNNm5vpY/0b41e9cd-ede3-4b1c-b6ef-e73008b82860.mp3' },
  { voice_id: 'uYXf8XasLslADfZ2MB4u', public_owner_id: '7d272ea0221fbc9ce382a3eaf4d7f907179558360d93b351ec7d344d30023cf9', name: 'Hope - Bubbly, Gossipy and Girly', hint: 'Chismosa y girly, con risitas y pausas.', cloned_by_count: 261447, preview_url: 'https://api.us.elevenlabs.io/v1/voices/uYXf8XasLslADfZ2MB4u/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ1c2VyX2lkIjoic0Q5MkhuTUhTOVdaTFhLTlRLeG1uQzhYbUozMiIsImZpbGVuYW1lIjoiTTBVVGZORmlnSW5oejhMTWI0REEubXAzIiwidGltZXN0YW1wIjoxNzkwNzE1NjAwMDAwMDAwfQ%3D%3D' },
  { voice_id: 'WAhoMTNdLdMoq1j3wf3I', public_owner_id: '7d272ea0221fbc9ce382a3eaf4d7f907179558360d93b351ec7d344d30023cf9', name: 'Hope - Smooth, Engaging and Kind', hint: 'Suave, sensual y romántica.', cloned_by_count: 119346, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/sD92HnMHS9WZLXKNTKxmnC8XmJ32/voices/WAhoMTNdLdMoq1j3wf3I/OdHq2JoogTP6B2rbqeKz.mp3' },
  { voice_id: '8DzKSPdgEQPaK5vKG0Rs', public_owner_id: '08504f2f7adf4206260a2166458936bacc9385957f11cb0d69e6879efdec2349', name: 'Vanessa - Beach Girl', hint: 'Chica de playa, tierna, para redes.', cloned_by_count: 151469, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/pJj966DxwEg3jXdcUkoTbMzkPsL2/voices/8DzKSPdgEQPaK5vKG0Rs/AeRt8yvbNanY84fSNvRc.mp3' },
  { voice_id: 'tQ4MEZFJOzsahSEEZtHK', public_owner_id: '76fb06688ef565775843b4efa41dd61de204a6cf28aa7ba86536140378d39188', name: 'Ivanna - Seductive & Intimate', hint: 'Seductora e íntima, suave y susurrada.', cloned_by_count: 140979, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/PbKq2iR4OIeherAWi2xD3ELKlfe2/voices/tQ4MEZFJOzsahSEEZtHK/62iX5gJdopY8r63K3CJf.mp3' },
  { voice_id: 'LEnmbrrxYsUYS7vsRRwD', public_owner_id: 'ca80533a28d1629da32b38131eb3d90e286a17a56ee77c165d5bc207f6b2b15e', name: 'Jessica - Intimate and Sensual', hint: 'Sensual, para notas de voz coquetas.', cloned_by_count: 46137, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/J4h991GHbFgiqH3MWFYXECli4hB3/voices/LEnmbrrxYsUYS7vsRRwD/XbuzjwjKc5rprnRx5Tgm.mp3' },
  { voice_id: 'T7eLpgAAhoXHlrNajG8v', public_owner_id: 'adfd156ac1d89b744a90f5b9ab3077791e58db5e9ae768c9f9c800419abd3603', name: 'Gracie Valley - Seductive and Sassy', hint: 'Seductora y atrevida, vibra influencer.', cloned_by_count: 27789, preview_url: 'https://api.us.elevenlabs.io/v1/voices/T7eLpgAAhoXHlrNajG8v/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJmZjlkZTQxNTcyNzI0MWZjYWQ5ODg5OThlYmUzYzhiYyIsImZpbGVuYW1lIjoiNXlFT0dBMUUzZEpMQUg5V3l6dXcubXAzIiwidGltZXN0YW1wIjoxNzkwNzE1NjAwMDAwMDAwfQ%3D%3D' },
  { voice_id: 'j7KV53NgP8U4LRS2k2Gs', public_owner_id: '8a95c14eec614c8dc201a67dc1d0a23cf6069820822686d3c635a48998c26fa4', name: 'Violet - Soft, Wistful and Inviting', hint: 'Como nota de voz de tu novia: cariñosa, tranquila.', cloned_by_count: 4870, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/d0423bdda7b04bc980634b5e65468313/voices/j7KV53NgP8U4LRS2k2Gs/fA0kn7assrx8Wpt6ewCH.mp3' },
  { voice_id: 'JDPatEvlpEV4gU041hTM', public_owner_id: '929391613c398e947bb220fb41d979047751cefe4df2ac88ae0691ec04ccce8c', name: 'Sydney - Sultry, Breathy and Reassuring', hint: 'Sensual, ronquita, cariñosa.', cloned_by_count: 3576, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/1OyFVG41A4VxpjESQpCiJFRjRaA3/voices/JDPatEvlpEV4gU041hTM/ZEnw6L5qW8zOVsrpTDwT.mp3' },
  { voice_id: '6j8uSqQkZH2WrWDVIiRB', public_owner_id: 'a5796f27eece6423cb3320da07463d46aca66520892267b0e136cdc27f7e8700', name: 'Luna - Late Night Sweetheart', hint: 'Novia de noche: susurrada, dulce.', cloned_by_count: 8420, preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/7geQkDeuy2aS1bPpYMr1vc5pDy23/voices/6j8uSqQkZH2WrWDVIiRB/Hxmv3ggvnbjDEEp8wrKs.mp3' },
];
// Datos frescos de la biblioteca (acento, edad, idiomas, muestra) por voice_id — se piden una vez por sesión.
const castSeedMeta = new Map();
// Tomas de casting ya pagadas (castKey → url): sobreviven al cambiar de pestaña o cerrar la cartilla.
const castTakeCache = new Map();
// Estimado ANTES de la primera toma: medido ~10 créditos por frase de ~85 caracteres con v4 (después se usa lo real).
const CAST_CREDITS_PER_CHAR = 0.12;
const CAST_MAX = 300; // tope de cast_take por frase
const CAST_NATURAL = { preset: 'natural', ...VOICE_PRESETS.find((p) => p.id === 'natural').settings };
// Filtros de la búsqueda (valores tal cual los usa la biblioteca de ElevenLabs).
const CAST_GENDERS = [{ id: 'female', label: 'Mujer' }, { id: 'male', label: 'Hombre' }, { id: '', label: 'Cualquier género' }];
const CAST_ACCENTS = [
  { id: '', label: 'Cualquier acento' }, { id: 'american', label: 'Americano' }, { id: 'latin american', label: 'Latino' },
  { id: 'peninsular', label: 'Español (España)' }, { id: 'british', label: 'Británico' }, { id: 'australian', label: 'Australiano' },
];
const CAST_AGES = [{ id: '', label: 'Cualquier edad' }, { id: 'young', label: 'Joven' }, { id: 'middle_aged', label: 'Media' }];
const CAST_LANG_NAMES = { es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', it: 'Italiano' };
const CAST_ACCENT_LABEL = { american: 'Americano', 'latin american': 'Latino', peninsular: 'España', british: 'Británico', australian: 'Australiano', canadian: 'Canadiense', irish: 'Irlandés', standard: 'Estándar' };
const CAST_AGE_LABEL = { young: 'Joven', middle_aged: 'Media', 'middle-aged': 'Media', old: 'Mayor' };
const castShort = (name) => String(name || '').split(' - ')[0].trim() || 'Voz';
const castDesc = (name) => { const s = String(name || ''); const i = s.indexOf(' - '); return i >= 0 ? s.slice(i + 3).trim() : ''; };
// La edge borra los saltos de línea (pegaría palabras): se normalizan a espacios antes de pedir/guardar la toma.
const castText = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const castKey = (vid, l) => `${vid}|${l.lang}|${castText(l.text)}`;
function castPop(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return '';
  if (x >= 1e6) return `${(x / 1e6).toLocaleString('es', { maximumFractionDigits: 1 })} M la usan`;
  if (x >= 1000) return `${Math.round(x / 1000).toLocaleString('es')} mil la usan`;
  return x === 1 ? '1 la usa' : `${x} la usan`;
}
// Idiomas que maneja la voz (su idioma + los verificados), solo los que la plataforma usa.
function castLangsOf(v) {
  const ids = new Set();
  if (v?.language) ids.add(String(v.language).slice(0, 2));
  for (const l of (Array.isArray(v?.verified_languages) ? v.verified_languages : [])) if (l?.language) ids.add(String(l.language).slice(0, 2));
  return VOICE_LANGS.filter((l) => ids.has(l.id));
}
// Frases de prueba en SU voz (las mismas para todas las candidatas → se comparan parejo).
function castLinesFor(n) {
  return [
    { id: 'l1', lang: 'en', text: `Hey babe, it's ${n || 'me'}… I just got back from the beach, and I made something really special for you.` },
    { id: 'l2', lang: 'en', text: "Mmm… I've been thinking about you all day. Don't make me wait too long, okay?" },
    { id: 'l3', lang: 'es', text: `Hola amor, soy ${n || 'yo'}… te preparé algo muy especial. ¿Lo quieres ver?` },
  ];
}
// Corre fn sobre items con n en paralelo como máximo; stop() corta la cola (lo que está en curso termina).
async function runPool(items, n, fn, stop) {
  let i = 0;
  const worker = async () => {
    while (i < items.length && !(stop && stop())) {
      const it = items[i++];
      try { await fn(it); } catch { /* cada tarea maneja su error */ }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
}

// Voz REAL para el comparativo de la propuesta (real vs IA). El clip se pasa en el navegador a un
// WAV mono 16-bit NUEVO (≤30 s) antes de subirlo: nada del archivo original (metadatos del teléfono/app) sobrevive.
const REAL_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac';
const REAL_EXT_RE = /\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i;
const REAL_MAX_MB = 20;
const REAL_MAX_SEC = 30;
const realChip = (on) => `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
  on ? 'border-transparent bg-brand text-on-accent' : 'border-line text-paper-mute hover:border-hair hover:text-paper'}`;

async function cleanRealClip(file) {
  const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  if (!AC) throw new Error('Este navegador no puede procesar audio. Probá con Chrome o Safari actualizados.');
  const ctx = new AC();
  try {
    let buf;
    try {
      const ab = await file.arrayBuffer();
      // Safari viejo solo tiene la versión con callbacks de decodeAudioData.
      buf = await new Promise((res, rej) => {
        const p = ctx.decodeAudioData(ab, res, rej);
        if (p && typeof p.then === 'function') p.then(res, rej);
      });
    } catch { throw new Error('No pude leer ese audio'); }
    if (!buf) throw new Error('No pude leer ese audio');
    const sr = buf.sampleRate;
    const len = Math.min(buf.length, Math.floor(sr * REAL_MAX_SEC));
    if (len < sr * 0.5) throw new Error('Ese audio es demasiado corto: subí un saludo de 5 a 20 segundos.');
    const chans = [];
    for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
    const n = chans.length || 1;
    // WAV PCM 16-bit mono: cabecera RIFF estándar de 44 bytes + muestras int16 little-endian.
    const out = new ArrayBuffer(44 + len * 2);
    const dv = new DataView(out);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (let c = 0; c < chans.length; c++) s += chans[c][i];
      s = Math.max(-1, Math.min(1, s / n));
      dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return { blob: new Blob([out], { type: 'audio/wav' }), trimmed: buf.length > len };
  } finally {
    try { await ctx.close(); } catch { /* noop */ }
  }
}

// Respuesta de error del function → { msg, needsKey } listo para mostrar.
function voiceErr(out, fallback = 'Algo salió mal. Probá de nuevo.') {
  if (out?.needsKey) return { msg: 'Falta conectar ElevenLabs: pegá la clave en Conexión.', needsKey: true };
  if (out?.needsConsent) return { msg: 'Falta el consentimiento de la creadora: marcalo arriba para poder clonar y generar audios.' };
  if (out?.needsVoice) return { msg: out?.error || 'Esta modelo todavía no tiene voz: elegí una de tus voces o cloná desde un clip.' };
  return { msg: out?.error || fallback };
}

function VoiceErr({ e, className = '' }) {
  if (!e) return null;
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-rose-300 ${className}`}>
      <AlertTriangle size={13} className="mt-px shrink-0" />
      <span className="min-w-0 flex-1">
        {e.msg}
        {e.needsKey && <Link href="/conexion" className="ml-1 font-semibold text-paper underline underline-offset-2">Ir a Conexión</Link>}
      </span>
    </div>
  );
}

function CreatorVoiceTab({ creator, patch, saving, flash, onVoiceState }) {
  const cid = creator.id;
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  const [status, setStatus] = useState(null);        // respuesta de 'status' (null = cargando)
  const [loaded, setLoaded] = useState(false);       // ya llegó el 'summary'
  const [voice, setVoice] = useState(null);          // voz vinculada a esta modelo | null
  const [sumConsent, setSumConsent] = useState(undefined);
  const [topErr, setTopErr] = useState(null);

  // Consentimiento: la fuente es profiles.consent_voice (se refresca vía patch → onSaved → load).
  // El override local muestra el valor nuevo apenas se guarda, sin esperar la recarga.
  const [consentOverride, setConsentOverride] = useState(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentErr, setConsentErr] = useState(null);
  const pendingConsentRef = useRef(null); // valor que se acaba de escribir, a confirmar con la recarga
  // Cada recarga (load() arma objetos nuevos) trae el valor REAL de la base: se descarta el override
  // aunque el valor no haya cambiado. Si el guardado no se aplicó (p. ej. 0 filas por permisos), se avisa.
  useEffect(() => {
    setConsentOverride(null);
    const pending = pendingConsentRef.current;
    pendingConsentRef.current = null;
    if (pending != null && typeof creator.consent_voice === 'boolean' && creator.consent_voice !== pending) {
      setConsentErr({ msg: 'El consentimiento no se guardó: tu rol no tiene permiso para editar la ficha de la creadora. Pedíselo a un admin.' });
    }
  }, [creator]);
  const consent = consentOverride ?? (typeof creator.consent_voice === 'boolean' ? creator.consent_voice : !!sumConsent);

  // Probar / quitar la voz actual
  const [testing, setTesting] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testErr, setTestErr] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearErr, setClearErr] = useState(null);

  // (A) voces de la cuenta de ElevenLabs
  const [libVoices, setLibVoices] = useState(null);  // null = todavía no se pidieron
  const [libBusy, setLibBusy] = useState(false);
  const [libErr, setLibErr] = useState(null);
  const [libQ, setLibQ] = useState('');
  const [assigning, setAssigning] = useState(null);  // voice_id en curso
  const playerRef = useRef(null);
  const playingRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  // (B) clonar desde un clip
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [fileErrs, setFileErrs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneErr, setCloneErr] = useState(null);

  // Afinar la voz (3 tomas → elegir → queda fijo)
  const [tuneText, setTuneText] = useState(VOICE_TEST_TEXT);
  const [tuneTakes, setTuneTakes] = useState(null); // [{ ...preset, url, err }]
  const [tuneBusy, setTuneBusy] = useState(false);
  const [tuneSaving, setTuneSaving] = useState(null); // preset id en curso
  const [tuneErr, setTuneErr] = useState(null);
  const [tuneLang, setTuneLang] = useState('es');    // idioma de las 3 tomas (la frase de prueba puede ser en inglés)
  const tuneRef = useRef(null);                      // caja "Afinar la voz" (el casting salta acá después de elegir)
  const pendingTuneRef = useRef(null);               // { text, lang }: afinar apenas aparezca la voz recién elegida
  const [tuneFresh, setTuneFresh] = useState('');    // nombre de la voz recién elegida en el casting (aviso en Afinar)

  // Voz real para el comparativo (voice.real_url / real_source / real_text vienen del summary)
  const realFileRef = useRef(null);
  const [realBusy, setRealBusy] = useState(null);    // 'upload' | 'voice' | 'clear' | null
  const [realErr, setRealErr] = useState(null);
  const [realNote, setRealNote] = useState('');      // "Se recortó a 30 s"
  const [realLang, setRealLang] = useState('es');
  const [realChange, setRealChange] = useState(false); // ya tiene voz real y se abrió "Cambiar"
  const [realClearOpen, setRealClearOpen] = useState(false);

  // Casting de voz (biblioteca pública de ElevenLabs): sin voz se muestra abierto; con voz, detrás de un botón.
  const [castOpen, setCastOpen] = useState(false);
  const [castLines, setCastLines] = useState(() => castLinesFor((creator.stage_name || creator.full_name || '').trim().split(/\s+/)[0] || ''));
  // castKey → { status: 'busy'|'ok'|'err', url, err }; arranca con las tomas ya pagadas en esta sesión.
  const [castTakes, setCastTakes] = useState(() => Object.fromEntries([...castTakeCache].map(([k, url]) => [k, { status: 'ok', url }])));
  const castTakesRef = useRef(castTakes);            // espejo sincrónico (la cola no pide dos veces la misma toma)
  const castLinesRef = useRef(null);                 // frases y lista ACTUALES (la cola salta lo que ya no está en pantalla)
  const castListRef = useRef(null);
  const castSearchSeqRef = useRef(0);                // descarta búsquedas viejas (volver a la lista sugerida / buscar otra vez)
  const tuneSeqRef = useRef(0);                      // descarta un "Afinar" viejo si la voz cambió mientras generaba
  const rootRef = useRef(null);                      // pestaña entera: para pausar los <audio> nativos
  const [castSeedInfo, setCastSeedInfo] = useState(() => Object.fromEntries(castSeedMeta));
  const castHydratingRef = useRef(false);
  const [castResults, setCastResults] = useState(null); // null = lista sugerida · [] = resultados de la búsqueda
  const [castQ, setCastQ] = useState('');
  const [castGender, setCastGender] = useState('female');
  const [castAccent, setCastAccent] = useState('');
  const [castAge, setCastAge] = useState('');
  const [castLangF, setCastLangF] = useState('');
  const [castSearching, setCastSearching] = useState(false);
  const [castSearchErr, setCastSearchErr] = useState(null);
  const [castHasMore, setCastHasMore] = useState(false);
  const [castPage, setCastPage] = useState(0);
  const castParamsRef = useRef(null);                // filtros de la última búsqueda (para "Ver más")
  const [castAllBusy, setCastAllBusy] = useState(false);
  const castStopRef = useRef(false);
  const castWantRef = useRef(null);                  // la última toma que se pidió escuchar (suena al estar lista)
  const [castPick, setCastPick] = useState(null);    // voice_id con la confirmación abierta
  const [castAdopting, setCastAdopting] = useState(null);
  const [castAdopted, setCastAdopted] = useState(null); // { from: voice_id de la biblioteca, to: voice_id que quedó amarrado }
  const [castErrs, setCastErrs] = useState({});      // voice_id → { msg }
  const [castSpent, setCastSpent] = useState({ takes: 0, credits: 0, chars: 0 });

  const loadSummary = useCallback(async () => {
    const out = await callVoice('summary');
    if (!aliveRef.current) return;
    setLoaded(true);
    if (!out.ok) {
      // Sin clave lo avisa el cartel de "Falta conectar ElevenLabs"; el resto se muestra.
      if (!out.needsKey) setTopErr(voiceErr(out, 'No se pudo cargar la voz de la modelo.'));
      return;
    }
    setTopErr(null);
    setVoice((out.voices || []).find((v) => v.creator_id === cid) || null);
    setSumConsent(out.consent ? out.consent[cid] : undefined);
  }, [cid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [st] = await Promise.all([callVoice('status'), loadSummary()]);
      if (!alive || !aliveRef.current) return;
      setStatus(st);
      if (!st.ok && !st.needsKey) setTopErr((e) => e || voiceErr(st, 'No se pudo consultar ElevenLabs.'));
    })();
    return () => { alive = false; };
  }, [loadSummary]);

  // Avisa a la cartilla si ya tiene voz (dot de la pestaña).
  useEffect(() => { if (loaded && onVoiceState) onVoiceState(!!voice); }, [loaded, voice, onVoiceState]);
  // Cortar la muestra que esté sonando al salir de la pestaña.
  useEffect(() => () => { try { playerRef.current?.pause(); } catch { /* noop */ } }, []);

  const configured = status == null ? null : status.ok ? !!status.configured : status.needsKey ? false : null;
  const first = (creator.stage_name || creator.full_name || '').trim().split(/\s+/)[0] || 'la modelo';
  const fmtMB = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

  async function toggleConsent() {
    if (consentBusy || saving) return;
    const next = !consent;
    setConsentBusy(true); setConsentErr(null);
    const ok = await patch({ consent_voice: next }, 'Consentimiento de voz actualizado');
    if (!aliveRef.current) return;
    setConsentBusy(false);
    if (ok) { pendingConsentRef.current = next; setConsentOverride(next); setSumConsent(next); if (next) setCloneErr(null); }
  }

  async function testVoice() {
    setTesting(true); setTestErr(null); setTestUrl('');
    const out = await callVoice('preview_voice', { creator_id: cid, text: VOICE_TEST_TEXT });
    if (!aliveRef.current) return;
    setTesting(false);
    if (!out.ok || !out.url) { setTestErr(out.ok ? { msg: 'No llegó el audio de prueba. Probá de nuevo.' } : voiceErr(out, 'No se pudo generar la prueba.')); return; }
    setTestUrl(out.url);
  }

  async function doClear() {
    setClearing(true); setClearErr(null);
    const out = await callVoice('clear_voice', { creator_id: cid });
    if (!aliveRef.current) return;
    setClearing(false);
    if (!out.ok) { setClearErr(voiceErr(out, 'No se pudo quitar la voz.')); return; }
    setClearOpen(false); setVoice(null); setTestUrl(''); setTestErr(null);
    tuneSeqRef.current++; setTuneBusy(false); setTuneTakes(null); setTuneFresh(''); pendingTuneRef.current = null;
    flash && flash('Voz quitada');
    loadSummary();
  }

  async function loadLibrary() {
    setLibBusy(true); setLibErr(null);
    const out = await callVoice('list_voices');
    if (!aliveRef.current) return;
    setLibBusy(false);
    if (!out.ok) { setLibErr(voiceErr(out, 'No se pudieron traer tus voces.')); return; }
    setLibVoices(Array.isArray(out.voices) ? out.voices : []);
  }

  async function assign(v) {
    if (assigning) return;
    setAssigning(v.voice_id); setLibErr(null);
    const out = await callVoice('assign_voice', { creator_id: cid, voice_id: v.voice_id });
    if (!aliveRef.current) return;
    setAssigning(null);
    if (!out.ok) { setLibErr(voiceErr(out, 'No se pudo asignar la voz.')); return; }
    if (out.voice) setVoice(out.voice);
    setTestUrl(''); setTestErr(null); setClearOpen(false); setTuneTakes(null); setTuneErr(null);
    tuneSeqRef.current++; setTuneBusy(false); setTuneFresh(''); pendingTuneRef.current = null;
    flash && flash(`Voz asignada: ${out.voice?.voice_name || v.name || 'listo'}`);
    loadSummary();
  }

  // Las 3 tomas salen en paralelo (misma frase, 3 ajustes). Cada una trae su propio error si falla.
  // opts { text, lang, force } → el casting la dispara con la frase de la voz recién elegida (sin esperar al estado);
  // force = aunque haya un Afinar viejo en curso (ese queda descartado por tuneSeqRef).
  async function tune(opts) {
    const text = String(opts?.text ?? tuneText).trim();
    const lang = opts?.lang || tuneLang;
    if (!text || (tuneBusy && !opts?.force)) return;
    const seq = ++tuneSeqRef.current;
    setTuneBusy(true); setTuneErr(null); setTuneTakes(null);
    const outs = await Promise.all(VOICE_PRESETS.map((p) => callVoice('preview_voice', { creator_id: cid, text, lang, settings: p.settings })));
    if (!aliveRef.current || seq !== tuneSeqRef.current) return;
    setTuneBusy(false);
    const takes = VOICE_PRESETS.map((p, i) => ({ ...p, url: outs[i]?.ok ? outs[i].url : '', err: outs[i]?.ok ? '' : voiceErr(outs[i] || {}, 'No salió esta toma.').msg }));
    if (takes.every((t) => !t.url)) { setTuneErr({ msg: takes[0].err || 'No salió ninguna toma. Probá de nuevo.' }); return; }
    setTuneTakes(takes);
  }

  async function choosePreset(t) {
    if (tuneSaving) return;
    setTuneSaving(t.id); setTuneErr(null);
    const out = await callVoice('set_voice_settings', { creator_id: cid, preset: t.id, settings: t.settings });
    if (!aliveRef.current) return;
    setTuneSaving(null);
    if (!out.ok) { setTuneErr(voiceErr(out, 'No se pudo guardar el ajuste.')); return; }
    if (out.voice) setVoice(out.voice);
    setTuneFresh('');
    flash && flash(`Ajuste fijo: ${t.label} — todo lo de ${first} sale así`);
  }

  // Un solo reproductor para toda la pestaña: muestras de la cuenta, del casting y sus tomas (suena una a la vez).
  function ensurePlayer() {
    let a = playerRef.current;
    if (!a) {
      a = new Audio();
      a.onended = () => { playingRef.current = null; if (aliveRef.current) setPlayingId(null); };
      playerRef.current = a;
    }
    return a;
  }
  function stopPlayer() {
    try { playerRef.current?.pause(); } catch { /* noop */ }
    playingRef.current = null; castWantRef.current = null;
    setPlayingId(null);
  }
  // Los <audio> con controles de la pestaña (voz actual, prueba, Afinar, voz real) también van de a uno con el reproductor.
  function pauseNative(except) {
    try { rootRef.current?.querySelectorAll('audio').forEach((el) => { if (el !== except) el.pause(); }); } catch { /* noop */ }
  }
  const onNativePlay = (e) => { stopPlayer(); pauseNative(e.currentTarget); };
  // pid = id de lo que suena ('cast:<toma>' / 'castprev:<voz>'); volver a tocarlo lo pausa.
  function playUrl(pid, url, onFail) {
    const a = ensurePlayer();
    if (playingRef.current === pid) { a.pause(); playingRef.current = null; castWantRef.current = null; setPlayingId(null); return; }
    castWantRef.current = pid;
    pauseNative();
    a.pause();
    a.src = url;
    playingRef.current = pid;
    setPlayingId(pid);
    a.play().catch((e) => {
      if (e?.name === 'AbortError' || playingRef.current !== pid || !aliveRef.current) return;
      playingRef.current = null; setPlayingId(null);
      // Safari puede frenar el play() que llega después de generar: la toma queda lista para tocarla.
      if (e?.name !== 'NotAllowedError' && onFail) onFail();
    });
  }

  function togglePlay(v) {
    if (!v.preview_url) return;
    const a = ensurePlayer();
    castWantRef.current = null;
    if (playingRef.current === v.voice_id) { a.pause(); playingRef.current = null; setPlayingId(null); return; }
    pauseNative();
    a.pause();
    a.src = v.preview_url;
    playingRef.current = v.voice_id;
    setPlayingId(v.voice_id);
    a.play().catch((e) => {
      if (e?.name === 'AbortError' || playingRef.current !== v.voice_id || !aliveRef.current) return;
      playingRef.current = null; setPlayingId(null);
      setLibErr({ msg: 'No se pudo reproducir la muestra de esa voz.' });
    });
  }

  // ── Casting ──
  const setCastLine = (i, p) => setCastLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const setTake = (k, val) => { castTakesRef.current = { ...castTakesRef.current, [k]: val }; setCastTakes(castTakesRef.current); };
  const setCastErr = (vid, e) => setCastErrs((m) => ({ ...m, [vid]: e }));

  // Toma de casting: se genera SOLO la primera vez que se pide (ajuste Natural, sin agregar la voz a la cuenta)
  // y queda guardada por voz + idioma + frase. Devuelve la url o null.
  async function genTake(v, l) {
    const text = castText(l.text);
    if (!text) return null;
    const k = castKey(v.voice_id, l);
    const cur = castTakesRef.current[k];
    if (cur?.status === 'busy') return null;
    if (cur?.status === 'ok') return cur.url;
    setTake(k, { status: 'busy' });
    const out = await callVoice('cast_take', {
      voice_id: v.voice_id, public_owner_id: v.public_owner_id || null, name: v.name || null,
      text, lang: l.lang, settings: CAST_NATURAL, allow_add: false,
    });
    // Ya se pagó: se guarda aunque se haya salido de la pestaña (al volver no se cobra de nuevo).
    if (out?.ok && out.url) castTakeCache.set(k, out.url);
    if (!aliveRef.current) return null;
    if (!out.ok || !out.url) {
      setTake(k, { status: 'err', err: out.ok ? 'No llegó el audio. Probá de nuevo.' : voiceErr(out, 'No salió esta toma.').msg });
      return null;
    }
    setTake(k, { status: 'ok', url: out.url });
    setCastSpent((s) => ({ takes: s.takes + 1, credits: s.credits + (Number(out.chars) || text.length), chars: s.chars + text.length }));
    return out.url;
  }

  async function playTake(v, l) {
    const k = castKey(v.voice_id, l);
    const pid = `cast:${k}`;
    const onFail = () => { castTakeCache.delete(k); setTake(k, { status: 'err', err: 'No se pudo reproducir esta toma. Tocá para generarla de nuevo.' }); };
    const t = castTakesRef.current[k];
    if (t?.status === 'busy') return;
    if (t?.status === 'ok') { playUrl(pid, t.url, onFail); return; }
    castWantRef.current = pid; // si mientras se genera se pide otra cosa, esta ya no suena sola
    const url = await genTake(v, l);
    if (url && aliveRef.current && castWantRef.current === pid) playUrl(pid, url, onFail);
  }

  function playCastPreview(v) {
    if (!v.preview_url) return;
    playUrl(`castprev:${v.voice_id}`, v.preview_url, () => setCastErr(v.voice_id, { msg: 'No se pudo reproducir la muestra original de esta voz.' }));
  }

  // Botón explícito: genera las tomas que faltan (o fallaron) de las voces en pantalla, de a 3 a la vez.
  // Antes de cada toma se mira lo que hay AHORA: si la frase cambió o la voz ya no está en la lista, se salta (no se paga).
  async function genAllTakes(jobs) {
    if (castAllBusy || !jobs.length) return;
    castStopRef.current = false;
    setCastAllBusy(true);
    await runPool(jobs, 3, (j) => {
      const cur = (castLinesRef.current || []).find((x) => x.id === j.l.id);
      if (!cur || castText(cur.text) !== castText(j.l.text) || cur.lang !== j.l.lang) return null;
      if (!(castListRef.current || []).some((x) => x.voice_id === j.v.voice_id)) return null;
      return genTake(j.v, j.l);
    }, () => castStopRef.current || !aliveRef.current);
    if (aliveRef.current) setCastAllBusy(false);
  }

  // Buscar en la biblioteca pública (reemplaza la lista sugerida). page > 0 → "Ver más" con los mismos filtros.
  async function castSearch(page = 0) {
    if (castSearching) return;
    const params = page > 0 && castParamsRef.current ? castParamsRef.current : {
      ...(castGender ? { gender: castGender } : {}),
      ...(castAccent ? { accent: castAccent } : {}),
      ...(castAge ? { age: castAge } : {}),
      ...(castLangF ? { language: castLangF } : {}),
      ...(castQ.trim() ? { search: castQ.trim() } : {}),
    };
    castParamsRef.current = params;
    const seq = ++castSearchSeqRef.current;
    setCastSearching(true); setCastSearchErr(null);
    const out = await callVoice('search_shared', { ...params, page, page_size: 30 });
    if (!aliveRef.current || seq !== castSearchSeqRef.current) return;
    setCastSearching(false);
    if (!out.ok) { setCastSearchErr(voiceErr(out, 'No se pudo buscar en la biblioteca de ElevenLabs.')); return; }
    const got = (Array.isArray(out.voices) ? out.voices : []).filter((v) => v?.voice_id);
    setCastResults((prev) => {
      if (page > 0 && prev) { const have = new Set(prev.map((v) => v.voice_id)); return [...prev, ...got.filter((v) => !have.has(v.voice_id))]; }
      return got;
    });
    setCastHasMore(!!out.has_more); setCastPage(page);
    if (page === 0) setCastPick(null);
  }
  function castBackToSeeds() {
    castSearchSeqRef.current++; // una búsqueda que siga en curso ya no pisa la lista sugerida
    setCastResults(null); setCastSearchErr(null); setCastHasMore(false); setCastPage(0); setCastPick(null); setCastSearching(false);
    castParamsRef.current = null;
  }

  // "Elegir esta voz" → confirmar → adopt_shared: se agrega a la cuenta y queda como SU voz fija.
  // Después se abre "Afinar la voz" con las 3 tomas (estable / natural / expresiva) para fijar el ajuste.
  async function adoptCast(v) {
    if (castAdopting) return;
    setCastAdopting(v.voice_id); setCastErr(v.voice_id, null);
    const out = await callVoice('adopt_shared', {
      creator_id: cid, voice_id: v.voice_id, public_owner_id: v.public_owner_id || null,
      name: v.name || null, preview_url: v.preview_url || null,
    });
    if (!aliveRef.current) return;
    setCastAdopting(null);
    if (!out.ok) { setCastErr(v.voice_id, voiceErr(out, 'No se pudo elegir esta voz. Probá de nuevo.')); return; }
    castStopRef.current = true; // el casting se cierra: "Generar todas" deja de gastar
    stopPlayer();
    setCastPick(null); setCastAdopted({ from: v.voice_id, to: out.voice?.voice_id || v.voice_id }); setCastOpen(false);
    // Afinar con la primera frase del casting (en su idioma): así se escuchan los ajustes con lo que va a decir.
    const l0 = castLines.find((l) => castText(l.text));
    const text = (l0 ? castText(l0.text) : tuneText.trim()).slice(0, 200);
    const lang = l0 ? l0.lang : tuneLang;
    setTuneText(text); setTuneLang(lang);
    pendingTuneRef.current = { text, lang, force: true };
    setTuneFresh(castShort(v.name));
    tuneSeqRef.current++; setTuneBusy(false); // un Afinar de la voz anterior que siga en curso ya no llena la caja
    if (out.voice) setVoice(out.voice);
    setTestUrl(''); setTestErr(null); setClearOpen(false); setTuneTakes(null); setTuneErr(null);
    flash && flash(`Voz elegida: ${castShort(v.name)} — ahora elegí el ajuste`);
    loadSummary();
  }

  function addFiles(list) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const errs = [];
    const next = [...files];
    for (const f of incoming) {
      const isAudio = (f.type || '').startsWith('audio/') || VOICE_EXT_RE.test(f.name || '');
      if (!isAudio) { errs.push(`${f.name}: no es un archivo de audio (mp3, wav, m4a, ogg, webm o flac).`); continue; }
      if (f.size > VOICE_MAX_MB * 1024 * 1024) { errs.push(`${f.name}: pesa ${fmtMB(f.size)}, el máximo es ${VOICE_MAX_MB} MB.`); continue; }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= VOICE_MAX_FILES) { errs.push(`Máximo ${VOICE_MAX_FILES} archivos: ${f.name} quedó afuera.`); continue; }
      next.push(f);
    }
    setFiles(next); setFileErrs(errs); setCloneErr(null);
  }
  const removeFile = (i) => { setFiles((s) => s.filter((_, j) => j !== i)); setFileErrs([]); };
  const pickFiles = () => {
    if (cloning) return;
    if (!consent) { setCloneErr(voiceErr({ needsConsent: true })); return; }
    fileRef.current?.click();
  };

  async function doClone() {
    if (!consent) { setCloneErr(voiceErr({ needsConsent: true })); return; }
    if (!files.length || cloning) return;
    setCloning(true); setCloneErr(null);
    const supabase = getSupabase();
    const paths = [];
    for (const f of files) {
      const safeName = (f.name || 'audio').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'audio';
      const { data, error } = await supabase.storage.from('voice-samples')
        .upload(`${cid}/${Date.now()}-${safeName}`, f, { contentType: f.type || 'audio/mpeg' });
      if (!aliveRef.current) return;
      if (error || !data?.path) { setCloning(false); setCloneErr({ msg: `No se pudo subir ${f.name}: ${error?.message || 'error desconocido'}.` }); return; }
      paths.push(data.path);
    }
    const out = await callVoice('clone_voice', { creator_id: cid, sample_paths: paths, name: creator.stage_name || creator.full_name });
    if (!aliveRef.current) return;
    setCloning(false);
    if (!out.ok) { setCloneErr(voiceErr(out, 'No se pudo clonar la voz.')); return; }
    setFiles([]); setFileErrs([]);
    if (out.voice) setVoice(out.voice);
    setTestUrl(''); setTestErr(null); setClearOpen(false);
    tuneSeqRef.current++; setTuneBusy(false); setTuneTakes(null); setTuneErr(null); setTuneFresh(''); pendingTuneRef.current = null;
    flash && flash('Voz clonada');
    loadSummary();
  }

  // Sin voz vinculada no hay comparativo: se cierra lo que haya quedado abierto.
  useEffect(() => { if (!voice) { setRealChange(false); setRealClearOpen(false); setRealErr(null); setRealNote(''); } }, [voice]);
  const hasReal = !!voice?.real_url;

  // Opción 1: su voz real subida → WAV limpio → proposal-audios/real/{modelo}/{ts}.wav → set_real_voice 'upload'.
  async function uploadReal(file) {
    if (!file || realBusy) return;
    setRealErr(null); setRealNote(''); setRealClearOpen(false);
    // Sin ElevenLabs conectado el guardado falla → no subimos nada (si no, queda un clip huérfano en el bucket público).
    if (configured === false) { setRealErr(voiceErr({ needsKey: true })); return; }
    const isAudio = (file.type || '').startsWith('audio/') || REAL_EXT_RE.test(file.name || '');
    if (!isAudio) { setRealErr({ msg: `${file.name}: no es un archivo de audio (mp3, wav, m4a, ogg, webm, flac o aac).` }); return; }
    if (file.size > REAL_MAX_MB * 1024 * 1024) { setRealErr({ msg: `${file.name}: pesa ${fmtMB(file.size)}, el máximo es ${REAL_MAX_MB} MB.` }); return; }
    setRealBusy('upload');
    let clip;
    try { clip = await cleanRealClip(file); } catch (e) {
      if (!aliveRef.current) return;
      setRealBusy(null); setRealErr({ msg: e?.message || 'No pude leer ese audio' }); return;
    }
    if (!aliveRef.current) return;
    const sb = getSupabase();
    const path = `real/${cid}/${Date.now()}.wav`;
    const { error: upErr } = await sb.storage.from('proposal-audios').upload(path, clip.blob, { contentType: 'audio/wav', upsert: false });
    if (!aliveRef.current) return;
    if (upErr) { setRealBusy(null); setRealErr({ msg: `No se pudo subir el clip: ${upErr.message || 'error de subida'}. Probá de nuevo.` }); return; }
    const url = sb.storage.from('proposal-audios').getPublicUrl(path)?.data?.publicUrl;
    if (!url) { setRealBusy(null); setRealErr({ msg: 'No se pudo obtener el link del clip. Probá de nuevo.' }); return; }
    const out = await callVoice('set_real_voice', { creator_id: cid, mode: 'upload', url });
    if (!aliveRef.current) return;
    setRealBusy(null);
    if (!out.ok) {
      // No se guardó → borramos el clip recién subido para no dejar audios sueltos en el bucket público.
      sb.storage.from('proposal-audios').remove([path]).catch(() => {});
      setRealErr(voiceErr(out, 'No se pudo guardar la voz real.')); return;
    }
    if (out.voice) setVoice(out.voice);
    setRealChange(false);
    setRealNote(clip.trimmed ? `Se recortó a ${REAL_MAX_SEC} s` : '');
    flash && flash('Voz real guardada');
  }

  // Opción 2: modelo sin voz real (p. ej. modelo IA) → una toma de su misma voz fija con otra frase.
  async function makeRealTake() {
    if (realBusy) return;
    setRealBusy('voice'); setRealErr(null); setRealNote(''); setRealClearOpen(false);
    const out = await callVoice('set_real_voice', { creator_id: cid, mode: 'voice', lang: realLang });
    if (!aliveRef.current) return;
    setRealBusy(null);
    if (!out.ok) { setRealErr(voiceErr(out, 'No se pudo generar la toma de su voz.')); return; }
    if (out.voice) setVoice(out.voice);
    setRealChange(false);
    flash && flash('Toma de su voz guardada');
  }

  async function clearReal() {
    if (realBusy) return;
    setRealBusy('clear'); setRealErr(null);
    const out = await callVoice('clear_real_voice', { creator_id: cid });
    if (!aliveRef.current) return;
    setRealBusy(null);
    if (!out.ok) { setRealErr(voiceErr(out, 'No se pudo quitar la voz real.')); return; }
    setVoice((v) => out.voice || (v ? { ...v, real_url: null, real_source: null, real_text: null } : v));
    setRealClearOpen(false); setRealChange(false); setRealNote('');
    flash && flash('Voz real quitada');
  }

  const q = libQ.trim().toLowerCase();
  const libShown = (libVoices || []).filter((v) => !q || [
    v.name, v.description, v.category, VOICE_CAT[v.category],
    ...(v.labels && typeof v.labels === 'object' ? Object.values(v.labels) : []),
  ].some((s) => typeof s === 'string' && s.toLowerCase().includes(q)));
  const showOptions = status != null && configured !== false;

  // Casting: abierto de entrada si no tiene voz; con voz, solo si se pidió.
  const castShown = loaded && showOptions && (!voice || castOpen);
  const castSeedList = CAST_SEEDS.map((s) => {
    const m = castSeedInfo[s.voice_id];
    return m ? { ...s, ...m, voice_id: s.voice_id, name: s.name, hint: s.hint, public_owner_id: m.public_owner_id || s.public_owner_id, preview_url: m.preview_url || s.preview_url, cloned_by_count: m.cloned_by_count ?? s.cloned_by_count } : s;
  });
  const castList = castResults || castSeedList;
  castLinesRef.current = castLines; castListRef.current = castList;
  const castLinesOk = castLines.filter((l) => castText(l.text));
  const castJobs = [];
  for (const v of castList) for (const l of castLinesOk) {
    const t = castTakes[castKey(v.voice_id, l)];
    if (!t || t.status === 'err') castJobs.push({ v, l });
  }
  // Con tomas ya hechas se usa lo que costaron de verdad por carácter; antes, lo medido con v4.
  const castRatio = castSpent.chars > 0 ? castSpent.credits / castSpent.chars : CAST_CREDITS_PER_CHAR;
  const castEst = Math.max(1, Math.round(castJobs.reduce((a, j) => a + castText(j.l.text).length, 0) * castRatio));
  const castPending = castJobs.length + Object.values(castTakes).filter((t) => t?.status === 'busy').length;
  // Casting cerrado (se eligió voz o se tocó la X) → "Generar todas" corta la cola (lo que está en curso termina).
  useEffect(() => { if (!castShown) castStopRef.current = true; }, [castShown]);

  // Datos frescos de las voces sugeridas (acento, edad, idiomas, muestra): una vez por sesión, de a 3.
  useEffect(() => {
    if (!castShown || castHydratingRef.current) return;
    const todo = CAST_SEEDS.filter((s) => !castSeedMeta.has(s.voice_id));
    if (!todo.length) return;
    castHydratingRef.current = true;
    (async () => {
      await runPool(todo, 3, async (s) => {
        const find = async (params) => {
          const out = await callVoice('search_shared', params);
          return out?.ok ? { hit: (out.voices || []).find((v) => v?.voice_id === s.voice_id) || null } : null;
        };
        let r = await find({ search: s.name, page_size: 30 });
        if (r && !r.hit) r = (await find({ search: castShort(s.name), gender: 'female', page_size: 100 })) || r;
        if (!r) return; // la consulta falló: se reintenta la próxima vez que se abra el casting
        castSeedMeta.set(s.voice_id, r.hit);
        if (aliveRef.current && r.hit) setCastSeedInfo((m) => ({ ...m, [s.voice_id]: r.hit }));
      }, () => !aliveRef.current);
      castHydratingRef.current = false;
    })();
  }, [castShown]);

  // Voz recién elegida en el casting → saltar a "Afinar la voz" y sacar las 3 tomas.
  useEffect(() => {
    const p = pendingTuneRef.current;
    if (!p || !voice) return;
    pendingTuneRef.current = null;
    try { tuneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* noop */ }
    tune(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  const castSel = 'w-full min-w-0 rounded-lg border border-line bg-ink px-2 py-1.5 text-[11px] text-paper outline-none focus:border-brand/60';
  const castChip = 'inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-mute';
  const castRow = (on) => `flex w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
    on ? 'border-brand/60 bg-brand/10 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:border-hair hover:text-paper'}`;

  return (
    <section ref={rootRef} className="card3d mb-4 rounded-3xl border border-line bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate font-display text-base font-bold text-paper">Voz de {first}</h3>
        {!loaded
          ? <StatusDot tone="zinc">Cargando…</StatusDot>
          : <StatusDot tone={voice ? 'ok' : 'warn'}>{voice ? 'Con voz' : 'Sin voz'}</StatusDot>}
      </div>

      {/* Sin clave de ElevenLabs */}
      {configured === false && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-3">
          <Plug size={15} className="mt-0.5 shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1 text-sm text-paper">
            Falta conectar ElevenLabs
            <span className="mt-0.5 block text-[11px] text-paper-mute">Sin la clave no se puede elegir, clonar ni probar la voz.</span>
          </span>
          <Link href="/conexion" className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Plug size={12} /> Ir a Conexión
          </Link>
        </div>
      )}
      <VoiceErr e={topErr} className="mb-4" />

      {/* Consentimiento */}
      <button
        type="button"
        onClick={toggleConsent}
        disabled={consentBusy || saving}
        className="flex w-full items-start gap-3 rounded-2xl border border-line bg-ink-2 p-3 text-left transition-colors hover:border-hair disabled:opacity-60"
      >
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
          consent ? 'border-brand bg-brand text-on-accent' : 'border-line bg-ink'}`}>
          {consentBusy ? <Loader2 size={12} className="animate-spin" /> : consent && <Check size={13} />}
        </span>
        <span className="min-w-0 flex-1 text-sm text-paper">
          La creadora dio consentimiento para clonar y usar su voz
          <span className="mt-0.5 block text-[11px] text-paper-mute">Obligatorio para clonar y generar audios</span>
        </span>
      </button>
      <VoiceErr e={consentErr} className="mt-2" />

      {/* Voz actual */}
      {!loaded ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-ink-2 p-4 text-sm text-paper-mute">
          <Loader2 size={15} className="animate-spin" /> Cargando la voz…
        </div>
      ) : voice ? (
        <div className="mt-4 rounded-2xl border border-line bg-ink-2 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
              <Mic size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-paper">{voice.voice_name || 'Voz sin nombre'}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {voice.source === 'cloned' ? 'Clonada en LetShoot' : 'De tu biblioteca ElevenLabs'}
              </div>
            </div>
          </div>
          {/* Los settings fijos de la voz, en palabras */}
          <p className="mt-2 text-[11px] leading-relaxed text-paper-dim">
            <span className="font-semibold text-paper-mute">Ajuste {presetLabel(voice.settings?.preset)}</span>
            {' · '}{voiceSettingsText(voice.settings, status?.ok ? status.model_label : null)}
          </p>

          {voice.preview_url && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls preload="none" src={voice.preview_url} onPlay={onNativePlay} className="mt-3 h-9 w-full" />
          )}

          {testUrl && (
            <div className="mt-3">
              <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">Prueba</div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio key={testUrl} controls autoPlay src={testUrl} onPlay={onNativePlay} className="h-9 w-full" />
            </div>
          )}
          <VoiceErr e={testErr} className="mt-3" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={testVoice} disabled={testing || configured === false}
              className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} {testing ? 'Generando…' : 'Probar voz'}
            </button>
            {!clearOpen && (
              <button type="button" onClick={() => { setClearOpen(true); setClearErr(null); }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:bg-rose-500/10 hover:text-rose-300">
                <Trash2 size={12} /> Quitar voz
              </button>
            )}
          </div>

          {clearOpen && (
            <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-3">
              <p className="text-[11px] leading-relaxed text-paper-mute">
                ¿Quitarle esta voz a {first}? Se desvincula de la modelo; la voz <span className="text-paper">no se borra</span> de ElevenLabs.
              </p>
              <VoiceErr e={clearErr} className="mt-2" />
              <div className="mt-2.5 flex justify-end gap-2">
                <button type="button" onClick={() => { setClearOpen(false); setClearErr(null); }}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper">Cancelar</button>
                <button type="button" onClick={doClear} disabled={clearing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
                  {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sí, quitar voz
                </button>
              </div>
            </div>
          )}

          {/* Afinar: misma frase, 3 ajustes → el elegido queda FIJO para todo lo que se cocine. */}
          <div ref={tuneRef} className={`mt-4 scroll-mt-36 rounded-xl border p-3 ${tuneFresh ? 'border-brand/50 bg-ink' : 'border-line bg-ink'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-paper"><SlidersHorizontal size={13} className="text-brand" /> Afinar la voz</div>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">Ajuste fijo: {presetLabel(voice.settings?.preset)}</span>
            </div>
            {tuneFresh && (
              <p className="mt-2 rounded-lg bg-brand/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-brand">
                Elegiste {tuneFresh}. Escuchá las 3 tomas y quedate con el ajuste que mejor le quede a {first}.
              </p>
            )}
            <p className="mt-1 text-[11px] leading-relaxed text-paper-mute">
              La misma frase en 3 tomas. Quedate con la que más suene a {first}: ese ajuste queda fijo y todo lo que se cocine sale igual.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <input value={tuneText} onChange={(e) => setTuneText(e.target.value.slice(0, 200))} placeholder="Frase de prueba (la que más usen)"
                className="min-w-0 flex-1 basis-[200px] rounded-lg border border-line bg-ink-2 px-3 py-2 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <select value={tuneLang} onChange={(e) => setTuneLang(e.target.value)} disabled={tuneBusy} aria-label="Idioma de las tomas"
                className="shrink-0 rounded-lg border border-line bg-ink-2 px-2 py-2 text-xs text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                {VOICE_LANGS.map((l) => <option key={l.id} value={l.id}>{l.flag} {l.label}</option>)}
              </select>
              <button type="button" onClick={() => tune()} disabled={tuneBusy || configured === false || !tuneText.trim()}
                className="btn3d inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-50">
                {tuneBusy ? <Loader2 size={12} className="animate-spin" /> : <SlidersHorizontal size={12} />} {tuneBusy ? 'Generando 3 tomas…' : 'Afinar: 3 tomas'}
              </button>
            </div>
            <VoiceErr e={tuneErr} className="mt-2" />
            {tuneTakes && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {tuneTakes.map((t) => {
                  const inUse = (voice.settings?.preset || 'natural') === t.id;
                  return (
                    <div key={t.id} className={`flex flex-col rounded-xl border p-2.5 ${inUse ? 'border-brand/60 bg-brand/5' : 'border-line bg-ink-2'}`}>
                      <div className="text-xs font-semibold text-paper">{t.label}</div>
                      <div className="mt-0.5 text-[10px] leading-snug text-paper-mute">{t.hint}</div>
                      {t.url
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        ? <audio controls preload="auto" src={t.url} onPlay={onNativePlay} className="mt-2 h-8 w-full" />
                        : <p className="mt-2 text-[11px] text-rose-300">{t.err}</p>}
                      <button type="button" onClick={() => choosePreset(t)} disabled={!t.url || !!tuneSaving || inUse}
                        className={`mt-2 inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold ${inUse ? 'bg-emerald-500/15 text-emerald-300' : 'btn3d-ghost disabled:opacity-50'}`}>
                        {inUse ? <><Check size={12} /> En uso</> : tuneSaving === t.id ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : 'Usar esta'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-paper-dim">La voz queda fija: siempre se usa esta misma voz y este mismo ajuste para esta modelo.</p>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-ink-2 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-paper-dim">
            <Mic size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-paper">Todavía no tiene voz</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> Hacé el casting de abajo, elegí una de tus voces o cloná la suya desde un clip.
            </div>
          </div>
        </div>
      )}

      {/* Casting de voz — voces de la biblioteca pública de ElevenLabs diciendo las mismas frases de la modelo */}
      {loaded && showOptions && !castShown && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink-2 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
            <Search size={17} />
          </span>
          <div className="min-w-0 flex-1 basis-[180px]">
            <h4 className="font-display text-sm font-semibold text-paper">Casting de voz</h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-paper-mute">Escuchá otras voces de la biblioteca de ElevenLabs diciendo las frases de {first}.</p>
          </div>
          <button type="button" onClick={() => setCastOpen(true)}
            className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Search size={12} /> Buscar otra voz (casting)
          </button>
        </div>
      )}
      {castShown && (
        <div className="mt-4 rounded-2xl border border-line bg-ink-2 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
              <AudioLines size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-semibold text-paper">Casting de voz</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-paper-mute">
                Voces de la biblioteca de ElevenLabs diciendo las mismas frases de {first}. Escuchá, compará y elegí: la que elijas queda como su voz fija.
              </p>
            </div>
            {voice && (
              <button type="button" onClick={() => { castStopRef.current = true; setCastOpen(false); setCastPick(null); stopPlayer(); }} title="Cerrar el casting"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Frases de prueba: las mismas para todas las voces */}
          <div className="mt-3 rounded-xl border border-line bg-ink p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="text-xs font-semibold text-paper">Frases de prueba</div>
              <button type="button" onClick={() => setCastLines(castLinesFor(first === 'la modelo' ? '' : first))}
                className="text-[10px] font-semibold text-paper-dim transition-colors hover:text-paper">Volver a las frases de {first}</button>
            </div>
            <div className="mt-2 space-y-2.5">
              {castLines.map((l, i) => (
                <div key={l.id}>
                  <div className="flex items-start gap-2">
                    <span className="mt-2 w-3 shrink-0 text-center font-mono text-[10px] font-semibold text-paper-dim">{i + 1}</span>
                    <textarea rows={2} value={l.text} onChange={(e) => setCastLine(i, { text: e.target.value.slice(0, CAST_MAX) })}
                      placeholder="Una frase que diría ella…" aria-label={`Frase de prueba ${i + 1}`}
                      className="min-w-0 flex-1 resize-y rounded-lg border border-line bg-ink-2 px-2.5 py-2 text-xs leading-relaxed text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 pl-5">
                    <select value={l.lang} onChange={(e) => setCastLine(i, { lang: e.target.value })} aria-label={`Idioma de la frase ${i + 1}`}
                      className="rounded-full border border-line bg-ink-2 px-2 py-0.5 text-[11px] font-semibold text-paper-mute outline-none focus:border-brand/60">
                      {VOICE_LANGS.map((x) => <option key={x.id} value={x.id}>{x.flag} {x.label}</option>)}
                    </select>
                    <span className={`font-mono text-[10px] tabular-nums ${l.text.length >= CAST_MAX ? 'text-amber-300' : 'text-paper-dim'}`}>{l.text.length} / {CAST_MAX}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buscar otras candidatas en la biblioteca */}
          <form onSubmit={(e) => { e.preventDefault(); castSearch(0); }} className="mt-3">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input value={castQ} onChange={(e) => setCastQ(e.target.value)} placeholder="Buscar otras voces…" title="Ej.: sexy, whisper, Miami, girlfriend"
                  className="w-full rounded-xl border border-line bg-ink py-2 pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </div>
              <button type="submit" disabled={castSearching}
                className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-50">
                {castSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select value={castGender} onChange={(e) => setCastGender(e.target.value)} aria-label="Género" className={castSel}>
                {CAST_GENDERS.map((o) => <option key={o.id || 'any'} value={o.id}>{o.label}</option>)}
              </select>
              <select value={castAccent} onChange={(e) => setCastAccent(e.target.value)} aria-label="Acento" className={castSel}>
                {CAST_ACCENTS.map((o) => <option key={o.id || 'any'} value={o.id}>{o.label}</option>)}
              </select>
              <select value={castAge} onChange={(e) => setCastAge(e.target.value)} aria-label="Edad" className={castSel}>
                {CAST_AGES.map((o) => <option key={o.id || 'any'} value={o.id}>{o.label}</option>)}
              </select>
              <select value={castLangF} onChange={(e) => setCastLangF(e.target.value)} aria-label="Idioma" className={castSel}>
                <option value="">Cualquier idioma</option>
                {VOICE_LANGS.map((l) => <option key={l.id} value={l.id}>{l.flag} {CAST_LANG_NAMES[l.id]}</option>)}
              </select>
            </div>
          </form>
          <VoiceErr e={castSearchErr} className="mt-2" />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 text-[11px] text-paper-mute">
              {castResults
                ? `${castResults.length} ${castResults.length === 1 ? 'voz encontrada' : 'voces encontradas'}`
                : 'Lista sugerida: chica joven americana, vibra Florida'}
            </span>
            {castResults && (
              <button type="button" onClick={castBackToSeeds}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand transition-colors hover:text-paper">
                <RefreshCw size={11} /> Volver a la lista sugerida
              </button>
            )}
          </div>

          {/* Costo: cada toma se genera solo al tocarla; generar todas es un botón aparte */}
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
            <p className="min-w-0 flex-1 basis-[200px] text-[11px] leading-relaxed text-paper-mute">
              Cada toma se genera la primera vez que la tocás (ajuste Natural{status?.ok && status.model_label ? ` · ${status.model_label}` : ''}) y queda guardada. Escuchar no ocupa lugares de voz en tu cuenta.
              {castSpent.takes > 0 && (
                <span className="block text-paper-dim">
                  Casting: {castSpent.takes} {castSpent.takes === 1 ? 'toma' : 'tomas'} · {castSpent.credits.toLocaleString('es')} créditos gastados
                </span>
              )}
            </p>
            {castAllBusy ? (
              <button type="button" onClick={() => { castStopRef.current = true; }}
                className="btn3d-ghost inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-semibold">
                <Loader2 size={12} className="animate-spin" /> Generando ({castPending})… Detener
              </button>
            ) : (
              <button type="button" onClick={() => genAllTakes(castJobs)} disabled={!castJobs.length}
                className="btn3d-ghost inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-semibold disabled:opacity-50">
                <Wand2 size={12} className="shrink-0" />
                <span className="min-w-0">{castLinesOk.length === 0 ? 'Escribí al menos una frase de prueba'
                  : castJobs.length ? `Generar todas las tomas (${castEst.toLocaleString('es')} créditos aprox.)` : 'Todas las tomas listas'}</span>
              </button>
            )}
          </div>

          {castResults && castResults.length === 0 ? (
            <p className="mt-3 rounded-xl border border-line bg-ink px-3 py-4 text-center text-[11px] text-paper-dim">
              Ninguna voz con esa búsqueda. Probá con menos filtros o volvé a la lista sugerida.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2.5">
              {castList.map((v) => {
                const inUse = !!voice && (voice.voice_id === v.voice_id || (castAdopted?.from === v.voice_id && castAdopted?.to === voice.voice_id));
                const desc = castDesc(v.name);
                const langs = castLangsOf(v);
                const pop = castPop(v.cloned_by_count);
                const picking = castPick === v.voice_id;
                const adopting = castAdopting === v.voice_id;
                const prevOn = playingId === `castprev:${v.voice_id}`;
                const cardOn = typeof playingId === 'string' && (playingId === `castprev:${v.voice_id}` || playingId.startsWith(`cast:${v.voice_id}|`));
                return (
                  <div key={v.voice_id}
                    className={`flex min-w-0 flex-col rounded-xl border p-3 transition-colors ${inUse ? 'border-brand/60 bg-brand/5' : cardOn ? 'border-brand/40 bg-ink' : 'border-line bg-ink'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-paper">{castShort(v.name)}</div>
                        {desc && <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-paper-mute">{desc}</div>}
                      </div>
                      {inUse && <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand"><Check size={12} /> En uso</span>}
                    </div>
                    {v.hint
                      ? <p className="mt-1 text-[11px] leading-snug text-paper-dim">{v.hint}</p>
                      : v.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-paper-dim">{v.description}</p> : null}
                    {(v.accent || v.age || langs.length > 0 || pop) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {v.accent && <span className={castChip}>{CAST_ACCENT_LABEL[v.accent] || v.accent}</span>}
                        {v.age && <span className={castChip}>{CAST_AGE_LABEL[v.age] || v.age}</span>}
                        {langs.length > 0 && <span className={castChip} title={`Habla: ${langs.map((l) => CAST_LANG_NAMES[l.id]).join(', ')}`}>{langs.map((l) => l.flag).join(' ')}</span>}
                        {pop && <span className="text-[10px] text-paper-dim">{pop}</span>}
                      </div>
                    )}

                    {/* Escuchar: muestra original + las frases de prueba */}
                    <div className="mt-2.5 space-y-1">
                      <button type="button" onClick={() => playCastPreview(v)} disabled={!v.preview_url}
                        title={v.preview_url ? '' : 'Esta voz no tiene muestra'} className={castRow(prevOn)}>
                        {prevOn ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="shrink-0" />}
                        <span className="min-w-0 flex-1 truncate text-left">Muestra original</span>
                      </button>
                      {castLinesOk.map((l) => {
                        const idx = castLines.indexOf(l) + 1;
                        const k = castKey(v.voice_id, l);
                        const t = castTakes[k];
                        const on = playingId === `cast:${k}`;
                        const lf = VOICE_LANGS.find((x) => x.id === l.lang);
                        return (
                          <div key={l.id}>
                            <button type="button" onClick={() => playTake(v, l)} disabled={t?.status === 'busy'} className={castRow(on)}>
                              {t?.status === 'busy' ? <Loader2 size={12} className="shrink-0 animate-spin" />
                                : on ? <Pause size={12} className="shrink-0" />
                                : t?.status === 'err' ? <RefreshCw size={12} className="shrink-0" />
                                : <Play size={12} className="shrink-0" />}
                              <span className="min-w-0 flex-1 truncate text-left">Frase {idx} {lf?.flag}</span>
                              <span className="shrink-0 text-[10px] font-normal text-paper-dim">
                                {t?.status === 'busy' ? 'Generando…' : t?.status === 'ok' ? (on ? 'Sonando' : 'Lista') : t?.status === 'err' ? 'Reintentar' : 'Generar'}
                              </span>
                            </button>
                            {t?.status === 'err' && <p className="mt-0.5 px-1 text-[10px] leading-snug text-rose-300">{t.err}</p>}
                          </div>
                        );
                      })}
                    </div>
                    <VoiceErr e={castErrs[v.voice_id]} className="mt-2" />

                    {/* Elegir → confirmar en la misma tarjeta */}
                    {!inUse && (
                      <div className="mt-auto pt-2.5">
                        {picking ? (
                          <div className="rounded-xl border border-brand/40 bg-brand/5 p-2.5">
                            <p className="text-[11px] leading-relaxed text-paper">Va a ser la voz fija de {first}: todo lo que se cocine sale con esta voz.</p>
                            {voice && <p className="mt-1 text-[10px] leading-snug text-paper-mute">Reemplaza a {voice.voice_name || 'su voz actual'}.</p>}
                            {!consent && (
                              <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-snug text-amber-300">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                Para generar audios en la cocina con esta voz tiene que estar marcado el consentimiento de voz (arriba).
                              </p>
                            )}
                            <div className="mt-2 flex justify-end gap-2">
                              <button type="button" onClick={() => setCastPick(null)} disabled={adopting}
                                className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper disabled:opacity-40">Cancelar</button>
                              <button type="button" onClick={() => adoptCast(v)} disabled={!!castAdopting}
                                className="btn3d inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                                {adopting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {adopting ? 'Guardando…' : 'Confirmar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setCastPick(v.voice_id); setCastErr(v.voice_id, null); }} disabled={!!castAdopting}
                            className="btn3d-ghost inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                            <Check size={12} /> Elegir esta voz
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {castResults && castHasMore && (
            <div className="mt-3 flex justify-center">
              <button type="button" onClick={() => castSearch(castPage + 1)} disabled={castSearching}
                className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50">
                {castSearching ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />} Ver más voces
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voz real — para el comparativo de la propuesta (real vs IA). Solo con voz vinculada. */}
      {loaded && voice && (
        <div className="mt-4 rounded-2xl border border-line bg-ink-2 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
              <AudioLines size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-semibold text-paper">Voz real — para el comparativo</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-paper-mute">
                Un clip corto de su voz real (un saludo de 5 a 20 segundos). Sale en la propuesta al lado de su voz con IA.
              </p>
            </div>
            {!hasReal && (
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-mute">Sin voz real</span>
            )}
          </div>

          {hasReal && (
            <div className="mt-3 rounded-xl border border-line bg-ink p-3">
              <div className="flex flex-wrap items-center gap-2">
                {voice.real_source === 'voice' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Mic size={11} /> Toma de su voz — modelo sin voz real
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <Check size={11} /> Subida
                  </span>
                )}
                {realNote && <span className="text-[10px] text-paper-dim">{realNote}</span>}
              </div>
              {voice.real_source === 'voice' && voice.real_text && (
                <p className="mt-1.5 text-[11px] italic leading-relaxed text-paper-dim">“{voice.real_text}”</p>
              )}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio key={voice.real_url} controls preload="none" src={voice.real_url} onPlay={onNativePlay} className="mt-2 h-9 w-full" />

              {!realClearOpen ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => { setRealChange((v) => !v); setRealErr(null); }} disabled={!!realBusy}
                    className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    {realChange ? <X size={12} /> : <RefreshCw size={12} />} {realChange ? 'Cancelar' : 'Cambiar'}
                  </button>
                  <button type="button" onClick={() => { setRealClearOpen(true); setRealChange(false); setRealErr(null); }} disabled={!!realBusy || configured === false}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50">
                    <Trash2 size={12} /> Quitar
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-3">
                  <p className="text-[11px] leading-relaxed text-paper-mute">
                    ¿Quitar la voz real de {first}? Las propuestas nuevas salen sin el comparativo hasta que cargues otra.
                  </p>
                  <div className="mt-2.5 flex justify-end gap-2">
                    <button type="button" onClick={() => setRealClearOpen(false)} disabled={realBusy === 'clear'}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-paper-mute hover:text-paper disabled:opacity-40">Cancelar</button>
                    <button type="button" onClick={clearReal} disabled={!!realBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
                      {realBusy === 'clear' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sí, quitar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(!hasReal || realChange) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {/* Opción 1: subir su voz real */}
              <div className="flex flex-col rounded-xl border border-line bg-ink p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-paper">
                  <UploadCloud size={13} className="text-brand" /> Subir su voz real
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper-mute">
                  Un audio suyo (mp3, wav, m4a…), hasta {REAL_MAX_MB} MB. Se usan los primeros {REAL_MAX_SEC} s.
                </p>
                <input ref={realFileRef} type="file" accept={REAL_ACCEPT} className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadReal(f); }} />
                <div className="mt-auto pt-2.5">
                  <button type="button" onClick={() => { if (!realBusy) realFileRef.current?.click(); }} disabled={!!realBusy || configured === false}
                    className="btn3d inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-50">
                    {realBusy === 'upload' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {realBusy === 'upload' ? 'Limpiando y subiendo…' : 'Elegir audio'}
                  </button>
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-paper-dim">
                    <ShieldCheck size={11} className="shrink-0" /> Se guarda limpio, sin datos del teléfono.
                  </p>
                </div>
              </div>

              {/* Opción 2: modelo sin voz real → una toma de su misma voz */}
              <div className="flex flex-col rounded-xl border border-line bg-ink p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-paper">
                  <Mic size={13} className="text-brand" /> No tengo su voz real → usar una toma de su voz
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper-mute">
                  Para modelos IA sin voz real: una toma de su misma voz con otra frase.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {VOICE_LANGS.map((l) => (
                    <button key={l.id} type="button" onClick={() => setRealLang(l.id)} disabled={!!realBusy} className={realChip(realLang === l.id)}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-2.5">
                  <button type="button" onClick={makeRealTake} disabled={!!realBusy || configured === false}
                    className="btn3d-ghost inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-50">
                    {realBusy === 'voice' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {realBusy === 'voice' ? 'Generando…' : 'Usar una toma de su voz'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <VoiceErr e={realErr} className="mt-2" />
        </div>
      )}

      {showOptions && (
        <>
          {/* (A) Elegir de la cuenta de ElevenLabs */}
          <div className="mt-4 rounded-2xl border border-line bg-ink-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-display text-sm font-semibold text-paper">Elegir de tus voces de ElevenLabs</h4>
                <p className="mt-0.5 text-[11px] text-paper-mute">Usá una voz que ya tengas en tu cuenta.</p>
              </div>
              <button type="button" onClick={loadLibrary} disabled={libBusy}
                className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                {libBusy ? <Loader2 size={12} className="animate-spin" /> : libVoices ? <RefreshCw size={12} /> : <AudioLines size={12} />}
                {libVoices ? 'Actualizar' : 'Ver mis voces'}
              </button>
            </div>
            <VoiceErr e={libErr} className="mt-3" />

            {libVoices && (
              <div className="mt-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                  <input value={libQ} onChange={(e) => setLibQ(e.target.value)} placeholder="Buscar voz por nombre…"
                    className="w-full rounded-xl border border-line bg-ink py-2 pl-9 pr-3 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                </div>
                {libShown.length === 0 ? (
                  <p className="mt-3 text-center text-[11px] text-paper-dim">
                    {libVoices.length === 0 ? 'Tu cuenta de ElevenLabs no tiene voces todavía.' : 'Ninguna voz coincide con la búsqueda.'}
                  </p>
                ) : (
                  <ul className="mt-2.5 max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
                    {libShown.map((v) => {
                      const linked = voice?.voice_id === v.voice_id;
                      return (
                        <li key={v.voice_id}
                          className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors ${
                            linked ? 'border-brand/60 bg-brand/10' : 'border-line bg-ink hover:border-hair'}`}>
                          <button type="button" onClick={() => togglePlay(v)} disabled={!v.preview_url}
                            title={v.preview_url ? (playingId === v.voice_id ? 'Pausar' : 'Escuchar muestra') : 'Sin muestra'}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:opacity-30">
                            {playingId === v.voice_id ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-paper">{v.name || 'Sin nombre'}</span>
                              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-mute">
                                {VOICE_CAT[v.category] || v.category || 'Voz'}
                              </span>
                            </div>
                            {v.description && <p className="mt-0.5 truncate text-[11px] text-paper-dim">{v.description}</p>}
                          </div>
                          {linked ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand"><Check size={13} /> En uso</span>
                          ) : (
                            <button type="button" onClick={() => assign(v)} disabled={!!assigning}
                              className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                              {assigning === v.voice_id && <Loader2 size={12} className="animate-spin" />} Usar esta
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* (B) Clonar desde un clip */}
          <div className="mt-4 rounded-2xl border border-line bg-ink-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-display text-sm font-semibold text-paper">Clonar desde un clip</h4>
                <p className="mt-0.5 text-[11px] text-paper-mute">Subí audios de la creadora y ElevenLabs clona su voz.</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim">{files.length} / {VOICE_MAX_FILES}</span>
            </div>

            <input ref={fileRef} type="file" accept={VOICE_ACCEPT} multiple className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <div
              role="button"
              tabIndex={consent && !cloning ? 0 : -1}
              aria-disabled={!consent || cloning}
              onClick={pickFiles}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles(); } }}
              onDragOver={(e) => { e.preventDefault(); if (consent && !cloning) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                if (cloning) return;
                if (!consent) { setCloneErr(voiceErr({ needsConsent: true })); return; }
                addFiles(e.dataTransfer?.files);
              }}
              className={`mt-3 grid w-full place-items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                !consent || cloning ? 'cursor-not-allowed border-line text-paper-dim opacity-50'
                  : dragOver ? 'cursor-pointer border-brand/60 text-paper-mute'
                  : 'cursor-pointer border-line text-paper-dim hover:border-brand/50 hover:text-paper-mute'}`}
            >
              <span className="flex flex-col items-center gap-2">
                <UploadCloud size={22} />
                <span className="text-sm font-semibold text-paper-mute">Arrastrá el audio de la creadora o buscá</span>
                <span className="text-[11px]">1–3 minutos de su voz, limpia, sin música ni otras voces</span>
              </span>
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
                    <AudioLines size={13} className="shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 truncate text-xs text-paper">{f.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-paper-dim">{fmtMB(f.size)}</span>
                    <button type="button" onClick={() => removeFile(i)} disabled={cloning} title="Quitar archivo"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper disabled:opacity-40">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fileErrs.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {fileErrs.map((m, i) => <VoiceErr key={i} e={{ msg: m }} />)}
              </div>
            )}
            <VoiceErr e={cloneErr} className="mt-2" />

            <button type="button" onClick={doClone} disabled={!consent || !files.length || cloning}
              className="btn3d mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:pointer-events-none disabled:opacity-40">
              {cloning ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} {cloning ? 'Clonando…' : 'Clonar voz'}
            </button>
            {!consent ? (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Falta el consentimiento de la creadora: marcalo arriba para poder clonar.
              </div>
            ) : !files.length ? (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-paper-dim/60" /> Subí al menos un audio (máx. {VOICE_MAX_FILES}, hasta {VOICE_MAX_MB} MB cada uno).
              </div>
            ) : voice ? (
              <p className="mt-2 text-[11px] text-paper-dim">Clonar reemplaza la voz actual de {first}.</p>
            ) : null}
          </div>
        </>
      )}
    </section>
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
          {/* «Ver como» — abre /trabajo con los accesos de ESTE empleado, solo lectura.
              Solo para el equipo interno (empleado/admin), nunca para uno mismo. */}
          {!isSelf && (staff.role === 'supervisor' || staff.role === 'admin') && (
            <button onClick={() => window.open(`/trabajo?as=${staff.id}`, '_blank', 'noopener')}
              title="Ver /trabajo como este empleado (solo lectura)"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-brand">
              <Eye size={13} /> <span className="hidden sm:inline">Ver como {(staff.full_name || '').trim().split(/\s+/)[0] || 'empleado'}</span>
            </button>
          )}
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
              ) : (staff.role === 'admin' || staff.role === 'supervisor') ? (
                // admin ⇄ Empleado se togglea acá. Los roles finos (Editor/Manager/Finanzas/Agente) NO — se cambian en Equipo
                // para no pisarlos sin querer (bug: el select viejo los degradaba a "Empleado" al tocarlo).
                <select value={staff.role === 'admin' ? 'admin' : 'supervisor'} onChange={(e) => onChangeRole(staff.id, e.target.value)} disabled={isSelf}
                  className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                  <option value="admin">Admin (acceso total)</option>
                  <option value="supervisor">Empleado</option>
                </select>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-paper">
                  {({ producer: 'Editor', chatter: 'Manager', finance: 'Finanzas', agent: 'Agente' }[staff.role] || staff.role)}
                  <span className="text-[10px] text-paper-dim">· cambialo en <Link href="/equipo" className="text-brand hover:underline">Equipo</Link></span>
                </span>
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
                Borra esta cuenta para siempre, junto con todo lo que le pertenece (contenido, carpetas, identidad, pedidos y notificaciones). No se puede deshacer.
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
  // Rol dinámico — antes decía "Dueño · Administración" para cualquiera.
  const roleLabel = isOwnerAccount(me)
    ? 'Dueño · Administración'
    : me?.role === 'admin' ? 'Administración'
    : me?.job_title || 'Equipo';
  return (
    <PortalHeader
      section="Administración"
      sectionIcon={ShieldCheck}
      me={me}
      roleLabel={roleLabel}
      switchTo={{ href: '/trabajo', label: 'Trabajo' }}
      extras={<ImpersonateMenu creators={creators} />}
      homeHref="/admin"
      maxW="max-w-6xl"
    />
  );
}

// «Ver como…» ahora vive en components/ImpersonateMenu.jsx para poder reusarlo
// desde /trabajo (supervisores) y no solo desde /admin.
