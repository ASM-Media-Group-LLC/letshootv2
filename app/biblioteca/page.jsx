'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles, ChevronDown, Search, X } from 'lucide-react';
import { useLang } from '@/app/providers';
import { LIBRARIES, GROUPS } from '@/lib/libraries';
import Logo from '@/components/Logo';

const T = {
  es: {
    kicker: 'La biblioteca',
    titleA: 'situaciones listas para',
    titleB: 'enganchar y vender',
    sub: 'No son ideas sueltas: es el sistema de contenido que alimenta tus chats todos los días. Cada situación cuenta una historia — y cada historia termina en una venta.',
    statsSituations: 'situaciones',
    statsScenes: 'escenas',
    statsFamilies: 'familias',
    scenesWord: 'escenas',
    all: 'Todas',
    searchPh: 'Buscar situación o escena…',
    noResults: 'No encontramos nada con esa búsqueda.',
    soon: 'Próximamente',
    ctaTitle: '¿Te imaginas tener todo esto listo, sin producirlo tú?',
    ctaSub: 'Eso es exactamente lo que hacemos. Tú vendes; nosotros creamos el producto.',
    ctaBtn: 'Ver paquetes',
  },
  en: {
    kicker: 'The library',
    titleA: 'situations ready to',
    titleB: 'hook and sell',
    sub: 'Not loose ideas: this is the content system that feeds your chats every day. Each situation tells a story — and each story ends in a sale.',
    statsSituations: 'situations',
    statsScenes: 'scenes',
    statsFamilies: 'families',
    scenesWord: 'scenes',
    all: 'All',
    searchPh: 'Search a situation or scene…',
    noResults: 'Nothing matched that search.',
    soon: 'Coming soon',
    ctaTitle: 'Imagine having all of this ready — without producing it yourself.',
    ctaSub: 'That is exactly what we do. You sell; we create the product.',
    ctaBtn: 'View packages',
  },
};

function LibraryCard({ lib, t, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        lib.soon
          ? 'border-line bg-card/60 opacity-70'
          : 'border-line bg-gradient-to-b from-card to-ink-2/50 hover:border-brand/40'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hair/5 text-2xl ring-1 ring-line" aria-hidden>
          {lib.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-base font-semibold text-paper">{lib.name}</span>
            {lib.soon && (
              <span className="shrink-0 rounded-full border border-line bg-hair/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
                {t.soon}
              </span>
            )}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-paper-dim">
            {lib.scenes.length} {t.scenesWord}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {lib.scenes.map((s) => (
              <span key={s} className="rounded-full border border-line bg-ink-2/70 px-2.5 py-1 text-xs text-paper-mute">{s}</span>
            ))}
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

  const [family, setFamily] = useState('all');
  const [q, setQ] = useState('');

  const totalScenes = libs.reduce((n, l) => n + l.scenes.length, 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return libs.filter((l) => {
      if (family !== 'all' && l.g !== family) return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.scenes.some((s) => s.toLowerCase().includes(needle))
      );
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
            <span className="text-brand">{libs.length}</span> {t.titleA}{' '}
            <span className="text-rainbow">{t.titleB}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">{t.sub}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { n: libs.length, l: t.statsSituations },
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

        {/* Sticky controls: search + family filter */}
        <div className="sticky top-[61px] z-20 -mx-5 mt-12 border-y border-line bg-ink/90 px-5 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:w-72">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPh}
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
                <button
                  key={g.id}
                  onClick={() => setFamily(g.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    family === g.id ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'
                  }`}
                >
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
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lib) => <LibraryCard key={lib.name} lib={lib} t={t} defaultOpen />)}
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
                    <span className="font-mono text-xs text-paper-dim">{items.length} {t.statsSituations}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((lib) => <LibraryCard key={lib.name} lib={lib} t={t} />)}
                  </div>
                </section>
              );
            })}
          </div>
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
    </div>
  );
}
