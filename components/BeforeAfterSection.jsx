'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import BeforeAfter from './BeforeAfter';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Self-contained copy (kept out of the big shared i18n dict). Falls back to ES.
const COPY = {
  es: { label: 'ANTES / DESPUÉS', titleA: 'Contenido real vs', highlight: 'Contenido IA', sub: 'Toca la imagen y mira la transformación. La misma persona, otra liga.', before: 'Contenido real', after: 'Contenido IA' },
  en: { label: 'BEFORE / AFTER', titleA: 'Real content vs', highlight: 'AI content', sub: 'Tap the image and watch the transformation. Same person, another league.', before: 'Real content', after: 'AI content' },
  pt: { label: 'ANTES / DEPOIS', titleA: 'Conteúdo real vs', highlight: 'Conteúdo IA', sub: 'Toca na imagem e vê a transformação. A mesma pessoa, outro nível.', before: 'Conteúdo real', after: 'Conteúdo IA' },
  fr: { label: 'AVANT / APRÈS', titleA: 'Contenu réel vs', highlight: 'Contenu IA', sub: "Touche l'image et regarde la transformation. La même personne, un autre niveau.", before: 'Contenu réel', after: 'Contenu IA' },
  de: { label: 'VORHER / NACHHER', titleA: 'Echter Content vs', highlight: 'KI-Content', sub: 'Tippe das Bild an und sieh die Verwandlung. Dieselbe Person, eine andere Liga.', before: 'Echter Content', after: 'KI-Content' },
  it: { label: 'PRIMA / DOPO', titleA: 'Contenuto reale vs', highlight: 'Contenuto IA', sub: "Tocca l'immagine e guarda la trasformazione. La stessa persona, un altro livello.", before: 'Contenuto reale', after: 'Contenuto IA' },
  zh: { label: '对比', titleA: '真实内容 vs', highlight: 'AI 内容', sub: '点击图片，见证蜕变。同一个人，完全不同的水准。', before: '真实内容', after: 'AI 内容' },
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
