'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'THE GAP', titleA: 'More content,', highlight: 'without more production',
    sub: 'We make the content you need to sell more on OnlyFans.',
    p1: 'Traditional shoots are expensive and slow. A single content day can mean a photographer, location, makeup, lighting, transportation, food, editing and hours of coordination.',
    p2: 'On OnlyFans the money is made in the chat — and there the fan wants content right now. Most creators don’t have it on hand: they can’t reply fast, they can’t hook the fan, the conversation cools off and the sale is lost.',
    p3: 'When a fan asks for custom content that you, your team or your agency don’t have on hand, that’s where we come in: we produce that sales content so you cash in on every request and monetize far more.',
    p4: 'Let’s Shoot fills that gap: curated, ready-to-sell content for chats, PPV drops and custom fan requests — no photographer, location or production cost.',
    diffTitle: 'No revenue share. Ever.',
    diff: 'Others sell lower-quality content and still want a cut — as if they were your partners. We produce on another level, and only ask for a solid subscription. What you earn on OnlyFans stays 100% yours.',
    raw: 'We don’t show raw generations. Most AI production involves testing, variations, rejected outputs and quality filtering. The value of Let’s Shoot is the final curated pack — not the raw production folder.',
  },
  es: {
    label: 'EL HUECO', titleA: 'Más contenido,', highlight: 'sin más producción',
    sub: 'Hacemos el contenido que necesitas para vender más en OnlyFans.',
    p1: 'Las sesiones tradicionales son caras y lentas. Un solo día de contenido puede significar fotógrafo, locación, maquillaje, luces, transporte, comida, edición y horas de coordinación.',
    p2: 'En OnlyFans el dinero se hace en el chat — y ahí el fan quiere contenido al instante. La mayoría de creadoras no lo tiene a la mano: no responden rápido, no enganchan, la conversación se enfría y se pierde la venta.',
    p3: 'Cuando un fan pide un contenido personalizado que tú, tu equipo o tu agencia no tienen a la mano, ahí entramos nosotros: producimos ese contenido de venta para que aproveches cada pedido y monetices mucho más.',
    p4: 'Let’s Shoot llena ese hueco: contenido de venta curado y listo para chats, PPV y pedidos personalizados — sin fotógrafo, locación ni costo de producción.',
    diffTitle: 'Sin porcentaje. Nunca.',
    diff: 'Otros venden contenido de menor nivel que el nuestro y aun así quieren cobrarte un porcentaje, como si fueran tus socios. Nosotros producimos a otro nivel, y solo buscamos una suscripción sólida. Lo que ganas en OnlyFans es 100% tuyo.',
    raw: 'No mostramos las generaciones en crudo. La producción con IA incluye pruebas, variaciones, descartes y control de calidad. El valor de Let’s Shoot es el paquete final curado — no la carpeta de producción.',
  },
};

export default function Solution() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="por-que" className="relative scroll-mt-24 bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
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
          <p>{t.p3}</p>
          <p className="text-paper">{t.p4}</p>
        </motion.div>

        {/* Differentiator — no revenue share */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-12 max-w-2xl rounded-2xl border border-brand/40 bg-brand/[0.06] px-6 py-6 text-center shadow-glow-sm"
        >
          <h3 className="font-display text-xl font-semibold text-brand sm:text-2xl">{t.diffTitle}</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-paper">{t.diff}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 max-w-2xl rounded-2xl border border-line bg-card px-6 py-5 text-center text-[14px] leading-relaxed text-paper-mute"
        >
          {t.raw}
        </motion.p>
      </div>
    </section>
  );
}
