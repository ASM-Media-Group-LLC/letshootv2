'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Clock, Hourglass, TrendingDown, ArrowRight, ArrowDown, Zap, Check, Heart } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'The real problem',
    highlight: 'We have your content ready at the right moment — for you.',
    sub: 'The money is made in the chat, and the fan won’t wait. When the content isn’t ready, this is what happens:',
    chain: [
      { t: 'The fan asks', d: 'In the chat, they want something right now.' },
      { t: 'You’re busy', d: 'Good content takes time to shoot and edit.' },
      { t: 'You’re late', d: 'The fan cools off and moves on.' },
      { t: 'Sale lost', d: 'You don’t sell — or you sell less.', loss: true },
    ],
    solveKicker: 'With Let’s Shoot',
    solveTitle: 'The content is always on hand',
    solve: 'Sales and engagement content ready to drop — so every chat, PPV and custom request turns into a sale, right when it counts.',
    custom: 'A fan asks for something you, your team or your agency don’t have on hand? We produce it — so you cash in on every request.',
    stratKicker: 'Content with strategy',
    stratTitle: 'The opener that opens the sale',
    strat: 'Your best clients — your whales, your “online boyfriends” — want to see your day-to-day. That everyday content is the opener: it lets you paint a story that ends in a sale of your premium content. But your day-to-day is the hardest thing to have ready in the moment. We make it for you — done and on hand — to feed those conversations and convert more.',
    diffTitle: 'No revenue share. Ever.',
    diff: 'A single image can make you a lot of money — and that’s exactly where others want their cut, as if they were your partners. Not with us: we produce on another level, and it’s part of your subscription, period. Everything you earn with our content, however much, stays 100% yours.',
  },
  es: {
    label: 'El problema real',
    highlight: 'Tenemos tu contenido en el momento indicado — para ti.',
    sub: 'El dinero se hace en el chat, y el fan no espera. Cuando el contenido no está listo, pasa esto:',
    chain: [
      { t: 'El fan pide', d: 'En el chat, quiere algo al instante.' },
      { t: 'Estás ocupada', d: 'El buen contenido toma tiempo en hacerse.' },
      { t: 'Llegas tarde', d: 'El fan se enfría y sigue de largo.' },
      { t: 'Venta perdida', d: 'No vendes — o vendes menos.', loss: true },
    ],
    solveKicker: 'Con Let’s Shoot',
    solveTitle: 'El contenido siempre está a la mano',
    solve: 'Contenido de venta y enganche listo para soltar — así cada chat, PPV y pedido se convierte en venta, justo cuando cuenta.',
    custom: '¿Un fan pide algo que tú, tu equipo o tu agencia no tienen a la mano? Nosotros lo producimos — para que aproveches cada pedido.',
    stratKicker: 'Contenido con estrategia',
    stratTitle: 'El opener que abre la venta',
    strat: 'Tus mejores clientes — tus ballenas, tus “novios online” — quieren ver tu día a día. Ese contenido cotidiano es el opener: con él se pinta una historia que termina en la venta de tu contenido premium. Pero tu día a día es lo más difícil de tener listo al momento. Nosotros te lo hacemos — hecho y a la mano — para alimentar esas conversaciones y convertir más.',
    diffTitle: 'Sin porcentaje. Nunca.',
    diff: 'Una sola imagen puede generarte muchísimo dinero — y ahí es donde otros quieren su porcentaje, como si fueran tus socios. Con nosotros no: producimos a otro nivel y es parte de tu suscripción, punto. Todo lo que ganes con nuestro contenido, por mucho que sea, es 100% tuyo.',
  },
};

const ICONS = [MessageCircle, Clock, Hourglass, TrendingDown];

export default function Solution() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="por-que" className="relative scroll-mt-24 overflow-hidden bg-ink py-24 sm:py-28">
      {/* ambient depth */}
      <div className="blob left-1/2 top-24 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="blob bottom-0 right-[8%] h-[280px] w-[280px] bg-rose-500/10" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-5">
        {/* ── Heading ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-hair/5 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgb(var(--brand,0_177_246))]" />
            {t.label}
          </span>
          <h2 className="headline mx-auto mt-5 max-w-[18ch] text-[clamp(1.85rem,4vw,3rem)] leading-[1.1] text-rainbow [text-wrap:balance]">
            {t.highlight}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">
            {t.sub}
          </p>
        </motion.div>

        {/* ── Cause → effect chain ─────────────────────────────────────────── */}
        <div className="relative mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-stretch md:gap-0">
          {/* connector line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" aria-hidden />

          {t.chain.map((step, i) => {
            const Icon = ICONS[i];
            const loss = step.loss;
            return (
              <Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease, delay: i * 0.09 }}
                  className={`group relative flex flex-1 flex-col items-center rounded-2xl border p-6 text-center backdrop-blur-sm transition-all duration-300 md:mx-1.5 ${
                    loss
                      ? 'border-rose-500/30 bg-gradient-to-b from-rose-500/[0.12] to-rose-500/[0.03] hover:border-rose-500/50'
                      : 'border-line bg-gradient-to-b from-card to-ink-2/60 hover:-translate-y-1 hover:border-brand/40'
                  }`}
                >
                  {/* step number */}
                  <span
                    className={`absolute right-3 top-3 font-mono text-[11px] font-semibold ${
                      loss ? 'text-rose-400/70' : 'text-paper-dim'
                    }`}
                  >
                    {loss ? '✕' : `0${i + 1}`}
                  </span>

                  {/* icon chip */}
                  <div
                    className={`relative z-[1] mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${
                      loss
                        ? 'bg-rose-500/15 text-rose-400 ring-rose-500/25'
                        : 'bg-brand/12 text-brand ring-brand/25'
                    }`}
                  >
                    <Icon size={24} aria-hidden strokeWidth={1.75} />
                  </div>

                  <div className={`font-display text-[17px] font-semibold ${loss ? 'text-rose-200' : 'text-paper'}`}>
                    {step.t}
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-snug text-paper-mute">{step.d}</p>
                </motion.div>

                {i < t.chain.length - 1 && (
                  <div className="flex shrink-0 items-center justify-center py-1 text-paper-dim md:py-0">
                    <ArrowRight className="hidden h-4 w-4 md:block" aria-hidden />
                    <ArrowDown className="h-4 w-4 md:hidden" aria-hidden />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ── Resolution ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-b from-brand/[0.1] to-brand/[0.02] p-8 text-center shadow-glow sm:p-10"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/30">
            <Zap size={26} aria-hidden strokeWidth={1.75} />
          </div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{t.solveKicker}</div>
          <h3 className="mx-auto mt-2 max-w-md font-display text-2xl font-semibold text-paper [text-wrap:balance] sm:text-[1.75rem]">
            {t.solveTitle}
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-paper [text-wrap:balance]">{t.solve}</p>
          <p className="mx-auto mt-5 max-w-xl border-t border-brand/15 pt-5 text-[14px] leading-relaxed text-paper-mute [text-wrap:balance]">
            {t.custom}
          </p>
        </motion.div>

        {/* ── Strategy / the opener ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 flex max-w-3xl items-start gap-4 rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/60 px-6 py-6 text-left"
        >
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand ring-1 ring-brand/25">
            <Heart size={20} aria-hidden strokeWidth={1.9} />
          </div>
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">{t.stratKicker}</div>
            <h3 className="mt-1 font-display text-lg font-semibold text-paper sm:text-xl">{t.stratTitle}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-paper-mute">{t.strat}</p>
          </div>
        </motion.div>

        {/* ── No revenue share ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 flex max-w-3xl items-start gap-4 rounded-2xl border border-line bg-card px-6 py-6 text-left"
        >
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand ring-1 ring-brand/20">
            <Check size={18} aria-hidden strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-paper sm:text-xl">{t.diffTitle}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-paper-mute">{t.diff}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
