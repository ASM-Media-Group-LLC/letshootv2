'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLang } from '@/app/providers';
import { ICONS } from './icons';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

export default function HowItWorks() {
  const { t } = useLang();
  const h = t.how;

  const ref = useRef(null);
  // Animated draw of the connecting line as user scrolls into view
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 20%'] });
  const lineWidth = useTransform(scrollYProgress, [0, 0.6], ['0%', '100%']);

  return (
    <section className="relative w-full bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading label={h.label} titleA={h.titleA} highlight={h.titleHighlight} sub={h.sub} hue="gradient" />

        <div ref={ref} className="relative mt-16">
          {/* Animated draw-on connector line */}
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px md:block">
            <motion.div
              className="h-full origin-left"
              style={{
                width: lineWidth,
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,177,246,0.5) 8%, rgba(127,224,255,0.85) 50%, rgba(0,177,246,0.5) 92%, transparent 100%)',
              }}
              aria-hidden
            />
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {h.steps.map((s, i) => {
              const Icon = ICONS[s.icon];
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.65, ease, delay: i * 0.18 }}
                  className="relative"
                >
                  {/* Big number circle with pop-in animation */}
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                    whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.18 + 0.15 }}
                    className="relative z-10 mx-auto mb-6 md:mx-0"
                  >
                    <div
                      className="grid h-24 w-24 place-items-center rounded-full"
                      style={{ background: 'radial-gradient(circle at 30% 30%, rgba(0,177,246,0.35), rgba(10,84,255,0.18) 60%, transparent 80%)' }}
                    >
                      <div className="glass-ios grid h-16 w-16 place-items-center rounded-full">
                        <span className="headline text-2xl text-rainbow">{s.n}</span>
                      </div>
                    </div>
                    {/* Pulsing ring */}
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-full border border-brand/30"
                      animate={{ scale: [1, 1.25, 1.25], opacity: [0.5, 0, 0] }}
                      transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity, delay: i * 0.4 }}
                      aria-hidden
                    />
                  </motion.div>

                  {/* Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.55, ease, delay: i * 0.18 + 0.3 }}
                    whileHover={{ y: -6 }}
                    className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-colors hover:border-paper/20"
                  >
                    {/* Icon chip with floating animation */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, delay: i * 0.3 }}
                      className="glass-ios grid h-12 w-12 place-items-center rounded-2xl text-brand"
                    >
                      {Icon && <Icon size={20} strokeWidth={2.2} aria-hidden />}
                    </motion.div>

                    <h3 className="mt-5 font-display text-xl font-semibold text-paper">{s.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-paper-mute">{s.d}</p>

                    {/* Radial accent on hover */}
                    <div
                      className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: 'radial-gradient(circle, rgba(0,177,246,0.22), transparent 70%)' }}
                      aria-hidden
                    />

                    {/* Hover shine sweep */}
                    <div
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-all duration-1000 group-hover:translate-x-full group-hover:opacity-100"
                      aria-hidden
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
