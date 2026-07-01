/**
 * LetShoot i18n dictionary.
 * Product: AI digital clone that generates editorial-level photos & videos.
 * Languages: ES (default), EN, PT, FR, DE, IT, ZH.
 */

export const SUPPORTED_LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh'];

export const LANG_LABELS = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  zh: '中文',
};

export const LANG_SHORT = {
  es: 'ES',
  en: 'EN',
  pt: 'PT',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  zh: 'ZH',
};

export const dict = {
  // ════════════════════════════════════════════════════════════ ES
  es: {
    nav: { creators: 'Creadores', agencies: 'Agencias', pricing: 'Precios', results: 'Resultados', cta: 'Empezar gratis' },
    hero: {
      eyebrow: 'PARA CREADORAS DE ONLYFANS', eyebrowPre: 'Para creadoras de', eyebrowPost: '',
      pre: 'Contenido de venta y enganche para OnlyFans',
      highlight: 'menos costo, menos tiempo, más ganancias',
      body: 'El buen contenido cuesta y tarda — y a la hora de vender, tu fan no espera. Te damos contenido de venta al instante, fresco y de sobra, para convertir cada chat, cada PPV y cada pedido en una venta. Ese es el problema que resolvemos.',
      platformsLabel: 'Listo para vender en',
      ctaPrimary: 'Empezar',
      ctaSecondary: 'Ver paquetes',
      stats: [{ n: '10x', l: 'más rápido' }, { n: '90%', l: 'de ahorro' }, { n: 'HD', l: 'calidad pro' }],
    },
    heroScrub: {
      typewriter: 'Sesiones de nivel editorial sin salir de casa. ¿Qué creamos hoy?',
      pills: [
        { label: 'Crear mi clon', href: '#pricing' },
        { label: 'Ver resultados', href: '#results' },
      ],
    },
    marquee: ['MALDIVAS', 'DUBÁI', 'PARÍS', 'MIAMI', 'TOKIO', 'SANTORINI', 'NUEVA YORK', 'BALI'],
    how: {
      label: 'CÓMO FUNCIONA', titleA: '3 pasos hacia tu', titleHighlight: 'fotógrafo IA',
      sub: 'De selfies a sesiones profesionales en minutos.',
      steps: [
        { n: '01', icon: 'upload', t: 'Sube tus selfies', d: 'Sube 10-20 fotos tuyas desde distintos ángulos. Nosotros hacemos el resto.' },
        { n: '02', icon: 'cpu', t: 'Entrenamos tu fotógrafo IA', d: 'Nuestro equipo entrena tu fotógrafo IA con tu estilo único. Listo en horas.' },
        { n: '03', icon: 'sparkles', t: 'Genera contenido', d: 'Elige locación, outfit y mood. Genera fotos y videos HD profesionales.' },
      ],
    },
    creators: {
      label: 'PARA CREADORES', titleA: 'Tu IA', titleHighlight: 'personal',
      sub: 'Contenido exclusivo listo para tu OnlyFans, sin salir de casa. La misma tú, en cualquier lugar.',
      items: [
        { icon: 'image', t: 'Fotos y videos HD realistas', d: 'Contenido indistinguible de sesiones reales.', tags: ['HD', '4K', 'Realista'] },
        { icon: 'map', t: 'Cualquier locación', d: 'París, Miami, Maldivas — sin moverte.', tags: ['París', 'Miami', 'Maldivas'] },
        { icon: 'shirt', t: 'Moda virtual', d: 'Variedad de outfits sin compra adicional.', tags: ['Outfits', 'Estilo'] },
        { icon: 'wand', t: 'Estilista IA', d: 'Maquillaje y styling virtual para tus rasgos.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'PARA AGENCIAS', titleA: 'Escala tu', titleHighlight: 'producción',
      sub: 'Dashboard de agencia con gestión de talento, producción masiva y analítica avanzada.',
      items: [
        { icon: 'users', t: 'Gestión de talento', d: 'Dashboard completo para tu roster de creadores.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Producción masiva', d: 'Fotos y videos para múltiples influencers a la vez.', tags: ['Batch', 'Escala'] },
        { icon: 'chart', t: 'Analítica avanzada', d: 'Métricas de rendimiento y ROI en tiempo real.', tags: ['ROI', 'Métricas'] },
        { icon: 'wallet', t: 'Ahorra tiempo y dinero', d: 'Sin fotógrafo, estudio, Uber ni catering.', tags: ['Ahorro', 'Rápido'] },
      ],
    },
    showcase: {
      label: 'LA MAGIA', titleA: 'La misma tú,', titleHighlight: 'mil locaciones',
      sub: 'Una sola sesión, fondos infinitos. Mueve el cursor y cambia de escenario en tiempo real.',
      hint: 'Mueve el cursor para cambiar de locación →',
    },
    comparison: {
      label: 'COMPARACIÓN', titleA: 'Una sesión tradicional vs', titleHighlight: 'LetShoot',
      sub: 'Todo lo que gastarías en UNA sola sesión de fotos, aquí lo tienes cada mes — y apareces en cualquier lugar donde tu audiencia quiera verte.',
      col1: 'Sesión tradicional', col2: 'LetShoot',
      rows: [
        { label: 'Fotógrafo', trad: '$500 - $800', ls: 'Incluido' },
        { label: 'Maquillaje y peinado', trad: '$100 - $250', ls: 'Incluido' },
        { label: 'Vestuario y outfits', trad: '$100 - $300', ls: 'Incluido' },
        { label: 'Locación / Airbnb', trad: '$150 - $500', ls: 'Incluido' },
        { label: 'Asistente y equipo', trad: '$100 - $300', ls: 'Incluido' },
        { label: 'Transporte y comida', trad: '$50 - $150', ls: 'Incluido' },
        { label: 'Tu tiempo', trad: '5 - 7 horas', ls: 'Minutos' },
        { label: 'Resultado', trad: '10-15 fotos, 1 video', ls: 'Donde tú quieras' },
      ],
      totalLabel: 'Total', totalTrad: '$1.100 - $2.600', totalLs: 'Desde $200/mes',
    },
    results: {
      label: 'RESULTADOS', titleA: '¿Es real o IA?', titleHighlight: 'IA',
      sub: 'Mismo contenido, distinta fórmula. Fotos y videos HD extremadamente realistas.',
      cards: [
        { t: 'Maldivas', loc: 'Playa · golden hour', hue: 'accent' },
        { t: 'Urbano', loc: 'Editorial · ciudad', hue: 'violet' },
        { t: 'Tokio', loc: 'Skyline · alta moda', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'PRECIOS', titleA: 'Planes para', titleHighlight: 'cada creador',
      sub: 'Un fotógrafo cobra $500+ por 10 fotos. Aquí tienes más cada mes — sin estudio, sin esperas, y apareces donde quieras. Cancela cuando quieras.',
      toggleCreators: 'Creadores', toggleAgencies: 'Agencias', popular: 'Más popular', perMonth: '/mes',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Empezar gratis', features: ['0 créditos reales', '1 fotógrafo IA', '3 locaciones base', 'Resolución estándar', 'Con marca de agua'] },
          { name: 'Starter', price: '$29', cta: 'Elegir Starter', features: ['50 créditos / mes', '1 fotógrafo IA completo', '10 locaciones', 'Resolución HD (1024px)', 'Sin marca de agua'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Elegir Pro', features: ['200 créditos / mes', 'Hasta 3 fotógrafos IA', 'Todas las locaciones', 'Ultra HD (2048px)', 'Cola prioritaria'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contactar ventas', features: ['Créditos personalizados', 'Fotógrafos IA ilimitados', 'Todas las locaciones', 'Ultra HD (2048px)', 'Gerente de cuenta dedicado'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Elegir Team', features: ['1.000 créditos / mes', 'Hasta 10 fotógrafos IA', 'Dashboard de talento', 'Ultra HD (2048px)', 'Soporte prioritario'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Elegir Studio', features: ['3.000 créditos / mes', 'Fotógrafos IA ilimitados', 'Producción masiva', 'Analítica avanzada', 'Acceso a API'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contactar ventas', features: ['Créditos a medida', 'Onboarding dedicado', 'SLA garantizado', 'Gerente de cuenta', 'Facturación anual'] },
        ],
      },
      packsTitle: '¿Necesitas más créditos?', packsSub: 'Packs adicionales. Nunca expiran. Funciona con cualquier plan.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: '¿Qué puedes crear con tus créditos?',
      tableSub: '1 crédito = 1 foto HD curada · 5 créditos = 1 video corto profesional',
      tableCols: ['Plan', 'Créditos', 'Solo fotos HD', 'O solo videos'],
      tableRows: [
        { plan: 'Free (prueba)', credits: '5', photos: '5 fotos', videos: '1 video' },
        { plan: 'Starter', credits: '50', photos: '50 fotos', videos: '10 videos' },
        { plan: 'Pro', credits: '200', photos: '200 fotos', videos: '40 videos' },
      ],
    },
    finalCta: { titleA: 'Crea tu banco de contenido de venta', highlight: 'hoy', body: 'Fotos y videos curados, listos para vender en PPV, chats y pedidos personalizados — sin día de producción. ¿Volumen para agencia? Escríbenos.', cta: 'Empezar' },
    footer: {
      tagline: 'Tu fotógrafo IA.', builtFor: 'Hecho para creadoras de',
      cols: [
        { title: 'Producto', items: ['Cómo funciona', 'Para creadores', 'Para agencias', 'Precios'] },
        { title: 'Compañía', items: ['Sobre nosotros', 'Blog', 'Contacto'] },
        { title: 'Legal', items: ['Términos', 'Privacidad', 'Cookies'] },
      ],
      copyright: '© 2026 LetShoot · Tu fotógrafo IA',
    },
  },

  // ════════════════════════════════════════════════════════════ EN
  en: {
    nav: { creators: 'Creators', agencies: 'Agencies', pricing: 'Pricing', results: 'Results', cta: 'Start free' },
    hero: {
      eyebrow: 'FOR ONLYFANS CREATORS', eyebrowPre: 'For', eyebrowPost: 'creators',
      pre: 'Sales and engagement content for OnlyFans',
      highlight: 'less cost, less time, more money',
      body: 'Great content costs money and takes time — and when your fan is ready to buy, they won’t wait. We give you sell-ready content on demand, fresh and in abundance, to turn every chat, every PPV and every request into a sale. That’s the problem we solve.',
      platformsLabel: 'Ready to sell on',
      ctaPrimary: 'Get Started',
      ctaSecondary: 'View packages',
      stats: [{ n: '10x', l: 'faster' }, { n: '90%', l: 'savings' }, { n: 'HD', l: 'pro quality' }],
    },
    heroScrub: {
      typewriter: 'Editorial-level sessions without leaving home. What are we creating today?',
      pills: [
        { label: 'Create my clone', href: '#pricing' },
        { label: 'See results', href: '#results' },
      ],
    },
    marquee: ['MALDIVES', 'DUBAI', 'PARIS', 'MIAMI', 'TOKYO', 'SANTORINI', 'NEW YORK', 'BALI'],
    how: {
      label: 'HOW IT WORKS', titleA: '3 steps to your', titleHighlight: 'AI photographer',
      sub: 'From selfies to professional sessions in minutes.',
      steps: [
        { n: '01', icon: 'upload', t: 'Upload your selfies', d: 'Upload 10-20 photos of yourself from different angles. We do the rest.' },
        { n: '02', icon: 'cpu', t: 'We train your AI photographer', d: 'Our team trains your AI photographer with your unique style. Ready in hours.' },
        { n: '03', icon: 'sparkles', t: 'Generate content', d: 'Choose location, outfit and mood. Generate professional HD photos and videos.' },
      ],
    },
    creators: {
      label: 'FOR CREATORS', titleA: 'Your personal', titleHighlight: 'AI',
      sub: 'Exclusive content ready for your OnlyFans, without leaving home. The same you, anywhere.',
      items: [
        { icon: 'image', t: 'Realistic HD photos & videos', d: 'Content indistinguishable from real sessions.', tags: ['HD', '4K', 'Realistic'] },
        { icon: 'map', t: 'Any location', d: 'Paris, Miami, Maldives — without moving.', tags: ['Paris', 'Miami', 'Maldives'] },
        { icon: 'shirt', t: 'Virtual fashion', d: 'A variety of outfits with no extra purchase.', tags: ['Outfits', 'Style'] },
        { icon: 'wand', t: 'AI stylist', d: 'Virtual makeup and styling tuned to your features.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'FOR AGENCIES', titleA: 'Scale your', titleHighlight: 'production',
      sub: 'Agency dashboard with talent management, mass production and advanced analytics.',
      items: [
        { icon: 'users', t: 'Talent management', d: 'A complete dashboard for your creator roster.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Mass production', d: 'Photos and videos for multiple influencers at once.', tags: ['Batch', 'Scale'] },
        { icon: 'chart', t: 'Advanced analytics', d: 'Real-time performance metrics and ROI.', tags: ['ROI', 'Metrics'] },
        { icon: 'wallet', t: 'Save time and money', d: 'No photographer, studio, Uber or catering.', tags: ['Savings', 'Fast'] },
      ],
    },
    showcase: {
      label: 'THE MAGIC', titleA: 'The same you,', titleHighlight: 'infinite locations',
      sub: 'One session, endless backdrops. Move your cursor to change the scene in real time.',
      hint: 'Move your cursor to change location →',
    },
    comparison: {
      label: 'COMPARISON', titleA: 'One traditional shoot vs', titleHighlight: 'LetShoot',
      sub: 'Everything you would spend on ONE photoshoot, you get every month — and you show up anywhere your audience wants to see you.',
      col1: 'Traditional shoot', col2: 'LetShoot',
      rows: [
        { label: 'Photographer', trad: '$500 - $800', ls: 'Included' },
        { label: 'Makeup & hair', trad: '$100 - $250', ls: 'Included' },
        { label: 'Wardrobe & outfits', trad: '$100 - $300', ls: 'Included' },
        { label: 'Location / Airbnb', trad: '$150 - $500', ls: 'Included' },
        { label: 'Assistant & crew', trad: '$100 - $300', ls: 'Included' },
        { label: 'Transport & food', trad: '$50 - $150', ls: 'Included' },
        { label: 'Your time', trad: '5 - 7 hours', ls: 'Minutes' },
        { label: 'Result', trad: '10-15 photos, 1 video', ls: 'Anywhere you want' },
      ],
      totalLabel: 'Total', totalTrad: '$1,100 - $2,600', totalLs: 'From $200/mo',
    },
    results: {
      label: 'RESULTS', titleA: 'Is it real or AI?', titleHighlight: 'AI',
      sub: 'Same content, different formula. Extremely realistic HD photos and videos.',
      cards: [
        { t: 'Maldives', loc: 'Beach · golden hour', hue: 'accent' },
        { t: 'Urban', loc: 'Editorial · city', hue: 'violet' },
        { t: 'Tokyo', loc: 'Skyline · high fashion', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'PRICING', titleA: 'Plans for', titleHighlight: 'every creator',
      sub: 'A photographer charges $500+ for 10 photos. Get more every month — no studio, no waiting, and you show up anywhere you want. Cancel anytime.',
      toggleCreators: 'Creators', toggleAgencies: 'Agencies', popular: 'Most popular', perMonth: '/mo',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Start free', features: ['0 real credits', '1 digital clone', '3 base locations', 'Standard resolution', 'With watermark'] },
          { name: 'Starter', price: '$29', cta: 'Choose Starter', features: ['50 credits / month', '1 full digital clone', '10 locations', 'HD resolution (1024px)', 'No watermark'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Choose Pro', features: ['200 credits / month', 'Up to 3 digital clones', 'All locations', 'Ultra HD (2048px)', 'Priority queue'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contact sales', features: ['Custom credits', 'Unlimited clones', 'All locations', 'Ultra HD (2048px)', 'Dedicated account manager'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Choose Team', features: ['1,000 credits / month', 'Up to 10 clones', 'Talent dashboard', 'Ultra HD (2048px)', 'Priority support'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Choose Studio', features: ['3,000 credits / month', 'Unlimited clones', 'Mass production', 'Advanced analytics', 'API access'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contact sales', features: ['Tailored credits', 'Dedicated onboarding', 'Guaranteed SLA', 'Account manager', 'Annual billing'] },
        ],
      },
      packsTitle: 'Need more credits?', packsSub: 'Add-on packs. Never expire. Works with any plan.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: 'What can you create with your credits?',
      tableSub: '1 credit = 1 curated HD photo · 5 credits = 1 professional short video',
      tableCols: ['Plan', 'Credits', 'HD photos only', 'Or videos only'],
      tableRows: [
        { plan: 'Free (trial)', credits: '5', photos: '5 photos', videos: '1 video' },
        { plan: 'Starter', credits: '50', photos: '50 photos', videos: '10 videos' },
        { plan: 'Pro', credits: '200', photos: '200 photos', videos: '40 videos' },
      ],
    },
    finalCta: { titleA: 'Build your sales content bank', highlight: 'today', body: 'Curated, ready-to-sell photos and videos for PPV, chats and custom-style requests — no production day required. Need agency volume? Contact us.', cta: 'Get Started' },
    footer: {
      tagline: 'Your AI photographer.', builtFor: 'Built for creators on',
      cols: [
        { title: 'Product', items: ['How it works', 'For creators', 'For agencies', 'Pricing'] },
        { title: 'Company', items: ['About', 'Blog', 'Contact'] },
        { title: 'Legal', items: ['Terms', 'Privacy', 'Cookies'] },
      ],
      copyright: '© 2026 LetShoot · Your AI photographer',
    },
  },

  // ════════════════════════════════════════════════════════════ PT
  pt: {
    nav: { creators: 'Criadores', agencies: 'Agências', pricing: 'Preços', results: 'Resultados', cta: 'Começar grátis' },
    hero: {
      eyebrow: 'SEM ESTÚDIO · SEM ESPERAS · SEM LIMITES',
      pre: 'Despede o teu',
      highlight: 'fotógrafo',
      body: 'O teu fotógrafo IA gera fotos e vídeos de nível editorial de qualquer lugar — sem estúdio, sem esperas. Para criadores e agências que nunca param.',
      ctaPrimary: 'Criar as minhas fotos',
      ctaSecondary: 'Ver resultados',
      stats: [{ n: '10x', l: 'mais rápido' }, { n: '90%', l: 'de economia' }, { n: 'HD', l: 'qualidade pro' }],
    },
    heroScrub: {
      typewriter: 'Sessões de nível editorial sem sair de casa. O que criamos hoje?',
      pills: [
        { label: 'Criar meu clone', href: '#pricing' },
        { label: 'Ver resultados', href: '#results' },
      ],
    },
    marquee: ['MALDIVAS', 'DUBAI', 'PARIS', 'MIAMI', 'TÓQUIO', 'SANTORINI', 'NOVA IORQUE', 'BALI'],
    how: {
      label: 'COMO FUNCIONA', titleA: '3 passos para o teu', titleHighlight: 'fotógrafo IA',
      sub: 'De selfies a sessões profissionais em minutos.',
      steps: [
        { n: '01', icon: 'upload', t: 'Envia as tuas selfies', d: 'Envia 10-20 fotos tuas de diferentes ângulos. Nós fazemos o resto.' },
        { n: '02', icon: 'cpu', t: 'Treinamos o teu fotógrafo IA', d: 'A nossa equipa treina o teu fotógrafo IA com o teu estilo único. Pronto em horas.' },
        { n: '03', icon: 'sparkles', t: 'Gera conteúdo', d: 'Escolhe locação, outfit e mood. Gera fotos e vídeos HD profissionais.' },
      ],
    },
    creators: {
      label: 'PARA CRIADORES', titleA: 'A tua IA', titleHighlight: 'pessoal',
      sub: 'Sessões de foto e vídeo sem sair de casa. A mesma tu, melhores resultados.',
      items: [
        { icon: 'image', t: 'Fotos e vídeos HD realistas', d: 'Conteúdo indistinguível de sessões reais.', tags: ['HD', '4K', 'Realista'] },
        { icon: 'map', t: 'Qualquer locação', d: 'Paris, Miami, Maldivas — sem te moveres.', tags: ['Paris', 'Miami', 'Maldivas'] },
        { icon: 'shirt', t: 'Moda virtual', d: 'Variedade de outfits sem compra adicional.', tags: ['Outfits', 'Estilo'] },
        { icon: 'wand', t: 'Estilista IA', d: 'Maquilhagem e styling virtual para os teus traços.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'PARA AGÊNCIAS', titleA: 'Escala a tua', titleHighlight: 'produção',
      sub: 'Dashboard de agência com gestão de talento, produção em massa e analítica avançada.',
      items: [
        { icon: 'users', t: 'Gestão de talento', d: 'Dashboard completo para o teu roster de criadores.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Produção em massa', d: 'Fotos e vídeos para vários influencers ao mesmo tempo.', tags: ['Batch', 'Escala'] },
        { icon: 'chart', t: 'Analítica avançada', d: 'Métricas de desempenho e ROI em tempo real.', tags: ['ROI', 'Métricas'] },
        { icon: 'wallet', t: 'Poupa tempo e dinheiro', d: 'Sem fotógrafo, estúdio, Uber nem catering.', tags: ['Poupança', 'Rápido'] },
      ],
    },
    showcase: {
      label: 'A MAGIA', titleA: 'A mesma tu,', titleHighlight: 'mil locações',
      sub: 'Uma só sessão, fundos infinitos. Move o cursor e muda de cenário em tempo real.',
      hint: 'Move o cursor para mudar de locação →',
    },
    comparison: {
      label: 'COMPARAÇÃO', titleA: 'Shoot tradicional vs', titleHighlight: 'LetShoot',
      col1: 'Shoot tradicional', col2: 'LetShoot',
      rows: [
        { label: 'Fotógrafo', trad: '$500 - $800', ls: 'Incluído' },
        { label: 'Maquilhagem', trad: '$100 - $200', ls: 'Incluído' },
        { label: 'Locação', trad: '$150 - $500', ls: 'Incluído' },
        { label: 'Transporte', trad: '$50 - $100', ls: 'Incluído' },
        { label: 'Tempo', trad: '5 - 7 horas', ls: 'Minutos' },
        { label: 'Fotos + vídeos', trad: '20-30 fotos, 1 vídeo', ls: 'Ilimitados' },
      ],
      totalLabel: 'Total', totalTrad: '$800 - $1.600', totalLs: 'Desde $200/mês',
    },
    results: {
      label: 'RESULTADOS', titleA: 'É real ou IA?', titleHighlight: 'IA',
      sub: 'Mesmo conteúdo, fórmula diferente. Fotos e vídeos HD extremamente realistas.',
      cards: [
        { t: 'Maldivas', loc: 'Praia · golden hour', hue: 'accent' },
        { t: 'Urbano', loc: 'Editorial · cidade', hue: 'violet' },
        { t: 'Tóquio', loc: 'Skyline · alta moda', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'PREÇOS', titleA: 'Planos para', titleHighlight: 'cada criador',
      sub: 'Escolhe o teu plano e começa a produzir hoje. Cancela quando quiseres.',
      toggleCreators: 'Criadores', toggleAgencies: 'Agências', popular: 'Mais popular', perMonth: '/mês',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Começar grátis', features: ['0 créditos reais', '1 fotógrafo IA', '3 locações base', 'Resolução padrão', 'Com marca de água'] },
          { name: 'Starter', price: '$29', cta: 'Escolher Starter', features: ['50 créditos / mês', '1 fotógrafo IA completo', '10 locações', 'Resolução HD (1024px)', 'Sem marca de água'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Escolher Pro', features: ['200 créditos / mês', 'Até 3 fotógrafos IA', 'Todas as locações', 'Ultra HD (2048px)', 'Fila prioritária'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contactar vendas', features: ['Créditos personalizados', 'Fotógrafos IA ilimitados', 'Todas as locações', 'Ultra HD (2048px)', 'Gestor de conta dedicado'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Escolher Team', features: ['1.000 créditos / mês', 'Até 10 fotógrafos IA', 'Dashboard de talento', 'Ultra HD (2048px)', 'Suporte prioritário'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Escolher Studio', features: ['3.000 créditos / mês', 'Fotógrafos IA ilimitados', 'Produção em massa', 'Analítica avançada', 'Acesso à API'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contactar vendas', features: ['Créditos à medida', 'Onboarding dedicado', 'SLA garantido', 'Gestor de conta', 'Faturação anual'] },
        ],
      },
      packsTitle: 'Precisas de mais créditos?', packsSub: 'Packs adicionais. Nunca expiram. Funciona com qualquer plano.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: 'O que podes criar com os teus créditos?',
      tableSub: '1 crédito = 1 foto HD curada · 5 créditos = 1 vídeo curto profissional',
      tableCols: ['Plano', 'Créditos', 'Só fotos HD', 'Ou só vídeos'],
      tableRows: [
        { plan: 'Free (teste)', credits: '5', photos: '5 fotos', videos: '1 vídeo' },
        { plan: 'Starter', credits: '50', photos: '50 fotos', videos: '10 vídeos' },
        { plan: 'Pro', credits: '200', photos: '200 fotos', videos: '40 vídeos' },
      ],
    },
    finalCta: { titleA: 'Despede o teu fotógrafo', highlight: 'hoje', body: 'Começa a produzir o teu próprio conteúdo que vende — sem fotógrafo, sem estúdio, sem esperas. Tu no comando.', cta: 'Começar agora' },
    footer: {
      tagline: 'O teu fotógrafo IA.',
      cols: [
        { title: 'Produto', items: ['Como funciona', 'Para criadores', 'Para agências', 'Preços'] },
        { title: 'Empresa', items: ['Sobre nós', 'Blog', 'Contacto'] },
        { title: 'Legal', items: ['Termos', 'Privacidade', 'Cookies'] },
      ],
      copyright: '© 2026 LetShoot · O teu fotógrafo IA',
    },
  },

  // ════════════════════════════════════════════════════════════ FR
  fr: {
    nav: { creators: 'Créateurs', agencies: 'Agences', pricing: 'Tarifs', results: 'Résultats', cta: 'Commencer gratuitement' },
    hero: {
      eyebrow: 'SANS STUDIO · SANS ATTENTE · SANS LIMITES',
      pre: 'Vire ton',
      highlight: 'photographe',
      body: 'Ton photographe IA génère des photos et vidéos de niveau éditorial depuis n’importe où — sans studio, sans attente. Pour les créateurs et agences qui ne s’arrêtent jamais.',
      ctaPrimary: 'Créer mes photos',
      ctaSecondary: 'Voir les résultats',
      stats: [{ n: '10x', l: 'plus rapide' }, { n: '90%', l: 'd’économies' }, { n: 'HD', l: 'qualité pro' }],
    },
    heroScrub: {
      typewriter: 'Des séances de niveau éditorial sans sortir de chez toi. On crée quoi aujourd’hui ?',
      pills: [
        { label: 'Créer mon clone', href: '#pricing' },
        { label: 'Voir les résultats', href: '#results' },
      ],
    },
    marquee: ['MALDIVES', 'DUBAÏ', 'PARIS', 'MIAMI', 'TOKYO', 'SANTORIN', 'NEW YORK', 'BALI'],
    how: {
      label: 'COMMENT ÇA MARCHE', titleA: '3 étapes vers ton', titleHighlight: 'photographe IA',
      sub: 'Des selfies à des séances professionnelles en quelques minutes.',
      steps: [
        { n: '01', icon: 'upload', t: 'Envoie tes selfies', d: 'Envoie 10-20 photos de toi sous différents angles. On s’occupe du reste.' },
        { n: '02', icon: 'cpu', t: 'On entraîne ton photographe IA', d: 'Notre équipe entraîne ton photographe IA avec ton style unique. Prêt en quelques heures.' },
        { n: '03', icon: 'sparkles', t: 'Génère du contenu', d: 'Choisis le lieu, la tenue et l’ambiance. Génère des photos et vidéos HD pro.' },
      ],
    },
    creators: {
      label: 'POUR LES CRÉATEURS', titleA: 'Ton IA', titleHighlight: 'personnelle',
      sub: 'Séances photo et vidéo sans sortir de chez toi. La même toi, de meilleurs résultats.',
      items: [
        { icon: 'image', t: 'Photos et vidéos HD réalistes', d: 'Un contenu indiscernable de vraies séances.', tags: ['HD', '4K', 'Réaliste'] },
        { icon: 'map', t: 'N’importe quel lieu', d: 'Paris, Miami, Maldives — sans bouger.', tags: ['Paris', 'Miami', 'Maldives'] },
        { icon: 'shirt', t: 'Mode virtuelle', d: 'Une variété de tenues sans achat supplémentaire.', tags: ['Tenues', 'Style'] },
        { icon: 'wand', t: 'Styliste IA', d: 'Maquillage et styling virtuels adaptés à tes traits.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'POUR LES AGENCES', titleA: 'Scale ta', titleHighlight: 'production',
      sub: 'Tableau de bord d’agence avec gestion des talents, production de masse et analytique avancée.',
      items: [
        { icon: 'users', t: 'Gestion des talents', d: 'Un tableau de bord complet pour ton roster de créateurs.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Production de masse', d: 'Photos et vidéos pour plusieurs influenceurs à la fois.', tags: ['Batch', 'Échelle'] },
        { icon: 'chart', t: 'Analytique avancée', d: 'Métriques de performance et ROI en temps réel.', tags: ['ROI', 'Métriques'] },
        { icon: 'wallet', t: 'Gagne du temps et de l’argent', d: 'Sans photographe, studio, Uber ni catering.', tags: ['Économies', 'Rapide'] },
      ],
    },
    showcase: {
      label: 'LA MAGIE', titleA: 'La même toi,', titleHighlight: 'mille lieux',
      sub: 'Une seule séance, des décors infinis. Bouge le curseur et change de décor en temps réel.',
      hint: 'Bouge le curseur pour changer de lieu →',
    },
    comparison: {
      label: 'COMPARAISON', titleA: 'Séance classique vs', titleHighlight: 'LetShoot',
      col1: 'Séance classique', col2: 'LetShoot',
      rows: [
        { label: 'Photographe', trad: '$500 - $800', ls: 'Inclus' },
        { label: 'Maquillage', trad: '$100 - $200', ls: 'Inclus' },
        { label: 'Lieu', trad: '$150 - $500', ls: 'Inclus' },
        { label: 'Transport', trad: '$50 - $100', ls: 'Inclus' },
        { label: 'Temps', trad: '5 - 7 heures', ls: 'Minutes' },
        { label: 'Photos + vidéos', trad: '20-30 photos, 1 vidéo', ls: 'Illimités' },
      ],
      totalLabel: 'Total', totalTrad: '$800 - $1 600', totalLs: 'Dès $200/mois',
    },
    results: {
      label: 'RÉSULTATS', titleA: 'Réel ou IA ?', titleHighlight: 'IA',
      sub: 'Même contenu, formule différente. Photos et vidéos HD extrêmement réalistes.',
      cards: [
        { t: 'Maldives', loc: 'Plage · golden hour', hue: 'accent' },
        { t: 'Urbain', loc: 'Éditorial · ville', hue: 'violet' },
        { t: 'Tokyo', loc: 'Skyline · haute couture', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'TARIFS', titleA: 'Des offres pour', titleHighlight: 'chaque créateur',
      sub: 'Choisis ton offre et commence à produire dès aujourd’hui. Annule quand tu veux.',
      toggleCreators: 'Créateurs', toggleAgencies: 'Agences', popular: 'Le plus populaire', perMonth: '/mois',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Commencer gratuitement', features: ['0 crédit réel', '1 clone numérique', '3 lieux de base', 'Résolution standard', 'Avec filigrane'] },
          { name: 'Starter', price: '$29', cta: 'Choisir Starter', features: ['50 crédits / mois', '1 clone numérique complet', '10 lieux', 'Résolution HD (1024px)', 'Sans filigrane'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Choisir Pro', features: ['200 crédits / mois', 'Jusqu’à 3 clones numériques', 'Tous les lieux', 'Ultra HD (2048px)', 'File prioritaire'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contacter les ventes', features: ['Crédits personnalisés', 'Clones illimités', 'Tous les lieux', 'Ultra HD (2048px)', 'Gestionnaire de compte dédié'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Choisir Team', features: ['1 000 crédits / mois', 'Jusqu’à 10 clones', 'Dashboard talents', 'Ultra HD (2048px)', 'Support prioritaire'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Choisir Studio', features: ['3 000 crédits / mois', 'Clones illimités', 'Production de masse', 'Analytique avancée', 'Accès API'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contacter les ventes', features: ['Crédits sur mesure', 'Onboarding dédié', 'SLA garanti', 'Gestionnaire de compte', 'Facturation annuelle'] },
        ],
      },
      packsTitle: 'Besoin de plus de crédits ?', packsSub: 'Packs additionnels. N’expirent jamais. Fonctionnent avec tous les plans.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: 'Que peux-tu créer avec tes crédits ?',
      tableSub: '1 crédit = 1 photo HD curée · 5 crédits = 1 vidéo courte pro',
      tableCols: ['Plan', 'Crédits', 'Photos HD seules', 'Ou vidéos seules'],
      tableRows: [
        { plan: 'Free (essai)', credits: '5', photos: '5 photos', videos: '1 vidéo' },
        { plan: 'Starter', credits: '50', photos: '50 photos', videos: '10 vidéos' },
        { plan: 'Pro', credits: '200', photos: '200 photos', videos: '40 vidéos' },
      ],
    },
    finalCta: { titleA: 'Vire ton photographe', highlight: 'aujourd’hui', body: 'Commence à produire ton propre contenu qui vend — sans photographe, sans studio, sans attente. C’est toi qui décides.', cta: 'Commencer maintenant' },
    footer: {
      tagline: 'Ton photographe IA.',
      cols: [
        { title: 'Produit', items: ['Comment ça marche', 'Pour les créateurs', 'Pour les agences', 'Tarifs'] },
        { title: 'Entreprise', items: ['À propos', 'Blog', 'Contact'] },
        { title: 'Légal', items: ['Conditions', 'Confidentialité', 'Cookies'] },
      ],
      copyright: '© 2026 LetShoot · Ton photographe IA',
    },
  },

  // ════════════════════════════════════════════════════════════ DE
  de: {
    nav: { creators: 'Creator', agencies: 'Agenturen', pricing: 'Preise', results: 'Ergebnisse', cta: 'Kostenlos starten' },
    hero: {
      eyebrow: 'KEIN STUDIO · KEIN WARTEN · KEINE GRENZEN',
      pre: 'Entlass deinen',
      highlight: 'Fotografen',
      body: 'Dein KI-Fotograf erstellt Fotos und Videos auf Editorial-Niveau von überall — ohne Studio, ohne Warten. Für Creator und Agenturen, die nie stoppen.',
      ctaPrimary: 'Meine Fotos erstellen',
      ctaSecondary: 'Ergebnisse ansehen',
      stats: [{ n: '10x', l: 'schneller' }, { n: '90%', l: 'Ersparnis' }, { n: 'HD', l: 'Pro-Qualität' }],
    },
    heroScrub: {
      typewriter: 'Editorial-Sessions, ohne das Haus zu verlassen. Was erschaffen wir heute?',
      pills: [
        { label: 'Meinen Klon erstellen', href: '#pricing' },
        { label: 'Ergebnisse ansehen', href: '#results' },
      ],
    },
    marquee: ['MALEDIVEN', 'DUBAI', 'PARIS', 'MIAMI', 'TOKIO', 'SANTORIN', 'NEW YORK', 'BALI'],
    how: {
      label: 'SO FUNKTIONIERT’S', titleA: '3 Schritte zu deinem', titleHighlight: 'KI-Fotografen',
      sub: 'Von Selfies zu professionellen Sessions in Minuten.',
      steps: [
        { n: '01', icon: 'upload', t: 'Lade deine Selfies hoch', d: 'Lade 10-20 Fotos von dir aus verschiedenen Winkeln hoch. Den Rest machen wir.' },
        { n: '02', icon: 'cpu', t: 'Wir erstellen deinen KI-Fotografen', d: 'Unser Team trainiert deinen KI-Fotografen mit einzigartigem Kontext. In Stunden fertig.' },
        { n: '03', icon: 'sparkles', t: 'Generiere Content', d: 'Wähle Location, Outfit und Mood. Generiere professionelle HD-Fotos und -Videos.' },
      ],
    },
    creators: {
      label: 'FÜR CREATOR', titleA: 'Deine persönliche', titleHighlight: 'KI',
      sub: 'Foto- und Video-Sessions, ohne das Haus zu verlassen. Dasselbe Du, bessere Ergebnisse.',
      items: [
        { icon: 'image', t: 'Realistische HD-Fotos & -Videos', d: 'Content, der von echten Sessions nicht zu unterscheiden ist.', tags: ['HD', '4K', 'Realistisch'] },
        { icon: 'map', t: 'Jede Location', d: 'Paris, Miami, Malediven — ohne dich zu bewegen.', tags: ['Paris', 'Miami', 'Malediven'] },
        { icon: 'shirt', t: 'Virtuelle Mode', d: 'Vielfalt an Outfits ohne zusätzlichen Kauf.', tags: ['Outfits', 'Stil'] },
        { icon: 'wand', t: 'KI-Stylist', d: 'Virtuelles Make-up und Styling, abgestimmt auf deine Züge.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'FÜR AGENTUREN', titleA: 'Skaliere deine', titleHighlight: 'Produktion',
      sub: 'Agentur-Dashboard mit Talent-Management, Massenproduktion und fortschrittlicher Analytik.',
      items: [
        { icon: 'users', t: 'Talent-Management', d: 'Ein komplettes Dashboard für dein Creator-Roster.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Massenproduktion', d: 'Fotos und Videos für mehrere Influencer gleichzeitig.', tags: ['Batch', 'Skalierung'] },
        { icon: 'chart', t: 'Fortschrittliche Analytik', d: 'Performance-Metriken und ROI in Echtzeit.', tags: ['ROI', 'Metriken'] },
        { icon: 'wallet', t: 'Spare Zeit und Geld', d: 'Ohne Fotograf, Studio, Uber oder Catering.', tags: ['Ersparnis', 'Schnell'] },
      ],
    },
    showcase: {
      label: 'DIE MAGIE', titleA: 'Dasselbe Du,', titleHighlight: 'tausend Locations',
      sub: 'Eine Session, unendliche Hintergründe. Bewege den Cursor und wechsle die Szene in Echtzeit.',
      hint: 'Bewege den Cursor, um die Location zu wechseln →',
    },
    comparison: {
      label: 'VERGLEICH', titleA: 'Klassisches Shooting vs', titleHighlight: 'LetShoot',
      col1: 'Klassisches Shooting', col2: 'LetShoot',
      rows: [
        { label: 'Fotograf', trad: '$500 - $800', ls: 'Inklusive' },
        { label: 'Make-up', trad: '$100 - $200', ls: 'Inklusive' },
        { label: 'Location', trad: '$150 - $500', ls: 'Inklusive' },
        { label: 'Transport', trad: '$50 - $100', ls: 'Inklusive' },
        { label: 'Zeit', trad: '5 - 7 Stunden', ls: 'Minuten' },
        { label: 'Fotos + Videos', trad: '20-30 Fotos, 1 Video', ls: 'Unbegrenzt' },
      ],
      totalLabel: 'Gesamt', totalTrad: '$800 - $1.600', totalLs: 'Ab $200/Monat',
    },
    results: {
      label: 'ERGEBNISSE', titleA: 'Echt oder KI?', titleHighlight: 'KI',
      sub: 'Gleicher Content, andere Formel. Extrem realistische HD-Fotos und -Videos.',
      cards: [
        { t: 'Malediven', loc: 'Strand · golden hour', hue: 'accent' },
        { t: 'Urban', loc: 'Editorial · Stadt', hue: 'violet' },
        { t: 'Tokio', loc: 'Skyline · High Fashion', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'PREISE', titleA: 'Pläne für', titleHighlight: 'jeden Creator',
      sub: 'Wähle deinen Plan und produziere ab heute. Jederzeit kündbar.',
      toggleCreators: 'Creator', toggleAgencies: 'Agenturen', popular: 'Am beliebtesten', perMonth: '/Monat',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Kostenlos starten', features: ['0 echte Credits', '1 digitaler Klon', '3 Basis-Locations', 'Standardauflösung', 'Mit Wasserzeichen'] },
          { name: 'Starter', price: '$29', cta: 'Starter wählen', features: ['50 Credits / Monat', '1 vollständiger Klon', '10 Locations', 'HD-Auflösung (1024px)', 'Ohne Wasserzeichen'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Pro wählen', features: ['200 Credits / Monat', 'Bis zu 3 digitale Klone', 'Alle Locations', 'Ultra HD (2048px)', 'Prioritäts-Warteschlange'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Vertrieb kontaktieren', features: ['Individuelle Credits', 'Unbegrenzte Klone', 'Alle Locations', 'Ultra HD (2048px)', 'Dedizierter Account-Manager'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Team wählen', features: ['1.000 Credits / Monat', 'Bis zu 10 Klone', 'Talent-Dashboard', 'Ultra HD (2048px)', 'Prioritäts-Support'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Studio wählen', features: ['3.000 Credits / Monat', 'Unbegrenzte Klone', 'Massenproduktion', 'Fortschrittliche Analytik', 'API-Zugang'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Vertrieb kontaktieren', features: ['Maßgeschneiderte Credits', 'Dediziertes Onboarding', 'Garantiertes SLA', 'Account-Manager', 'Jährliche Abrechnung'] },
        ],
      },
      packsTitle: 'Brauchst du mehr Credits?', packsSub: 'Zusatz-Packs. Verfallen nie. Funktionieren mit jedem Plan.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: 'Was kannst du mit deinen Credits erstellen?',
      tableSub: '1 Credit = 1 kuratiertes HD-Foto · 5 Credits = 1 professionelles Kurzvideo',
      tableCols: ['Plan', 'Credits', 'Nur HD-Fotos', 'Oder nur Videos'],
      tableRows: [
        { plan: 'Free (Test)', credits: '5', photos: '5 Fotos', videos: '1 Video' },
        { plan: 'Starter', credits: '50', photos: '50 Fotos', videos: '10 Videos' },
        { plan: 'Pro', credits: '200', photos: '200 Fotos', videos: '40 Videos' },
      ],
    },
    finalCta: { titleA: 'Entlass deinen Fotografen', highlight: 'heute', body: 'Produziere ab heute deinen eigenen Content, der verkauft — ohne Fotograf, ohne Studio, ohne Warten. Du hast die Kontrolle.', cta: 'Jetzt starten' },
    footer: {
      tagline: 'Dein KI-Fotograf.',
      cols: [
        { title: 'Produkt', items: ['So funktioniert’s', 'Für Creator', 'Für Agenturen', 'Preise'] },
        { title: 'Unternehmen', items: ['Über uns', 'Blog', 'Kontakt'] },
        { title: 'Rechtliches', items: ['AGB', 'Datenschutz', 'Cookies'] },
      ],
      copyright: '© 2026 LetShoot · Dein KI-Fotograf',
    },
  },

  // ════════════════════════════════════════════════════════════ IT
  it: {
    nav: { creators: 'Creator', agencies: 'Agenzie', pricing: 'Prezzi', results: 'Risultati', cta: 'Inizia gratis' },
    hero: {
      eyebrow: 'SENZA STUDIO · SENZA ATTESE · SENZA LIMITI',
      pre: 'Licenzia il tuo',
      highlight: 'fotografo',
      body: 'Il tuo fotografo IA genera foto e video di livello editoriale da ovunque — senza studio, senza attese. Per creator e agenzie che non si fermano mai.',
      ctaPrimary: 'Crea le mie foto',
      ctaSecondary: 'Vedi i risultati',
      stats: [{ n: '10x', l: 'più veloce' }, { n: '90%', l: 'di risparmio' }, { n: 'HD', l: 'qualità pro' }],
    },
    heroScrub: {
      typewriter: 'Sessioni di livello editoriale senza uscire di casa. Cosa creiamo oggi?',
      pills: [
        { label: 'Crea il mio clone', href: '#pricing' },
        { label: 'Vedi i risultati', href: '#results' },
      ],
    },
    marquee: ['MALDIVE', 'DUBAI', 'PARIGI', 'MIAMI', 'TOKYO', 'SANTORINI', 'NEW YORK', 'BALI'],
    how: {
      label: 'COME FUNZIONA', titleA: '3 passi verso il tuo', titleHighlight: 'fotografo IA',
      sub: 'Dai selfie a sessioni professionali in pochi minuti.',
      steps: [
        { n: '01', icon: 'upload', t: 'Carica i tuoi selfie', d: 'Carica 10-20 tue foto da diverse angolazioni. Al resto pensiamo noi.' },
        { n: '02', icon: 'cpu', t: 'Creiamo il tuo fotografo IA', d: 'Il nostro team allena il tuo fotografo IA con un contesto unico. Pronto in poche ore.' },
        { n: '03', icon: 'sparkles', t: 'Genera contenuti', d: 'Scegli location, outfit e mood. Genera foto e video HD professionali.' },
      ],
    },
    creators: {
      label: 'PER I CREATOR', titleA: 'La tua IA', titleHighlight: 'personale',
      sub: 'Sessioni foto e video senza uscire di casa. La stessa te, risultati migliori.',
      items: [
        { icon: 'image', t: 'Foto e video HD realistici', d: 'Contenuti indistinguibili da sessioni reali.', tags: ['HD', '4K', 'Realistico'] },
        { icon: 'map', t: 'Qualsiasi location', d: 'Parigi, Miami, Maldive — senza muoverti.', tags: ['Parigi', 'Miami', 'Maldive'] },
        { icon: 'shirt', t: 'Moda virtuale', d: 'Varietà di outfit senza acquisti aggiuntivi.', tags: ['Outfit', 'Stile'] },
        { icon: 'wand', t: 'Stylist IA', d: 'Trucco e styling virtuali su misura per i tuoi tratti.', tags: ['Makeup', 'Styling'] },
      ],
    },
    agencies: {
      label: 'PER LE AGENZIE', titleA: 'Scala la tua', titleHighlight: 'produzione',
      sub: 'Dashboard per agenzie con gestione dei talenti, produzione di massa e analytics avanzate.',
      items: [
        { icon: 'users', t: 'Gestione talenti', d: 'Una dashboard completa per il tuo roster di creator.', tags: ['Roster', 'Dashboard'] },
        { icon: 'layers', t: 'Produzione di massa', d: 'Foto e video per più influencer contemporaneamente.', tags: ['Batch', 'Scala'] },
        { icon: 'chart', t: 'Analytics avanzate', d: 'Metriche di performance e ROI in tempo reale.', tags: ['ROI', 'Metriche'] },
        { icon: 'wallet', t: 'Risparmia tempo e denaro', d: 'Senza fotografo, studio, Uber né catering.', tags: ['Risparmio', 'Veloce'] },
      ],
    },
    showcase: {
      label: 'LA MAGIA', titleA: 'La stessa te,', titleHighlight: 'mille location',
      sub: 'Una sola sessione, sfondi infiniti. Muovi il cursore e cambia scenario in tempo reale.',
      hint: 'Muovi il cursore per cambiare location →',
    },
    comparison: {
      label: 'CONFRONTO', titleA: 'Shooting tradizionale vs', titleHighlight: 'LetShoot',
      col1: 'Shooting tradizionale', col2: 'LetShoot',
      rows: [
        { label: 'Fotografo', trad: '$500 - $800', ls: 'Incluso' },
        { label: 'Trucco', trad: '$100 - $200', ls: 'Incluso' },
        { label: 'Location', trad: '$150 - $500', ls: 'Incluso' },
        { label: 'Trasporto', trad: '$50 - $100', ls: 'Incluso' },
        { label: 'Tempo', trad: '5 - 7 ore', ls: 'Minuti' },
        { label: 'Foto + video', trad: '20-30 foto, 1 video', ls: 'Illimitati' },
      ],
      totalLabel: 'Totale', totalTrad: '$800 - $1.600', totalLs: 'Da $200/mese',
    },
    results: {
      label: 'RISULTATI', titleA: 'È reale o IA?', titleHighlight: 'IA',
      sub: 'Stesso contenuto, formula diversa. Foto e video HD estremamente realistici.',
      cards: [
        { t: 'Maldive', loc: 'Spiaggia · golden hour', hue: 'accent' },
        { t: 'Urban', loc: 'Editorial · città', hue: 'violet' },
        { t: 'Tokyo', loc: 'Skyline · alta moda', hue: 'coral' },
      ],
    },
    pricing: {
      label: 'PREZZI', titleA: 'Piani per', titleHighlight: 'ogni creator',
      sub: 'Scegli il tuo piano e inizia a produrre oggi. Disdici quando vuoi.',
      toggleCreators: 'Creator', toggleAgencies: 'Agenzie', popular: 'Più popolare', perMonth: '/mese',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: 'Inizia gratis', features: ['0 crediti reali', '1 clone digitale', '3 location base', 'Risoluzione standard', 'Con filigrana'] },
          { name: 'Starter', price: '$29', cta: 'Scegli Starter', features: ['50 crediti / mese', '1 clone digitale completo', '10 location', 'Risoluzione HD (1024px)', 'Senza filigrana'] },
          { name: 'Pro', price: '$79', popular: true, cta: 'Scegli Pro', features: ['200 crediti / mese', 'Fino a 3 cloni digitali', 'Tutte le location', 'Ultra HD (2048px)', 'Coda prioritaria'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contatta le vendite', features: ['Crediti personalizzati', 'Cloni illimitati', 'Tutte le location', 'Ultra HD (2048px)', 'Account manager dedicato'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: 'Scegli Team', features: ['1.000 crediti / mese', 'Fino a 10 cloni', 'Dashboard talenti', 'Ultra HD (2048px)', 'Supporto prioritario'] },
          { name: 'Studio', price: '$399', popular: true, cta: 'Scegli Studio', features: ['3.000 crediti / mese', 'Cloni illimitati', 'Produzione di massa', 'Analytics avanzate', 'Accesso API'] },
          { name: 'Enterprise', price: 'Custom', cta: 'Contatta le vendite', features: ['Crediti su misura', 'Onboarding dedicato', 'SLA garantito', 'Account manager', 'Fatturazione annuale'] },
        ],
      },
      packsTitle: 'Ti servono più crediti?', packsSub: 'Pack aggiuntivi. Non scadono mai. Funzionano con qualsiasi piano.',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: 'Cosa puoi creare con i tuoi crediti?',
      tableSub: '1 credito = 1 foto HD curata · 5 crediti = 1 video breve professionale',
      tableCols: ['Piano', 'Crediti', 'Solo foto HD', 'O solo video'],
      tableRows: [
        { plan: 'Free (prova)', credits: '5', photos: '5 foto', videos: '1 video' },
        { plan: 'Starter', credits: '50', photos: '50 foto', videos: '10 video' },
        { plan: 'Pro', credits: '200', photos: '200 foto', videos: '40 video' },
      ],
    },
    finalCta: { titleA: 'Licenzia il tuo fotografo', highlight: 'oggi', body: 'Inizia a produrre i tuoi contenuti che vendono — senza fotografo, senza studio, senza attese. Al comando ci sei tu.', cta: 'Inizia ora' },
    footer: {
      tagline: 'Il tuo fotografo IA.',
      cols: [
        { title: 'Prodotto', items: ['Come funziona', 'Per i creator', 'Per le agenzie', 'Prezzi'] },
        { title: 'Azienda', items: ['Chi siamo', 'Blog', 'Contatti'] },
        { title: 'Legale', items: ['Termini', 'Privacy', 'Cookie'] },
      ],
      copyright: '© 2026 LetShoot · Il tuo fotografo IA',
    },
  },

  // ════════════════════════════════════════════════════════════ ZH
  zh: {
    nav: { creators: '创作者', agencies: '机构', pricing: '价格', results: '案例', cta: '免费开始' },
    hero: {
      eyebrow: '无需影棚 · 无需等待 · 没有限制',
      pre: '解雇你的',
      highlight: '摄影师',
      body: '你的 AI 摄影师随时随地生成杂志级的照片和视频——无需影棚，无需等待。为永不停歇的创作者和机构而生。',
      ctaPrimary: '创建我的照片',
      ctaSecondary: '查看案例',
      stats: [{ n: '10x', l: '更快' }, { n: '90%', l: '节省' }, { n: 'HD', l: '专业画质' }],
    },
    heroScrub: {
      typewriter: '足不出户，拍出杂志级大片。今天我们创作什么？',
      pills: [
        { label: '创建我的分身', href: '#pricing' },
        { label: '查看案例', href: '#results' },
      ],
    },
    marquee: ['马尔代夫', '迪拜', '巴黎', '迈阿密', '东京', '圣托里尼', '纽约', '巴厘岛'],
    how: {
      label: '如何运作', titleA: '三步拥有你的', titleHighlight: 'AI 摄影师',
      sub: '几分钟内，从自拍到专业大片。',
      steps: [
        { n: '01', icon: 'upload', t: '上传你的自拍', d: '上传 10-20 张不同角度的自拍，剩下的交给我们。' },
        { n: '02', icon: 'cpu', t: '我们打造你的 AI 摄影师', d: '我们的团队用专属语境训练你的 AI 摄影师，数小时即可完成。' },
        { n: '03', icon: 'sparkles', t: '生成内容', d: '选择场景、服装和氛围，生成专业的 HD 照片和视频。' },
      ],
    },
    creators: {
      label: '为创作者', titleA: '你的专属', titleHighlight: 'AI',
      sub: '足不出户完成照片和视频拍摄。同样的你，更好的效果。',
      items: [
        { icon: 'image', t: '逼真的 HD 照片与视频', d: '与真实拍摄难以区分的内容。', tags: ['HD', '4K', '逼真'] },
        { icon: 'map', t: '任意场景', d: '巴黎、迈阿密、马尔代夫——无需移动。', tags: ['巴黎', '迈阿密', '马尔代夫'] },
        { icon: 'shirt', t: '虚拟时装', d: '多样穿搭，无需额外购买。', tags: ['穿搭', '风格'] },
        { icon: 'wand', t: 'AI 造型师', d: '为你的五官量身定制的虚拟妆容与造型。', tags: ['妆容', '造型'] },
      ],
    },
    agencies: {
      label: '为机构', titleA: '扩展你的', titleHighlight: '产能',
      sub: '机构控制台，集人才管理、批量生产和高级分析于一体。',
      items: [
        { icon: 'users', t: '人才管理', d: '为你的创作者阵容打造的完整控制台。', tags: ['阵容', '控制台'] },
        { icon: 'layers', t: '批量生产', d: '同时为多位达人生成照片和视频。', tags: ['批量', '规模'] },
        { icon: 'chart', t: '高级分析', d: '实时的表现指标与 ROI。', tags: ['ROI', '指标'] },
        { icon: 'wallet', t: '省时又省钱', d: '无需摄影师、影棚、打车或餐饮。', tags: ['省钱', '快速'] },
      ],
    },
    showcase: {
      label: '魔法时刻', titleA: '同样的你，', titleHighlight: '千变场景',
      sub: '一次拍摄，背景无限。移动光标，实时切换场景。',
      hint: '移动光标切换场景 →',
    },
    comparison: {
      label: '对比', titleA: '传统拍摄 vs', titleHighlight: 'LetShoot',
      col1: '传统拍摄', col2: 'LetShoot',
      rows: [
        { label: '摄影师', trad: '$500 - $800', ls: '已包含' },
        { label: '化妆', trad: '$100 - $200', ls: '已包含' },
        { label: '场地', trad: '$150 - $500', ls: '已包含' },
        { label: '交通', trad: '$50 - $100', ls: '已包含' },
        { label: '耗时', trad: '5 - 7 小时', ls: '几分钟' },
        { label: '照片 + 视频', trad: '20-30 张照片, 1 个视频', ls: '无限量' },
      ],
      totalLabel: '合计', totalTrad: '$800 - $1,600', totalLs: '$200/月起',
    },
    results: {
      label: '案例', titleA: '是真实还是 AI？', titleHighlight: 'AI',
      sub: '同样的内容，不同的方式。极其逼真的 HD 照片与视频。',
      cards: [
        { t: '马尔代夫', loc: '海滩 · 黄金时刻', hue: 'accent' },
        { t: '都市', loc: '杂志风 · 城市', hue: 'violet' },
        { t: '东京', loc: '天际线 · 高级时装', hue: 'coral' },
      ],
    },
    pricing: {
      label: '价格', titleA: '适合每位', titleHighlight: '创作者的方案',
      sub: '选择你的方案，今天就开始产出。随时可取消。',
      toggleCreators: '创作者', toggleAgencies: '机构', popular: '最受欢迎', perMonth: '/月',
      plans: {
        creators: [
          { name: 'Free', price: '$0', cta: '免费开始', features: ['0 个真实积分', '1 个数字分身', '3 个基础场景', '标准分辨率', '带水印'] },
          { name: 'Starter', price: '$29', cta: '选择 Starter', features: ['每月 50 积分', '1 个完整数字分身', '10 个场景', 'HD 分辨率 (1024px)', '无水印'] },
          { name: 'Pro', price: '$79', popular: true, cta: '选择 Pro', features: ['每月 200 积分', '最多 3 个数字分身', '全部场景', '超高清 (2048px)', '优先队列'] },
          { name: 'Enterprise', price: 'Custom', cta: '联系销售', features: ['定制积分', '无限分身', '全部场景', '超高清 (2048px)', '专属客户经理'] },
        ],
        agencies: [
          { name: 'Team', price: '$149', cta: '选择 Team', features: ['每月 1,000 积分', '最多 10 个分身', '人才控制台', '超高清 (2048px)', '优先支持'] },
          { name: 'Studio', price: '$399', popular: true, cta: '选择 Studio', features: ['每月 3,000 积分', '无限分身', '批量生产', '高级分析', 'API 接入'] },
          { name: 'Enterprise', price: 'Custom', cta: '联系销售', features: ['定制积分', '专属上线', '保障 SLA', '客户经理', '年度结算'] },
        ],
      },
      packsTitle: '需要更多积分？', packsSub: '加购积分包。永不过期。适用于任意套餐。',
      packs: [{ c: '25', p: '$24.99' }, { c: '50', p: '$44.99' }, { c: '100', p: '$79.99' }, { c: '250', p: '$174.99' }],
      tableTitle: '用积分能创作什么？',
      tableSub: '1 积分 = 1 张精修 HD 照片 · 5 积分 = 1 个专业短视频',
      tableCols: ['套餐', '积分', '仅 HD 照片', '或仅视频'],
      tableRows: [
        { plan: 'Free（试用）', credits: '5', photos: '5 张照片', videos: '1 个视频' },
        { plan: 'Starter', credits: '50', photos: '50 张照片', videos: '10 个视频' },
        { plan: 'Pro', credits: '200', photos: '200 张照片', videos: '40 个视频' },
      ],
    },
    finalCta: { titleA: '今天就解雇你的', highlight: '摄影师', body: '从今天起自己产出能变现的内容——无需摄影师、无需影棚、无需等待。一切由你掌控。', cta: '立即开始' },
    footer: {
      tagline: '你的 AI 摄影师。',
      cols: [
        { title: '产品', items: ['如何运作', '为创作者', '为机构', '价格'] },
        { title: '公司', items: ['关于我们', '博客', '联系我们'] },
        { title: '法律', items: ['条款', '隐私', 'Cookie'] },
      ],
      copyright: '© 2026 LetShoot · 你的 AI 摄影师',
    },
  },
};
