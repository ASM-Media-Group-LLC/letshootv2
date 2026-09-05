'use client';

// ─────────────────────────────────────────────────────────────────────────
// Propuesta pública — formato TRÍPTICO por look.
//   · Cada slide 100svh: INSPIRACIÓN + MODELO REAL = RESULTADO (hero).
//   · Feedback por look (❤ / ✕ / 💬), watermark + anti-descarga siempre.
//   · Lee el draft del editor desde localStorage 'ls_propuesta_draft'.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, X, MessageSquare, ChevronDown, Lock, Clock, Send } from 'lucide-react';
import Logo from '@/components/Logo';
import { propDict, PROP_LANGS } from '@/lib/propuesta-i18n';

const DRAFT_KEY = 'ls_propuesta_draft';
const pBig = (s) => `https://picsum.photos/seed/${s}/900/1125`;
const pSm = (s) => `https://picsum.photos/seed/${s}/600/750`;
const pad2 = (n) => String(n).padStart(2, '0');

const DEMO = {
  v: 1,
  name: 'Selección editorial',
  subtitle: 'Verano · 2026',
  intro: 'Sentí el estilo antes de confirmar la sesión.',
  lang: 'es',
  days: 10,
  code: 'JP-VE26-A31F',
  expiresAt: '2026-09-15T23:59:59Z',
  model: { name: 'Julia Parker', agency: 'Kash Agency' },
  recipient: { name: 'Valentina Ríos', email: 'valentina@email.com', kind: 'prospect' },
  template: 'exclusive',
  coverUrl: pBig('lsai-dubai'),
  closingUrl: pBig('lsai-night'),
  looks: [
    { id: 'lk1', caption: 'Dubai · balcón · golden hour',   inspiration: pSm('lsin-dubai'),  real: pSm('lsre-01'), result: pBig('lsai-dubai') },
    { id: 'lk2', caption: 'Playa · golden hour · lifestyle', inspiration: pSm('lsin-beach'),  real: pSm('lsre-02'), result: pBig('lsai-beach') },
    { id: 'lk3', caption: 'Cafetería · luz matinal',         inspiration: pSm('lsin-cafe'),   real: pSm('lsre-03'), result: pBig('lsai-cafe') },
    { id: 'lk4', caption: 'Estudio · editorial · clean',     inspiration: pSm('lsin-studio'), real: pSm('lsre-04'), result: pBig('lsai-studio') },
    { id: 'lk5', caption: 'Piscina · mediodía · lifestyle',  inspiration: pSm('lsin-pool'),   real: pSm('lsre-05'), result: pBig('lsai-pool') },
    { id: 'lk6', caption: 'Noche urbana · neón',             inspiration: pSm('lsin-night'),  real: pSm('lsre-06'), result: pBig('lsai-night') },
  ],
};

const EMPTY_FB = { status: null, note: '' };

function useCountdown(iso) {
  const target = useMemo(() => {
    const n = new Date(iso).getTime();
    return Number.isFinite(n) ? n : 0;
  }, [iso]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return { d, h, expired: ms === 0 };
}

export default function Propuesta() {
  const [cfg, setCfg] = useState(DEMO);
  const [lang, setLang] = useState('es');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let draftLang = null;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const complete = Array.isArray(d?.looks)
          ? d.looks.filter((l) => l?.id && l?.inspiration && l?.real && l?.result)
          : [];
        if (d?.v === 1 && complete.length > 0) {
          setCfg({ ...DEMO, ...d, model: { ...DEMO.model, ...(d.model || {}) }, looks: complete });
          draftLang = d.lang;
        }
      }
    } catch {}
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && PROP_LANGS.includes(q)) setLang(q);
    else if (draftLang && PROP_LANGS.includes(draftLang)) setLang(draftLang);
  }, []);

  const t = propDict(lang);
  const looks = cfg.looks;
  const total = looks.length;

  const { d, h, expired } = useCountdown(cfg.expiresAt);
  const [state, setState] = useState({});
  const [openComment, setOpenComment] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const slidesRef = useRef([]);
  const coverRef = useRef(null);

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

  return (
    <div className="bg-ink text-paper" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Logo flotante top-left */}
      <div className="fixed left-3 top-3 z-40 flex items-center rounded-full border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur-md sm:left-6 sm:top-6">
        <Logo size="sm" forceDark />
      </div>

      {/* Nav flotante top-right */}
      <div className="fixed right-3 top-3 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:right-6 sm:top-6">
        <span>{cfg.code}</span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span suppressHydrationWarning className={`inline-flex items-center gap-1 ${expired ? 'text-rose-300' : d < 2 ? 'text-amber-300' : 'text-brand'}`}>
          <Clock size={10} /> {expired ? t.expired : d > 0 ? `${d}d ${h}h` : `${h}h`}
        </span>
      </div>

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
      <div className="fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:bottom-6 sm:left-6">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cfg.coverUrl || looks[0]?.result} alt="" className="h-full w-full object-cover object-[center_30%]" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
          <Watermark code={cfg.code} uid="cover" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16 sm:px-10 sm:pb-24">
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-4 pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(0,177,246,0.9)]" />
            {t.privateSel} · {cfg.model.name}
          </div>
          {cfg.recipient?.name && (
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
              {t.preparedFor} <span className="text-white">{cfg.recipient.name}</span>
            </div>
          )}
          <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            {t.formula}
          </div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.03em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]">
            {cfg.name}
            <span className="mt-1 block text-[clamp(1.1rem,2.4vw,1.75rem)] font-medium italic text-white/70">
              {cfg.subtitle}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-balance text-[15px] leading-relaxed text-white/85 sm:text-base">
            {cfg.intro}
          </p>
          <button
            onClick={() => scrollTo(0)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.04]"
          >
            {t.start} <ChevronDown size={16} />
          </button>
          <div className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {total} {t.looks} · {t.tapHint}
          </div>
        </div>
      </section>

      {/* ═════════════ LOOKS — un tríptico por pantalla ═════════════ */}
      {looks.map((l, i) => {
        const st = fb(l.id);
        const active = currentIdx === i;
        const enter = `transition-all duration-700 ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`;
        return (
          <section
            key={l.id}
            ref={(el) => (slidesRef.current[i] = el)}
            data-idx={i}
            className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink px-4 py-6 sm:px-10"
          >
            {/* Desktop: columna fuentes + operadores + hero */}
            <div className={`hidden w-full max-w-5xl items-center justify-center gap-4 sm:flex lg:gap-6 ${enter}`}>
              <div className="flex w-[30%] max-w-[300px] shrink-0 flex-col">
                <Shot src={l.inspiration} alt={l.caption} label={t.inspiration} dot="bg-amber-400" code={cfg.code} uid={`${l.id}-in`} className="aspect-[4/5] max-h-[36vh] w-full rounded-2xl ring-white/10" />
                <div className="relative z-10 -my-4 flex justify-center">
                  <OpBadge className="h-9 w-9 text-base">+</OpBadge>
                </div>
                <Shot src={l.real} alt={l.caption} label={t.realModel} dot="bg-emerald-400" code={cfg.code} uid={`${l.id}-re`} className="aspect-[4/5] max-h-[36vh] w-full rounded-2xl ring-white/10" />
              </div>
              <OpBadge className="h-9 w-9 text-base">=</OpBadge>
              <div className="min-w-0 flex-1">
                <div className="mx-auto w-full max-w-[64vh]">
                  <Shot src={l.result} alt={l.caption} label={t.aiResult} dot="bg-brand" big code={cfg.code} uid={`${l.id}-ai`} className="aspect-[4/5] max-h-[80vh] w-full rounded-3xl shadow-glow ring-brand/30" />
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <div className="text-sm text-white/80">{l.caption}</div>
                    <div className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                      {t.look} {pad2(i + 1)} · {pad2(total)}
                    </div>
                  </div>
                  {st.note?.trim() && (
                    <div className="mt-2 flex items-start gap-1.5 text-[13px] italic text-white/70">
                      <MessageSquare size={12} className="mt-0.5 shrink-0" />
                      <span>{st.note.trim()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: fila fuentes + = + hero abajo */}
            <div className={`w-full pt-8 sm:hidden ${enter}`}>
              <div className="relative grid grid-cols-2 gap-2">
                <Shot src={l.inspiration} alt={l.caption} label={t.inspiration} dot="bg-amber-400" code={cfg.code} uid={`${l.id}-min`} className="h-[22vh] w-full rounded-2xl ring-white/10" />
                <Shot src={l.real} alt={l.caption} label={t.realModel} dot="bg-emerald-400" code={cfg.code} uid={`${l.id}-mre`} className="h-[22vh] w-full rounded-2xl ring-white/10" />
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <OpBadge className="h-7 w-7 text-sm">+</OpBadge>
                </div>
              </div>
              <div className="my-1.5 flex justify-center">
                <OpBadge className="h-7 w-7 text-sm">=</OpBadge>
              </div>
              <Shot src={l.result} alt={l.caption} label={t.aiResult} dot="bg-brand" big code={cfg.code} uid={`${l.id}-mai`} className="h-[52svh] w-full rounded-3xl shadow-glow ring-brand/30" />
              <div className="mt-3 px-1">
                <div className="text-sm text-white/80">{l.caption}</div>
                <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {t.look} {pad2(i + 1)} · {pad2(total)}
                </div>
                {st.note?.trim() && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-[13px] italic text-white/70">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <span>{st.note.trim()}</span>
                  </div>
                )}
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
      <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink px-6 py-24">
        {cfg.closingUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cfg.closingUrl} alt="" className="h-full w-full object-cover" draggable={false} style={{ WebkitUserDrag: 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/70" />
            <Watermark code={cfg.code} uid="closing" />
          </div>
        )}
        <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" forceDark />
          </div>
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
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-paper-mute hover:border-brand/40 hover:text-paper"
            >
              {t.reviewAgain}
            </button>
          </div>

          <div className="mt-16 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-dim">
            <Link href="/" className="hover:text-paper">LetShoot · {cfg.model.agency}</Link>
            <span className="mx-2">·</span>
            <span>{t.privateLink}</span>
          </div>
        </div>
      </section>

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

function Shot({ src, alt, label, dot, code, uid, big = false, className = '' }) {
  return (
    <div className={`relative overflow-hidden ring-1 ${className}`}>
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

function OpBadge({ children, className = '' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 font-mono font-semibold text-white/80 backdrop-blur ${className}`}>
      {children}
    </span>
  );
}

function BigActionBtn({ children, active, onClick, tone, label }) {
  const activeCls =
    tone === 'like' ? 'bg-emerald-500 text-white shadow-[0_10px_40px_-8px_rgba(16,185,129,0.7)]'
    : tone === 'reject' ? 'bg-rose-500 text-white shadow-[0_10px_40px_-8px_rgba(244,63,94,0.7)]'
    : 'bg-brand text-on-accent shadow-glow';
  const idle = 'bg-white/12 text-white/95 hover:bg-white/22 backdrop-blur-md border border-white/15';
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

function CommentSheet({ t, look, value, onChange, onClose }) {
  const [text, setText] = useState(value || '');
  useEffect(() => setText(value || ''), [value]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-card p-6 shadow-2xl sm:m-4 sm:rounded-3xl"
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
          className="mt-4 w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
        />
        <div className="mt-2 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-dim">
          <Lock size={10} /> {t.anon}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm text-paper-mute hover:border-hair hover:text-paper">
            {t.cancel}
          </button>
          <button
            onClick={() => { onChange(text); onClose(); }}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]"
          >
            <Send size={14} /> {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
