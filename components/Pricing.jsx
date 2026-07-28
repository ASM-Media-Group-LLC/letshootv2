'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Packs — per-month price for each billing period (m = monthly, q = quarterly, a = annual)
export const PACKS = [
  { key: 'test', name: 'Test Pack', was: 500,  m: 249, q: 219, a: 179 },
  { key: 'core', name: 'Core Pack', was: 1000, m: 499, q: 439, a: 359, popular: true },
  { key: 'pro',  name: 'Pro Pack',  was: 2000, m: 899, q: 789, a: 649 },
];
// Billing periods: months billed + discount vs monthly (for the toggle badge)
export const PERIODS = [
  { key: 'm', months: 1,  off: 0 },
  { key: 'q', months: 3,  off: 12 },
  { key: 'a', months: 12, off: 28 },
];

export const PRICING_COPY = {
  en: {
    label: 'PACKAGES', titleA: 'Choose your', highlight: 'sales content pack',
    sub: 'Curated, ready-to-sell photo and video packs — built for PPV, chat sales and custom-style fan requests.',
    perMo: '/mo', cta: 'Get Started', popular: 'Most popular',
    periods: { m: 'Monthly', q: 'Quarterly', a: 'Annual' }, save: 'Save',
    billed: { m: 'billed monthly', q: 'billed every 3 months', a: 'billed yearly' },
    setupTag: 'Free for 7 days', setupTitle: 'Your AI clone, built for free', freeWord: 'FREE', valRange: '$3,000–$10,000',
    setupDetail: 'The custom model behind all your content. Normally $3,000–$10,000 — free with any pack for the next 7 days.',
    whyTitle: 'Why the investment varies',
    whyIntro: 'Every clone is hand-built to match you exactly. The investment scales with the level of detail we reproduce:',
    whyFactors: ['Tattoos & body art', 'Scars or past surgeries', 'Moles & beauty marks', 'Piercings & accessories', 'Skin tone & texture', 'Other distinctive features'],
    whyOutro: 'Simpler likenesses start at $3,000; highly detailed builds reach $10,000 — free for every client during the 7-day launch.',
    packs: {
      test: { desc: 'Try the workflow and get your first batch of sellable content.', features: ['20 final photos', '1 short AI video', '5 sales concepts', 'Curated delivery', '1 technical revision only'] },
      core: { desc: 'The sweet spot — a solid content bank for chats and PPV drops.', features: ['45 final photos', '2 short AI videos', '10 sales concepts', 'Curated delivery', '1 technical revision only'] },
      pro:  { desc: 'Maximum variety for creators who sell every day.', features: ['90 final photos', '4 short AI videos', '20 sales concepts', 'Curated delivery', '2 technical revisions only'] },
    },
    agencyTitle: 'Agency Volume', agencyPrice: 'Custom Quote',
    agencyDesc: 'Managing multiple creators? Get a custom pack for higher volume — more models, photos and concepts.',
    agencyCta: 'Contact us',
  },
  es: {
    label: 'PAQUETES', titleA: 'Elige tu', highlight: 'paquete de contenido',
    sub: 'Paquetes curados de fotos y videos listos para vender — hechos para PPV, ventas por chat y pedidos personalizados de fans.',
    perMo: '/mes', cta: 'Empezar', popular: 'Más popular',
    periods: { m: 'Mensual', q: 'Trimestral', a: 'Anual' }, save: 'Ahorra',
    billed: { m: 'facturado mensual', q: 'facturado cada 3 meses', a: 'facturado al año' },
    setupTag: 'Gratis por 7 días', setupTitle: 'Tu clon IA, creado gratis', freeWord: 'GRATIS', valRange: '$3,000–$10,000',
    setupDetail: 'El molde que crea todo tu contenido. Normalmente $3,000–$10,000 — gratis con cualquier pack los próximos 7 días.',
    whyTitle: 'Por qué varía la inversión',
    whyIntro: 'Cada clon se construye a mano para que sea idéntico a ti. La inversión sube según el nivel de detalle que reproducimos:',
    whyFactors: ['Tatuajes y arte corporal', 'Cicatrices o cirugías previas', 'Lunares y marcas de belleza', 'Piercings y accesorios', 'Tono y textura de piel', 'Otros rasgos distintivos'],
    whyOutro: 'Los casos simples empiezan en $3,000; los muy detallados llegan a $10,000 — gratis para todas durante el lanzamiento de 7 días.',
    packs: {
      test: { desc: 'Prueba el flujo y recibe tu primer lote de contenido vendible.', features: ['20 fotos finales', '1 video IA corto', '5 conceptos de venta', 'Entrega curada', 'Solo 1 revisión técnica'] },
      core: { desc: 'El punto justo — un buen banco de contenido para chats y PPV.', features: ['45 fotos finales', '2 videos IA cortos', '10 conceptos de venta', 'Entrega curada', 'Solo 1 revisión técnica'] },
      pro:  { desc: 'Máxima variedad para creadoras que venden todos los días.', features: ['90 fotos finales', '4 videos IA cortos', '20 conceptos de venta', 'Entrega curada', 'Solo 2 revisiones técnicas'] },
    },
    agencyTitle: 'Volumen para agencias', agencyPrice: 'Cotización a medida',
    agencyDesc: '¿Manejas varias creadoras? Te armamos un paquete a medida para más volumen — más modelos, fotos y conceptos.',
    agencyCta: 'Contáctanos',
  },
  pt: {
    label: 'PACOTES', titleA: 'Escolhe o teu', highlight: 'pacote de conteúdo',
    sub: 'Pacotes curados de fotos e vídeos prontos para vender — feitos para PPV, vendas por chat e pedidos personalizados de fãs.',
    perMo: '/mês', cta: 'Começar', popular: 'Mais popular',
    periods: { m: 'Mensal', q: 'Trimestral', a: 'Anual' }, save: 'Poupa',
    billed: { m: 'faturado mensalmente', q: 'faturado a cada 3 meses', a: 'faturado ao ano' },
    setupTag: 'Grátis por 7 dias', setupTitle: 'O teu clone IA, criado grátis', freeWord: 'GRÁTIS', valRange: '$3,000–$10,000',
    setupDetail: 'O molde que cria todo o teu conteúdo. Normalmente $3,000–$10,000 — grátis com qualquer pack nos próximos 7 dias.',
    whyTitle: 'Porque é que o investimento varia',
    whyIntro: 'Cada clone é construído à mão para ser idêntico a ti. O investimento sobe conforme o nível de detalhe que reproduzimos:',
    whyFactors: ['Tatuagens e arte corporal', 'Cicatrizes ou cirurgias anteriores', 'Sinais e marcas de beleza', 'Piercings e acessórios', 'Tom e textura de pele', 'Outros traços distintivos'],
    whyOutro: 'Os casos simples começam em $3,000; os muito detalhados chegam a $10,000 — grátis para todas durante o lançamento de 7 dias.',
    packs: {
      test: { desc: 'Testa o fluxo e recebe o teu primeiro lote de conteúdo vendável.', features: ['20 fotos finais', '1 vídeo IA curto', '5 conceitos de venda', 'Entrega curada', 'Apenas 1 revisão técnica'] },
      core: { desc: 'O ponto certo — um bom banco de conteúdo para chats e PPV.', features: ['45 fotos finais', '2 vídeos IA curtos', '10 conceitos de venda', 'Entrega curada', 'Apenas 1 revisão técnica'] },
      pro:  { desc: 'Máxima variedade para criadoras que vendem todos os dias.', features: ['90 fotos finais', '4 vídeos IA curtos', '20 conceitos de venda', 'Entrega curada', 'Apenas 2 revisões técnicas'] },
    },
    agencyTitle: 'Volume para agências', agencyPrice: 'Orçamento à medida',
    agencyDesc: 'Geres várias criadoras? Montamos-te um pacote à medida para mais volume — mais modelos, fotos e conceitos.',
    agencyCta: 'Contacta-nos',
  },
  fr: {
    label: 'FORFAITS', titleA: 'Choisis ton', highlight: 'pack de contenu',
    sub: 'Des packs curés de photos et vidéos prêts à vendre — pensés pour le PPV, les ventes par chat et les demandes personnalisées des fans.',
    perMo: '/mois', cta: 'Commencer', popular: 'Le plus populaire',
    periods: { m: 'Mensuel', q: 'Trimestriel', a: 'Annuel' }, save: 'Économise',
    billed: { m: 'facturé chaque mois', q: 'facturé tous les 3 mois', a: 'facturé à l’année' },
    setupTag: 'Gratuit pendant 7 jours', setupTitle: 'Ton clone IA, créé gratuitement', freeWord: 'GRATUIT', valRange: '$3,000–$10,000',
    setupDetail: 'Le modèle sur mesure derrière tout ton contenu. Normalement $3,000–$10,000 — gratuit avec n’importe quel pack pendant les 7 prochains jours.',
    whyTitle: 'Pourquoi l’investissement varie',
    whyIntro: 'Chaque clone est construit à la main pour être identique à toi. L’investissement augmente selon le niveau de détail qu’on reproduit :',
    whyFactors: ['Tatouages et body art', 'Cicatrices ou chirurgies passées', 'Grains de beauté et marques', 'Piercings et accessoires', 'Teint et texture de peau', 'Autres traits distinctifs'],
    whyOutro: 'Les cas simples commencent à $3,000 ; les plus détaillés atteignent $10,000 — gratuit pour toutes pendant le lancement de 7 jours.',
    packs: {
      test: { desc: 'Teste le workflow et reçois ton premier lot de contenu prêt à vendre.', features: ['20 photos finales', '1 vidéo IA courte', '5 concepts de vente', 'Livraison curée', '1 seule révision technique'] },
      core: { desc: 'Le bon équilibre — une solide banque de contenu pour les chats et le PPV.', features: ['45 photos finales', '2 vidéos IA courtes', '10 concepts de vente', 'Livraison curée', '1 seule révision technique'] },
      pro:  { desc: 'Un maximum de variété pour les créatrices qui vendent tous les jours.', features: ['90 photos finales', '4 vidéos IA courtes', '20 concepts de vente', 'Livraison curée', '2 révisions techniques seulement'] },
    },
    agencyTitle: 'Volume agences', agencyPrice: 'Devis sur mesure',
    agencyDesc: 'Tu gères plusieurs créatrices ? On te prépare un pack sur mesure pour plus de volume — plus de modèles, de photos et de concepts.',
    agencyCta: 'Contacte-nous',
  },
  de: {
    label: 'PAKETE', titleA: 'Wähle dein', highlight: 'Content-Paket',
    sub: 'Kuratierte, verkaufsfertige Foto- und Video-Pakete — gemacht für PPV, Chat-Verkäufe und persönliche Fan-Wünsche.',
    perMo: '/Monat', cta: 'Loslegen', popular: 'Am beliebtesten',
    periods: { m: 'Monatlich', q: 'Vierteljährlich', a: 'Jährlich' }, save: 'Spare',
    billed: { m: 'monatlich abgerechnet', q: 'alle 3 Monate abgerechnet', a: 'jährlich abgerechnet' },
    setupTag: '7 Tage gratis', setupTitle: 'Dein KI-Klon, kostenlos erstellt', freeWord: 'GRATIS', valRange: '$3,000–$10,000',
    setupDetail: 'Die maßgeschneiderte Vorlage hinter deinem gesamten Content. Normalerweise $3,000–$10,000 — in den nächsten 7 Tagen gratis zu jedem Pack.',
    whyTitle: 'Warum die Investition variiert',
    whyIntro: 'Jeder Klon wird von Hand gebaut, damit er dir exakt gleicht. Die Investition steigt mit dem Detailgrad, den wir nachbilden:',
    whyFactors: ['Tattoos & Body-Art', 'Narben oder frühere OPs', 'Muttermale & Schönheitsflecken', 'Piercings & Accessoires', 'Hautton & Hauttextur', 'Weitere markante Merkmale'],
    whyOutro: 'Einfache Fälle starten bei $3,000; sehr detaillierte erreichen $10,000 — im 7-Tage-Launch für alle gratis.',
    packs: {
      test: { desc: 'Teste den Workflow und erhalte deine erste Ladung verkaufsfertigen Content.', features: ['20 finale Fotos', '1 kurzes KI-Video', '5 Verkaufskonzepte', 'Kuratierte Lieferung', 'Nur 1 technische Revision'] },
      core: { desc: 'Der Sweet Spot — eine solide Content-Bank für Chats und PPV-Drops.', features: ['45 finale Fotos', '2 kurze KI-Videos', '10 Verkaufskonzepte', 'Kuratierte Lieferung', 'Nur 1 technische Revision'] },
      pro:  { desc: 'Maximale Vielfalt für Creatorinnen, die jeden Tag verkaufen.', features: ['90 finale Fotos', '4 kurze KI-Videos', '20 Verkaufskonzepte', 'Kuratierte Lieferung', 'Nur 2 technische Revisionen'] },
    },
    agencyTitle: 'Agentur-Volumen', agencyPrice: 'Individuelles Angebot',
    agencyDesc: 'Du managst mehrere Creatorinnen? Wir schnüren dir ein individuelles Paket für mehr Volumen — mehr Models, Fotos und Konzepte.',
    agencyCta: 'Kontaktiere uns',
  },
  it: {
    label: 'PACCHETTI', titleA: 'Scegli il tuo', highlight: 'pacchetto di contenuti',
    sub: 'Pacchetti curati di foto e video pronti da vendere — pensati per PPV, vendite in chat e richieste personalizzate dei fan.',
    perMo: '/mese', cta: 'Inizia', popular: 'Più popolare',
    periods: { m: 'Mensile', q: 'Trimestrale', a: 'Annuale' }, save: 'Risparmia',
    billed: { m: 'fatturato ogni mese', q: 'fatturato ogni 3 mesi', a: 'fatturato all’anno' },
    setupTag: 'Gratis per 7 giorni', setupTitle: 'Il tuo clone IA, creato gratis', freeWord: 'GRATIS', valRange: '$3,000–$10,000',
    setupDetail: 'Lo stampo che crea tutti i tuoi contenuti. Normalmente $3,000–$10,000 — gratis con qualsiasi pack per i prossimi 7 giorni.',
    whyTitle: 'Perché l’investimento varia',
    whyIntro: 'Ogni clone è costruito a mano per essere identico a te. L’investimento sale in base al livello di dettaglio che riproduciamo:',
    whyFactors: ['Tatuaggi e body art', 'Cicatrici o interventi passati', 'Nei e segni di bellezza', 'Piercing e accessori', 'Tono e texture della pelle', 'Altri tratti distintivi'],
    whyOutro: 'I casi semplici partono da $3,000; quelli molto dettagliati arrivano a $10,000 — gratis per tutte durante il lancio di 7 giorni.',
    packs: {
      test: { desc: 'Prova il flusso e ricevi il tuo primo lotto di contenuti pronti da vendere.', features: ['20 foto finali', '1 breve video IA', '5 concept di vendita', 'Consegna curata', 'Solo 1 revisione tecnica'] },
      core: { desc: 'Il punto giusto — una solida banca di contenuti per chat e PPV.', features: ['45 foto finali', '2 brevi video IA', '10 concept di vendita', 'Consegna curata', 'Solo 1 revisione tecnica'] },
      pro:  { desc: 'Massima varietà per creator che vendono ogni giorno.', features: ['90 foto finali', '4 brevi video IA', '20 concept di vendita', 'Consegna curata', 'Solo 2 revisioni tecniche'] },
    },
    agencyTitle: 'Volume per agenzie', agencyPrice: 'Preventivo su misura',
    agencyDesc: 'Gestisci più creator? Ti prepariamo un pacchetto su misura per più volume — più modelle, foto e concept.',
    agencyCta: 'Contattaci',
  },
  zh: {
    label: '套餐', titleA: '选择你的', highlight: '内容套餐',
    sub: '精心策划、即刻可售的照片和视频套餐——专为 PPV、聊天销售和粉丝定制需求打造。',
    perMo: '/月', cta: '开始', popular: '最受欢迎',
    periods: { m: '月付', q: '季付', a: '年付' }, save: '省',
    billed: { m: '按月计费', q: '每 3 个月计费', a: '按年计费' },
    setupTag: '限时 7 天免费', setupTitle: '你的 AI 分身，免费打造', freeWord: '免费', valRange: '$3,000–$10,000',
    setupDetail: '生成你全部内容的专属模型。原价 $3,000–$10,000——未来 7 天内购买任意套餐即免费赠送。',
    whyTitle: '为什么投入有所不同',
    whyIntro: '每个分身都由人工精心打造，确保和你一模一样。我们还原的细节越多，投入就越高：',
    whyFactors: ['纹身与身体彩绘', '疤痕或既往手术', '痣与美人痣', '穿孔饰品与配饰', '肤色与肤质', '其他鲜明特征'],
    whyOutro: '简单的从 $3,000 起，细节繁多的可达 $10,000——7 天首发期间所有客户全部免费。',
    packs: {
      test: { desc: '体验完整流程，拿到你的第一批可变现内容。', features: ['20 张成品照片', '1 个 AI 短视频', '5 个销售创意', '精选交付', '仅 1 次技术修改'] },
      core: { desc: '最优性价比——为聊天和 PPV 打造的扎实内容库。', features: ['45 张成品照片', '2 个 AI 短视频', '10 个销售创意', '精选交付', '仅 1 次技术修改'] },
      pro:  { desc: '内容多样性拉满，专为每天出单的创作者。', features: ['90 张成品照片', '4 个 AI 短视频', '20 个销售创意', '精选交付', '仅 2 次技术修改'] },
    },
    agencyTitle: '机构批量方案', agencyPrice: '定制报价',
    agencyDesc: '在管理多位创作者？我们为你定制更大体量的专属套餐——更多模特、更多照片、更多创意。',
    agencyCta: '联系我们',
  },
};

export default function Pricing() {
  const { lang } = useLang();
  const c = PRICING_COPY[lang] || PRICING_COPY.en;
  const [period, setPeriod] = useState('m');

  return (
    <section id="pricing" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={c.label} titleA={c.titleA} highlight={c.highlight} sub={c.sub} align="center" hue="gradient" />
        </div>

        {/* Limited-time free AI-clone setup */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-9 max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-r from-brand/60 via-brand/25 to-brand/60 p-px shadow-glow"
        >
          <div className="rounded-[23px] bg-ink-2/95 px-6 py-6 backdrop-blur">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-5 sm:text-left">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand/15 ring-1 ring-brand/40">
                <Sparkles size={26} className="text-brand" aria-hidden />
              </div>
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-on-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-on-accent/70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-on-accent" />
                  </span>
                  {c.setupTag}
                </span>
                <h3 className="mt-2 font-display text-xl text-paper sm:text-2xl">{c.setupTitle}</h3>
                <p className="mt-1.5 text-[13px] leading-snug text-paper-mute">{c.setupDetail}</p>
              </div>
              <div className="shrink-0 text-center">
                <div className="whitespace-nowrap font-mono text-[13px] text-paper-dim line-through decoration-paper-dim/60">{c.valRange}</div>
                <div className="font-display text-4xl leading-none text-brand">{c.freeWord}</div>
              </div>
            </div>

            {/* Why the price varies */}
            <details className="group mt-4 border-t border-line/70 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-paper-mute transition-colors hover:text-brand sm:justify-start">
                {c.whyTitle}
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-4">
                <p className="text-[13px] leading-relaxed text-paper-mute">{c.whyIntro}</p>
                <ul className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {c.whyFactors.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px] text-paper">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                        <Check size={12} aria-hidden />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line/70 pt-3 text-[12px] leading-relaxed text-paper-dim">{c.whyOutro}</p>
              </div>
            </details>
          </div>
        </motion.div>

        {/* Billing period toggle */}
        <div className="mx-auto mt-10 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-card p-1.5">
          {PERIODS.map((per) => {
            const active = period === per.key;
            return (
              <button
                key={per.key}
                type="button"
                onClick={() => setPeriod(per.key)}
                className={`relative flex flex-1 flex-col items-center justify-center rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 ${
                  active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
                }`}
              >
                <span>{c.periods[per.key]}</span>
                {per.off > 0 && (
                  <span className={`mt-0.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${active ? 'bg-on-accent/20 text-on-accent' : 'bg-brand/15 text-brand'}`}>
                    {c.save} {per.off}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3 packs */}
        <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.map((pack, i) => {
            const pc = c.packs[pack.key];
            const price = pack[period];
            const months = PERIODS.find((p) => p.key === period).months;
            const billedTotal = price * months;
            return (
              <motion.div
                key={pack.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease, delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                className={`group relative flex flex-col rounded-3xl border p-6 transition-shadow duration-300 ${
                  pack.popular ? 'border-brand bg-brand/[0.07] shadow-glow-sm' : 'border-line bg-card hover:border-paper/20'
                }`}
              >
                {pack.popular && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 -top-px h-28 rounded-t-3xl bg-gradient-to-b from-brand/20 to-transparent" aria-hidden />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">
                      {c.popular}
                    </div>
                  </>
                )}

                <span className="relative font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{pack.name}</span>

                <div className="relative mt-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-paper-dim line-through decoration-paper-dim/60">${pack.was.toLocaleString('en-US')}</span>
                    <span className="rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">-{Math.round((1 - price / pack.was) * 100)}%</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-display text-[2.8rem] leading-none ${pack.popular ? 'text-brand' : 'text-paper'}`}>${price}</span>
                    <span className="font-mono text-[11px] text-paper-dim">{c.perMo}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-paper-dim">
                    {period === 'm' ? c.billed.m : `$${billedTotal.toLocaleString('en-US')} ${c.billed[period]}`}
                  </div>
                </div>

                <p className="relative mt-4 min-h-[2.5rem] text-[13px] leading-relaxed text-paper-mute">{pc.desc}</p>

                <div className="relative my-4 h-px bg-line/70" />

                <ul className="relative flex-1 space-y-2.5">
                  {pc.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-[13px] text-paper-mute">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`relative mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold transition-transform hover:scale-[1.03] ${
                    pack.popular ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/60 hover:text-brand'
                  }`}
                >
                  {c.cta}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Agency volume — custom quote */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-5 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-3xl border border-brand/30 bg-card px-6 py-6 text-center sm:flex-row sm:text-left"
        >
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="font-display text-lg text-paper">{c.agencyTitle}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand">{c.agencyPrice}</span>
            </div>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-paper-mute">{c.agencyDesc}</p>
          </div>
          <a href="#" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
            {c.agencyCta} <ArrowRight size={16} aria-hidden />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
