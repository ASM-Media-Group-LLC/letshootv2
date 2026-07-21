'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, Sparkles, ChevronDown, Search, X, Instagram, Check, MapPin,
  Dumbbell, UtensilsCrossed, ShoppingBag, Brush, Car, Home, Briefcase, PawPrint, CloudRain, CalendarDays,
  Heart, Smile, Moon, PartyPopper, Quote, BedDouble, HeartHandshake, Clapperboard, Gift,
  Drama, Shirt, Ghost, Film, Gamepad2, GraduationCap, Route, Dices, Target, Music,
  Timer, Lock, Trophy, Flame, Package, BellRing, Eye, BarChart3, MessageCircle, Ticket,
  Plane, Hotel, Sun, Bath, Droplets, Gem, Building2, Martini, Users, Flower2,
  Mic, AudioLines, Headphones, Volume2,
} from 'lucide-react';
import { useLang } from '@/app/providers';
import { LIBRARIES, GROUPS, AUDIO } from '@/lib/libraries';
import Logo from '@/components/Logo';

const ICONS = {
  Dumbbell, UtensilsCrossed, ShoppingBag, Brush, Car, Home, Briefcase, PawPrint, CloudRain, CalendarDays,
  Heart, Smile, Moon, PartyPopper, Quote, Sparkles, BedDouble, HeartHandshake, Clapperboard, Gift,
  Drama, Shirt, Ghost, Film, Gamepad2, GraduationCap, Route, Dices, Target, Music,
  Timer, Lock, Trophy, Flame, Package, BellRing, Eye, BarChart3, MessageCircle, Ticket,
  Plane, Hotel, Sun, Bath, Droplets, Gem, Building2, Martini, Users, Flower2,
  Mic, AudioLines, Headphones, Volume2,
};
const iconFor = (name) => ICONS[name] || Sparkles;

const T = {
  es: {
    kicker: 'La biblioteca',
    titleA: 'Contenido estratégico y de enganche en el momento indicado para',
    titleB: 'OnlyFans',
    sub: 'Estas son solo algunas de las infinitas estrategias que creamos para ti — historia, enganche y venta, listas justo cuando las necesitas en el chat.',
    statsStrategies: 'estrategias',
    statsScenes: 'escenas listas',
    statsPossibilities: 'posibilidades',
    statsHint: 'Y esto es solo una muestra — las ideas son infinitas.',
    scenesWord: 'escenas',
    all: 'Todas',
    searchPh: 'Buscar estrategia o escena…',
    noResults: 'No encontramos nada con esa búsqueda.',
    creatorKicker: 'La creadora',
    creatorTag: 'Creadora',
    creatorBio: 'Julia vive en Miami y es una de nuestras modelos estrella. Con el tiempo le hemos creado muchísimo contenido — para redes, venta y engagement — todo producido con inteligencia artificial. Es un caso de éxito real: ese contenido se ha convertido en muchísimas ventas y ganancias. Y ella es solo un ejemplo de lo que hacemos por ti.',
    creatorCta: 'Ver su Instagram',
    creatorLocation: 'Miami, FL',
    creatorPoint1: 'Redes sociales',
    creatorPoint2: 'Venta',
    creatorPoint3: 'Engagement',
    creatorFeed: 'Su feed',
    ctaTitle: '¿Te imaginas tener todo esto listo, sin producirlo tú?',
    ctaSub: 'Eso es exactamente lo que hacemos. Tú vendes; nosotros creamos el producto.',
    ctaBtn: 'Ver paquetes',
  },
  en: {
    kicker: 'The library',
    titleA: 'Strategic, engaging content at the right moment for',
    titleB: 'OnlyFans',
    sub: 'These are just a few of the infinite strategies we create for you — story, hook and sale, ready right when you need them in the chat.',
    statsStrategies: 'strategies',
    statsScenes: 'ready scenes',
    statsPossibilities: 'possibilities',
    statsHint: 'And this is only a sample — the ideas are endless.',
    scenesWord: 'scenes',
    all: 'All',
    searchPh: 'Search a strategy or scene…',
    noResults: 'Nothing matched that search.',
    creatorKicker: 'The creator',
    creatorTag: 'Creator',
    creatorBio: 'Julia lives in Miami and is one of our star models. Over time we’ve created a huge amount of content for her — for social, sales and engagement — all produced with AI. She’s a real success story: that content has turned into serious sales and earnings. And she’s just one example of what we do for you.',
    creatorCta: 'View her Instagram',
    creatorLocation: 'Miami, FL',
    creatorPoint1: 'Social media',
    creatorPoint2: 'Sales',
    creatorPoint3: 'Engagement',
    creatorFeed: 'Her feed',
    ctaTitle: 'Imagine having all of this ready — without producing it yourself.',
    ctaSub: 'That is exactly what we do. You sell; we create the product.',
    ctaBtn: 'View packages',
  },
};

const IG_URL = 'https://www.instagram.com/its.juliaparker/';
const CREATOR_AVATAR = '/lib/venta-solo-hoy.jpg';
const CREATOR_FEED = [
  '/lib/musica-carro.jpg', '/lib/spa-jacuzzi-noche.jpg', '/lib/musica-playlist.jpg',
  '/lib/venta-reto-semana.jpg', '/lib/venta-nueva-lenceria.jpg', '/lib/musica-baile.jpg',
  '/lib/venta-drop-medianoche.jpg', '/lib/musica-audifonos.jpg', '/lib/venta-si-llegamos.jpg',
  '/lib/pedidos-custom.jpg', '/lib/venta-recompensa.jpg', '/lib/venta-descuento-sorpresa.jpg',
];

function SceneThumb({ img, label, onOpen, lib }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      onClick={() => onOpen?.({ src: img, title: label, lib })}
      className="group/scene relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-ink-2/60 transition-transform duration-200 active:scale-[0.97]"
    >
      {!loaded && <span className="absolute inset-0 animate-pulse bg-hair/5" aria-hidden />}
      <Image
        src={img}
        alt={label}
        fill
        sizes="(min-width: 640px) 12vw, 45vw"
        loading="eager"
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-all duration-500 group-hover/scene:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2 pt-6 text-left text-[11px] font-medium leading-tight text-paper">
        {label}
      </span>
    </button>
  );
}

function StrategyCard({ lib, t, defaultOpen, muted, onOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  // Once a card has been opened we keep its scenes mounted so the close/open
  // animation stays smooth. Collapsed-and-never-opened cards render no <img>
  // at all — that both saves loading ~200 images up front and fixes the bug
  // where lazy images inside a 0-height container never painted until a tap.
  const [hasOpened, setHasOpened] = useState(!!defaultOpen);
  const Icon = iconFor(lib.icon);
  const shot = lib.imgs?.find(Boolean);

  const toggle = () =>
    setOpen((v) => {
      if (!v) setHasOpened(true);
      return !v;
    });

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        muted ? 'border-line bg-card/60' : 'border-line bg-gradient-to-b from-card to-ink-2/50 hover:border-brand/40'
      }`}
    >
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-hair/5"
      >
        {shot ? (
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-1 ring-brand/25">
            <Image src={shot} alt="" fill sizes="48px" className="object-cover" />
          </span>
        ) : (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
            muted ? 'bg-hair/5 text-paper-dim ring-line' : 'bg-brand/12 text-brand ring-brand/25'
          }`}>
            <Icon size={19} strokeWidth={1.75} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold text-paper">{lib.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-paper-dim">{lib.scenes.length} {t.scenesWord}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {hasOpened && (
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
              {lib.scenes.map((s, i) => {
                const img = lib.imgs?.[i];
                return img ? (
                  <SceneThumb key={s} img={img} label={s} lib={lib.name} onOpen={onOpen} />
                ) : (
                  <div key={s} className="relative flex aspect-[9/16] items-end rounded-lg border border-dashed border-line bg-ink-2/40 p-2">
                    <span className="text-[11px] leading-tight text-paper-dim">{s}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BibliotecaPage() {
  const { lang } = useLang();
  const t = T[lang] || T.en;
  const libs = LIBRARIES[lang] || LIBRARIES.en;
  const groups = GROUPS[lang] || GROUPS.en;
  const audio = AUDIO[lang] || AUDIO.en;

  const [family, setFamily] = useState('all');
  const [q, setQ] = useState('');
  const [shot, setShot] = useState(null);

  const totalScenes = libs.reduce((n, l) => n + l.scenes.length, 0);

  // Lock background scroll while the lightbox is open (mobile UX).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.style.overflow = shot ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [shot]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return libs.filter((l) => {
      if (family !== 'all' && l.g !== family) return false;
      if (!needle) return true;
      return l.name.toLowerCase().includes(needle) || l.scenes.some((s) => s.toLowerCase().includes(needle));
    });
  }, [libs, family, q]);

  const searching = q.trim().length > 0;
  const shownGroups = family === 'all' ? groups : groups.filter((g) => g.id === family);

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-ink text-paper">
      <div className="blob left-1/2 top-0 h-[520px] w-[680px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-3 text-paper-mute transition-colors hover:text-paper">
            <ArrowLeft size={18} />
            <Logo size="sm" />
          </Link>
          <Link href="/#pricing" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.04]">
            {t.ctaBtn}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 py-14">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-hair/5 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
            <Sparkles size={14} /> {t.kicker}
          </span>
          <h1 className="headline mt-5 text-balance text-[clamp(2rem,5vw,3.6rem)] leading-[1.08]">
            {t.titleA}{' '}
            <img
              src="/onlyfans-logo.png"
              alt="OnlyFans"
              className="inline-block h-[0.72em] w-auto translate-y-[0.06em] drop-shadow-[0_2px_20px_rgba(0,175,240,0.4)]"
              draggable={false}
            />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">{t.sub}</p>
        </div>

        {/* ── Meet the creator — real Instagram showcase ── */}
        <section id="creator" className="mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] border border-line bg-gradient-to-b from-card to-ink-2/40 shadow-glow-sm">
            {/* Profile header */}
            <div className="flex flex-col items-center gap-6 border-b border-line p-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:p-8 sm:text-left">
              <div className="shrink-0 rounded-full bg-gradient-to-tr from-brand via-sky-400 to-fuchsia-500 p-[3px]">
                <Image
                  src={CREATOR_AVATAR}
                  alt="Julia Parker"
                  width={112}
                  height={112}
                  sizes="112px"
                  className="h-24 w-24 rounded-full object-cover object-top ring-4 ring-ink sm:h-28 sm:w-28"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                  <h2 className="font-display text-2xl font-bold text-paper">Julia Parker</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-brand">
                    <Sparkles size={11} /> {t.creatorTag}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-medium text-paper-mute sm:justify-start">
                  <a
                    href={IG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-brand"
                  >
                    <Instagram size={15} /> @its.juliaparker
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand" /> {t.creatorLocation}
                  </span>
                </div>

                <p className="mx-auto mt-3 max-w-xl text-[13.5px] leading-relaxed text-paper-mute sm:mx-0">{t.creatorBio}</p>

                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {[t.creatorPoint1, t.creatorPoint2, t.creatorPoint3].map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-hair/5 px-3 py-1.5 text-[12px] font-medium text-paper-mute">
                      <Check size={13} className="text-brand" /> {p}
                    </span>
                  ))}
                </div>

                <a
                  href={IG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/50 bg-brand/12 px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
                >
                  <Instagram size={16} /> {t.creatorCta}
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>

            {/* Feed grid — Instagram-style */}
            <div className="grid grid-cols-3 gap-1 p-1 sm:grid-cols-6 sm:gap-1.5 sm:p-1.5">
              {CREATOR_FEED.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setShot({ src, title: 'Julia Parker', lib: '@its.juliaparker' })}
                  className={`group/feed relative aspect-square touch-manipulation overflow-hidden bg-ink-2/60 transition active:opacity-80 ${i === 0 ? 'rounded-tl-[1.4rem]' : ''}`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 16vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover/feed:scale-110"
                  />
                  <span className="absolute inset-0 bg-brand/0 transition-colors duration-300 group-hover/feed:bg-brand/10" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky controls */}
        <div className="sticky top-[61px] z-20 -mx-5 mt-6 border-y border-line bg-ink/90 px-5 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:w-72">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh}
                className="w-full rounded-full border border-line bg-ink-2 py-2 pl-10 pr-9 text-sm text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim hover:text-paper" aria-label="Limpiar">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ id: 'all', name: t.all }, ...groups].map((g) => (
                <button key={g.id} onClick={() => setFamily(g.id)}
                  className={`touch-manipulation rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
                    family === g.id ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'
                  }`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <p className="mt-14 text-center text-paper-dim">{t.noResults}</p>
        ) : searching ? (
          <div className="mt-8 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lib) => <StrategyCard key={lib.name} lib={lib} t={t} defaultOpen onOpen={setShot} />)}
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {shownGroups.map((g) => {
              const items = filtered.filter((l) => l.g === g.id);
              if (!items.length) return null;
              return (
                <section key={g.id}>
                  <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
                    <h2 className="font-display text-xl font-semibold text-paper">{g.name}</h2>
                    <span className="font-mono text-xs text-paper-dim">{items.length} {t.statsStrategies}</span>
                  </div>
                  <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((lib) => <StrategyCard key={lib.name} lib={lib} t={t} onOpen={setShot} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ── Audio — separate, coming soon ── */}
        {!searching && family === 'all' && (
          <section className="mt-16 rounded-3xl border border-dashed border-line bg-card/40 p-6 sm:p-8">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-semibold text-paper">{audio.title}</h2>
              <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                {audio.badge}
              </span>
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-paper-mute">{audio.intro}</p>
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {audio.ideas.map((idea) => <StrategyCard key={idea.name} lib={idea} t={t} muted />)}
            </div>
          </section>
        )}

        {/* Closing CTA */}
        <div className="relative mx-auto mt-20 max-w-3xl overflow-hidden rounded-[2rem] border border-brand/45 bg-gradient-to-b from-brand/[0.14] via-brand/[0.05] to-transparent p-8 text-center shadow-glow sm:p-12">
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold leading-tight [text-wrap:balance] sm:text-4xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-paper [text-wrap:balance]">{t.ctaSub}</p>
            <Link href="/#pricing" className="group mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]">
              {t.ctaBtn}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {shot && (
        <div
          onClick={() => setShot(null)}
          className="lb-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-5 backdrop-blur"
        >
          <button onClick={() => setShot(null)} aria-label="Cerrar" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-line text-paper transition-colors hover:bg-hair/10 active:scale-95">
            <X size={18} />
          </button>
          <figure onClick={(e) => e.stopPropagation()} className="lb-pop max-h-full overflow-hidden rounded-2xl border border-line bg-card">
            <img src={shot.src} alt={shot.title} className="max-h-[78svh] w-auto object-contain" />
            <figcaption className="flex items-baseline gap-2 px-4 py-3">
              <span className="font-display font-semibold text-paper">{shot.title}</span>
              <span className="font-mono text-[11px] text-paper-dim">· {shot.lib}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
