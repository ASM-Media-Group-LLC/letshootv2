'use client';

// ─────────────────────────────────────────────────────────────────────────
// Propuesta pública — formato TRÍPTICO por look. Ruta dinámica /p/[linkId].
//   · Cada slide 100svh: INSPIRACIÓN + MODELO REAL = RESULTADO (hero).
//   · Feedback por look (❤ / ✕ / 💬), watermark + anti-descarga siempre.
//   · BACKEND real (migración 0062): get_proposal_by_link carga la propuesta
//     publicada y no vencida; save_proposal_feedback guarda el feedback.
//   · GATE DE REGISTRO obligatorio (si linkId !== 'demo'): el receptor crea una
//     CUENTA REAL de creadora (nombre + correo + contraseña, teléfono opcional
//     con banderita) vía edge function `proposal-register` — queda confirmada,
//     entra directo con signInWithPassword, sin mail de confirmación. Si el
//     correo ya existe → modo login inline (contraseña) + register_for_proposal.
//     El uuid del registro se guarda en estado y en localStorage
//     'ls_prop_reg_<linkId>' ({ id, name, email }) para no re-pedirlo acá.
//   · EXCEPCIÓN linkId === 'demo': preview interno del wizard (draft local en
//     'ls_propuesta_draft'), SIN backend y SIN gate.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, X, MessageSquare, ChevronDown, Lock, Clock, Send, User, Mail, ArrowRight, Sparkles, KeyRound, Eye, EyeOff, Check, Play, Pause, Download } from 'lucide-react';
import Logo from '@/components/Logo';
import { getSupabase } from '@/lib/supabase/client';
import { buildZip } from '@/lib/zip';
import { propDict, PROP_LANGS } from '@/lib/propuesta-i18n';
import { PROPOSAL_LOGOS } from '@/lib/proposal-logos';

const regKey = (id) => `ls_prop_reg_${id}`;
const pad2 = (n) => String(n).padStart(2, '0');
const EMAIL_RX = /^\S+@\S+\.\S+$/;

const DEMO = {
  v: 1,
  name: 'Selección editorial',
  subtitle: 'Verano · 2026',
  intro: 'Sentí el estilo antes de confirmar la sesión.',
  lang: 'es',
  days: 10,
  code: 'JP-VE26AF',
  expiresAt: '2026-09-15T23:59:59Z',
  model: { name: 'Julia Parker', agency: 'Kash Agency' },
  recipient: { name: 'Valentina Ríos', email: 'valentina@email.com', kind: 'prospect' },
  template: 'exclusive',
  coverUrl: '/model-latina.jpg',
  closingUrl: '/model-noche.jpg',
  looks: [
    { id: 'lk1', caption: 'Miami · Ocean Drive · golden hour', inspiration: '/card-locacion.jpg',     real: '/ba-before-1.jpg',       result: '/model-latina.jpg' },
    { id: 'lk2', caption: 'Resort · piscina · lifestyle',      inspiration: '/card-localizacion.jpg', real: '/result-5.jpg',          result: '/model-resort.jpg' },
    { id: 'lk3', caption: 'Noche urbana · neón',               inspiration: '/card-hd.jpg',           real: '/hero-real.jpg',         result: '/model-noche.jpg' },
    { id: 'lk4', caption: 'Editorial · moda',                  inspiration: '/card-moda.jpg',         real: '/ba-after-1.jpg',        result: '/model-europea.jpg' },
    { id: 'lk5', caption: 'Estudio · estilista',               inspiration: '/card-estilista.jpg',    real: '/ba-after-2.jpg',        result: '/result-4.jpg' },
    { id: 'lk6', caption: 'Cinemática · IA',                   inspiration: '/hero-poster.jpg',       real: '/hero-miami-poster.jpg', result: '/hero-ia.jpg' },
  ],
};

const EMPTY_FB = { status: null, note: '' };

// ── Idioma por GEO ────────────────────────────────────────────────────────
// La propuesta se abre en el idioma de quien la mira (según su ubicación), igual
// que la home: US/Canadá → inglés, resto de América → español, y Europa por el
// idioma del navegador (de/it/fr). Mapeado a los idiomas de la propuesta.
const US_CA_TZ = new Set([
  'America/New_York', 'America/Detroit', 'America/Toronto', 'America/Chicago',
  'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
  'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax',
  'America/Boise', 'America/Indiana/Indianapolis', 'America/Kentucky/Louisville',
  'America/Regina', 'America/St_Johns', 'Pacific/Honolulu',
]);
function detectPropLang() {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.startsWith('US/') || tz.startsWith('Canada/') || US_CA_TZ.has(tz)) return 'en';
      if (tz.startsWith('America/')) return 'es'; // resto de América = Latinoamérica
    } catch { /* ignore */ }
  }
  if (typeof navigator !== 'undefined') {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    const match = prefs.map((l) => (l || '').slice(0, 2).toLowerCase()).find((l) => PROP_LANGS.includes(l));
    if (match) return match;
  }
  return null; // sin señal clara → se usa el idioma con el que se armó la propuesta
}

// Mapea la fila cruda de get_proposal_by_link → cfg que consume el viewer.
// (el link_id hace de "code" del watermark/nav; looks ya viene como jsonb).
function mapRow(row) {
  const looks = Array.isArray(row?.looks)
    ? row.looks.filter((l) => l?.id && l?.inspiration && l?.real && l?.result)
    : [];
  return {
    v: 1,
    name: row?.name || '',
    subtitle: row?.subtitle || '',
    intro: row?.intro || '',
    lang: row?.lang || 'es',
    code: row?.link_id || '',
    expiresAt: row?.expires_at || null,
    model: { name: row?.model_name || 'LetShoot', agency: row?.model_agency || '' },
    recipient: { name: row?.recipient_name || '', email: row?.recipient_email || '' },
    dedication: row?.dedication || '',
    template: row?.template || 'exclusive',
    coverUrl: row?.cover_url || '',
    closingUrl: row?.closing_url || '',
    agencyLogoUrl: row?.agency_logo_url || '',
    logos: Array.isArray(row?.logos) ? row.logos : [],
    proposalType: ['visual', 'audio', 'both'].includes(row?.proposal_type) ? row.proposal_type : 'visual',
    audios: Array.isArray(row?.audios) ? row.audios.filter((a) => a?.id && a?.src) : [],
    approvalRequired: !!row?.approval_required,
    approvalStatus: row?.approval_status || null,       // 'pending' | 'approved' | 'rejected'
    approvalReviewer: row?.approval_reviewer_name || '',
    looks,
  };
}

// Fila de logos de plataformas (OnlyFans + redes) que el operador eligió — sale
// AL FINAL de la propuesta (pantalla de cierre). Chips glassy, mismo estilo que
// la home. OnlyFans es pastilla horizontal (su PNG es un wordmark); el resto,
// chips circulares con el SVG de su marca.
function ProposalLogos({ logos, className = 'mt-14', justify = 'center', compact = false }) {
  const sel = PROPOSAL_LOGOS.filter((l) => (logos || []).includes(l.key));
  if (!sel.length) return null;
  const pill = compact ? 'h-8 px-3' : 'h-10 px-4';
  const circ = compact ? 'h-8 w-8' : 'h-10 w-10';
  const imgH = compact ? 'h-3' : 'h-4';
  const svgH = compact ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]';
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${justify === 'start' ? 'justify-start' : 'justify-center'} ${className}`}>
      {sel.map((l) =>
        l.png ? (
          <span key={l.key} aria-label={l.label} title={l.label}
            className={`inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] backdrop-blur-md ${pill}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.png} alt={l.label} className={`${imgH} w-auto`} draggable={false} style={{ WebkitUserDrag: 'none' }} />
          </span>
        ) : (
          <span key={l.key} aria-label={l.label} title={l.label}
            className={`inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.06] backdrop-blur-md ${circ}`}>
            <svg viewBox="0 0 24 24" className={svgH} fill={l.color} aria-hidden><path d={l.path} /></svg>
          </span>
        )
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════
// Shell: carga la propuesta del link + decide gate de registro vs. viewer.
// ══════════════════════════════════════════════════════════════════════════

export default function PropuestaViewer({ linkId }) {
  const isDemo = linkId === 'demo';
  const [cfg, setCfg] = useState(DEMO);
  const [lang, setLang] = useState('es');
  const [reg, setReg] = useState(null); // { id, name, email } del registro
  const [phase, setPhase] = useState('loading'); // 'loading' | 'gate' | 'view' | 'unavailable'
  const [isPreview, setIsPreview] = useState(false); // ?preview=1 → vista del equipo (sin gate, solo lectura)
  // Modo APROBACIÓN: si el link trae ?approve=<token>, el que decide ve la
  // propuesta completa (sin gate) con barra Aprobar/Rechazar.
  const [approveToken, setApproveToken] = useState(null);
  // Quién mira: { staff: bool, name } si hay sesión (para separar el feedback
  // interno del de la creadora y atribuir la revisión).
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('lang');
    const qLang = q && PROP_LANGS.includes(q) ? q : null;

    // ── /p/demo: preview interno de los pasos 2-3 del wizard. Renderiza el
    //    DRAFT de trabajo del editor desde localStorage, SIN backend ni gate. ──
    if (isDemo) {
      let propLang = null;
      try {
        const raw = window.localStorage.getItem('ls_propuesta_draft');
        if (raw) {
          const d = JSON.parse(raw);
          const complete = Array.isArray(d?.looks)
            ? d.looks.filter((l) => l?.id && l?.inspiration && l?.real && l?.result)
            : [];
          const someAudio = Array.isArray(d?.audios) && d.audios.some((a) => a?.id && a?.src);
          if (d?.v === 1 && (complete.length > 0 || someAudio)) {
            setCfg({ ...DEMO, ...d, model: { ...DEMO.model, ...(d.model || {}) }, looks: complete });
            propLang = d.lang;
          }
        }
      } catch {}
      if (qLang) setLang(qLang);
      else if (propLang && PROP_LANGS.includes(propLang)) setLang(propLang);
      setPhase('view');
      return;
    }

    // ── Propuesta real: carga desde el backend vía RPC (sin sesión). ──
    let cancelled = false;
    (async () => {
      let row = null;
      try {
        const { data, error } = await getSupabase().rpc('get_proposal_by_link', { p_link: linkId });
        if (!error && Array.isArray(data) && data.length > 0) row = data[0];
      } catch {}
      if (cancelled) return;
      if (!row) { setPhase('unavailable'); return; }

      const mapped = mapRow(row);
      setCfg(mapped);
      // Prioridad: idioma por GEO (dónde está quien mira) → ?lang → idioma con el
      // que se armó la propuesta. El GEO manda: US/Canadá inglés, LatAm español,
      // Europa por el navegador; sin señal, cae al ?lang o al idioma guardado.
      const geoLang = detectPropLang();
      if (geoLang) setLang(geoLang);
      else if (qLang) setLang(qLang);
      else if (mapped.lang && PROP_LANGS.includes(mapped.lang)) setLang(mapped.lang);

      // Quién está mirando: si es STAFF logueado, su feedback va al bucket "equipo"
      // (interno) y no al de la creadora. Se resuelve una vez acá.
      let session = null;
      try { session = (await getSupabase().auth.getSession())?.data?.session || null; } catch {}
      let viewerInfo = null;
      if (session?.user?.id) {
        try {
          const { data: prof } = await getSupabase().from('profiles').select('role, full_name, stage_name').eq('id', session.user.id).maybeSingle();
          if (prof) {
            const staffRoles = ['admin', 'supervisor', 'producer', 'chatter'];
            viewerInfo = { staff: staffRoles.includes(prof.role), name: prof.full_name || prof.stage_name || session.user.email || '' };
          }
        } catch {}
      }
      if (cancelled) return;
      setViewer(viewerInfo);

      // Modo APROBACIÓN: ?approve=<token> → el que decide ve la propuesta completa
      // (sin gate) con barra Aprobar/Rechazar. Tiene prioridad sobre todo lo demás.
      const approveParam = new URLSearchParams(window.location.search).get('approve');
      // "Abierto" para el almacén: sólo cuando la mira la CREADORA/receptor (no
      // staff, no modo aprobación). Fire-and-forget, no bloquea el render.
      if (!approveParam && !viewerInfo?.staff) {
        try { getSupabase().rpc('mark_proposal_opened', { p_link: linkId }); } catch {}
      }
      if (approveParam) {
        setApproveToken(approveParam);
        setReg({ id: null, name: viewerInfo?.name || mapped.recipient?.name || '', email: '' });
        setPhase('view');
        return;
      }

      // Vista previa del EQUIPO (?preview=1, desde "Ver como cliente"): mostrar la
      // propuesta SIN el gate de registro y en modo solo-lectura (no guarda feedback).
      const previewParam = new URLSearchParams(window.location.search).get('preview');
      if (previewParam) {
        setIsPreview(true);
        setReg({ id: null, name: mapped.recipient?.name || '', email: '' });
        setPhase('view');
        return;
      }

      // Entrada por INVITACIÓN: el id del registro viaja en el link (?reg=…) →
      // saltamos el gate (el equipo ya la invitó). También salta si ya hay sesión
      // (usuaria con cuenta, entra directo) o si ya se registró en este dispositivo.
      const regParam = new URLSearchParams(window.location.search).get('reg');
      let saved = null;
      try {
        const raw = window.localStorage.getItem(regKey(linkId));
        if (raw) saved = JSON.parse(raw);
      } catch {}
      if (cancelled) return;

      if (regParam) {
        const r = { id: regParam, name: mapped.recipient?.name || '', email: mapped.recipient?.email || (session?.user?.email || '') };
        try { window.localStorage.setItem(regKey(linkId), JSON.stringify(r)); } catch {}
        setReg(r); setPhase('view');
      } else if (saved?.id) {
        setReg(saved); setPhase('view');
      } else if (session) {
        setReg({ id: null, name: mapped.recipient?.name || '', email: session.user?.email || '' });
        setPhase('view');
      } else {
        setPhase('gate');
      }
    })();
    return () => { cancelled = true; };
  }, [linkId, isDemo]);

  const t = propDict(lang);

  // Tras registrarse: guardar el uuid del registro y pasar DIRECTO a la propuesta.
  const onRegistered = (r) => {
    try { window.localStorage.setItem(regKey(linkId), JSON.stringify(r)); } catch {}
    setReg(r);
    setPhase('view');
  };

  if (phase === 'loading') return <div className="min-h-[100svh] bg-ink" />;
  if (phase === 'unavailable') return <Unavailable t={t} />;
  if (phase === 'gate') return <RegisterGate t={t} cfg={cfg} linkId={linkId} onDone={onRegistered} />;
  return (
    <>
      {/* Audio y fotos usan EXACTAMENTE el mismo cuerpo (portada, cierre, flujo). */}
      <ProposalBody t={t} cfg={cfg} linkId={linkId} reg={reg} isDemo={isDemo} viewer={viewer} preview={isPreview} />
      {approveToken && <ApproveBar lang={lang} linkId={linkId} token={approveToken} viewer={viewer} initialStatus={cfg.approvalStatus} reviewer={cfg.approvalReviewer} />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Barra de APROBACIÓN — la ve quien decide (link con ?approve=<token>). Aprueba
// o rechaza (con motivo). Aprobar → la edge function invita sola a la creadora.
// ══════════════════════════════════════════════════════════════════════════

function ApproveBar({ lang, linkId, token, viewer, initialStatus, reviewer }) {
  const es = lang !== 'en';
  // Si la propuesta YA fue decidida (aprobada/rechazada), arrancamos mostrando el
  // resultado — NO se aprueba ni rechaza dos veces.
  const [state, setState] = useState(
    initialStatus === 'approved' ? 'approved' : initialStatus === 'rejected' ? 'rejected' : 'idle'
  );
  const [reason, setReason] = useState('');
  const [who, setWho] = useState('');           // quién decide — queda como "quién aprobó"
  const [err, setErr] = useState('');
  // ¿La aprobación disparó el envío a la creadora? Con candado sí; un manager
  // "decide" de una copia NO (ella ya la tiene) — cambia el mensaje de éxito.
  const [sentToCreator, setSentToCreator] = useState(true);

  // Prellenar con el nombre del que mira si está logueado (equipo). Igual se
  // puede editar; si nadie está logueado, lo tiene que escribir.
  useEffect(() => { if (viewer?.name) setWho((w) => w || viewer.name); }, [viewer]);

  const decide = async (decision) => {
    const name = who.trim();
    if (!name) {
      setErr(es ? 'Poné tu nombre para dejar registro de quién decidió.' : 'Enter your name so we record who decided.');
      return;
    }
    setState('sending'); setErr('');
    try {
      const { data, error } = await getSupabase().functions.invoke('proposal-approval', {
        body: { action: 'decide', link_id: linkId, token, decision, reason: decision === 'rejected' ? reason.trim() : '', reviewer_name: name },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || (es ? 'No se pudo procesar.' : 'Could not process.'));
      if (decision === 'approved') setSentToCreator(!!data?.invited);
      setState(decision === 'approved' ? 'approved' : 'rejected');
    } catch (e) {
      setState('error'); setErr(e?.message || (es ? 'No se pudo procesar.' : 'Could not process.'));
    }
  };

  const wrap = 'fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-ink/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3.5 backdrop-blur-md';
  if (state === 'approved') {
    return (
      <div className={wrap}>
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2 text-sm font-semibold text-emerald-300">
          <Check size={16} /> {sentToCreator
            ? (es ? 'Aprobada — se le envió a la creadora.' : 'Approved — sent to the creator.')
            : (es ? 'Aprobada — quedó registrada para el equipo.' : 'Approved — recorded for the team.')}{reviewer ? (es ? ` · por ${reviewer}` : ` · by ${reviewer}`) : ''}
        </div>
      </div>
    );
  }
  if (state === 'rejected') {
    return (
      <div className={wrap}>
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2 text-sm font-semibold text-rose-300">
          <X size={16} /> {es ? 'Rechazada — el equipo queda avisado.' : 'Rejected — the team has been notified.'}{reviewer ? (es ? ` · por ${reviewer}` : ` · by ${reviewer}`) : ''}
        </div>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <div className="mx-auto w-full max-w-lg space-y-2.5">
        {/* Quién decide — queda registrado como "aprobada/rechazada por …". Se
            prellena con el equipo logueado; si no, lo escribe quien aprueba. */}
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-[12px] text-paper-dim">{es ? 'Decidís como' : 'Deciding as'}</label>
          <input
            value={who} onChange={(e) => setWho(e.target.value)}
            placeholder={es ? 'Tu nombre' : 'Your name'}
            className="min-w-0 flex-1 rounded-full border border-line bg-ink-2 px-3.5 py-2 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
          />
        </div>
        {state === 'rejecting' ? (
          <div className="space-y-2.5">
            <textarea
              autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder={es ? 'Motivo del rechazo (qué cambiar)…' : 'Reason for rejection (what to change)…'}
              className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setState('idle')} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-paper-mute hover:text-paper">
                {es ? 'Volver' : 'Back'}
              </button>
              <button type="button" onClick={() => decide('rejected')} disabled={state === 'sending'}
                className="flex-1 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {es ? 'Confirmar rechazo' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="hidden min-w-0 flex-1 truncate text-sm text-paper-mute sm:block">
              {es ? '¿Aprobás esta propuesta para la creadora?' : 'Approve this proposal for the creator?'}
            </span>
            <button type="button" onClick={() => setState('rejecting')} disabled={state === 'sending'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-paper hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-60 sm:flex-none sm:py-2.5">
              <X size={15} /> {es ? 'Rechazar' : 'Reject'}
            </button>
            <button type="button" onClick={() => decide('approved')} disabled={state === 'sending'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 sm:flex-none sm:py-2.5">
              <Check size={15} /> {state === 'sending' ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Aprobar y enviar' : 'Approve & send')}
            </button>
          </div>
        )}
        {err && <p className="mt-2 text-center text-[12px] text-rose-300">{err}</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Pantalla amable cuando el link no existe / está archivado / vencido.
// ══════════════════════════════════════════════════════════════════════════

function Unavailable({ t }) {
  return (
    <div
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16 text-paper"
      style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))', paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
    >
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative w-full max-w-sm text-center">
        <div className="flex justify-center"><Logo size="lg" forceDark /></div>
        <div className="mx-auto mt-8 grid h-12 w-12 place-items-center rounded-full border border-line bg-card">
          <Clock size={20} className="text-paper-mute" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-paper">{t.unavailableTitle}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-paper-mute">{t.unavailableSub}</p>
        <Link href="/" className="mt-7 inline-block text-sm font-semibold text-brand hover:underline">LetShoot</Link>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Gate de registro — crea la CUENTA REAL de creadora (email + contraseña) vía
// edge function `proposal-register` y entra directo (signInWithPassword). Si el
// correo ya existe → modo login inline. Teléfono opcional con banderita (E.164).
// ══════════════════════════════════════════════════════════════════════════

function RegisterGate({ t, cfg, linkId, onDone }) {
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [name, setName] = useState(cfg.recipient?.name || '');
  const [email, setEmail] = useState(cfg.recipient?.email || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    setName((v) => v || cfg.recipient?.name || '');
    setEmail((v) => v || cfg.recipient?.email || '');
  }, [cfg]);

  const emailOk = EMAIL_RX.test(email.trim());
  const valid = mode === 'login'
    ? emailOk && password.length >= 1
    : name.trim().length > 0 && emailOk && password.length >= 8;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setErr('');
    const sb = getSupabase();
    try {
      if (mode === 'register') {
        // 1) Crea la cuenta real + registro ligado a la propuesta (server-side).
        const { data, error } = await sb.functions.invoke('proposal-register', {
          body: { link_id: linkId, email: email.trim(), password, full_name: name.trim() },
        });
        if (error) throw error;
        if (!data?.ok) {
          // El correo ya tiene cuenta → pasar a login inline (conserva la contraseña escrita).
          if (data?.exists) { setMode('login'); setErr(t.regLoginSub); setBusy(false); return; }
          throw new Error(data?.error || t.regError);
        }
        // 2) Inicia sesión para entrar con sesión real (cuenta ya confirmada).
        await sb.auth.signInWithPassword({ email: email.trim(), password });
        onDone({ id: data.registration_id || null, name: name.trim(), email: email.trim() });
      } else {
        // Modo login: autentica y registra el lead de ESTA propuesta (la cuenta ya existía).
        const { error: sErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (sErr) { setBusy(false); setErr(t.regWrongPass); return; }
        let rid = null;
        try {
          const { data } = await sb.rpc('register_for_proposal', {
            p_link: linkId, p_name: (name.trim() || cfg.recipient?.name || email.trim()),
            p_email: email.trim(), p_phone: null,
          });
          rid = typeof data === 'string' ? data : (Array.isArray(data) ? data[0] : data) || null;
        } catch {}
        onDone({ id: rid, name: name.trim() || cfg.recipient?.name || '', email: email.trim() });
      }
    } catch (e2) {
      setBusy(false);
      setErr(e2?.message || t.regError);
    }
  };

  const bgUrl = cfg.coverUrl || '';
  const inputCls = 'w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3.5 text-base text-paper placeholder:text-paper-dim outline-none focus:border-brand/60 sm:py-2.5 sm:text-sm';
  const isLogin = mode === 'login';

  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-4 py-10 text-paper" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
      {bgUrl && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgUrl} alt="" className="h-full w-full scale-110 object-cover blur-2xl" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          <div className="absolute inset-0 bg-ink/80" />
        </div>
      )}
      <form onSubmit={submit} className="card3d relative z-10 w-full max-w-sm rounded-3xl border border-line bg-card p-7 shadow-glow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            {cfg.agencyLogoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.agencyLogoUrl} alt="" className="h-11 w-auto max-w-[150px] object-contain" draggable={false} style={{ WebkitUserDrag: 'none' }} />
                <span className="text-3xl font-light leading-none text-white/45">+</span>
              </>
            )}
            <Logo size="lg" forceDark />
          </div>
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <Sparkles size={13} /> {cfg.model?.name || t.privateSel}
          </span>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-paper">{isLogin ? t.regLoginTitle : t.regTitle}</h1>
          <p className="mt-1.5 text-sm text-paper-mute">{isLogin ? t.regLoginSub : t.regSub}</p>
          {/* Contexto: qué propuesta es (para no perder de qué se trata). */}
          {cfg.name && (
            <span className="mt-3 inline-block max-w-full truncate rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/75">
              {cfg.name}{cfg.recipient?.name ? ` · ${cfg.recipient.name}` : ''}
            </span>
          )}
        </div>

        {!isLogin && (
          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.recipName}</span>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.recipNamePh} className={inputCls} />
            </div>
          </label>
        )}

        <label className={`${isLogin ? 'mt-6' : 'mt-4'} block`}>
          <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.recipEmail}</span>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.recipEmailPh} className={inputCls} />
          </div>
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.regPassword}</span>
          <div className="relative">
            <KeyRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '••••••••' : t.regPasswordPh}
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? t.regHide : t.regShow}
              className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-paper-dim hover:text-paper"
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {err && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}

        <button
          type="submit"
          disabled={!valid || busy}
          className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
        >
          {busy ? (isLogin ? t.regLoginSending : t.regSending) : (isLogin ? t.regLoginCta : t.regCta)}
          {!busy && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>

        {isLogin ? (
          <button
            type="button"
            onClick={() => { setMode('register'); setErr(''); setPassword(''); }}
            className="mt-3 block w-full text-center text-xs font-semibold text-paper-mute hover:text-paper"
          >
            {t.regOtherEmail}
          </button>
        ) : (
          <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-dim">
            <Lock size={10} /> {t.regHint}
          </div>
        )}
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Viewer tríptico (el componente original de /p/demo, ya sin carga propia).
// ══════════════════════════════════════════════════════════════════════════


// Reproductor de audio MINIMALISTA (para la propuesta de audio): play/pausa +
// barra ARRASTRABLE con el dedo (adelante/atrás, como WhatsApp) + tiempo. Sin
// volumen ni menú de 3 puntitos del navegador.
function AudioPlayer({ src }) {
  const ref = useRef(null);
  const trackRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fmt = (s) => { if (!s || !Number.isFinite(s)) return '0:00'; const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${String(ss).padStart(2, '0')}`; };
  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); };

  // Posición (en segundos) a partir del X del dedo/mouse sobre la barra.
  const timeAt = (clientX) => {
    const el = trackRef.current; if (!el || !dur) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  };
  const applySeek = (clientX) => {
    if (!dur) return;
    const t = timeAt(clientX);
    setCur(t);
    if (ref.current) ref.current.currentTime = t; // scrub en vivo
  };
  const onDown = (e) => {
    if (!dur) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    setDragging(true);
    applySeek(e.clientX);
  };
  const onMove = (e) => { if (dragging) applySeek(e.clientX); };
  const onUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  };

  const pct = dur ? (cur / dur) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => { if (!dragging) setCur(ref.current?.currentTime || 0); }}
        onLoadedMetadata={() => setDur(ref.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setCur(0); }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-accent shadow-glow-sm transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
      </button>
      {/* Área de agarre alta (h-6) para que sea fácil arrastrar en el teléfono;
          touch-none evita que la página haga scroll mientras arrastrás. */}
      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="flex h-6 min-w-0 flex-1 cursor-pointer touch-none select-none items-center"
      >
        <div className="relative h-1.5 w-full rounded-full bg-white/15">
          <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${pct}%` }} />
          <div className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${dragging ? 'scale-125' : ''}`} style={{ left: `${pct}%` }} />
        </div>
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/70">{playing || cur > 0 ? fmt(cur) : fmt(dur)}</span>
    </div>
  );
}

function ProposalBody({ t, cfg, linkId, reg, isDemo, viewer, preview = false }) {
  // Mismo formato para fotos y audios. Para audio, los "looks" son los audios
  // (cada uno { id, label, src }); la portada, el cierre, el feedback y el flujo
  // son idénticos — solo cambia lo que se muestra en cada pantalla.
  const isAudio = cfg.proposalType === 'audio';
  const wantsVisual = cfg.proposalType !== 'audio';                        // visual o ambas
  const wantsAudio = cfg.proposalType === 'audio' || cfg.proposalType === 'both';
  const photos = wantsVisual ? (cfg.looks || []) : [];
  const audios = wantsAudio ? (cfg.audios || []) : [];
  const looks = [...photos, ...audios];   // combinado: alimenta stats, envío y el observer
  const total = looks.length;
  const audioIdx = photos.length;         // la sección de audios ocupa UNA pantalla, después de las fotos

  // El título y el intro por defecto (los del molde) se localizan al idioma de
  // quien mira; si el equipo los editó a mano, se respetan tal cual.
  const storedLang = cfg.lang || 'es';
  const dispName = cfg.name && propDict(storedLang)?.redesName === cfg.name ? (t.redesName || cfg.name) : cfg.name;
  const dispIntro = cfg.intro && propDict(storedLang)?.redesIntro === cfg.intro ? (t.redesIntro || cfg.intro) : cfg.intro;

  const [state, setState] = useState({});
  const [openComment, setOpenComment] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);       // popup de descarga de fotos
  const [dlBusy, setDlBusy] = useState('');           // '' | 'aprobadas' | 'todas' (preparando)
  const [dlErr, setDlErr] = useState('');
  const [dlReady, setDlReady] = useState(null);       // { imgFiles, zip, fname, count } tras preparar
  const [dlDone, setDlDone] = useState('');           // '' | 'shared' (teléfono) | 'zip' (compu) — confirmación
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const slidesRef = useRef([]);
  const coverRef = useRef(null);
  const closingRef = useRef(null);

  const fb = (id) => state[id] || EMPTY_FB;
  const setLook = (id, patch) => setState((s) => ({ ...s, [id]: { ...(s[id] || EMPTY_FB), ...patch } }));
  const scrollTo = (i) => (i === -1 ? coverRef.current : slidesRef.current[i])?.scrollIntoView({ behavior: 'smooth' });

  const stats = useMemo(() => {
    const v = looks.map((l) => fb(l.id));
    return {
      liked: v.filter((x) => x.status === 'liked').length,
      rejected: v.filter((x) => x.status === 'rejected').length,
      commented: v.filter((x) => x.note?.trim()).length,
      // Sin decidir = ni me gusta ni paso. Hay que decidir TODAS para terminar.
      undecided: v.filter((x) => x.status !== 'liked' && x.status !== 'rejected').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, looks]);

  // Lleva a la primera foto/audio sin decidir (para poder terminar).
  const scrollToFirstUndecided = () => {
    const idx = looks.findIndex((l) => { const s = fb(l.id).status; return s !== 'liked' && s !== 'rejected'; });
    if (idx < 0) return;
    scrollTo(idx < photos.length ? idx : audioIdx);
  };
  // Revisar de nuevo = volver al inicio para cambiar lo que se confundió (guarda
  // las marcas). Si ya había enviado, reabre para poder terminar otra vez.
  const reviewAgain = () => { setSent(false); scrollTo(-1); };

  // ── RETOMAR: progreso PARCIAL (borrador) ──────────────────────────────────
  // Si cierra a medias, retoma donde quedó. Se guarda en las DOS: localStorage
  // (mismo aparato, instantáneo) y la cuenta (DB, cross-device por el link). NO
  // en preview/demo. Al TERMINAR ya no hace falta (queda el feedback real).
  const skipProgress = isDemo || preview;
  const progressKind = viewer?.staff ? 'internal' : 'creator';
  const PROG_KEY = `ls_prop_prog_${linkId}_${progressKind}`;
  // Guardamos POR kind (no un solo booleano): la sesión del equipo puede resolver
  // tarde y cambiar 'creator'→'internal'; hay que recargar con el kind correcto.
  const loadedKindRef = useRef('');
  const scoreItems = (arr) => (Array.isArray(arr) ? arr.filter((x) => x?.status === 'liked' || x?.status === 'rejected').length : -1);

  // Cargar el borrador para RETOMAR (elige el más avanzado entre aparato y
  // cuenta). Se re-evalúa si cambia el kind; solo aplica si aún no marcó nada.
  useEffect(() => {
    if (skipProgress || !linkId || total === 0 || loadedKindRef.current === progressKind) return;
    loadedKindRef.current = progressKind;
    (async () => {
      let local = null;
      try { const raw = localStorage.getItem(PROG_KEY); if (raw) local = JSON.parse(raw); } catch {}
      let remote = null;
      try {
        const { data } = await getSupabase().rpc('get_proposal_progress', { p_link: linkId, p_kind: progressKind });
        if (Array.isArray(data)) remote = data;
      } catch {}
      // Elegimos el borrador más avanzado (aparato vs cuenta). NO se aborta en el
      // cleanup: el componente puede remontar y setState en el viejo es no-op; el
      // que quede montado restaura. Solo aplica si aún no marcó nada.
      const pick = scoreItems(remote) >= scoreItems(local) ? remote : local;
      if (pick && pick.length && scoreItems(pick) > 0) {
        const st = {};
        for (const it of pick) if (it?.id) st[it.id] = { status: (it.status === 'liked' || it.status === 'rejected') ? it.status : null, note: it.note || '' };
        setState((cur) => (Object.keys(cur).length ? cur : st));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipProgress, linkId, total, progressKind]);

  // Autoguardar (debounced) apenas marca algo — a las dos (aparato + cuenta).
  useEffect(() => {
    if (skipProgress || sent || loadedKindRef.current !== progressKind) return;
    const items = looks.map((l) => { const s = fb(l.id); return { id: l.id, status: s.status ?? null, note: s.note || '' }; });
    if (!items.some((i) => i.status || (i.note || '').trim())) return;
    const to = setTimeout(() => {
      try { localStorage.setItem(PROG_KEY, JSON.stringify(items)); } catch {}
      getSupabase().rpc('save_proposal_progress', { p_link: linkId, p_items: items, p_kind: progressKind }).then(() => {}, () => {});
    }, 700);
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sent, skipProgress, progressKind]);

  useEffect(() => {
    const block = (e) => { if (e.target?.tagName === 'IMG') e.preventDefault(); };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    const onKey = (e) => { if (e.key === 'Escape') setOpenComment(null); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          const idx = Number(e.target.dataset.idx);
          if (!Number.isNaN(idx)) setCurrentIdx(idx);
        }
      });
    }, { threshold: [0.55, 0.75] });
    [coverRef.current, ...slidesRef.current].forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [looks]);

  // El resumen NO se abre solo: aparece únicamente cuando la persona toca
  // "Enviar feedback" al final (evita el pop-up intrusivo a mitad de camino).

  const sendFeedback = async () => {
    if (sending) return;
    const items = looks.map((l) => {
      const st = fb(l.id);
      return { id: l.id, caption: l.caption || l.label || '', result: l.result || l.src || null, status: st.status ?? null, note: st.note || '' };
    });
    // /p/demo (preview del wizard) y ?preview=1 (vista del equipo): sin backend ni
    // registro → confirmación local, NO se guarda feedback (evita datos basura).
    if (isDemo || preview) { setSent(true); setSummaryOpen(false); return true; }
    setSending(true);
    setSendErr('');
    try {
      // Si mira un STAFF logueado, su feedback va al bucket 'internal' (equipo),
      // aparte del de la creadora ('creator') — no se pisan.
      const isStaff = !!viewer?.staff;
      const { error } = await getSupabase().rpc('save_proposal_feedback', {
        p_link: linkId,
        p_reg: reg?.id || null,
        p_items: items,
        p_name: isStaff ? (viewer.name || 'Equipo') : (reg?.name || cfg.recipient?.name || ''),
        p_kind: isStaff ? 'internal' : 'creator',
      });
      if (error) throw error;
      setSent(true);
      setSummaryOpen(false);
      // Aviso al equipo: si respondió la CREADORA (no staff), le llega un correo
      // a quien armó la propuesta. Fire-and-forget, no bloquea la confirmación.
      if (!isStaff) {
        try { getSupabase().functions.invoke('proposal-notify', { body: { link_id: linkId } }); } catch {}
      }
      return true;
    } catch (e) {
      setSendErr(e?.message || t.regError);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Terminar Y descargar en un solo botón: guarda el feedback y, si le gustó
  // alguna, abre de una la descarga de sus favoritas. Si no le gustó ninguna,
  // solo termina (no hay nada que bajar).
  const finishAndDownload = async () => {
    if (sending) return;
    const ok = await sendFeedback();
    if (ok && stats.liked > 0 && photosWithResult.length > 0) {
      setDlErr(''); setDlReady(null); setDlDone(''); setDlOpen(true);
    }
  };

  // ── Descarga de fotos CREADAS (result) en un ZIP ordenado ──────────────────
  // onlyLiked → solo las que gustaron; si no, todas las de la propuesta. NUNCA la
  // de inspiración ni la de modelo real. "De golpe" en un solo .zip.
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).toLowerCase();
  const photosWithResult = photos.filter((l) => l.result);

  // PASO 1 — Preparar: baja las fotos CREADAS (result) y arma tanto los archivos
  // individuales (para la hoja de compartir del teléfono → van a Fotos/galería)
  // como un ZIP (para computadora). NUNCA inspiración ni modelo real.
  const preparePhotos = async (onlyLiked) => {
    if (dlBusy) return;
    const set = photosWithResult.filter((l) => !onlyLiked || fb(l.id).status === 'liked');
    if (!set.length) { setDlErr(onlyLiked ? (t.dlNoneLiked || 'Todavía no marcaste ninguna que te guste.') : (t.dlNone || 'No hay fotos para bajar.')); return; }
    setDlErr(''); setDlReady(null); setDlBusy(onlyLiked ? 'aprobadas' : 'todas');
    try {
      const base = slug(cfg.recipient?.name) || slug(cfg.name) || 'letshoot';
      const zipItems = []; const imgFiles = [];
      for (let i = 0; i < set.length; i++) {
        const l = set[i];
        const res = await fetch(l.result, { mode: 'cors' });
        if (!res.ok) continue;
        const blob = await res.blob();
        const buf = new Uint8Array(await blob.arrayBuffer());
        const ext = ((l.result.split('?')[0].split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp').slice(0, 4);
        const name = `${base}-${pad2(i + 1)}.${ext}`;
        zipItems.push({ name, data: buf });
        imgFiles.push(new File([blob], name, { type: blob.type || 'image/webp' }));
      }
      if (!imgFiles.length) throw new Error('fetch');
      const zip = buildZip(zipItems);
      const fname = `${base}-${cfg.code || 'fotos'}-${onlyLiked ? 'aprobadas' : 'todas'}.zip`;
      setDlReady({ imgFiles, zip, fname, count: imgFiles.length });
    } catch { setDlErr(t.dlError || 'No se pudieron bajar las fotos. Reintentá.'); }
    finally { setDlBusy(''); }
  };

  // PASO 2 — Guardar (con gesto fresco → iOS no lo bloquea): en teléfono usa la
  // hoja de compartir con las FOTOS (se guardan en Fotos / se mandan a WhatsApp);
  // en computadora baja el ZIP.
  const savePhotos = async () => {
    if (!dlReady) return;
    const { imgFiles, zip, fname } = dlReady;
    try {
      if (navigator.canShare && navigator.canShare({ files: imgFiles })) {
        await navigator.share({ files: imgFiles, title: 'Fotos LetShoot' });
        setDlDone('shared'); setDlReady(null);   // el share sheet terminó → confirmar
        return;
      }
    } catch (e) { if (e?.name === 'AbortError') return; /* si falla el share, cae al ZIP */ }
    try {
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      setDlDone('zip'); setDlReady(null);
    } catch { setDlErr(t.dlError || 'No se pudieron guardar. Reintentá.'); }
  };

  return (
    <div className="bg-ink text-paper" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Vista de equipo (?preview=1 / "Ver como cliente"): SOLO LECTURA. Aviso
          claro y fijo de que lo que se marque acá NO se guarda — así el equipo
          revisa la propuesta sin confundirse ni ensuciar los números reales. */}
      {preview && !isDemo && (
        <div className="fixed inset-x-0 top-0 z-[75] flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-[12px] font-bold text-black">
          <Eye size={13} /> Vista de equipo · solo lectura — lo que marques aquí NO se guarda
        </div>
      )}

      {/* Preview del editor (/p/demo): botón para VOLVER al editor. Cierra esta
          pestaña (se abrió con window.open); si no puede, va atrás en el historial. */}
      {isDemo && (
        <button
          type="button"
          onClick={() => { try { window.close(); } catch {} setTimeout(() => { try { if (!window.closed) window.history.back(); } catch {} }, 120); }}
          className="fixed left-3 top-[calc(env(safe-area-inset-top,0px)+0.9rem)] z-[70] inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/85 sm:left-6 sm:top-6"
        >
          <ArrowRight size={14} className="rotate-180" /> Volver al editor
        </button>
      )}

      {/* (El co-branding KASH + LetShoot vive DENTRO de la portada — abajo — para
          poder bajarlo bien sin chocar con los looks al scrollear.) */}

      {/* (Sin badge de código ni contador arriba-derecha: portada limpia.) */}

      {/* Progreso lateral (dots verticales) — solo en fotos (una por pantalla). */}
      {!isAudio && (
      <div className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => scrollTo(-1)} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/60 backdrop-blur hover:bg-white/20" title={t.backToCover}>◄</button>
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-1.5 w-1.5 rounded-full transition-all ${
              currentIdx === i ? 'h-6 bg-brand shadow-[0_0_12px_rgba(0,177,246,0.7)]' : 'bg-white/25 hover:bg-white/50'
            }`}
            aria-label={`${t.look} ${i + 1}`}
          />
        ))}
      </div>
      )}

      {/* BARRA DE PROGRESO pegada arriba — SIEMPRE visible: cuántas decididas de
          todas (se llena). Clic → salta a la primera sin decidir (o al cierre si
          ya están todas). Es lo que la empuja a marcar cada una. */}
      {total > 0 && (
      <button
        type="button"
        onClick={() => (stats.undecided > 0 ? scrollToFirstUndecided() : closingRef.current?.scrollIntoView({ behavior: 'smooth' }))}
        className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+0.7rem)] z-[45] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/15 bg-black/65 px-3.5 py-2 backdrop-blur-md transition-colors hover:bg-black/80 sm:top-5"
        title={stats.undecided > 0 ? `${stats.undecided} ${t.leftToDecide || 'por decidir'}` : (t.feedbackSent || '')}
      >
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20 sm:w-24">
          <span
            className={`block h-full rounded-full transition-all duration-300 ${stats.undecided === 0 ? 'bg-emerald-400' : 'bg-brand'}`}
            style={{ width: `${Math.round(((total - stats.undecided) / total) * 100)}%` }}
          />
        </span>
        <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 tabular-nums">
          {stats.undecided === 0
            ? <span className="inline-flex items-center gap-1 text-emerald-300"><Check size={11} /> {total}/{total}</span>
            : <>{total - stats.undecided}/{total} <span className="text-white/50">{t.decided || 'decididas'}</span></>}
        </span>
      </button>
      )}

      {/* Contador flotante bottom-left — solo en fotos. */}
      {!isAudio && (
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-3 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:bottom-6 sm:left-6">
        <span>{pad2(Math.max(currentIdx + 1, 0))} / {pad2(total)}</span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <Heart size={10} fill="currentColor" /> {stats.liked}
        </span>
        <span className="inline-flex items-center gap-1 text-rose-300">
          <X size={10} /> {stats.rejected}
        </span>
      </div>
      )}

      {/* ═════════════ COVER ═════════════ */}
      <section
        ref={coverRef}
        data-idx="-1"
        className="relative flex h-[100svh] w-full items-center overflow-hidden bg-ink"
      >
        <div className="absolute inset-0">
          {/* Si NO hay foto de portada, queda en negro (no se usa la del look). */}
          {cfg.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.coverUrl} alt="" className="h-full w-full object-cover object-[center_30%]" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
          <Watermark code={cfg.code} uid="cover" />
        </div>

        {/* Co-branding KASH + LetShoot — centrado, bien abajo del borde, sin cajas.
            KASH un punto más grande que LetShoot (glifos medidos) para presencia. */}
        <div className="absolute inset-x-0 top-12 z-20 flex justify-center sm:top-20">
          <div className="flex origin-center scale-[0.72] items-center gap-4 sm:scale-100 sm:gap-5">
            {cfg.agencyLogoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.agencyLogoUrl} alt="" className="h-[54px] w-auto max-w-[200px] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:h-[58px]" draggable={false} style={{ WebkitUserDrag: 'none' }} />
                <span className="text-3xl font-light leading-none text-white/75 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl">+</span>
              </>
            )}
            <Logo size="lg" forceDark className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
          </div>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 sm:py-20">
          {/* Rótulo chico = título del paquete ("Contenido para tus redes"). */}
          {cfg.recipient?.name && dispName && (
            <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55 sm:text-xs">
              {dispName}
            </div>
          )}
          {/* Hero gigante = el NOMBRE de la creadora (la protagonista, sin "Preparada para"). */}
          <h1 className="font-display text-[clamp(2.8rem,8.5vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]">
            {cfg.recipient?.name || dispName}
            {/* El subtítulo solo sale si hay uno (por defecto va vacío). */}
            {cfg.subtitle && (
              <span className="mt-1 block text-[clamp(1.1rem,2.4vw,1.75rem)] font-medium italic text-white/70">
                {cfg.subtitle}
              </span>
            )}
          </h1>
          <p className="mt-5 max-w-sm text-[12.5px] leading-relaxed text-white/70 sm:text-[13.5px]">
            {dispIntro}
          </p>
          <button
            onClick={() => scrollTo(0)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
          >
            {t.start} <ChevronDown size={16} />
          </button>
          {/* Logos de plataformas también en la portada (igual que al final). */}
          <ProposalLogos logos={cfg.logos} justify="start" className="mt-8" />
        </div>
      </section>

      {/* ═════════════ CONTENIDO ═════════════ */}
      {/* FOTOS — una pantalla por look (visual o ambas). Va PRIMERO. */}
      {wantsVisual && photos.map((l, i) => {
        const st = fb(l.id);
        const active = currentIdx === i;
        const fade = `transition-opacity duration-700 ease-out delay-500 ${active ? 'opacity-100' : 'opacity-0'}`;
        return (
          <section
            key={l.id}
            ref={(el) => (slidesRef.current[i] = el)}
            data-idx={i}
            className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink px-4 py-3 sm:px-10 sm:py-6"
          >
            {/* Desktop: UN SOLO CUADRO dividido — las tres fotos pegadas (sin
                «+»/«=»), esquinas redondeadas solo por fuera (overflow-hidden en
                el marco), y líneas finas de 2px separando las celdas (vienen del
                gap sobre un fondo claro). Izquierda 2 apiladas, derecha el
                resultado grande. El texto va sobre la foto del resultado. */}
            <div className="mx-auto hidden h-[74svh] aspect-[13/10] overflow-hidden rounded-3xl bg-white/10 shadow-glow ring-1 ring-brand/25 sm:flex gap-[2px] [perspective:1200px]">
              {/* Fuentes: dos celdas apiladas, mitad y mitad de la altura */}
              <div className="flex h-full basis-[38%] flex-col gap-[2px]">
                <div className="relative min-h-0 flex-1">
                  <Shot src={l.inspiration} alt={l.caption} label={t.inspiration} dot="bg-amber-400" code={cfg.code} uid={`${l.id}-in`} active={active} delay="delay-0" className="h-full w-full ring-0" />
                </div>
                <div className="relative min-h-0 flex-1">
                  <Shot src={l.real} alt={l.caption} label={t.realModel} dot="bg-emerald-400" code={cfg.code} uid={`${l.id}-re`} active={active} delay="delay-150" className="h-full w-full ring-0" />
                </div>
              </div>
              {/* Resultado: celda grande, caption superpuesto abajo */}
              <div className="relative h-full basis-[62%]">
                <Shot src={l.result} alt={l.caption} label={t.aiResult} dot="bg-brand" big code={cfg.code} uid={`${l.id}-ai`} active={active} delay="delay-300" className="h-full w-full ring-0" />
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-4 pt-12 ${fade}`}>
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-sm text-white/90">{l.caption}</div>
                    <div className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      {t.look} {pad2(i + 1)} · {pad2(photos.length)}
                    </div>
                  </div>
                  {st.note?.trim() && (
                    <div className="mt-2 flex items-start gap-1.5 text-[13px] italic text-white/80">
                      <MessageSquare size={12} className="mt-0.5 shrink-0" />
                      <span>{st.note.trim()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: MISMO lenguaje "cuadro dividido" en vertical — el RESULTADO
                protagonista arriba y las dos fuentes (inspiración + modelo real)
                como fila pegada debajo, todo en un marco con líneas de 2px. Sin
                «+»/«=»; caption superpuesto sobre el resultado. */}
            <div className="w-full sm:hidden [perspective:1200px]">
              <div className="flex h-[80svh] w-full flex-col gap-[2px] overflow-hidden rounded-3xl bg-white/10 shadow-glow ring-1 ring-brand/25">
                {/* Resultado: celda grande y bien vertical (protagonista), caption abajo */}
                <div className="relative min-h-0 flex-[2.9]">
                  <Shot src={l.result} alt={l.caption} label={t.aiResult} dot="bg-brand" big code={cfg.code} uid={`${l.id}-mai`} active={active} delay="delay-300" className="h-full w-full ring-0" />
                  <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-14 ${fade}`}>
                    <div className="pr-20">
                      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        {t.look} {pad2(i + 1)} · {pad2(photos.length)}
                      </div>
                      <div className="mt-1 text-[15px] leading-snug text-white/95">{l.caption}</div>
                      {st.note?.trim() && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-[13px] italic text-white/80">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" />
                          <span>{st.note.trim()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Fuentes: dos celdas pegadas, mitad y mitad del ancho */}
                <div className="flex min-h-0 flex-1 gap-[2px]">
                  <Shot src={l.inspiration} alt={l.caption} label={t.inspiration} dot="bg-amber-400" code={cfg.code} uid={`${l.id}-min`} active={active} delay="delay-0" className="h-full flex-1 ring-0" />
                  <Shot src={l.real} alt={l.caption} label={t.realModel} dot="bg-emerald-400" code={cfg.code} uid={`${l.id}-mre`} active={active} delay="delay-150" className="h-full flex-1 ring-0" />
                </div>
              </div>
            </div>

            {/* Feedback flotante por look */}
            <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6 sm:gap-3">
              <BigActionBtn
                active={st.status === 'liked'}
                onClick={() => setLook(l.id, { status: st.status === 'liked' ? null : 'liked' })}
                tone="like"
                label={t.like}
              >
                <Heart size={20} fill={st.status === 'liked' ? 'currentColor' : 'none'} />
              </BigActionBtn>
              <BigActionBtn
                active={st.status === 'rejected'}
                onClick={() => setLook(l.id, { status: st.status === 'rejected' ? null : 'rejected' })}
                tone="reject"
                label={t.reject}
              >
                <X size={20} />
              </BigActionBtn>
              <BigActionBtn
                active={!!st.note?.trim()}
                onClick={() => setOpenComment(l.id)}
                tone="comment"
                label={t.comment}
              >
                <MessageSquare size={18} />
              </BigActionBtn>
            </div>
          </section>
        );
      })}

      {/* AUDIOS — sección aparte (audio o ambas). Va DESPUÉS de las fotos. */}
      {wantsAudio && (
        <section
          ref={(el) => (slidesRef.current[audioIdx] = el)}
          data-idx={audioIdx}
          className="relative flex w-full flex-col justify-center overflow-hidden px-5 py-20 sm:min-h-[100svh] sm:py-16"
          style={{ background: 'radial-gradient(120% 60% at 82% 4%, rgba(0,177,246,0.30), transparent 55%), linear-gradient(165deg, #0a2434 0%, #08131d 60%, #04121a 100%)' }}
        >
          <Watermark code={cfg.code} uid="audios" />
          <div className="relative z-10 mx-auto w-full max-w-xl">
            <div className="mb-5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(0,177,246,0.9)]" /> {t.audios || 'Audios'} · {pad2(audios.length)}
            </div>
            <div className="space-y-3">
              {audios.map((l, i) => {
                const st = fb(l.id);
                return (
                  <div key={l.id} className={`rounded-2xl border bg-ink/45 p-3.5 backdrop-blur-xl transition-colors ${st.status === 'liked' ? 'border-emerald-400/55' : st.status === 'rejected' ? 'border-rose-400/45' : 'border-white/12'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-white/40">{pad2(i + 1)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{l.label || `${t.audio || 'Audio'} ${pad2(i + 1)}`}</span>
                    </div>
                    <div className="mt-3">
                      <AudioPlayer src={l.src} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" onClick={() => setLook(l.id, { status: st.status === 'liked' ? null : 'liked' })}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${st.status === 'liked' ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.25)]' : 'border-white/15 text-white/75 hover:border-white/35 hover:text-white'}`}>
                        <Heart size={14} fill={st.status === 'liked' ? 'currentColor' : 'none'} /> {t.like}
                      </button>
                      <button type="button" onClick={() => setLook(l.id, { status: st.status === 'rejected' ? null : 'rejected' })}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${st.status === 'rejected' ? 'border-rose-400/70 bg-rose-500/25 text-rose-50 shadow-[0_0_18px_rgba(251,113,133,0.22)]' : 'border-white/15 text-white/75 hover:border-white/35 hover:text-white'}`}>
                        <X size={14} /> {t.reject}
                      </button>
                      <button type="button" onClick={() => setOpenComment(l.id)}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all ${st.note?.trim() ? 'border-brand/70 bg-brand/15 text-brand' : 'border-white/15 text-white/75 hover:border-white/35 hover:text-white'}`}>
                        <MessageSquare size={14} />
                      </button>
                    </div>
                    {st.note?.trim() && (
                      <p className="mt-2.5 flex items-start gap-1.5 text-[12px] italic text-white/70">
                        <MessageSquare size={12} className="mt-0.5 shrink-0" /><span>{st.note.trim()}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═════════════ CIERRE ═════════════ */}
      <section ref={closingRef} className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink px-6 py-24">
        {cfg.closingUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cfg.closingUrl} alt="" className="h-full w-full object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/70" />
            <Watermark code={cfg.code} uid="closing" />
          </div>
        )}
        <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.03em]">
            {t.thanks}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-paper-mute sm:text-base">
            {sent ? t.thanksSub : (t.finishPrompt || 'Dale me gusta o paso a cada foto para terminar. Comentar es opcional.')}
          </p>

          <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3">
            <FinalStat value={stats.liked} label={t.liked} tone="ok" icon={<Heart size={14} fill="currentColor" />} />
            <FinalStat value={stats.rejected} label={t.rejected} tone="bad" icon={<X size={14} />} />
            <FinalStat value={stats.commented} label={t.comments} icon={<MessageSquare size={14} />} />
          </div>

          {/* Un solo CTA protagonista (grande, centrado) + "Revisar de nuevo"
              como link discreto debajo. */}
          <div className="mx-auto mt-12 flex w-full max-w-sm flex-col items-center gap-4">
            {sent ? (
              // Ya terminó → descargar sus favoritas (protagonista) + confirmación.
              <>
                {photosWithResult.length > 0 ? (
                  <button
                    onClick={() => { setDlErr(''); setDlReady(null); setDlDone(''); setDlOpen(true); }}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-brand px-8 py-4 text-base font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.02]"
                  >
                    <Download size={18} /> {t.downloadLiked || 'Descargar mis favoritas'}{stats.liked ? ` · ${stats.liked}` : ''}
                  </button>
                ) : null}
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  {t.feedbackSent}
                </span>
              </>
            ) : stats.undecided > 0 ? (
              // Aún faltan → el botón "Terminar y descargar" es AZUL (como Start,
              // que llame). Tocarlo la lleva a la primera sin decidir. Debajo,
              // cuántas faltan (en ámbar).
              <>
                <button
                  onClick={scrollToFirstUndecided}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-brand px-8 py-4 text-base font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.02]"
                >
                  <Download size={18} /> {t.finishDownload || 'Terminar y descargar'}
                </button>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-200">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-400/25 font-mono text-[10px] font-bold tabular-nums">{stats.undecided}</span>
                  {t.leftToDecide || 'por decidir'}
                </span>
              </>
            ) : (
              // Todas decididas → TERMINAR Y DESCARGAR en un solo botón.
              <button
                onClick={finishAndDownload}
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-brand px-8 py-4 text-base font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {stats.liked > 0 ? <Download size={18} /> : <Send size={16} />}
                {sending
                  ? (t.regSending || 'Enviando…')
                  : (stats.liked > 0 ? (t.finishDownload || 'Terminar y descargar') : (t.finishReview || 'Terminar revisión'))}
              </button>
            )}
            {sendErr && <p className="text-[13px] text-rose-300">{sendErr}</p>}
          </div>

          <div className="mt-16 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-dim">
            <Link href="/" className="hover:text-paper">LetShoot{cfg.model?.agency ? ` · ${cfg.model.agency}` : ''}</Link>
            <span className="mx-2">·</span>
            <span>{t.privateLink}</span>
          </div>
        </div>
      </section>

      {/* ═════════════ DESCARGA DE FOTOS (popup) ═════════════ */}
      {dlOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/80 p-5 backdrop-blur-sm" onClick={() => !dlBusy && setDlOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 text-center shadow-glow-sm">
            <div className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${dlDone ? 'bg-emerald-500/15 text-emerald-300' : 'bg-brand/15 text-brand'}`}>
              {dlDone ? <Check size={22} /> : <Download size={20} />}
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-paper">{dlDone ? '¡Listo!' : (t.downloadTitle || 'Descargar fotos')}</h3>
            {dlDone ? (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-paper-mute">
                  {dlDone === 'shared'
                    ? <>Se guardaron en tu teléfono. Revisá tu <b className="text-paper">galería / Fotos</b> (o el chat donde las mandaste).</>
                    : <>Descargado. Buscá el archivo en <b className="text-paper">Descargas</b> de tu compu.</>}
                </p>
                <button onClick={() => { setDlOpen(false); setDlDone(''); }}
                  className="btn3d mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">
                  <Check size={15} /> Listo
                </button>
              </>
            ) : dlReady ? (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-paper-mute">{dlReady.count} {dlReady.count === 1 ? 'foto lista' : 'fotos listas'}. En el teléfono se guardan en <b className="text-paper">Fotos</b> (o las mandás a WhatsApp/Telegram); en la compu bajan en un ZIP.</p>
                <div className="mt-5 space-y-2.5">
                  <button onClick={savePhotos}
                    className="btn3d flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold">
                    <Download size={16} /> {t.dlSave || 'Guardar / Compartir'} · {dlReady.count}
                  </button>
                  <button onClick={() => { setDlReady(null); setDlErr(''); }}
                    className="text-[12px] font-medium text-paper-dim hover:text-paper">{t.dlChoose || 'Elegir otras'}</button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-paper-mute">
                  {viewer?.staff
                    ? (t.downloadSubStaff || 'Solo las fotos creadas. En el teléfono se guardan en Fotos.')
                    : (t.downloadSubCreator || 'Bajás solo las que marcaste que te gustan. En el teléfono se guardan en Fotos.')}
                </p>
                <div className="mt-5 space-y-2.5">
                  <button onClick={() => preparePhotos(true)} disabled={!!dlBusy}
                    className="btn3d flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">
                    {dlBusy === 'aprobadas'
                      ? <><Clock size={15} className="animate-pulse" /> {t.dlPreparing || 'Preparando…'}</>
                      : <><Heart size={15} fill="currentColor" /> {t.dlLiked || 'Solo las que me gustaron'} · {stats.liked}</>}
                  </button>
                  {/* SOLO el equipo (staff) puede bajar TODAS; la creadora solo las que le gustaron. */}
                  {viewer?.staff && (
                    <button onClick={() => preparePhotos(false)} disabled={!!dlBusy}
                      className="btn3d-ghost flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60">
                      {dlBusy === 'todas'
                        ? <><Clock size={15} className="animate-pulse" /> {t.dlPreparing || 'Preparando…'}</>
                        : <><Download size={15} /> {t.dlAll || 'Todas las de la propuesta'} · {photosWithResult.length}</>}
                    </button>
                  )}
                  {/* 3ª opción real: ya terminó (el feedback quedó guardado); solo
                      elige NO descargar. */}
                  <button onClick={() => { setDlOpen(false); setDlReady(null); }} disabled={!!dlBusy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-paper-mute transition-colors hover:border-hair hover:text-paper disabled:opacity-60">
                    {t.finishNoDownload || 'Terminar sin descargar'}
                  </button>
                </div>
              </>
            )}
            {dlErr && <p className="mt-3 text-[12px] text-rose-300">{dlErr}</p>}
            {dlReady && <button onClick={() => !dlBusy && (setDlOpen(false), setDlReady(null))} className="mt-4 text-[12px] font-medium text-paper-dim hover:text-paper">{t.finishNoDownload || 'Terminar sin descargar'}</button>}
          </div>
        </div>
      )}

      {/* ═════════════ RESUMEN FINAL ═════════════ */}
      {summaryOpen && (
        <SummaryModal
          t={t}
          looks={looks}
          fb={fb}
          setLook={setLook}
          onComment={(id) => setOpenComment(id)}
          onClose={() => setSummaryOpen(false)}
          onSend={sendFeedback}
          sending={sending}
          error={sendErr}
        />
      )}

      {/* ═════════════ COMMENT SHEET ═════════════ */}
      {openComment && (
        <CommentSheet
          t={t}
          look={looks.find((l) => l.id === openComment)}
          value={fb(openComment).note}
          onChange={(note) => setLook(openComment, { note })}
          onClose={() => setOpenComment(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Shot({ src, alt, label, dot, code, uid, big = false, active = true, delay = '', className = '' }) {
  // Las fotos están SIEMPRE visibles (nada de opacity-0 que deja un hueco gris
  // al hacer scroll). Entrada sutil: la activa a escala 1, la inactiva un pelín
  // más chica — sin desaparecer.
  const flip = active
    ? 'opacity-100 [transform:translateY(0)_scale(1)]'
    : 'opacity-100 [transform:translateY(0)_scale(0.985)]';
  return (
    <div className={`relative overflow-hidden ring-1 transition-all duration-700 ease-out ${delay} ${flip} ${className}`}>
      {/* object-position sesgado hacia arriba: las fotos son verticales y la CARA
          va en el tercio superior — así el recorte nunca se la come. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="h-full w-full object-cover object-[center_22%]" style={{ WebkitUserDrag: 'none' }} />
      <Watermark code={code} uid={uid} />
      <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className={`font-mono ${big ? 'text-[10px]' : 'text-[9px]'} font-semibold uppercase tracking-[0.18em] text-white/85`}>
          {label}
        </span>
      </span>
    </div>
  );
}

function BigActionBtn({ children, active, onClick, tone, label }) {
  const activeCls =
    tone === 'like' ? 'bg-emerald-500 text-white shadow-[0_10px_40px_-8px_rgba(16,185,129,0.7)]'
    : tone === 'reject' ? 'bg-rose-500 text-white shadow-[0_10px_40px_-8px_rgba(244,63,94,0.7)]'
    : 'bg-brand text-on-accent shadow-glow';
  const idle = 'bg-white/[0.12] text-white/95 hover:bg-white/[0.22] backdrop-blur-md border border-white/15';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition-all active:scale-95 sm:h-14 sm:w-14 ${active ? activeCls : idle}`}
    >
      {children}
    </button>
  );
}

function Watermark({ code, uid }) {
  const pid = `wm-${uid || code}`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] mix-blend-luminosity" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id={pid} width="380" height="380" patternUnits="userSpaceOnUse" patternTransform="rotate(-26)">
          <text x="0" y="20" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11" fontWeight="500" letterSpacing="0.32em" fill="rgb(255 255 255)">
            LETSHOOT · {code}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}

function FinalStat({ value, label, tone, icon }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-paper';
  return (
    <div className="rounded-2xl border border-line bg-card py-4">
      <div className={`flex items-center justify-center gap-1.5 font-display text-2xl font-bold tabular-nums ${color}`}>
        {icon}{value}
      </div>
      <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-dim">{label}</div>
    </div>
  );
}

function MiniToggle({ active, onClick, tone, label, children }) {
  const activeCls =
    tone === 'like' ? 'bg-emerald-500 text-white'
    : tone === 'reject' ? 'bg-rose-500 text-white'
    : 'bg-brand text-on-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-full transition-all active:scale-95 sm:h-8 sm:w-8 ${
        active ? activeCls : 'border border-line text-paper-mute hover:border-hair hover:text-paper'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryModal({ t, looks, fb, setLook, onComment, onClose, onSend, sending = false, error = '' }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:m-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
          <div className="font-display text-xl font-bold text-paper">{t.summaryTitle}</div>
          <p className="mt-1 text-sm text-paper-mute">{t.summarySub}</p>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-4 pb-3">
          {looks.map((l) => {
            const st = fb(l.id);
            return (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                {l.result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.result} alt="" className="h-14 w-11 shrink-0 rounded-md object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
                ) : (
                  <div className="grid h-14 w-11 shrink-0 place-items-center rounded-md bg-brand/15 text-lg text-brand">▶</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm text-paper">{l.caption || l.label}</div>
                  {st.status === null && !st.note?.trim() && (
                    <div className="mt-0.5 text-[11px] text-paper-dim">{t.noMark}</div>
                  )}
                  {st.note?.trim() && (
                    <div className="mt-0.5 truncate text-[12px] italic text-paper-mute">{st.note.trim()}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <MiniToggle
                    active={st.status === 'liked'}
                    onClick={() => setLook(l.id, { status: st.status === 'liked' ? null : 'liked' })}
                    tone="like"
                    label={t.like}
                  >
                    <Heart size={14} fill={st.status === 'liked' ? 'currentColor' : 'none'} />
                  </MiniToggle>
                  <MiniToggle
                    active={st.status === 'rejected'}
                    onClick={() => setLook(l.id, { status: st.status === 'rejected' ? null : 'rejected' })}
                    tone="reject"
                    label={t.reject}
                  >
                    <X size={14} />
                  </MiniToggle>
                  <MiniToggle
                    active={!!st.note?.trim()}
                    onClick={() => onComment(l.id)}
                    tone="comment"
                    label={t.comment}
                  >
                    <MessageSquare size={13} />
                  </MiniToggle>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-6 sm:pb-4">
          {error && <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={sending} className="rounded-full border border-line px-4 py-3 text-sm text-paper-mute hover:border-hair hover:text-paper disabled:opacity-50 sm:py-2">
              {t.keepLooking}
            </button>
            <button
              onClick={onSend}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60 sm:py-2.5"
            >
              <Send size={14} /> {sending ? t.regSending : t.sendFeedback}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentSheet({ t, look, value, onChange, onClose }) {
  const [text, setText] = useState(value || '');
  useEffect(() => setText(value || ''), [value]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-card p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl sm:m-4 sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-center gap-3 border-b border-line pb-3">
          {look?.result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.result} alt="" className="h-14 w-11 rounded-md object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          ) : (
            <div className="grid h-14 w-11 shrink-0 place-items-center rounded-md bg-brand/15 text-lg text-brand">▶</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.commentFor}</div>
            <div className="line-clamp-1 font-display font-semibold text-paper">{look?.caption || look?.label}</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute hover:border-brand/40 hover:text-paper">
            <X size={15} />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={t.commentPh}
          className="mt-4 w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-base text-paper placeholder:text-paper-dim outline-none focus:border-brand/60 sm:text-sm"
        />
        <div className="mt-2 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-dim">
          <Lock size={10} /> {t.anon}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-4 py-3 text-sm text-paper-mute hover:border-hair hover:text-paper sm:py-2">
            {t.cancel}
          </button>
          <button
            onClick={() => { onChange(text); onClose(); }}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] sm:py-2"
          >
            <Send size={14} /> {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
