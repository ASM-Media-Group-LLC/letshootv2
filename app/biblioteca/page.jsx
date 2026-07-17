'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Sparkles, ChevronDown, Search, X,
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
    titleA: 'Contenido de',
    titleB: 'enganche y venta',
    titleC: 'en el momento indicado',
    sub: 'El contenido del día a día que tus fans de OnlyFans esperan de ti — historia, enganche y venta, listo justo cuando lo necesitas en el chat.',
    statsStrategies: 'estrategias',
    statsScenes: 'escenas',
    statsFamilies: 'familias',
    scenesWord: 'escenas',
    all: 'Todas',
    searchPh: 'Buscar estrategia o escena…',
    noResults: 'No encontramos nada con esa búsqueda.',
    ctaTitle: '¿Te imaginas tener todo esto listo, sin producirlo tú?',
    ctaSub: 'Eso es exactamente lo que hacemos. Tú vendes; nosotros creamos el producto.',
    ctaBtn: 'Ver paquetes',
  },
  en: {
    kicker: 'The library',
    titleA: 'Content for',
    titleB: 'engagement and sales',
    titleC: 'at the right moment',
    sub: 'The day-to-day content your OnlyFans fans expect from you — story, hook and sale, ready exactly when you need it in the chat.',
    statsStrategies: 'strategies',
    statsScenes: 'scenes',
    statsFamilies: 'families',
    scenesWord: 'scenes',
    all: 'All',
    searchPh: 'Search a strategy or scene…',
    noResults: 'Nothing matched that search.',
    ctaTitle: 'Imagine having all of this ready — without producing it yourself.',
    ctaSub: 'That is exactly what we do. You sell; we create the product.',
    ctaBtn: 'View packages',
  },
};

function StrategyCard({ lib, t, defaultOpen, muted, onOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const Icon = iconFor(lib.icon);
  const shot = lib.imgs?.find(Boolean);
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        muted ? 'border-line bg-card/60' : 'border-line bg-gradient-to-b from-card to-ink-2/50 hover:border-brand/40'
      }`}
    >
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        {shot ? (
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-1 ring-brand/25">
            <img src={shot} alt="" className="h-full w-full object-cover" loading="lazy" />
          </span>
        ) : (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
            muted ? 'bg-hair/5 text-paper-dim ring-line' : 'bg-brand/12 text-brand ring-brand/25'
          }`}>
            <Icon size={19} strokeWidth={1.75} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="truncate font-display text-base font-semibold text-paper">{lib.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-paper-dim">{lib.scenes.length} {t.scenesWord}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
            {lib.scenes.map((s, i) => {
              const img = lib.imgs?.[i];
              return img ? (
                <button
                  key={s}
                  onClick={() => onOpen?.({ src: img, title: s, lib: lib.name })}
                  className="group/scene relative overflow-hidden rounded-lg border border-line"
                >
                  <img src={img} alt={s} loading="lazy" className="aspect-[9/16] w-full object-cover transition-transform duration-300 group-hover/scene:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2 pt-6 text-left text-[11px] font-medium leading-tight text-paper">
                    {s}
                  </span>
                </button>
              ) : (
                <div key={s} className="relative flex aspect-[9/16] items-end rounded-lg border border-dashed border-line bg-ink-2/40 p-2">
                  <span className="text-[11px] leading-tight text-paper-dim">{s}</span>
                </div>
              );
            })}
          </div>
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
            <span className="text-rainbow">{t.titleB}</span>{' '}
            {t.titleC}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">{t.sub}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { n: libs.length, l: t.statsStrategies },
              { n: totalScenes, l: t.statsScenes },
              { n: groups.length, l: t.statsFamilies },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-line bg-card px-6 py-3">
                <div className="font-display text-2xl font-bold text-brand">{s.n}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky controls */}
        <div className="sticky top-[61px] z-20 -mx-5 mt-12 border-y border-line bg-ink/90 px-5 py-3 backdrop-blur">
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
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-5 backdrop-blur"
        >
          <button onClick={() => setShot(null)} aria-label="Cerrar" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-line text-paper transition-colors hover:bg-hair/10">
            <X size={18} />
          </button>
          <figure onClick={(e) => e.stopPropagation()} className="max-h-full overflow-hidden rounded-2xl border border-line bg-card">
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
