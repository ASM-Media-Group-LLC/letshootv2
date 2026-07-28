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
  pt: {
    label: 'COMO FUNCIONA', titleA: 'Curado por princípio,', highlight: 'claro por política',
    polTitle: 'Política de revisões',
    pol1: 'Cada pacote inclui uma seleção final curada. As fotos e vídeos entregues já passaram pelo controlo de qualidade interno. As revisões estão incluídas apenas para problemas técnicos claros — mãos distorcidas, inconsistência do rosto, glitches visuais graves, outfit errado, ou conteúdo que não corresponde ao conceito aprovado.',
    pol2: 'As revisões não se aplicam a gostos pessoais, mudanças de opinião, querer um conceito totalmente diferente, ou pedir para ver as gerações descartadas. Geramos mais conteúdo do que entregamos, e recebes apenas o melhor.',
    forTitle: 'Para quem é', notTitle: 'Não é para',
    forList: [
      'Criadoras de OnlyFans que já monetizam',
      'Agências que gerem várias criadoras',
      'Quem vende PPV ou conteúdo personalizado',
      'Modelos ocupadas que não conseguem produzir cada pedido',
      'Equipas que precisam de um banco de conteúdo para chatters',
      'Quem quer mais variedade sem sessões completas',
    ],
    notList: [
      'Quem procura edições ilimitadas',
      'Quem quer controlar cada geração',
      'Quem espera uma sessão completa a preço barato',
      'Iniciantes sem estratégia de monetização',
    ],
  },
  fr: {
    label: 'COMMENT ÇA MARCHE', titleA: 'Curation assumée,', highlight: 'politique claire',
    polTitle: 'Politique de révisions',
    pol1: 'Chaque forfait inclut une sélection finale soignée. Les photos et vidéos livrées ont déjà passé notre contrôle qualité interne. Les révisions ne sont incluses que pour des problèmes techniques évidents — mains déformées, incohérence du visage, glitchs visuels majeurs, mauvaise tenue, ou contenu qui ne correspond pas au concept validé.',
    pol2: 'Les révisions ne s’appliquent pas aux goûts personnels, aux changements d’avis, à l’envie d’un concept totalement différent, ni aux demandes de voir les générations écartées. On génère plus de contenu qu’on n’en livre, et tu ne reçois que le meilleur.',
    forTitle: 'À qui ça s’adresse', notTitle: 'Pas pour',
    forList: [
      'Les créatrices OnlyFans qui monétisent déjà',
      'Les agences qui gèrent plusieurs créatrices',
      'Celles qui vendent du PPV ou du contenu personnalisé',
      'Les modèles débordées qui ne peuvent pas produire chaque demande',
      'Les équipes qui ont besoin d’une banque de contenu pour les chatters',
      'Celles qui veulent plus de variété sans shootings complets',
    ],
    notList: [
      'Ceux qui cherchent des retouches illimitées',
      'Ceux qui veulent contrôler chaque génération',
      'Ceux qui attendent un shooting complet à petit prix',
      'Les débutantes sans stratégie de monétisation',
    ],
  },
  de: {
    label: 'SO FUNKTIONIERT’S', titleA: 'Bewusst kuratiert,', highlight: 'klar geregelt',
    polTitle: 'Richtlinie für Überarbeitungen',
    pol1: 'Jedes Paket enthält eine kuratierte finale Auswahl. Die gelieferten Fotos und Videos haben bereits unsere interne Qualitätskontrolle durchlaufen. Überarbeitungen sind nur bei klaren technischen Problemen inbegriffen — verzerrte Hände, inkonsistentes Gesicht, gravierende visuelle Glitches, falsches Outfit oder Content, der nicht zum freigegebenen Konzept passt.',
    pol2: 'Überarbeitungen gelten nicht bei persönlichem Geschmack, Meinungsänderungen, dem Wunsch nach einem komplett anderen Konzept oder der Bitte, aussortierte Generierungen zu sehen. Wir generieren mehr Content, als wir liefern, und du bekommst nur das Beste.',
    forTitle: 'Für wen es ist', notTitle: 'Nichts für',
    forList: [
      'OnlyFans-Creatorinnen, die bereits monetarisieren',
      'Agenturen, die mehrere Creatorinnen betreuen',
      'Alle, die PPV oder Custom Content verkaufen',
      'Vielbeschäftigte Models, die nicht jede Anfrage produzieren können',
      'Teams, die eine Content-Bank für Chatter brauchen',
      'Alle, die mehr Abwechslung ohne komplette Shootings wollen',
    ],
    notList: [
      'Leute, die unbegrenzte Bearbeitungen suchen',
      'Leute, die jede Generierung kontrollieren wollen',
      'Leute, die ein komplettes Shooting zum Billigpreis erwarten',
      'Anfänger ohne Monetarisierungsstrategie',
    ],
  },
  it: {
    label: 'COME FUNZIONA', titleA: 'Curato per scelta,', highlight: 'regole chiare',
    polTitle: 'Politica di revisione',
    pol1: 'Ogni pacchetto include una selezione finale curata. Le foto e i video consegnati hanno già superato il controllo qualità interno. Le revisioni sono incluse solo per problemi tecnici evidenti — mani distorte, incoerenza del volto, glitch visivi gravi, outfit sbagliato, o contenuti che non corrispondono al concept approvato.',
    pol2: 'Le revisioni non si applicano a gusti personali, ripensamenti, alla voglia di un concept totalmente diverso, o alla richiesta di vedere le generazioni scartate. Generiamo più contenuti di quelli che consegniamo, e ricevi solo il meglio.',
    forTitle: 'Per chi è', notTitle: 'Non è per',
    forList: [
      'Creator di OnlyFans che già monetizzano',
      'Agenzie che gestiscono più creator',
      'Chi vende PPV o contenuti personalizzati',
      'Modelle impegnate che non possono produrre ogni richiesta',
      'Team che hanno bisogno di una banca contenuti per i chatter',
      'Chi vuole più varietà senza shooting completi',
    ],
    notList: [
      'Chi cerca modifiche illimitate',
      'Chi vuole controllare ogni generazione',
      'Chi si aspetta uno shooting completo a prezzo basso',
      'Principianti senza strategia di monetizzazione',
    ],
  },
  zh: {
    label: '如何运作', titleA: '精心筛选，', highlight: '规则透明',
    polTitle: '修改政策',
    pol1: '每个套餐都包含一份精心筛选的最终成片。交付的照片和视频都已通过内部质检。修改仅限于明显的技术问题 — 手部变形、脸部不一致、严重的视觉瑕疵、服装搞错，或内容与事先确认的方案不符。',
    pol2: '修改不适用于个人喜好、改变主意、想换一个完全不同的方案，或要求查看被淘汰的生成内容。我们生成的内容比交付的更多，你收到的只有最好的那部分。',
    forTitle: '适合谁', notTitle: '不适合',
    forList: [
      '已经在变现的 OnlyFans 创作者',
      '管理多位创作者的机构',
      '出售 PPV 或定制内容的人',
      '忙到无法逐单制作内容的模特',
      '需要为聊天客服准备内容库的团队',
      '不用完整拍摄也想要更多变化的人',
    ],
    notList: [
      '想要无限次修改的人',
      '想控制每一次生成的人',
      '指望花小钱买到完整拍摄的人',
      '没有变现策略的新手',
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
