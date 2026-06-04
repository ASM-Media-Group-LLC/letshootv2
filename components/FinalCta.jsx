'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

export default function FinalCta() {
  const { t } = useLang();
  const c = t.finalCta;

  return (
    <section className="relative w-full bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease }}
        className="card-grad relative overflow-hidden rounded-[2.5rem] border border-brand/25 px-6 py-16 text-center shadow-soft sm:py-24"
      >
        <div className="blob left-[5%] top-[-20%] h-[300px] w-[300px] bg-brand/18" aria-hidden />
        <div className="blob right-[5%] bottom-[-20%] h-[300px] w-[300px] bg-sky/12" aria-hidden />

        <div className="relative">
          <h2 className="headline mx-auto max-w-3xl text-[clamp(2.5rem,7vw,5rem)] text-paper">
            {c.titleA} <span className="text-rainbow">{c.highlight}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-paper-mute">{c.body}</p>
          <a
            href="#pricing"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-lg font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
          >
            {c.cta}
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
        </div>
      </motion.div>
      </div>
    </section>
  );
}
