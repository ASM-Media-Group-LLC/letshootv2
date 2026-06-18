'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'THE GAP', titleA: 'More content,', highlight: 'without more production',
    p1: 'Traditional shoots are expensive and slow. A single content day can mean a photographer, location, makeup, lighting, transportation, food, editing and hours of coordination.',
    p2: 'AI tools are cheaper — but most creators don’t need another tool. They need ready-to-sell content.',
    p3: 'Let’s Shoot fills that gap: curated sales content built for OnlyFans chats, PPV drops and custom-style fan requests.',
    raw: 'We don’t show raw generations. Most AI production involves testing, variations, rejected outputs and quality filtering. The value of Let’s Shoot is the final curated pack — not the raw production folder.',
  },
  es: {
    label: 'EL HUECO', titleA: 'Más contenido,', highlight: 'sin más producción',
    p1: 'Las sesiones tradicionales son caras y lentas. Un solo día de contenido puede significar fotógrafo, locación, maquillaje, luces, transporte, comida, edición y horas de coordinación.',
    p2: 'Las herramientas de IA son más baratas — pero la mayoría de las creadoras no necesitan otra herramienta. Necesitan contenido listo para vender.',
    p3: 'Let’s Shoot llena ese hueco: contenido de venta curado, hecho para chats de OnlyFans, PPV y pedidos personalizados.',
    raw: 'No mostramos las generaciones en crudo. La producción con IA incluye pruebas, variaciones, descartes y control de calidad. El valor de Let’s Shoot es el paquete final curado — no la carpeta de producción.',
  },
};

export default function Solution() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section className="relative bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} align="center" hue="gradient" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease }}
          className="mt-10 space-y-5 text-center text-[16px] leading-relaxed text-paper-mute"
        >
          <p>{t.p1}</p>
          <p>{t.p2}</p>
          <p className="text-paper">{t.p3}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-10 max-w-2xl rounded-2xl border border-line bg-card px-6 py-5 text-center text-[14px] leading-relaxed text-paper-mute"
        >
          {t.raw}
        </motion.p>
      </div>
    </section>
  );
}
