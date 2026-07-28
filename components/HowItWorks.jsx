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
  pt: {
    label: 'COMO ENTREGAMOS', titleA: 'Do brief ao', highlight: 'pacote pronto a vender',
    sub: 'Um processo simples e curado — pensado para proteger o teu tempo e a tua marca.',
    steps: [
      'Envias-nos referências, o estilo da modelo, os limites aprovados e o tipo de conteúdo que queres.',
      'Geramos mais imagens do que as que entregamos.',
      'A nossa equipa filtra e seleciona apenas o melhor e realmente utilizável.',
      'Recebes um pacote final curado — pronto a vender.',
      'As revisões aplicam-se só a erros técnicos, não a gostos pessoais.',
    ],
    note: 'Não pagas por cada geração de IA. Pagas pelo conteúdo final curado, selecionado para vender.',
  },
  fr: {
    label: 'COMMENT ON LIVRE', titleA: 'Du brief au', highlight: 'pack prêt à vendre',
    sub: 'Un processus simple et soigné — pensé pour protéger ton temps et ta marque.',
    steps: [
      'Tu nous envoies des références, le style de la modèle, les limites approuvées et le type de contenu que tu veux.',
      'On génère plus d’images qu’on n’en livre.',
      'Notre équipe filtre et sélectionne uniquement les assets les plus forts et vraiment utilisables.',
      'Tu reçois un pack final trié sur le volet — prêt à vendre.',
      'Les révisions ne couvrent que les erreurs techniques, pas les goûts personnels.',
    ],
    note: 'Tu ne paies pas chaque génération d’IA. Tu paies le contenu final sélectionné avec soin, prêt pour la vente.',
  },
  de: {
    label: 'SO LÄUFT DIE LIEFERUNG', titleA: 'Vom Brief zum', highlight: 'verkaufsfertigen Paket',
    sub: 'Ein einfacher, kuratierter Prozess — gemacht, um deine Zeit und deine Marke zu schützen.',
    steps: [
      'Du schickst uns Referenzen, den Stil des Models, die freigegebenen Grenzen und die Art von Content, die du willst.',
      'Wir erstellen mehr Bilder, als wir liefern.',
      'Unser Team filtert und wählt nur das Stärkste und wirklich Brauchbare aus.',
      'Du bekommst ein final kuratiertes Paket — bereit zum Verkaufen.',
      'Revisionen gelten nur für technische Fehler, nicht für persönlichen Geschmack.',
    ],
    note: 'Du zahlst nicht für jede KI-Generierung. Du zahlst für den final kuratierten Content, ausgewählt für den Verkauf.',
  },
  it: {
    label: 'COME AVVIENE LA CONSEGNA', titleA: 'Dal brief al', highlight: 'pacchetto pronto da vendere',
    sub: 'Un processo semplice e curato — pensato per proteggere il tuo tempo e il tuo brand.',
    steps: [
      'Ci invii referenze, lo stile della modella, i limiti approvati e il tipo di contenuti che vuoi.',
      'Generiamo più immagini di quelle che consegniamo.',
      'Il nostro team filtra e seleziona solo gli asset più forti e davvero utilizzabili.',
      'Ricevi un pacchetto finale curato — pronto da vendere.',
      'Le revisioni valgono solo per errori tecnici, non per gusti personali.',
    ],
    note: 'Non paghi ogni generazione di IA. Paghi il contenuto finale curato, selezionato per la vendita.',
  },
  zh: {
    label: '交付流程', titleA: '从需求到', highlight: '即刻可卖的内容包',
    sub: '简单、精心筛选的流程——为守护你的时间和品牌而设计。',
    steps: [
      '你把参考图、模特风格、已确认的尺度和想要的内容类型发给我们。',
      '我们生成的图片远多于最终交付的数量。',
      '我们的团队严格筛选，只留下最出色、真正可用的素材。',
      '你收到一份精选的最终内容包——即刻可卖。',
      '修改仅针对技术性错误，不含个人喜好。',
    ],
    note: '你不是为每次 AI 生成付费，而是为最终精选、专为销售挑选的内容付费。',
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
