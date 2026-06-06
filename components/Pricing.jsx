'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Minus, ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// ── Plans (language-independent: name, price, structure) ─────────────────────
const PLANS = [
  { key: 'free',     name: 'Free',     base: 0 },
  { key: 'standard', name: 'Standard', base: 79.99 },
  { key: 'plus',     name: 'Plus',     base: 119.99, inherits: 'Standard' },
  { key: 'premium',  name: 'Premium',  base: 199.99, inherits: 'Plus', popular: true },
  { key: 'elite',    name: 'Elite',    base: 399.00, inherits: 'Premium', attention: true },
];

// Billing periods (mult = discount applied, off = badge under label)
const PERIODS = [
  { key: 'm', mult: 1,    off: null },
  { key: 'q', mult: 0.85, off: 15 },
  { key: 'a', mult: 0.75, off: 25 },
];

// Stepper aria-labels (creator count +/-)
const STEP_ARIA = {
  es: { less: 'Quitar creador', more: 'Añadir creador' },
  en: { less: 'Remove creator', more: 'Add creator' },
  pt: { less: 'Remover criador', more: 'Adicionar criador' },
  fr: { less: 'Retirer un créateur', more: 'Ajouter un créateur' },
  de: { less: 'Creator entfernen', more: 'Creator hinzufügen' },
  it: { less: 'Rimuovi creator', more: 'Aggiungi creator' },
  zh: { less: '减少创作者', more: '增加创作者' },
};

// Top-level tabs
const TABS = {
  es: { creator: 'Creador', agency: 'Agencia', business: 'Empresa' },
  en: { creator: 'Creator', agency: 'Agency', business: 'Business' },
  pt: { creator: 'Criador', agency: 'Agência', business: 'Empresa' },
  fr: { creator: 'Créateur', agency: 'Agence', business: 'Entreprise' },
  de: { creator: 'Creator', agency: 'Agentur', business: 'Unternehmen' },
  it: { creator: 'Creator', agency: 'Agenzia', business: 'Azienda' },
  zh: { creator: '创作者', agency: '代理', business: '企业' },
};

// Agency: volume pricing per creator (language-independent)
const AGENCY_PLANS = [
  { key: 'agency',   name: 'Agency',          volume: [[3, 99.99], [5, 82.99], [8, 60.99], [Infinity, 59.99]] },
  { key: 'advanced', name: 'Agency Advanced', volume: [[3, 116.99], [5, 91.99], [8, 75.99], [Infinity, 68.99]] },
];
function perCreator(plan, n) {
  for (const [max, price] of plan.volume) if (n <= max) return price;
  return plan.volume[plan.volume.length - 1][1];
}

// Agency / Business copy (es + en; others fall back to en)
const AGENCY = {
  es: {
    desc: 'Producción de IA centralizada para agencias que gestionan varios creadores. Precio por volumen.',
    planDesc: { agency: 'Producción centralizada para agencias que gestionan varios creadores.', advanced: 'Todo lo de Agency más dirección de arte avanzada, branding a medida y soporte prioritario.' },
    featuresTitle: 'Incluido', advancedTitle: 'Agency Advanced añade',
    features: [
      { t: 'Creadores ilimitados', tag: 'Exclusivo' }, { t: 'Fotos IA ilimitadas', tag: 'Sin límite' }, { t: 'Añade o quita creadores', tag: 'Flexible' },
      { t: 'Dashboard de agencia centralizado' }, { t: 'Reportes en tiempo real' }, { t: 'Producción 24/7 (IA + equipo)' },
      { t: 'Videos IA + reels' }, { t: 'Locaciones premium' }, { t: 'Licencia comercial' }, { t: 'Inicio inmediato' },
      { t: 'Renders prioritarios' }, { t: 'Gestión de talento' },
    ],
    advancedFeatures: [
      { t: 'Dirección de arte avanzada', tag: 'Avanzado' }, { t: 'Branding y estilos a medida', tag: 'Avanzado' }, { t: 'Soporte prioritario', tag: 'Exclusivo' },
    ],
    yourPrice: 'Tu precio', creators: 'Creadores', volumeTitle: 'Precio por volumen (por creador)', perMonth: '/mes', cta: 'Hablar con ventas',
    fine: 'Cancela cuando quieras. Precios sin impuestos aplicables.',
  },
  en: {
    desc: 'Centralized AI production for agencies managing multiple creators. Volume pricing.',
    planDesc: { agency: 'Centralized production for agencies managing multiple creators.', advanced: 'Everything in Agency plus advanced art direction, custom branding and priority support.' },
    featuresTitle: 'Included', advancedTitle: 'Agency Advanced adds',
    features: [
      { t: 'Unlimited creators', tag: 'Exclusive' }, { t: 'Unlimited AI photos', tag: 'Uncapped' }, { t: 'Add or remove creators', tag: 'Flexible' },
      { t: 'Centralized agency dashboard' }, { t: 'Real-time reporting' }, { t: '24/7 production (AI + team)' },
      { t: 'AI videos + reels' }, { t: 'Premium locations' }, { t: 'Commercial license' }, { t: 'Immediate start' },
      { t: 'Priority renders' }, { t: 'Talent management' },
    ],
    advancedFeatures: [
      { t: 'Advanced art direction', tag: 'Advanced' }, { t: 'Custom branding & styles', tag: 'Advanced' }, { t: 'Priority support', tag: 'Exclusive' },
    ],
    yourPrice: 'Your price', creators: 'Creators', volumeTitle: 'Volume pricing (per creator)', perMonth: '/mo', cta: 'Talk to sales',
    fine: 'Cancel anytime. Prices exclude applicable taxes.',
  },
  pt: {
    desc: 'Produção de IA centralizada para agências que gerem vários criadores. Preço por volume.',
    planDesc: { agency: 'Produção centralizada para agências que gerem vários criadores.', advanced: 'Tudo do Agency mais direção de arte avançada, branding à medida e suporte prioritário.' },
    featuresTitle: 'Incluído', advancedTitle: 'O Agency Advanced acrescenta',
    features: [
      { t: 'Criadores ilimitados', tag: 'Exclusivo' }, { t: 'Fotos IA ilimitadas', tag: 'Sem limite' }, { t: 'Adiciona ou remove criadores', tag: 'Flexível' },
      { t: 'Dashboard de agência centralizado' }, { t: 'Relatórios em tempo real' }, { t: 'Produção 24/7 (IA + equipa)' },
      { t: 'Vídeos IA + reels' }, { t: 'Localizações premium' }, { t: 'Licença comercial' }, { t: 'Início imediato' },
      { t: 'Renders prioritários' }, { t: 'Gestão de talento' },
    ],
    advancedFeatures: [
      { t: 'Direção de arte avançada', tag: 'Avançado' }, { t: 'Branding e estilos à medida', tag: 'Avançado' }, { t: 'Suporte prioritário', tag: 'Exclusivo' },
    ],
    yourPrice: 'O teu preço', creators: 'Criadores', volumeTitle: 'Preço por volume (por criador)', perMonth: '/mês', cta: 'Falar com vendas',
    fine: 'Cancela quando quiseres. Preços sem impostos aplicáveis.',
  },
  fr: {
    desc: 'Production IA centralisée pour les agences gérant plusieurs créateurs. Tarif dégressif.',
    planDesc: { agency: 'Production centralisée pour les agences gérant plusieurs créateurs.', advanced: 'Tout d’Agency plus direction artistique avancée, branding sur mesure et support prioritaire.' },
    featuresTitle: 'Inclus', advancedTitle: 'Agency Advanced ajoute',
    features: [
      { t: 'Créateurs illimités', tag: 'Exclusif' }, { t: 'Photos IA illimitées', tag: 'Sans limite' }, { t: 'Ajoute ou retire des créateurs', tag: 'Flexible' },
      { t: 'Tableau de bord d’agence centralisé' }, { t: 'Rapports en temps réel' }, { t: 'Production 24/7 (IA + équipe)' },
      { t: 'Vidéos IA + reels' }, { t: 'Lieux premium' }, { t: 'Licence commerciale' }, { t: 'Démarrage immédiat' },
      { t: 'Rendus prioritaires' }, { t: 'Gestion des talents' },
    ],
    advancedFeatures: [
      { t: 'Direction artistique avancée', tag: 'Avancé' }, { t: 'Branding et styles sur mesure', tag: 'Avancé' }, { t: 'Support prioritaire', tag: 'Exclusif' },
    ],
    yourPrice: 'Ton prix', creators: 'Créateurs', volumeTitle: 'Tarif dégressif (par créateur)', perMonth: '/mois', cta: 'Contacter les ventes',
    fine: 'Annule quand tu veux. Prix hors taxes applicables.',
  },
  de: {
    desc: 'Zentralisierte KI-Produktion für Agenturen mit mehreren Creators. Mengenrabatt.',
    planDesc: { agency: 'Zentralisierte Produktion für Agenturen mit mehreren Creators.', advanced: 'Alles aus Agency plus erweiterte Art-Direction, individuelles Branding und Prioritäts-Support.' },
    featuresTitle: 'Enthalten', advancedTitle: 'Agency Advanced ergänzt',
    features: [
      { t: 'Unbegrenzte Creators', tag: 'Exklusiv' }, { t: 'Unbegrenzte KI-Fotos', tag: 'Unbegrenzt' }, { t: 'Creators hinzufügen/entfernen', tag: 'Flexibel' },
      { t: 'Zentrales Agentur-Dashboard' }, { t: 'Echtzeit-Reporting' }, { t: '24/7-Produktion (KI + Team)' },
      { t: 'KI-Videos + Reels' }, { t: 'Premium-Locations' }, { t: 'Kommerzielle Lizenz' }, { t: 'Sofortiger Start' },
      { t: 'Prioritäts-Renders' }, { t: 'Talent-Management' },
    ],
    advancedFeatures: [
      { t: 'Erweiterte Art-Direction', tag: 'Erweitert' }, { t: 'Individuelles Branding & Styles', tag: 'Erweitert' }, { t: 'Prioritäts-Support', tag: 'Exklusiv' },
    ],
    yourPrice: 'Dein Preis', creators: 'Creators', volumeTitle: 'Mengenpreis (pro Creator)', perMonth: '/Mon.', cta: 'Vertrieb kontaktieren',
    fine: 'Jederzeit kündbar. Preise zzgl. anfallender Steuern.',
  },
  it: {
    desc: 'Produzione IA centralizzata per agenzie che gestiscono più creator. Prezzo a volume.',
    planDesc: { agency: 'Produzione centralizzata per agenzie che gestiscono più creator.', advanced: 'Tutto di Agency più art direction avanzata, branding su misura e supporto prioritario.' },
    featuresTitle: 'Incluso', advancedTitle: 'Agency Advanced aggiunge',
    features: [
      { t: 'Creator illimitati', tag: 'Esclusivo' }, { t: 'Foto IA illimitate', tag: 'Illimitate' }, { t: 'Aggiungi o rimuovi creator', tag: 'Flessibile' },
      { t: 'Dashboard agenzia centralizzata' }, { t: 'Report in tempo reale' }, { t: 'Produzione 24/7 (IA + team)' },
      { t: 'Video IA + reel' }, { t: 'Location premium' }, { t: 'Licenza commerciale' }, { t: 'Avvio immediato' },
      { t: 'Render prioritari' }, { t: 'Gestione talenti' },
    ],
    advancedFeatures: [
      { t: 'Art direction avanzata', tag: 'Avanzato' }, { t: 'Branding e stili su misura', tag: 'Avanzato' }, { t: 'Supporto prioritario', tag: 'Esclusivo' },
    ],
    yourPrice: 'Il tuo prezzo', creators: 'Creator', volumeTitle: 'Prezzo a volume (per creator)', perMonth: '/mese', cta: 'Contatta le vendite',
    fine: 'Disdici quando vuoi. Prezzi IVA esclusa.',
  },
  zh: {
    desc: '为管理多位创作者的代理机构提供集中式 AI 制作，按量计价。',
    planDesc: { agency: '为管理多位创作者的代理机构提供集中式制作。', advanced: '包含 Agency 的全部，外加高级艺术指导、定制品牌与优先支持。' },
    featuresTitle: '包含', advancedTitle: 'Agency Advanced 额外提供',
    features: [
      { t: '无限创作者', tag: '专属' }, { t: '无限 AI 照片', tag: '无限' }, { t: '随时增减创作者', tag: '灵活' },
      { t: '集中式代理仪表盘' }, { t: '实时报告' }, { t: '7×24 制作（AI + 团队）' },
      { t: 'AI 视频 + Reels' }, { t: '高级场景' }, { t: '商用授权' }, { t: '立即开始' },
      { t: '优先渲染' }, { t: '人才管理' },
    ],
    advancedFeatures: [
      { t: '高级艺术指导', tag: '进阶' }, { t: '定制品牌与风格', tag: '进阶' }, { t: '优先支持', tag: '专属' },
    ],
    yourPrice: '你的价格', creators: '创作者', volumeTitle: '按量计价（每位创作者）', perMonth: '/月', cta: '联系销售',
    fine: '随时取消。价格不含适用税费。',
  },
};

const BUSINESS = {
  es: {
    desc: 'Cobertura a medida para marcas, plataformas y productoras con flujos propios.',
    sub: 'Producción de IA personalizada para empresas que necesitan flujos a medida, SLA y soporte dedicado.',
    featuresTitle: 'Incluye', price: 'A medida', cta: 'Solicitar cotización',
    features: ['Funciones a medida', 'Reportes white-label', 'Acceso de equipo', 'Integraciones y API', 'Onboarding personalizado', 'Soporte dedicado', 'Garantías SLA', 'Facturación corporativa'],
  },
  en: {
    desc: 'Custom coverage for brands, platforms and studios with bespoke workflows.',
    sub: 'Tailored AI production for companies that need custom workflows, SLAs and dedicated support.',
    featuresTitle: 'Includes', price: 'Custom', cta: 'Request a quote',
    features: ['Flexible features', 'White-label reporting', 'Team access', 'API & custom integrations', 'Custom onboarding', 'Dedicated support', 'SLA guarantees', 'Corporate billing'],
  },
  pt: {
    desc: 'Cobertura à medida para marcas, plataformas e produtoras com fluxos próprios.',
    sub: 'Produção de IA personalizada para empresas que precisam de fluxos à medida, SLA e suporte dedicado.',
    featuresTitle: 'Inclui', price: 'À medida', cta: 'Pedir orçamento',
    features: ['Funções à medida', 'Relatórios white-label', 'Acesso de equipa', 'Integrações e API', 'Onboarding personalizado', 'Suporte dedicado', 'Garantias SLA', 'Faturação corporativa'],
  },
  fr: {
    desc: 'Couverture sur mesure pour marques, plateformes et studios avec workflows propres.',
    sub: 'Production IA personnalisée pour les entreprises ayant besoin de workflows sur mesure, de SLA et d’un support dédié.',
    featuresTitle: 'Comprend', price: 'Sur mesure', cta: 'Demander un devis',
    features: ['Fonctions sur mesure', 'Rapports en marque blanche', 'Accès équipe', 'Intégrations et API', 'Onboarding personnalisé', 'Support dédié', 'Garanties SLA', 'Facturation entreprise'],
  },
  de: {
    desc: 'Maßgeschneiderte Abdeckung für Marken, Plattformen und Studios mit eigenen Workflows.',
    sub: 'Individuelle KI-Produktion für Unternehmen mit maßgeschneiderten Workflows, SLAs und dediziertem Support.',
    featuresTitle: 'Enthält', price: 'Individuell', cta: 'Angebot anfordern',
    features: ['Flexible Funktionen', 'White-Label-Reporting', 'Team-Zugang', 'Integrationen & API', 'Individuelles Onboarding', 'Dedizierter Support', 'SLA-Garantien', 'Firmen-Abrechnung'],
  },
  it: {
    desc: 'Copertura su misura per brand, piattaforme e studi con workflow propri.',
    sub: 'Produzione IA personalizzata per aziende che necessitano di workflow su misura, SLA e supporto dedicato.',
    featuresTitle: 'Include', price: 'Su misura', cta: 'Richiedi un preventivo',
    features: ['Funzioni su misura', 'Report white-label', 'Accesso team', 'Integrazioni e API', 'Onboarding personalizzato', 'Supporto dedicato', 'Garanzie SLA', 'Fatturazione aziendale'],
  },
  zh: {
    desc: '为拥有自有流程的品牌、平台与制作方提供定制化覆盖。',
    sub: '为需要定制流程、SLA 与专属支持的企业提供量身定制的 AI 制作。',
    featuresTitle: '包含', price: '定制', cta: '申请报价',
    features: ['定制功能', '白标报告', '团队访问', '集成与 API', '定制入驻', '专属支持', 'SLA 保证', '企业账单'],
  },
};

// ── Copy per language (es + en; others fall back to en) ──────────────────────
const COPY = {
  es: {
    periodLabels: { m: 'Mensual', q: '3 Meses', a: 'Anual' },
    save: 'Ahorra', perMonth: '/mes', free: 'Gratis', off: '-50%', popular: 'Más popular',
    everyA: 'Todo lo de', everyB: ', y:', attention: 'Atención personalizada',
    plans: {
      free: { desc: 'Comprueba la magia sin pagar nada. Tu primera sesión corre por nuestra cuenta.', cta: 'Probar gratis', features: [
        { t: '1 sesión de prueba' }, { t: 'Vista previa en baja resolución' }, { t: 'Sin tarjeta de crédito' },
      ]},
      standard: { desc: 'Todo lo que necesitas para dejar de pagar fotógrafo y producir como pro.', cta: 'Empezar', features: [
        { t: 'Hasta 150 fotos IA / mes' }, { t: 'Outfits y locaciones', tag: 'Sin límite' }, { t: 'Calidad HD' }, { t: 'Maquillaje y estilo IA', tag: 'Exclusivo' },
      ]},
      plus: { desc: 'Sube de nivel: más volumen, video y calidad 4K para crecer sin frenos.', cta: 'Empezar', features: [
        { t: 'Hasta 400 fotos IA / mes' }, { t: 'Videos IA cortos', tag: 'Nuevo' }, { t: 'Calidad 4K', tag: 'Exclusivo' }, { t: 'Locaciones premium' },
      ]},
      premium: { desc: 'El arsenal completo: producción ilimitada, prioridad total y licencia comercial.', cta: 'Empezar', features: [
        { t: 'Fotos IA ilimitadas' }, { t: 'Videos IA largos + reels' }, { t: 'Renders prioritarios', tag: 'Sin espera' }, { t: 'Licencia comercial', tag: 'Exclusivo' }, { t: 'Soporte prioritario' },
      ]},
      elite: { desc: 'Tu estudio creativo personal. Un equipo real dirige cada sesión por ti.', cta: 'Hablar con ventas', features: [
        { t: 'Gestor de cuenta dedicado' }, { t: 'Sesiones a medida', tag: 'Express' }, { t: 'Dirección creativa 1-a-1' }, { t: 'Soporte por línea directa' },
      ]},
    },
  },
  en: {
    periodLabels: { m: 'Monthly', q: '3 Months', a: 'Annual' },
    save: 'Save', perMonth: '/mo', free: 'Free', off: '-50%', popular: 'Most popular',
    everyA: 'Everything in', everyB: ', and:', attention: 'Personalized attention',
    plans: {
      free: { desc: 'See the magic for free. Your first session is on us.', cta: 'Try for free', features: [
        { t: '1 trial session' }, { t: 'Low-res preview' }, { t: 'No credit card required' },
      ]},
      standard: { desc: 'Everything you need to ditch the photographer and shoot like a pro.', cta: 'Get started', features: [
        { t: 'Up to 150 AI photos / mo' }, { t: 'Outfits & locations', tag: 'Unlimited' }, { t: 'HD quality' }, { t: 'AI makeup & styling', tag: 'Exclusive' },
      ]},
      plus: { desc: 'Level up: more volume, video and 4K quality to grow without limits.', cta: 'Get started', features: [
        { t: 'Up to 400 AI photos / mo' }, { t: 'Short AI videos', tag: 'New' }, { t: '4K quality', tag: 'Exclusive' }, { t: 'Premium locations' },
      ]},
      premium: { desc: 'The full arsenal: unlimited production, top priority and commercial rights.', cta: 'Get started', features: [
        { t: 'Unlimited AI photos' }, { t: 'Long AI videos + reels' }, { t: 'Priority renders', tag: 'Zero wait' }, { t: 'Commercial license', tag: 'Exclusive' }, { t: 'Priority support' },
      ]},
      elite: { desc: 'Your personal creative studio. A real team directs every session for you.', cta: 'Talk to sales', features: [
        { t: 'Dedicated account manager' }, { t: 'Custom sessions', tag: 'Express' }, { t: '1-on-1 creative direction' }, { t: 'Direct-line support' },
      ]},
    },
  },
  pt: {
    periodLabels: { m: 'Mensal', q: '3 Meses', a: 'Anual' },
    save: 'Poupa', perMonth: '/mês', free: 'Grátis', off: '-50%', popular: 'Mais popular',
    everyA: 'Tudo do', everyB: ', e:', attention: 'Atenção personalizada',
    plans: {
      free: { desc: 'Comprova a magia sem pagar nada. A tua primeira sessão é por nossa conta.', cta: 'Experimentar grátis', features: [
        { t: '1 sessão de teste' }, { t: 'Pré-visualização em baixa resolução' }, { t: 'Sem cartão de crédito' },
      ]},
      standard: { desc: 'Tudo o que precisas para deixar o fotógrafo e produzir como profissional.', cta: 'Começar', features: [
        { t: 'Até 150 fotos IA / mês' }, { t: 'Outfits e localizações', tag: 'Sem limite' }, { t: 'Qualidade HD' }, { t: 'Maquilhagem e estilo IA', tag: 'Exclusivo' },
      ]},
      plus: { desc: 'Sobe de nível: mais volume, vídeo e qualidade 4K para crescer sem travões.', cta: 'Começar', features: [
        { t: 'Até 400 fotos IA / mês' }, { t: 'Vídeos IA curtos', tag: 'Novo' }, { t: 'Qualidade 4K', tag: 'Exclusivo' }, { t: 'Localizações premium' },
      ]},
      premium: { desc: 'O arsenal completo: produção ilimitada, prioridade total e licença comercial.', cta: 'Começar', features: [
        { t: 'Fotos IA ilimitadas' }, { t: 'Vídeos IA longos + reels' }, { t: 'Renders prioritários', tag: 'Sem espera' }, { t: 'Licença comercial', tag: 'Exclusivo' }, { t: 'Suporte prioritário' },
      ]},
      elite: { desc: 'O teu estúdio criativo pessoal. Uma equipa real dirige cada sessão por ti.', cta: 'Falar com vendas', features: [
        { t: 'Gestor de conta dedicado' }, { t: 'Sessões à medida', tag: 'Express' }, { t: 'Direção criativa 1-a-1' }, { t: 'Suporte por linha direta' },
      ]},
    },
  },
  fr: {
    periodLabels: { m: 'Mensuel', q: '3 Mois', a: 'Annuel' },
    save: 'Économise', perMonth: '/mois', free: 'Gratuit', off: '-50%', popular: 'Le plus populaire',
    everyA: 'Tout de', everyB: ', et :', attention: 'Attention personnalisée',
    plans: {
      free: { desc: 'Découvre la magie gratuitement. Ta première séance est offerte.', cta: 'Essai gratuit', features: [
        { t: '1 séance d’essai' }, { t: 'Aperçu en basse résolution' }, { t: 'Sans carte bancaire' },
      ]},
      standard: { desc: 'Tout pour arrêter de payer un photographe et produire comme un pro.', cta: 'Commencer', features: [
        { t: 'Jusqu’à 150 photos IA / mois' }, { t: 'Tenues et lieux', tag: 'Illimité' }, { t: 'Qualité HD' }, { t: 'Maquillage et style IA', tag: 'Exclusif' },
      ]},
      plus: { desc: 'Monte en gamme : plus de volume, de vidéo et de 4K pour grandir sans limite.', cta: 'Commencer', features: [
        { t: 'Jusqu’à 400 photos IA / mois' }, { t: 'Vidéos IA courtes', tag: 'Nouveau' }, { t: 'Qualité 4K', tag: 'Exclusif' }, { t: 'Lieux premium' },
      ]},
      premium: { desc: 'L’arsenal complet : production illimitée, priorité totale et licence commerciale.', cta: 'Commencer', features: [
        { t: 'Photos IA illimitées' }, { t: 'Vidéos IA longues + reels' }, { t: 'Rendus prioritaires', tag: 'Sans attente' }, { t: 'Licence commerciale', tag: 'Exclusif' }, { t: 'Support prioritaire' },
      ]},
      elite: { desc: 'Ton studio créatif personnel. Une vraie équipe dirige chaque séance pour toi.', cta: 'Contacter les ventes', features: [
        { t: 'Gestionnaire de compte dédié' }, { t: 'Séances sur mesure', tag: 'Express' }, { t: 'Direction créative en 1-à-1' }, { t: 'Support par ligne directe' },
      ]},
    },
  },
  de: {
    periodLabels: { m: 'Monatlich', q: '3 Monate', a: 'Jährlich' },
    save: 'Spare', perMonth: '/Mon.', free: 'Kostenlos', off: '-50%', popular: 'Am beliebtesten',
    everyA: 'Alles aus', everyB: ', und:', attention: 'Persönliche Betreuung',
    plans: {
      free: { desc: 'Erlebe die Magie kostenlos. Deine erste Session geht auf uns.', cta: 'Kostenlos testen', features: [
        { t: '1 Test-Session' }, { t: 'Vorschau in niedriger Auflösung' }, { t: 'Keine Kreditkarte nötig' },
      ]},
      standard: { desc: 'Alles, um den Fotografen zu ersetzen und wie ein Profi zu produzieren.', cta: 'Loslegen', features: [
        { t: 'Bis zu 150 KI-Fotos / Mon.' }, { t: 'Outfits & Locations', tag: 'Unbegrenzt' }, { t: 'HD-Qualität' }, { t: 'KI-Make-up & Styling', tag: 'Exklusiv' },
      ]},
      plus: { desc: 'Leg nach: mehr Volumen, Video und 4K-Qualität für grenzenloses Wachstum.', cta: 'Loslegen', features: [
        { t: 'Bis zu 400 KI-Fotos / Mon.' }, { t: 'Kurze KI-Videos', tag: 'Neu' }, { t: '4K-Qualität', tag: 'Exklusiv' }, { t: 'Premium-Locations' },
      ]},
      premium: { desc: 'Das volle Arsenal: unbegrenzte Produktion, Top-Priorität und Lizenz.', cta: 'Loslegen', features: [
        { t: 'Unbegrenzte KI-Fotos' }, { t: 'Lange KI-Videos + Reels' }, { t: 'Prioritäts-Renders', tag: 'Ohne Warten' }, { t: 'Kommerzielle Lizenz', tag: 'Exklusiv' }, { t: 'Prioritäts-Support' },
      ]},
      elite: { desc: 'Dein persönliches Kreativstudio. Ein echtes Team leitet jede Session für dich.', cta: 'Vertrieb kontaktieren', features: [
        { t: 'Dedizierter Account-Manager' }, { t: 'Maßgeschneiderte Sessions', tag: 'Express' }, { t: '1-zu-1 Kreativ-Direktion' }, { t: 'Support per Direktleitung' },
      ]},
    },
  },
  it: {
    periodLabels: { m: 'Mensile', q: '3 Mesi', a: 'Annuale' },
    save: 'Risparmia', perMonth: '/mese', free: 'Gratis', off: '-50%', popular: 'Più popolare',
    everyA: 'Tutto di', everyB: ', e:', attention: 'Attenzione personalizzata',
    plans: {
      free: { desc: 'Prova la magia senza pagare. La tua prima sessione è offerta da noi.', cta: 'Prova gratis', features: [
        { t: '1 sessione di prova' }, { t: 'Anteprima in bassa risoluzione' }, { t: 'Senza carta di credito' },
      ]},
      standard: { desc: 'Tutto ciò che serve per lasciare il fotografo e produrre come un pro.', cta: 'Inizia', features: [
        { t: 'Fino a 150 foto IA / mese' }, { t: 'Outfit e location', tag: 'Illimitati' }, { t: 'Qualità HD' }, { t: 'Trucco e stile IA', tag: 'Esclusivo' },
      ]},
      plus: { desc: 'Sali di livello: più volume, video e qualità 4K per crescere senza limiti.', cta: 'Inizia', features: [
        { t: 'Fino a 400 foto IA / mese' }, { t: 'Video IA brevi', tag: 'Nuovo' }, { t: 'Qualità 4K', tag: 'Esclusivo' }, { t: 'Location premium' },
      ]},
      premium: { desc: 'L’arsenale completo: produzione illimitata, priorità totale e licenza commerciale.', cta: 'Inizia', features: [
        { t: 'Foto IA illimitate' }, { t: 'Video IA lunghi + reel' }, { t: 'Render prioritari', tag: 'Zero attesa' }, { t: 'Licenza commerciale', tag: 'Esclusivo' }, { t: 'Supporto prioritario' },
      ]},
      elite: { desc: 'Il tuo studio creativo personale. Un team reale dirige ogni sessione per te.', cta: 'Contatta le vendite', features: [
        { t: 'Account manager dedicato' }, { t: 'Sessioni su misura', tag: 'Express' }, { t: 'Direzione creativa 1-a-1' }, { t: 'Supporto con linea diretta' },
      ]},
    },
  },
  zh: {
    periodLabels: { m: '按月', q: '3个月', a: '按年' },
    save: '省', perMonth: '/月', free: '免费', off: '-50%', popular: '最受欢迎',
    everyA: '包含', everyB: ' 的全部，外加：', attention: '专属服务',
    plans: {
      free: { desc: '免费体验这份魔力，首次拍摄由我们买单。', cta: '免费试用', features: [
        { t: '1 次试用拍摄' }, { t: '低分辨率预览' }, { t: '无需信用卡' },
      ]},
      standard: { desc: '告别摄影师，像专业人士一样产出所需的一切。', cta: '开始', features: [
        { t: '每月最多 150 张 AI 照片' }, { t: '服装与场景', tag: '无限' }, { t: '高清画质' }, { t: 'AI 妆容与造型', tag: '专属' },
      ]},
      plus: { desc: '升级体验：更多产量、视频与 4K 画质，助你无限成长。', cta: '开始', features: [
        { t: '每月最多 400 张 AI 照片' }, { t: 'AI 短视频', tag: '新' }, { t: '4K 画质', tag: '专属' }, { t: '高级场景' },
      ]},
      premium: { desc: '全套武器库：无限产出、最高优先级与商用授权。', cta: '开始', features: [
        { t: '无限 AI 照片' }, { t: 'AI 长视频 + Reels' }, { t: '优先渲染', tag: '零等待' }, { t: '商用授权', tag: '专属' }, { t: '优先支持' },
      ]},
      elite: { desc: '你的专属创意工作室，由真实团队执导每一次拍摄。', cta: '联系销售', features: [
        { t: '专属客户经理' }, { t: '定制拍摄', tag: 'Express' }, { t: '一对一创意指导' }, { t: '专线支持' },
      ]},
    },
  },
};

const fmt = (n) => n.toFixed(2);

// Small feature row used across tabs
function Feature({ f }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-paper-mute">
      <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <span className="flex-1">
        {f.t}
        {f.tag && (
          <span className="ml-1.5 inline-block rounded bg-hair/10 px-1.5 py-px align-middle font-mono text-[9px] uppercase tracking-wide text-paper-dim">
            {f.tag}
          </span>
        )}
      </span>
    </li>
  );
}

export default function Pricing() {
  const { t, lang } = useLang();
  const p = t.pricing;
  const c = COPY[lang] || COPY.en;
  const tabs = TABS[lang] || TABS.en;
  const ag = AGENCY[lang] || AGENCY.en;
  const biz = BUSINESS[lang] || BUSINESS.en;
  const stepAria = STEP_ARIA[lang] || STEP_ARIA.en;

  const [tab, setTab] = useState('creator');
  const [period, setPeriod] = useState('m');
  const [agencyPlan, setAgencyPlan] = useState('agency');
  const [creators, setCreators] = useState(2);
  const mult = PERIODS.find((x) => x.key === period).mult;

  const TAB_KEYS = ['creator', 'agency', 'business'];
  const aPlan = AGENCY_PLANS.find((x) => x.key === agencyPlan);
  const agPer = perCreator(aPlan, creators) * mult;
  const agTotal = agPer * creators;

  // Reusable billing toggle (creator + agency)
  const billingToggle = (
    <div className="mx-auto mt-10 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-card/80 p-1.5 backdrop-blur">
      {PERIODS.map((per) => {
        const active = period === per.key;
        return (
          <button
            key={per.key}
            type="button"
            onClick={() => setPeriod(per.key)}
            className={`relative flex flex-1 flex-col items-center justify-center rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 ${
              active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:bg-hair/[0.04] hover:text-paper'
            }`}
          >
            <span>{c.periodLabels[per.key]}</span>
            {per.off && (
              <span className={`mt-0.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                active ? 'bg-on-accent/20 text-on-accent' : 'bg-brand/15 text-brand'
              }`}>
                {c.save} {per.off}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <section id="pricing" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={p.label} titleA={p.titleA} highlight={p.titleHighlight} sub={p.sub} align="center" hue="gradient" />
        </div>

        {/* Audience tabs: Creator / Agency / Business */}
        <div className="mx-auto mt-9 flex w-full max-w-sm items-stretch gap-1 rounded-full border border-line bg-card p-1">
          {TAB_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                tab === k ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
              }`}
            >
              {tabs[k]}
            </button>
          ))}
        </div>

        {/* ── CREATOR ─────────────────────────────────────────────────────── */}
        {tab === 'creator' && (<>
        {billingToggle}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANS.map((plan, i) => {
            const pc = c.plans[plan.key];
            const price = plan.base * mult;
            const original = plan.base * 2 * mult;
            const highlight = plan.popular || plan.attention;
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease, delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className={`group relative flex flex-col rounded-3xl border p-5 transition-shadow duration-300 ${
                  plan.popular ? 'border-brand bg-brand/[0.07] shadow-glow-sm' :
                  plan.attention ? 'border-brand/70 bg-card' : 'border-line bg-card hover:border-paper/20'
                }`}
              >
                {/* Glow wash on the featured plan */}
                {plan.popular && (
                  <div className="pointer-events-none absolute inset-x-0 -top-px h-28 rounded-t-3xl bg-gradient-to-b from-brand/20 to-transparent" aria-hidden />
                )}

                {/* Attention ribbon */}
                {plan.attention && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">
                    {c.attention}
                  </div>
                )}

                {/* Name + popular / off badge */}
                <div className="relative flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{plan.name}</span>
                  {plan.popular ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-on-accent">{c.popular}</span>
                  ) : plan.base > 0 ? (
                    <span className="rounded-md bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">{c.off}</span>
                  ) : null}
                </div>

                {/* Price */}
                {plan.base > 0 ? (
                  <div className="relative mt-3">
                    <span className="font-mono text-xs text-paper-dim line-through">${fmt(original)}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display text-[2.6rem] leading-none ${plan.popular ? 'text-brand' : 'text-paper'}`}>${fmt(price)}</span>
                      <span className="text-sm text-paper-dim">{c.perMonth}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-3 font-display text-[2.6rem] leading-none text-paper">{c.free}</div>
                )}

                <p className="relative mt-4 min-h-[2.5rem] text-[13px] leading-relaxed text-paper-mute">{pc.desc}</p>

                <div className="relative my-4 h-px bg-line/70" />

                {plan.inherits && (
                  <p className="relative -mt-1 mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">
                    {c.everyA} <span className="text-paper">{plan.inherits}</span>{c.everyB}
                  </p>
                )}

                <ul className="relative flex-1 space-y-2.5">
                  {pc.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-[13px] text-paper-mute">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1">
                        {f.t}
                        {f.tag && (
                          <span className="ml-1.5 inline-block rounded bg-hair/10 px-1.5 py-px align-middle font-mono text-[9px] uppercase tracking-wide text-paper-dim">
                            {f.tag}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`relative mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold transition-transform hover:scale-[1.03] ${
                    highlight ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/60 hover:text-brand'
                  }`}
                >
                  {pc.cta}
                </a>
              </motion.div>
            );
          })}
        </div>
        </>)}

        {/* ── AGENCY ──────────────────────────────────────────────────────── */}
        {tab === 'agency' && (<>
        {/* Agency / Agency Advanced switch */}
        <div className="mx-auto mt-9 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-card p-1">
          {AGENCY_PLANS.map((ap) => (
            <button
              key={ap.key}
              type="button"
              onClick={() => setAgencyPlan(ap.key)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                agencyPlan === ap.key ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
              }`}
            >
              {ap.name}
            </button>
          ))}
        </div>

        {billingToggle}

        <motion.div
          key={agencyPlan}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-[1.3fr_1fr]"
        >
          {/* Features */}
          <div className="rounded-3xl border border-line bg-card p-6 sm:p-8">
            <p className="text-[15px] leading-relaxed text-paper-mute">{ag.planDesc[agencyPlan]}</p>
            <h4 className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-dim">{ag.featuresTitle}</h4>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {ag.features.map((f, i) => <Feature key={i} f={f} />)}
            </ul>
            {agencyPlan === 'advanced' && (
              <>
                <h4 className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-widest text-brand">{ag.advancedTitle}</h4>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {ag.advancedFeatures.map((f, i) => <Feature key={i} f={f} />)}
                </ul>
              </>
            )}
          </div>

          {/* Price calculator */}
          <div className="flex flex-col rounded-3xl border border-brand bg-brand/[0.06] p-6 shadow-glow-sm sm:p-8">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{ag.yourPrice}</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-[2.8rem] leading-none text-brand">${fmt(agTotal)}</span>
              <span className="text-sm text-paper-dim">{ag.perMonth}</span>
            </div>

            {/* Creator stepper */}
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-line bg-ink-2 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-paper">{ag.creators}</div>
                <div className="font-mono text-[11px] text-paper-dim">{creators} × ${fmt(agPer)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={stepAria.less} onClick={() => setCreators((n) => Math.max(1, n - 1))}
                  className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper transition-colors hover:border-brand/60 hover:text-brand">
                  <Minus size={15} aria-hidden />
                </button>
                <span className="w-8 text-center font-display text-lg text-paper">{creators}</span>
                <button type="button" aria-label={stepAria.more} onClick={() => setCreators((n) => Math.min(50, n + 1))}
                  className="grid h-8 w-8 place-items-center rounded-full border border-line text-paper transition-colors hover:border-brand/60 hover:text-brand">
                  <Plus size={15} aria-hidden />
                </button>
              </div>
            </div>

            {/* Volume table */}
            <h4 className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-dim">{ag.volumeTitle}</h4>
            <div className="mt-3 space-y-1.5">
              {[['1-3', 0], ['4-5', 1], ['6-8', 2], ['9+', 3]].map(([label, idx]) => {
                const tierPrice = aPlan.volume[idx][1] * mult;
                const activeRow = (idx === 0 && creators <= 3) || (idx === 1 && creators >= 4 && creators <= 5) || (idx === 2 && creators >= 6 && creators <= 8) || (idx === 3 && creators >= 9);
                return (
                  <div key={label} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${activeRow ? 'bg-brand/15 text-paper' : 'text-paper-mute'}`}>
                    <span className="font-mono text-[12px]">{label}</span>
                    <span className={activeRow ? 'font-semibold text-brand' : ''}>${fmt(tierPrice)}</span>
                  </div>
                );
              })}
            </div>

            <a href="#" className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
              {ag.cta} <ArrowRight size={16} aria-hidden />
            </a>
            <p className="mt-3 text-center font-mono text-[10px] text-paper-dim">{ag.fine}</p>
          </div>
        </motion.div>
        </>)}

        {/* ── BUSINESS ────────────────────────────────────────────────────── */}
        {tab === 'business' && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-brand/40 bg-card p-8 sm:p-10"
        >
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <h3 className="headline text-3xl text-paper">{biz.price}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper-mute">{biz.desc}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-paper-dim">{biz.sub}</p>
              <a href="#" className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.04]">
                {biz.cta} <ArrowRight size={16} aria-hidden />
              </a>
            </div>
            <div className="rounded-2xl border border-line bg-ink-2 p-6">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-dim">{biz.featuresTitle}</h4>
              <ul className="mt-4 grid gap-2.5">
                {biz.features.map((f, i) => <Feature key={i} f={{ t: f }} />)}
              </ul>
            </div>
          </div>
        </motion.div>
        )}
      </div>
    </section>
  );
}
