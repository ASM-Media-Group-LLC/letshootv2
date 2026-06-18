'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'HOW DELIVERY WORKS', titleA: 'From brief to', highlight: 'sales-ready pack',
    sub: 'A simple, curated process — designed to protect your time and your brand.',
    steps: [
      'You submit references, model style, approved boundaries and the type of content you want.',
      'We create more images than we deliver.',
      'Our team filters and selects only the strongest, usable assets.',
      'You receive a curated final pack — ready to sell.',
      'Revisions apply only to technical errors, not personal taste.',
    ],
    note: 'You are not paying for every AI generation. You are paying for the final curated content selected for sales use.',
  },
  es: {
    label: 'CÓMO SE ENTREGA', titleA: 'Del brief al', highlight: 'paquete listo para vender',
    sub: 'Un proceso simple y curado — diseñado para cuidar tu tiempo y tu marca.',
    steps: [
      'Nos envías referencias, el estilo de la modelo, los límites aprobados y el tipo de contenido que quieres.',
      'Generamos más imágenes de las que entregamos.',
      'Nuestro equipo filtra y selecciona solo lo mejor y usable.',
      'Recibes un paquete final curado — listo para vender.',
      'Las revisiones aplican solo a errores técnicos, no a gustos personales.',
    ],
    note: 'No pagas por cada generación de IA. Pagas por el contenido final curado, seleccionado para vender.',
  },
};

export default function HowItWorks() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="delivery" className="relative bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-4xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        <div className="mt-12 space-y-3">
          {t.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease, delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15 font-display text-base text-brand">{i + 1}</span>
              <p className="text-[15px] leading-relaxed text-paper">{step}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-10 max-w-2xl rounded-2xl border border-brand/30 bg-brand/[0.06] px-6 py-5 text-center text-[15px] font-medium leading-relaxed text-paper"
        >
          {t.note}
        </motion.p>
      </div>
    </section>
  );
}
