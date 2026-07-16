'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Check } from 'lucide-react';
import { useLang } from '@/app/providers';
import { LIBRARIES, GROUPS } from '@/lib/libraries';
import Logo from '@/components/Logo';

const ease = [0.22, 1, 0.36, 1];

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
    ctaTitle: '¿Te imaginas tener todo esto listo, sin producirlo tú?',
    ctaSub: 'Eso es exactamente lo que hacemos. Tú vendes; nosotros creamos el producto.',
    ctaBtn: 'Ver paquetes',
    back: 'Inicio',
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
    ctaTitle: 'Imagine having all of this ready — without producing it yourself.',
    ctaSub: 'That is exactly what we do. You sell; we create the product.',
    ctaBtn: 'View packages',
    back: 'Home',
  },
};

export default function BibliotecaPage() {
  const { lang } = useLang();
  const t = T[lang] || T.en;
  const libs = LIBRARIES[lang] || LIBRARIES.en;
  const groups = GROUPS[lang] || GROUPS.en;

  const totalScenes = libs.reduce((n, l) => n + l.scenes.length, 0);

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

          {/* Stats */}
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

        {/* Groups */}
        <div className="mt-16 space-y-14">
          {groups.map((g) => {
            const items = libs.filter((l) => l.g === g.id);
            return (
              <section key={g.id}>
                <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
                  <h2 className="font-display text-xl font-semibold text-paper">{g.name}</h2>
                  <span className="font-mono text-xs text-paper-dim">{items.length} {t.statsSituations}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((lib, i) => (
                    <motion.div
                      key={lib.name}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{ duration: 0.4, ease, delay: (i % 3) * 0.05 }}
                      className="rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/50 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hair/5 text-2xl ring-1 ring-line" aria-hidden>{lib.emoji}</span>
                        <div>
                          <h3 className="font-display text-base font-semibold text-paper">{lib.name}</h3>
                          <span className="font-mono text-[11px] text-paper-dim">{lib.scenes.length} {t.scenesWord}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {lib.scenes.map((s) => (
                          <span key={s} className="rounded-full border border-line bg-ink-2/70 px-2.5 py-1 text-xs text-paper-mute">{s}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Closing CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="relative mx-auto mt-20 max-w-3xl overflow-hidden rounded-[2rem] border border-brand/45 bg-gradient-to-b from-brand/[0.14] via-brand/[0.05] to-transparent p-8 text-center shadow-glow sm:p-12"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold leading-tight [text-wrap:balance] sm:text-4xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-paper [text-wrap:balance]">{t.ctaSub}</p>
            <Link href="/#pricing" className="group mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]">
              {t.ctaBtn}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
