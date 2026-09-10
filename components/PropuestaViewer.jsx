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
import { Heart, X, MessageSquare, ChevronDown, Lock, Clock, Send, User, Mail, ArrowRight, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import { getSupabase } from '@/lib/supabase/client';
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
          if (d?.v === 1 && complete.length > 0) {
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
      if (qLang) setLang(qLang);
      else if (mapped.lang && PROP_LANGS.includes(mapped.lang)) setLang(mapped.lang);

      // Entrada por INVITACIÓN: el id del registro viaja en el link (?reg=…) →
      // saltamos el gate (el equipo ya la invitó). También salta si ya hay sesión
      // (usuaria con cuenta, entra directo) o si ya se registró en este dispositivo.
      const regParam = new URLSearchParams(window.location.search).get('reg');
      let saved = null;
      try {
        const raw = window.localStorage.getItem(regKey(linkId));
        if (raw) saved = JSON.parse(raw);
      } catch {}
      let session = null;
      try { session = (await getSupabase().auth.getSession())?.data?.session || null; } catch {}
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
  return <ProposalBody t={t} cfg={cfg} linkId={linkId} reg={reg} isDemo={isDemo} />;
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
                <img src={cfg.agencyLogoUrl} alt="" className="max-h-8 max-w-[130px] object-contain" draggable={false} style={{ WebkitUserDrag: 'none' }} />
                <span className="text-2xl font-light leading-none text-white/45">+</span>
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

function ProposalBody({ t, cfg, linkId, reg, isDemo }) {
  const looks = cfg.looks;
  const total = looks.length;

  const [state, setState] = useState({});
  const [openComment, setOpenComment] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sent, setSent] = useState(false);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, looks]);

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
      return { id: l.id, caption: l.caption, result: l.result, status: st.status ?? null, note: st.note || '' };
    });
    // /p/demo es preview del wizard: no hay backend ni registro → confirmación local.
    if (isDemo) { setSent(true); setSummaryOpen(false); return; }
    setSending(true);
    setSendErr('');
    try {
      const { error } = await getSupabase().rpc('save_proposal_feedback', {
        p_link: linkId,
        p_reg: reg?.id || null,
        p_items: items,
        p_name: reg?.name || cfg.recipient?.name || '',
      });
      if (error) throw error;
      setSent(true);
      setSummaryOpen(false);
    } catch (e) {
      setSendErr(e?.message || t.regError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-ink text-paper" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Co-branding centrado arriba: AGENCIA (KASH) + LetShoot — juntos en el
          medio, SIN cajas, con sombra para legibilidad sobre la foto y buen
          tamaño para que tengan presencia. Agencia primero, luego "+", luego LetShoot. */}
      <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+0.9rem)] z-40 flex -translate-x-1/2 items-center gap-3 sm:top-7 sm:gap-4">
        {cfg.agencyLogoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cfg.agencyLogoUrl} alt="" className="h-8 w-auto max-w-[130px] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:h-9" draggable={false} style={{ WebkitUserDrag: 'none' }} />
            <span className="text-2xl font-light leading-none text-white/70 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">+</span>
          </>
        )}
        <Logo size="lg" forceDark className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
      </div>

      {/* (Sin badge de código ni contador arriba-derecha: portada limpia.) */}

      {/* Progreso lateral (dots verticales) */}
      <div className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => scrollTo(-1)} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/60 backdrop-blur hover:bg-white/20" title={t.backToCover}>◄</button>
        {looks.map((_, i) => (
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

      {/* Contador flotante bottom-left */}
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

      {/* ═════════════ COVER ═════════════ */}
      <section
        ref={coverRef}
        data-idx="-1"
        className="relative flex h-[100svh] w-full items-end overflow-hidden bg-ink"
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
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] sm:px-10 sm:pb-24">
          {/* Rótulo chico = título del paquete ("Contenido para tus redes"). */}
          {cfg.recipient?.name && cfg.name && (
            <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55 sm:text-xs">
              {cfg.name}
            </div>
          )}
          {/* Hero gigante = el NOMBRE de la creadora (la protagonista, sin "Preparada para"). */}
          <h1 className="font-display text-[clamp(2.8rem,8.5vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]">
            {cfg.recipient?.name || cfg.name}
            {/* El subtítulo solo sale si hay uno (por defecto va vacío). */}
            {cfg.subtitle && (
              <span className="mt-1 block text-[clamp(1.1rem,2.4vw,1.75rem)] font-medium italic text-white/70">
                {cfg.subtitle}
              </span>
            )}
          </h1>
          <p className="mt-5 max-w-sm text-[12.5px] leading-relaxed text-white/70 sm:text-[13.5px]">
            {cfg.intro}
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

      {/* ═════════════ LOOKS — un tríptico por pantalla ═════════════ */}
      {looks.map((l, i) => {
        const st = fb(l.id);
        const active = currentIdx === i;
        const fade = `transition-opacity duration-700 ease-out delay-500 ${active ? 'opacity-100' : 'opacity-0'}`;
        return (
          <section
            key={l.id}
            ref={(el) => (slidesRef.current[i] = el)}
            data-idx={i}
            className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink px-4 py-6 sm:px-10"
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
                      {t.look} {pad2(i + 1)} · {pad2(total)}
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
              <div className="flex h-[70svh] w-full flex-col gap-[2px] overflow-hidden rounded-3xl bg-white/10 shadow-glow ring-1 ring-brand/25">
                {/* Resultado: celda grande, caption superpuesto abajo */}
                <div className="relative min-h-0 flex-[2.35]">
                  <Shot src={l.result} alt={l.caption} label={t.aiResult} dot="bg-brand" big code={cfg.code} uid={`${l.id}-mai`} active={active} delay="delay-300" className="h-full w-full ring-0" />
                  <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-14 ${fade}`}>
                    <div className="pr-20">
                      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        {t.look} {pad2(i + 1)} · {pad2(total)}
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
          {/* (El co-branding KASH + LetShoot va fijo arriba en todas las pantallas.) */}
          <div className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(0,177,246,0.9)]" />
            {t.endTag}
          </div>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-tight tracking-[-0.03em]">
            {t.thanks}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-paper-mute sm:text-base">
            {t.thanksSub}
          </p>

          <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3">
            <FinalStat value={stats.liked} label={t.liked} tone="ok" icon={<Heart size={14} fill="currentColor" />} />
            <FinalStat value={stats.rejected} label={t.rejected} tone="bad" icon={<X size={14} />} />
            <FinalStat value={stats.commented} label={t.comments} icon={<MessageSquare size={14} />} />
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {sent ? (
              <button
                onClick={() => setSummaryOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-semibold text-paper hover:border-brand/40"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                {t.feedbackSent}
              </button>
            ) : (
              <button
                onClick={() => setSummaryOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.02]"
              >
                <Send size={14} /> {t.sendFeedback}
              </button>
            )}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-paper-mute hover:border-brand/40 hover:text-paper"
            >
              {t.reviewAgain}
            </button>
          </div>

          {/* Logos de plataformas elegidos — al final. */}
          <ProposalLogos logos={cfg.logos} />

          <div className="mt-16 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-dim">
            <Link href="/" className="hover:text-paper">LetShoot{cfg.model?.agency ? ` · ${cfg.model.agency}` : ''}</Link>
            <span className="mx-2">·</span>
            <span>{t.privateLink}</span>
          </div>
        </div>
      </section>

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="h-full w-full object-cover" style={{ WebkitUserDrag: 'none' }} />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.result} alt="" className="h-14 w-11 shrink-0 rounded-md object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm text-paper">{l.caption}</div>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={look.result} alt="" className="h-14 w-11 rounded-md object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.commentFor}</div>
            <div className="line-clamp-1 font-display font-semibold text-paper">{look.caption}</div>
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
