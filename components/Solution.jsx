'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Clock, Hourglass, TrendingDown, ArrowRight, ArrowDown, Zap } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'THE REAL PROBLEM',
    titleA: 'It’s not creating content.', highlight: 'It’s having it ready, instantly.',
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
    diffTitle: 'No revenue share. Ever.',
    diff: 'A single image can make you a lot of money — and that’s exactly where others want their cut, as if they were your partners. Not with us: we produce on another level, and it’s part of your subscription, period. Everything you earn with our content, however much, stays 100% yours.',
  },
  es: {
    label: 'EL PROBLEMA REAL',
    titleA: 'No es crear contenido.', highlight: 'Es tenerlo listo al instante.',
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
    diffTitle: 'Sin porcentaje. Nunca.',
    diff: 'Una sola imagen puede generarte muchísimo dinero — y ahí es donde otros quieren su porcentaje, como si fueran tus socios. Con nosotros no: producimos a otro nivel y es parte de tu suscripción, punto. Todo lo que ganes con nuestro contenido, por mucho que sea, es 100% tuyo.',
  },
};

const ICONS = [MessageCircle, Clock, Hourglass, TrendingDown];

export default function Solution() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="por-que" className="relative scroll-mt-24 bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        {/* ── Cause → effect chain (the wall of text, made scannable) ───────── */}
        <div className="mt-14 flex flex-col items-stretch gap-3 md:flex-row md:items-stretch">
          {t.chain.map((step, i) => {
            const Icon = ICONS[i];
            const loss = step.loss;
            return (
              <Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                  className={`flex flex-1 flex-col items-center rounded-2xl border p-5 text-center ${
                    loss ? 'border-rose-500/40 bg-rose-500/[0.07]' : 'border-line bg-card'
                  }`}
                >
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
                      loss ? 'bg-rose-500/15 text-rose-400' : 'bg-brand/15 text-brand'
                    }`}
                  >
                    <Icon size={20} aria-hidden />
                  </div>
                  <div className={`font-display text-base font-semibold ${loss ? 'text-rose-200' : 'text-paper'}`}>
                    {step.t}
                  </div>
                  <p className="mt-1 text-sm leading-snug text-paper-mute">{step.d}</p>
                </motion.div>

                {i < t.chain.length - 1 && (
                  <div className="flex shrink-0 items-center justify-center text-paper-dim">
                    <ArrowRight className="hidden h-5 w-5 md:block" aria-hidden />
                    <ArrowDown className="h-5 w-5 md:hidden" aria-hidden />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ── Resolution ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease }}
          className="mx-auto mt-8 max-w-3xl rounded-3xl border border-brand/40 bg-brand/[0.06] p-7 text-center shadow-glow-sm sm:p-9"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Zap size={22} aria-hidden />
          </div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-brand">{t.solveKicker}</div>
          <h3 className="mt-2 font-display text-2xl font-semibold text-paper sm:text-3xl">{t.solveTitle}</h3>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-paper">{t.solve}</p>
          <p className="mx-auto mt-4 max-w-xl border-t border-brand/15 pt-4 text-[14px] leading-relaxed text-paper-mute">
            {t.custom}
          </p>
        </motion.div>

        {/* ── No revenue share ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 max-w-3xl rounded-2xl border border-line bg-card px-6 py-6 text-center"
        >
          <h3 className="font-display text-lg font-semibold text-paper sm:text-xl">{t.diffTitle}</h3>
          <p className="mx-auto mt-2 max-w-2xl text-[14px] leading-relaxed text-paper-mute">{t.diff}</p>
        </motion.div>
      </div>
    </section>
  );
}
