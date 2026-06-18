'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// A "concept" = a sellable visual idea / fantasy for chats, PPV or custom content.
const CONCEPTS = [
  'Strawberries', 'Banana', 'Shower', 'Gym outfit', 'Secretary', 'Maid', 'Nurse',
  'Girlfriend POV', 'Mirror selfie', 'Hotel room', 'Kitchen / cooking', 'Pool / bikini',
  'Morning in bed', 'Car selfie', 'Date night', 'Cozy bedroom', 'Luxury apartment',
  'Beach fantasy', 'Sporty outfit', 'Custom fan request',
];

const T = {
  en: {
    label: 'SALES CONCEPTS', titleA: 'Sellable concepts,', highlight: 'ready to use',
    sub: 'A concept is a sellable visual idea or fantasy you can drop into chats, PPV or custom-style requests. Pick from a growing library — or send your own fan request.',
  },
  es: {
    label: 'CONCEPTOS DE VENTA', titleA: 'Conceptos vendibles,', highlight: 'listos para usar',
    sub: 'Un concepto es una idea o fantasía vendible que usas en chats, PPV o pedidos personalizados. Elige de una librería que crece — o mándanos el pedido de tu fan.',
  },
};

export default function Concepts() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="concepts" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob right-1/4 top-10 h-[320px] w-[320px] bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mt-10 flex flex-wrap justify-center gap-2.5"
        >
          {CONCEPTS.map((c, i) => (
            <span
              key={i}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                c === 'Custom fan request'
                  ? 'border-brand/60 bg-brand/15 font-semibold text-brand'
                  : 'border-line bg-card text-paper-mute hover:border-brand/40 hover:text-paper'
              }`}
            >
              {c}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
