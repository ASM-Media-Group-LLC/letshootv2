'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'THE REAL PROBLEM', titleA: 'It’s not producing —', highlight: 'it’s not having it ready',
    sub: 'The money is made in the chat, and the fan won’t wait. If the content isn’t ready, the sale walks away.',
    p1: 'And you’re busy. Great content takes time to make — and if you’re late, you might not sell; and when you do, you sell less.',
    p2: 'Every day your fans want something new: teasers, previews, requests. Without content on hand you can’t hook them or keep the relationship that keeps them buying.',
    p3: 'When a fan asks for custom content that you, your team or your agency don’t have on hand, that’s where we come in: we produce that sales content so you cash in on every request and monetize far more.',
    p4: 'Let’s Shoot keeps you stocked: sales and engagement content always ready for chats, PPV and requests — right when you need it, so you never let a sale slip.',
    diffTitle: 'No revenue share. Ever.',
    diff: 'Others sell lower-quality content and still want a cut — as if they were your partners. We produce on another level, and only ask for a solid subscription. What you earn on OnlyFans stays 100% yours.',
    raw: 'We don’t show raw generations. Most AI production involves testing, variations, rejected outputs and quality filtering. The value of Let’s Shoot is the final curated pack — not the raw production folder.',
  },
  es: {
    label: 'EL PROBLEMA REAL', titleA: 'No es producir —', highlight: 'es no tenerlo a la mano',
    sub: 'El dinero se hace en el chat, y el fan no espera. Si el contenido no está listo, la venta se va.',
    p1: 'Y tú estás ocupada. Crear buen contenido toma tiempo — y si te tardas, puede que no vendas; y si vendes, vendes menos.',
    p2: 'Cada día tus fans quieren algo nuevo: teasers, adelantos, pedidos. Sin material a la mano no puedes engancharlos ni sostener la relación que hace que sigan comprando.',
    p3: 'Cuando un fan pide un contenido personalizado que tú, tu equipo o tu agencia no tienen a la mano, ahí entramos nosotros: producimos ese contenido de venta para que aproveches cada pedido y monetices mucho más.',
    p4: 'Let’s Shoot te mantiene surtida: contenido de venta y enganche siempre listo para chats, PPV y pedidos — justo cuando lo necesitas, para que nunca dejes pasar una venta.',
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
