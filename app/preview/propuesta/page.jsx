'use client';

// ─────────────────────────────────────────────────────────────────────────
// Propuesta pública — formato MINIMAL FULLSCREEN.
//
//   · Portada única a pantalla completa (título + modelo + CTA scroll).
//   · Cada foto ocupa 100vh vertical, ancho completo. Scroll suave.
//   · Botones fijos abajo derecha: ❤ / ✕ / 💬 por foto (tap para feedback).
//   · Nav flotante top-right: contador + código + vencimiento.
//   · Watermark discreto SIEMPRE presente en cada foto.
//   · Anti-descarga: right-click, drag, user-select bloqueados.
//   · Cierre: pantalla final con resumen + link a repetir + email.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, X, MessageSquare, ChevronDown, Lock, Clock, Send, Check } from 'lucide-react';
import { propDict, PROP_LANGS } from '@/lib/propuesta-i18n';

const PACKAGE = {
  name: 'Selección editorial',
  subtitle: 'Verano · 2026',
  model: 'Julia Parker',
  operator: 'Kash Agency',
  expiresAt: '2026-09-05T23:59:59Z',
  code: 'JP-VE26-A31F',
  intro: 'Sentí el estilo antes de confirmar la sesión. Deslizá para ver todas.',
};

const PHOTOS = [
  { id: 'p1',  src: 'https://picsum.photos/seed/lsjp01/1200/1500', caption: 'Cafetería · luz matinal · retrato natural' },
  { id: 'p2',  src: 'https://picsum.photos/seed/lsjp02/1200/1500', caption: 'Playa · golden hour · plano medio' },
  { id: 'p3',  src: 'https://picsum.photos/seed/lsjp03/1200/1500', caption: 'Ambiente urbano nocturno' },
  { id: 'p4',  src: 'https://picsum.photos/seed/lsjp04/1200/1500', caption: 'Interior editorial · calma · atmósfera clara' },
  { id: 'p5',  src: 'https://picsum.photos/seed/lsjp05/1200/1500', caption: 'Bar · low key · cinematográfico' },
  { id: 'p6',  src: 'https://picsum.photos/seed/lsjp06/1200/1500', caption: 'Retrato intenso · look editorial' },
  { id: 'p7',  src: 'https://picsum.photos/seed/lsjp07/1200/1500', caption: 'Piscina · mediodía · lifestyle' },
  { id: 'p8',  src: 'https://picsum.photos/seed/lsjp08/1200/1500', caption: 'Estudio · fondo blanco · look limpio' },
  { id: 'p9',  src: 'https://picsum.photos/seed/lsjp09/1200/1500', caption: 'Editorial · aire · silueta' },
  { id: 'p10', src: 'https://picsum.photos/seed/lsjp10/1200/1500', caption: 'Café · detalle · manos y taza' },
  { id: 'p11', src: 'https://picsum.photos/seed/lsjp11/1200/1500', caption: 'Golden hour · playa · último sol' },
  { id: 'p12', src: 'https://picsum.photos/seed/lsjp12/1200/1500', caption: 'Retrato final · mirada directa' },
];

function useCountdown(iso) {
  const target = useMemo(() => new Date(iso).getTime(), [iso]);
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
  // Idioma del link vía ?lang= (es|en|de|it|fr). El operador lo elige al
  // publicar; el receptor ve la UI traducida sin identificarse.
  const [lang, setLang] = useState('es');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && PROP_LANGS.includes(q)) setLang(q);
  }, []);
  const t = propDict(lang);

  const { d, h, expired } = useCountdown(PACKAGE.expiresAt);
  const [state, setState] = useState(() => Object.fromEntries(PHOTOS.map((p) => [p.id, { status: null, note: '' }])));
  const [openComment, setOpenComment] = useState(null); // photoId
  const [currentIdx, setCurrentIdx] = useState(0);
  const photosRef = useRef([]);

  const stats = useMemo(() => {
    const v = Object.values(state);
    return {
      liked: v.filter((x) => x.status === 'liked').length,
      rejected: v.filter((x) => x.status === 'rejected').length,
      commented: v.filter((x) => x.note?.trim()).length,
      seen: currentIdx + 1,
      total: PHOTOS.length,
    };
  }, [state, currentIdx]);

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

  // IntersectionObserver: qué foto está actualmente en viewport.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          const idx = Number(e.target.dataset.idx);
          if (!Number.isNaN(idx)) setCurrentIdx(idx);
        }
      });
    }, { threshold: [0.55, 0.75] });
    photosRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const setPhoto = (id, patch) => setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const scrollTo = (i) => photosRef.current[i]?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-ink text-paper" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>

      {/* Nav flotante top-right */}
      <div className="fixed right-3 top-3 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:right-6 sm:top-6">
        <span>{PACKAGE.code}</span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span className={`inline-flex items-center gap-1 ${expired ? 'text-rose-300' : d < 2 ? 'text-amber-300' : 'text-brand'}`}>
          <Clock size={10} /> {expired ? t.expired : d > 0 ? `${d}d ${h}h` : `${h}h`}
        </span>
      </div>

      {/* Progreso lateral (dots verticales) */}
      <div className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => scrollTo(-1)} className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/60 backdrop-blur hover:bg-white/20" title={t.backToCover}>◄</button>
        {PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-1.5 w-1.5 rounded-full transition-all ${
              currentIdx === i ? 'h-6 bg-brand shadow-[0_0_12px_rgba(0,177,246,0.7)]' : 'bg-white/25 hover:bg-white/50'
            }`}
            aria-label={`Ir a foto ${i + 1}`}
          />
        ))}
      </div>

      {/* Contador flotante bottom-left */}
      <div className="fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:bottom-6 sm:left-6">
        <span>{String(currentIdx + 1).padStart(2, '0')} / {String(PHOTOS.length).padStart(2, '0')}</span>
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
        ref={(el) => (photosRef.current[-1] = el)}
        data-idx="-1"
        className="relative flex h-[100svh] w-full items-end overflow-hidden bg-ink"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTOS[0].src.replace(/\/\d+\/\d+$/, '/1600/2400')} alt="" className="h-full w-full object-cover object-[center_30%]" draggable={false} style={{ WebkitUserDrag: 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
          <Watermark code={PACKAGE.code} />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16 sm:px-10 sm:pb-24">
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-4 pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgba(0,177,246,0.9)]" />
            {t.privateSel} · {PACKAGE.model}
          </div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.03em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]">
            {PACKAGE.name}
            <span className="mt-1 block text-[clamp(1.1rem,2.4vw,1.75rem)] font-medium italic text-white/70">
              {PACKAGE.subtitle}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-balance text-[15px] leading-relaxed text-white/85 sm:text-base">
            {PACKAGE.intro}
          </p>
          <button
            onClick={() => scrollTo(0)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.04]"
          >
            {t.start} <ChevronDown size={16} />
          </button>
          <div className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {PHOTOS.length} {t.images} · {t.tapHint}
          </div>
        </div>
      </section>

      {/* ═════════════ FOTOS FULLSCREEN una por una ═════════════ */}
      {PHOTOS.map((p, i) => {
        const st = state[p.id];
        return (
          <section
            key={p.id}
            ref={(el) => (photosRef.current[i] = el)}
            data-idx={i}
            className="relative h-[100svh] w-full overflow-hidden bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.caption}
              draggable={false}
              className="h-full w-full object-cover object-center transition-opacity duration-500"
              style={{ WebkitUserDrag: 'none' }}
            />
            <Watermark code={PACKAGE.code} />

            {/* Overlay bottom con caption */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-6 pb-24 sm:p-10 sm:pb-28">
              <div className="max-w-md">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  {String(i + 1).padStart(2, '0')} / {String(PHOTOS.length).padStart(2, '0')}
                </span>
                <div className="mt-2 font-display text-xl font-semibold leading-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)] sm:text-2xl">
                  {p.caption}
                </div>
                {st.note?.trim() && (
                  <div className="mt-2 flex items-start gap-1.5 text-[13px] italic text-white/75">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <span>{st.note.trim()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botones flotantes bottom-right (feedback) */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-3 sm:bottom-10 sm:right-10">
              <BigActionBtn
                active={st.status === 'liked'}
                onClick={() => setPhoto(p.id, { status: st.status === 'liked' ? null : 'liked' })}
                tone="like"
                label={t.like}
              >
                <Heart size={22} fill={st.status === 'liked' ? 'currentColor' : 'none'} />
              </BigActionBtn>
              <BigActionBtn
                active={st.status === 'rejected'}
                onClick={() => setPhoto(p.id, { status: st.status === 'rejected' ? null : 'rejected' })}
                tone="reject"
                label={t.reject}
              >
                <X size={22} />
              </BigActionBtn>
              <BigActionBtn
                active={!!st.note?.trim()}
                onClick={() => setOpenComment(p.id)}
                tone="comment"
                label={t.comment}
              >
                <MessageSquare size={20} />
              </BigActionBtn>
            </div>
          </section>
        );
      })}

      {/* ═════════════ CIERRE ═════════════ */}
      <section className="relative flex min-h-[100svh] w-full items-center justify-center bg-ink px-6 py-24">
        <div className="mx-auto w-full max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">
            <Check size={11} /> {t.endTag}
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
            <Link href="/" className="hover:text-paper">LetShoot · {PACKAGE.operator}</Link>
            <span className="mx-2">·</span>
            <span>{t.privateLink}</span>
          </div>
        </div>
      </section>

      {/* ═════════════ COMMENT SHEET (modal bottom) ═════════════ */}
      {openComment && (
        <CommentSheet
          t={t}
          photo={PHOTOS.find((p) => p.id === openComment)}
          value={state[openComment].note}
          onChange={(note) => setPhoto(openComment, { note })}
          onClose={() => setOpenComment(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

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
      className={`grid h-14 w-14 place-items-center rounded-full transition-all active:scale-95 ${active ? activeCls : idle}`}
    >
      {children}
    </button>
  );
}

function Watermark({ code }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] mix-blend-luminosity" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id={`wm-${code}`} width="380" height="380" patternUnits="userSpaceOnUse" patternTransform="rotate(-26)">
          <text x="0" y="20" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11" fontWeight="500" letterSpacing="0.32em" fill="rgb(255 255 255)">
            LETSHOOT · {code}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#wm-${code})`} />
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

function CommentSheet({ t, photo, value, onChange, onClose }) {
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
          <img src={photo.src.replace(/\/\d+\/\d+$/, '/200/250')} alt="" className="h-14 w-11 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.commentFor}</div>
            <div className="line-clamp-1 font-display font-semibold text-paper">{photo.caption}</div>
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
