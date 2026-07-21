'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, Sparkles, ChevronDown, Search, X, Instagram, Check, MapPin, SlidersHorizontal,
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
    kicker: 'Casos de éxito',
    titleA: 'Contenido estratégico y de enganche para',
    titleB: 'OnlyFans',
    titleC: '',
    sub: 'Historia, enganche y venta, listo justo en el momento indicado — para que no dejes dinero sobre la mesa.',
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
    creatorBio: [
      'Julia es una modelo americana que vive en Miami. Como muchas, tiene su vida fitness y de influencer, y desde siempre vende contenido exclusivo. Pero había algo que le costaba muchísimo producir: el contenido del día a día y el de situaciones específicas — y en OnlyFans ese es justo el que más vende, porque primero engancha la historia y después se vende el contenido.',
      'Le pasaba algo real —un mal día, un momento cualquiera— y de ahí nacía el contenido de esa situación: el fan lo vivía con ella, la apoyaba, la ayudaba… y terminaba comprando su contenido de venta. Pero armar todo eso eran horas, ropa, maquillaje, locaciones y muchísimo dinero.',
      'Con nosotros eso cambió: ahora responde al instante con el contenido ideal para cada situación, sin días de producción y sin gastar de más. Y ella es solo un ejemplo de lo que hacemos por ti.',
    ],
    creatorCta: 'Ver su Instagram',
    creatorLocation: 'Miami, FL',
    creatorPoint1: 'Redes sociales',
    creatorPoint2: 'Venta',
    creatorPoint3: 'Engagement',
    creatorFeed: 'Su feed',
    creatorMore: 'Ver el caso de éxito',
    creatorLess: 'Ver menos',
    ctaTitle: '¿Te imaginas tener todo esto listo, sin producirlo tú?',
    ctaSub: 'Eso es exactamente lo que hacemos. Tú vendes; nosotros creamos el producto.',
    ctaBtn: 'Ver paquetes',
  },
  en: {
    kicker: 'Success stories',
    titleA: 'Strategic, engaging content for',
    titleB: 'OnlyFans',
    titleC: '',
    sub: 'Story, hook and sales content, ready right when the moment calls for it — so you never leave money on the table.',
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
    creatorBio: [
      'Julia is an American model living in Miami. Like many creators, she has her fitness and influencer life and has always sold exclusive content. But there was one thing that was really hard to produce: her day-to-day and situational content — and on OnlyFans that’s exactly what sells, because first the story hooks them and then the content sells.',
      'Something real would happen — a bad day, an ordinary moment — and it became content for that situation: her fans lived it with her, supported her, helped her… and ended up buying her sales content. But putting all that together meant hours, wardrobe, makeup, locations and a lot of money.',
      'With us that changed: now she responds instantly with the perfect content for every situation — no production days, no overspending. And she’s just one example of what we do for you.',
    ],
    creatorCta: 'View her Instagram',
    creatorLocation: 'Miami, FL',
    creatorPoint1: 'Social media',
    creatorPoint2: 'Sales',
    creatorPoint3: 'Engagement',
    creatorFeed: 'Her feed',
    creatorMore: 'See the case study',
    creatorLess: 'Show less',
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
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

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
        <div className="mx-auto max-w-4xl text-center">
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
            {t.titleC}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">{t.sub}</p>
        </div>

        {/* ── Meet the creator — real Instagram showcase ── */}
        <section id="creator" className="mx-auto mt-8 max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-card to-ink-2/40 shadow-glow-sm">
            {/* Compact clickable header — the whole case study collapses to this bar */}
            <button
              onClick={() => setCreatorOpen((v) => !v)}
              aria-expanded={creatorOpen}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-hair/5 sm:px-5"
            >
              <span className="shrink-0 rounded-full bg-gradient-to-tr from-brand via-sky-400 to-fuchsia-500 p-[2px]">
                <Image
                  src={CREATOR_AVATAR}
                  alt="Julia Parker"
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-14 w-14 rounded-full object-cover object-top ring-2 ring-ink"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-display text-lg font-bold text-paper">Julia Parker</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-brand">
                    <Sparkles size={10} /> {t.creatorTag}
                  </span>
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-paper-mute">
                  <span className="inline-flex items-center gap-1"><Instagram size={13} /> @its.juliaparker</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-brand" /> {t.creatorLocation}</span>
                </span>
              </span>
              <span className="hidden shrink-0 text-sm font-medium text-paper-mute sm:inline">
                {creatorOpen ? t.creatorLess : t.creatorMore}
              </span>
              <ChevronDown size={20} className={`shrink-0 text-paper-dim transition-transform duration-300 ${creatorOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Expandable body — story + pills + IG + full feed */}
            {creatorOpen && (
              <div className="border-t border-line">
                <div className="px-5 pb-5 pt-4 sm:px-6">
                  <div className="max-w-2xl space-y-2.5">
                    {t.creatorBio.map((para, i) => (
                      <p key={i} className="text-[13.5px] leading-relaxed text-paper-mute">{para}</p>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
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

                <div className="grid grid-cols-3 gap-1 border-t border-line p-1 sm:grid-cols-6 sm:gap-1.5 sm:p-1.5">
                  {CREATOR_FEED.map((src) => (
                    <button
                      key={src}
                      onClick={() => setShot({ src, title: 'Julia Parker', lib: '@its.juliaparker' })}
                      className="group/feed relative aspect-square touch-manipulation overflow-hidden rounded-md bg-ink-2/60 transition active:opacity-80"
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
            )}
          </div>
        </section>

        {/* Sticky controls */}
        <div className="sticky top-[61px] z-20 -mx-5 mt-6 border-y border-line bg-ink/80 px-5 py-3.5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh}
                className="w-full rounded-full border border-line bg-ink-2/70 py-2.5 pl-11 pr-9 text-sm text-paper outline-none transition focus:border-brand/60 focus:bg-ink-2 focus:ring-2 focus:ring-brand/20"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim transition-colors hover:text-paper" aria-label="Limpiar">
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                className="flex w-full items-center gap-2 rounded-full border border-line bg-card/60 px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:border-brand/40 lg:w-auto"
              >
                <SlidersHorizontal size={15} className="shrink-0 text-brand" />
                <span className="flex-1 truncate text-left">{family === 'all' ? t.all : (groups.find((g) => g.id === family)?.name || t.all)}</span>
                <ChevronDown size={16} className={`shrink-0 text-paper-dim transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
              </button>
              {filterOpen && (
                <>
                  <button aria-hidden tabIndex={-1} onClick={() => setFilterOpen(false)} className="fixed inset-0 z-30 cursor-default" />
                  <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-60 overflow-auto rounded-2xl border border-line bg-ink-2 p-1.5 shadow-glow-sm">
                    {[{ id: 'all', name: t.all }, ...groups].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setFamily(g.id); setFilterOpen(false); }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          family === g.id ? 'bg-brand/15 font-semibold text-brand' : 'text-paper-mute hover:bg-hair/5 hover:text-paper'
                        }`}
                      >
                        {g.name}
                        {family === g.id && <Check size={15} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
