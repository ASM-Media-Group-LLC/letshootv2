'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import BeforeAfter from './BeforeAfter';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Self-contained copy (kept out of the big shared i18n dict). Falls back to ES.
const COPY = {
  es: { label: 'ANTES / DESPUÉS', titleA: 'Cámara regular vs', highlight: 'Cámara IA', sub: 'Arrastra la barra y mira la transformación. La misma persona, otra liga.', before: 'Cámara regular', after: 'Cámara IA', hint: 'Arrastra para revelar' },
  en: { label: 'BEFORE / AFTER', titleA: 'Regular camera vs', highlight: 'AI camera', sub: 'Drag the bar and watch the transformation. Same person, another league.', before: 'Regular camera', after: 'AI camera', hint: 'Drag to reveal' },
  pt: { label: 'ANTES / DEPOIS', titleA: 'Câmara normal vs', highlight: 'Câmara IA', sub: 'Arrasta a barra e vê a transformação. A mesma pessoa, outro nível.', before: 'Câmara normal', after: 'Câmara IA', hint: 'Arrasta para revelar' },
  fr: { label: 'AVANT / APRÈS', titleA: 'Appareil classique vs', highlight: 'Caméra IA', sub: 'Glisse la barre et regarde la transformation. La même personne, un autre niveau.', before: 'Appareil classique', after: 'Caméra IA', hint: 'Glisse pour révéler' },
  de: { label: 'VORHER / NACHHER', titleA: 'Normale Kamera vs', highlight: 'KI-Kamera', sub: 'Zieh den Regler und sieh die Verwandlung. Dieselbe Person, eine andere Liga.', before: 'Normale Kamera', after: 'KI-Kamera', hint: 'Zum Aufdecken ziehen' },
  it: { label: 'PRIMA / DOPO', titleA: 'Fotocamera normale vs', highlight: 'Fotocamera IA', sub: 'Trascina la barra e guarda la trasformazione. La stessa persona, un altro livello.', before: 'Fotocamera normale', after: 'Fotocamera IA', hint: 'Trascina per rivelare' },
  zh: { label: '对比', titleA: '普通相机 vs', highlight: 'AI 相机', sub: '拖动滑块，见证蜕变。同一个人，完全不同的水准。', before: '普通相机', after: 'AI 相机', hint: '拖动以揭晓' },
};

const PAIRS = [
  { before: '/ba-before-1.jpg', after: '/ba-after-1.jpg', alt: 'Sesión IA en locación de lujo' },
  { before: '/ba-before-2.jpg', after: '/ba-after-2.jpg', alt: 'Sesión IA editorial' },
];

export default function BeforeAfterSection() {
  const { lang } = useLang();
  const c = COPY[lang] || COPY.es;

  return (
    <section id="before-after" className="relative bg-ink overflow-hidden py-24 sm:py-28">
      <div className="blob right-[-8%] top-[10%] h-[420px] w-[420px] bg-brand/20" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading label={c.label} titleA={c.titleA} highlight={c.highlight} sub={c.sub} hue="brand" align="center" />

        <div className="mt-14 grid items-start gap-6 sm:grid-cols-2">
          {PAIRS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease, delay: i * 0.1 }}
            >
              <BeforeAfter
                before={p.before}
                after={p.after}
                beforeLabel={c.before}
                afterLabel={c.after}
                alt={p.alt}
              />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
