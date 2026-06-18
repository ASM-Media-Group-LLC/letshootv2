'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'HOW IT WORKS', titleA: 'Curated by design,', highlight: 'clear by policy',
    polTitle: 'Revision policy',
    pol1: 'Every package includes a curated final selection. The images and videos delivered have already passed internal quality control. Revisions are included only for clear technical issues — distorted hands, incorrect face consistency, major visual glitches, wrong outfit direction, or content that does not match the approved concept.',
    pol2: 'Revisions do not apply to personal preference, change of mind, wanting a completely different concept, or asking to see rejected generations. We generate more content than we deliver, and you receive only the best final assets.',
    forTitle: 'Who this is for', notTitle: 'Not for',
    forList: [
      'OnlyFans creators already monetizing',
      'Agencies managing multiple creators',
      'Creators who sell PPV or custom content',
      'Busy models who can’t shoot every fan request',
      'Teams that need a content bank for chatters',
      'Creators who want more variety without full shoots',
    ],
    notList: [
      'People looking for unlimited edits',
      'People wanting to control every generation',
      'People expecting a full custom shoot for cheap',
      'Beginners with no monetization strategy',
    ],
  },
  es: {
    label: 'CÓMO FUNCIONA', titleA: 'Curado por diseño,', highlight: 'claro por política',
    polTitle: 'Política de revisiones',
    pol1: 'Cada paquete incluye una selección final curada. Las fotos y videos entregados ya pasaron control de calidad interno. Las revisiones se incluyen solo para problemas técnicos claros — manos distorsionadas, inconsistencia de rostro, glitches visuales graves, outfit equivocado, o contenido que no coincide con el concepto aprobado.',
    pol2: 'Las revisiones no aplican a gustos personales, cambios de opinión, querer un concepto totalmente distinto, o pedir ver las generaciones descartadas. Generamos más contenido del que entregamos, y recibes solo lo mejor.',
    forTitle: 'Para quién es', notTitle: 'No es para',
    forList: [
      'Creadoras de OnlyFans que ya monetizan',
      'Agencias que manejan varias creadoras',
      'Quienes venden PPV o contenido personalizado',
      'Modelos ocupadas que no pueden producir cada pedido',
      'Equipos que necesitan banco de contenido para chatters',
      'Quienes quieren más variedad sin sesiones completas',
    ],
    notList: [
      'Quienes buscan ediciones ilimitadas',
      'Quienes quieren controlar cada generación',
      'Quienes esperan una sesión completa a precio barato',
      'Principiantes sin estrategia de monetización',
    ],
  },
};

export default function RevisionPolicy() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="policy" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} align="center" hue="gradient" />
        </div>

        {/* Revision policy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-12 max-w-3xl rounded-3xl border border-line bg-card p-6 sm:p-8"
        >
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-brand">{t.polTitle}</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-paper-mute">{t.pol1}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-paper-mute">{t.pol2}</p>
        </motion.div>

        {/* Who this is for / not for */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease }}
            className="rounded-3xl border border-brand/30 bg-brand/[0.05] p-6 sm:p-8"
          >
            <h3 className="font-display text-lg text-paper">{t.forTitle}</h3>
            <ul className="mt-4 space-y-3">
              {t.forList.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-paper-mute">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease, delay: 0.08 }}
            className="rounded-3xl border border-line bg-card p-6 sm:p-8"
          >
            <h3 className="font-display text-lg text-paper-mute">{t.notTitle}</h3>
            <ul className="mt-4 space-y-3">
              {t.notList.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-paper-dim">
                  <X size={16} className="mt-0.5 shrink-0 text-paper-dim" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
