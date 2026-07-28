'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Clock, Hourglass, TrendingDown, ArrowRight, ArrowDown, Zap, Check, Heart } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

const T = {
  en: {
    label: 'The real problem',
    highlight: 'We have your content ready at the right moment — for you.',
    sub: 'The money is made in the chat, and the fan won’t wait. When the content isn’t ready, this is what happens:',
    chain: [
      { t: 'The fan asks', d: 'In the chat, they want something right now.' },
      { t: 'Busy or no material', d: 'You’re busy — or you just don’t have that content on hand.' },
      { t: 'It arrives late', d: 'The content isn’t there in time and the fan cools off.' },
      { t: 'Sale lost', d: 'You don’t sell — or you sell less.', loss: true },
    ],
    solveKicker: 'With Let’s Shoot',
    solveTitle: 'The right content, at the exact moment',
    creatorNote: 'If you create content, you already know the value of having it ready in every form, instantly — it’s the hardest part, and it’s exactly what sells the most.',
    solve: 'Picture never running out of something to say. You always have sales and engagement content ready to drop the second it matters — so every conversation becomes a chance to sell.',
    examplesLabel: 'How it plays out in the chat',
    examples: [
      'You talk to him, show him how your day is going and build a story. That hooks him — and you sell him more content.',
      'Your VIP wants something just for him tonight. Instead of losing him, you send the perfect photo and close the sale.',
      '“What are you up to?” — you send a beach photo, like you’re sharing your day, and it turns into a PPV.',
    ],
    thesis: 'This fixes the real problem in the industry: a creator’s time and availability. We create the product — and the product is what sells.',
    custom: 'And if a fan asks for something you, your team or your agency don’t have on hand? We produce it — so you never leave a sale on the table.',
    stratKicker: 'Sales + engagement',
    stratTitle: 'Stories that sell',
    strat: 'You almost always have sales content — what’s missing is the engagement kind. Engagement tells a story: a situation, a moment. It’s the content that shows the fan you’re always there, and it’s often what actually converts. That’s what we do: give you the content at the right moment, in the right situation, for the right person — your whales, your VIPs.',
    diffTitle: 'No revenue share. Ever.',
    diff: 'A single image can make you a lot of money — and that’s exactly where others want their cut, as if they were your partners. Not with us: we produce on another level, and it’s part of your subscription, period. Everything you earn with our content, however much, stays 100% yours.',
  },
  es: {
    label: 'El problema real',
    highlight: 'Tenemos tu contenido en el momento indicado — para ti.',
    sub: 'El dinero se hace en el chat, y el fan no espera. Cuando el contenido no está listo, pasa esto:',
    chain: [
      { t: 'El fan pide', d: 'En el chat, quiere algo al instante.' },
      { t: 'Ocupada o sin material', d: 'Estás ocupada — o no tienes ese contenido a la mano.' },
      { t: 'Llega tarde', d: 'El contenido no llega a tiempo y el fan se enfría.' },
      { t: 'Venta perdida', d: 'No vendes — o vendes menos.', loss: true },
    ],
    solveKicker: 'Con Let’s Shoot',
    solveTitle: 'El contenido justo, en el momento indicado',
    creatorNote: 'Si creas contenido, ya sabes lo que vale tenerlo listo en todas sus formas y al instante — es lo más difícil, y es justo lo que más vende.',
    solve: 'Imagina nunca quedarte sin qué decir. Siempre tienes contenido de venta y de enganche listo para soltar en el segundo que importa — y cada conversación se vuelve una oportunidad de venta.',
    examplesLabel: 'Así se ve en el chat',
    examples: [
      'Le hablas, le muestras cómo va tu día a día y le armas una historia. Eso lo engancha — y le vendes más contenido.',
      'Tu cliente VIP quiere algo solo para él esta noche. En vez de perderlo, le mandas la foto perfecta y cierras la venta.',
      '“¿Qué haces?” — le mandas una foto en la playa, como contándole tu día, y termina en un PPV.',
    ],
    thesis: 'Esto arregla el problema real de la industria: el tiempo y la disponibilidad de la creadora. Nosotros creamos el producto — y el producto es lo que vende.',
    custom: '¿Y si un fan pide algo que tú, tu equipo o tu agencia no tienen a la mano? Nosotros lo producimos — para que nunca dejes una venta sobre la mesa.',
    stratKicker: 'Venta + enganche',
    stratTitle: 'Historias que venden',
    strat: 'Casi siempre tienes contenido de venta — lo que te falta es el de enganche. El enganche cuenta una historia: una situación, un momento. Es el contenido que le demuestra al fan que siempre estás atenta, y muchas veces es el que de verdad convierte. Eso hacemos: darte el contenido en el momento indicado, en la situación indicada y para la persona indicada — tus ballenas, tus clientes VIP.',
    diffTitle: 'Sin porcentaje. Nunca.',
    diff: 'Una sola imagen puede generarte muchísimo dinero — y ahí es donde otros quieren su porcentaje, como si fueran tus socios. Con nosotros no: producimos a otro nivel y es parte de tu suscripción, punto. Todo lo que ganes con nuestro contenido, por mucho que sea, es 100% tuyo.',
  },
  pt: {
    label: 'O problema real',
    highlight: 'Temos o teu conteúdo no momento certo — para ti.',
    sub: 'O dinheiro faz-se no chat, e o fã não espera. Quando o conteúdo não está pronto, acontece isto:',
    chain: [
      { t: 'O fã pede', d: 'No chat, quer algo na hora.' },
      { t: 'Ocupada ou sem material', d: 'Estás ocupada — ou não tens esse conteúdo à mão.' },
      { t: 'Chega tarde', d: 'O conteúdo não chega a tempo e o fã arrefece.' },
      { t: 'Venda perdida', d: 'Não vendes — ou vendes menos.', loss: true },
    ],
    solveKicker: 'Com a Let’s Shoot',
    solveTitle: 'O conteúdo certo, no momento certo',
    creatorNote: 'Se crias conteúdo, já sabes o que vale tê-lo pronto em todas as formas e na hora — é o mais difícil, e é justamente o que mais vende.',
    solve: 'Imagina nunca ficares sem o que dizer. Tens sempre conteúdo de venda e de engagement pronto para soltar no segundo que importa — e cada conversa vira uma oportunidade de venda.',
    examplesLabel: 'Assim funciona no chat',
    examples: [
      'Falas com ele, mostras como está a ser o teu dia e crias uma história. Isso prende-o — e vendes-lhe mais conteúdo.',
      'O teu cliente VIP quer algo só para ele esta noite. Em vez de o perderes, mandas a foto perfeita e fechas a venda.',
      '“O que estás a fazer?” — mandas uma foto na praia, como quem conta o seu dia, e acaba num PPV.',
    ],
    thesis: 'Isto resolve o problema real da indústria: o tempo e a disponibilidade da criadora. Nós criamos o produto — e o produto é o que vende.',
    custom: 'E se um fã pedir algo que tu, a tua equipa ou a tua agência não têm à mão? Nós produzimos — para nunca deixares uma venda em cima da mesa.',
    stratKicker: 'Venda + engagement',
    stratTitle: 'Histórias que vendem',
    strat: 'Quase sempre tens conteúdo de venda — o que te falta é o de engagement. O engagement conta uma história: uma situação, um momento. É o conteúdo que mostra ao fã que estás sempre atenta, e muitas vezes é o que realmente converte. É isso que fazemos: dar-te o conteúdo no momento certo, na situação certa e para a pessoa certa — as tuas whales, os teus clientes VIP.',
    diffTitle: 'Sem percentagem. Nunca.',
    diff: 'Uma única imagem pode render-te muitíssimo dinheiro — e é aí que outros querem a sua percentagem, como se fossem teus sócios. Connosco não: produzimos a outro nível e faz parte da tua subscrição, ponto. Tudo o que ganhares com o nosso conteúdo, por muito que seja, é 100% teu.',
  },
  fr: {
    label: 'Le vrai problème',
    highlight: 'On a ton contenu au bon moment — pour toi.',
    sub: 'L’argent se fait dans le chat, et le fan n’attend pas. Quand le contenu n’est pas prêt, voilà ce qui se passe :',
    chain: [
      { t: 'Le fan demande', d: 'Dans le chat, il veut quelque chose tout de suite.' },
      { t: 'Occupée ou sans matériel', d: 'Tu es occupée — ou tu n’as pas ce contenu sous la main.' },
      { t: 'Ça arrive trop tard', d: 'Le contenu n’arrive pas à temps et le fan se refroidit.' },
      { t: 'Vente perdue', d: 'Tu ne vends pas — ou tu vends moins.', loss: true },
    ],
    solveKicker: 'Avec Let’s Shoot',
    solveTitle: 'Le bon contenu, au bon moment',
    creatorNote: 'Si tu crées du contenu, tu sais déjà ce que ça vaut de l’avoir prêt sous toutes ses formes et à l’instant — c’est le plus difficile, et c’est exactement ce qui vend le plus.',
    solve: 'Imagine ne jamais être à court de quoi dire. Tu as toujours du contenu de vente et d’engagement prêt à envoyer à la seconde qui compte — et chaque conversation devient une occasion de vendre.',
    examplesLabel: 'Voilà ce que ça donne dans le chat',
    examples: [
      'Tu lui parles, tu lui montres ton quotidien et tu lui construis une histoire. Ça l’accroche — et tu lui vends plus de contenu.',
      'Ton client VIP veut quelque chose rien que pour lui ce soir. Au lieu de le perdre, tu lui envoies la photo parfaite et tu conclus la vente.',
      '« Tu fais quoi ? » — tu lui envoies une photo à la plage, comme si tu racontais ta journée, et ça finit en PPV.',
    ],
    thesis: 'Ça règle le vrai problème de l’industrie : le temps et la disponibilité de la créatrice. Nous, on crée le produit — et c’est le produit qui vend.',
    custom: 'Et si un fan demande quelque chose que toi, ton équipe ou ton agence n’avez pas sous la main ? On le produit — pour que tu ne laisses jamais une vente sur la table.',
    stratKicker: 'Vente + engagement',
    stratTitle: 'Des histoires qui vendent',
    strat: 'Tu as presque toujours du contenu de vente — ce qui te manque, c’est celui d’engagement. L’engagement raconte une histoire : une situation, un moment. C’est le contenu qui montre au fan que tu es toujours là, et c’est souvent celui qui convertit vraiment. C’est ce qu’on fait : te donner le contenu au bon moment, dans la bonne situation et pour la bonne personne — tes whales, tes clients VIP.',
    diffTitle: 'Pas de commission. Jamais.',
    diff: 'Une seule image peut te rapporter énormément d’argent — et c’est exactement là que d’autres veulent leur part, comme s’ils étaient tes associés. Pas avec nous : on produit à un autre niveau et c’est inclus dans ton abonnement, point. Tout ce que tu gagnes avec notre contenu, peu importe combien, reste 100% à toi.',
  },
  de: {
    label: 'Das echte Problem',
    highlight: 'Wir haben deinen Content im richtigen Moment — für dich.',
    sub: 'Das Geld wird im Chat verdient, und der Fan wartet nicht. Wenn der Content nicht bereit ist, passiert das:',
    chain: [
      { t: 'Der Fan fragt', d: 'Im Chat — er will sofort etwas.' },
      { t: 'Beschäftigt oder kein Material', d: 'Du bist beschäftigt — oder hast diesen Content gerade nicht zur Hand.' },
      { t: 'Er kommt zu spät', d: 'Der Content kommt nicht rechtzeitig und der Fan kühlt ab.' },
      { t: 'Verkauf verloren', d: 'Du verkaufst nicht — oder weniger.', loss: true },
    ],
    solveKicker: 'Mit Let’s Shoot',
    solveTitle: 'Der richtige Content, im richtigen Moment',
    creatorNote: 'Wenn du Content erstellst, weißt du längst, was es wert ist, ihn in jeder Form sofort parat zu haben — es ist das Schwierigste, und genau das, was am meisten verkauft.',
    solve: 'Stell dir vor, dir geht nie der Stoff aus. Du hast immer Verkaufs- und Engagement-Content bereit, um ihn genau in der Sekunde rauszuschicken, die zählt — und jede Unterhaltung wird zur Verkaufschance.',
    examplesLabel: 'So sieht das im Chat aus',
    examples: [
      'Du schreibst mit ihm, zeigst ihm deinen Tag und baust eine Story auf. Das fesselt ihn — und du verkaufst ihm mehr Content.',
      'Dein VIP-Kunde will heute Nacht etwas nur für ihn. Statt ihn zu verlieren, schickst du das perfekte Foto und machst den Verkauf klar.',
      '„Was machst du gerade?“ — du schickst ein Foto vom Strand, als würdest du von deinem Tag erzählen, und am Ende wird ein PPV daraus.',
    ],
    thesis: 'Das löst das echte Problem der Branche: die Zeit und Verfügbarkeit der Creatorin. Wir erstellen das Produkt — und das Produkt ist es, was verkauft.',
    custom: 'Und wenn ein Fan etwas will, das du, dein Team oder deine Agentur nicht zur Hand habt? Wir produzieren es — damit du nie einen Verkauf liegen lässt.',
    stratKicker: 'Verkauf + Engagement',
    stratTitle: 'Storys, die verkaufen',
    strat: 'Verkaufs-Content hast du fast immer — was dir fehlt, ist der Engagement-Content. Engagement erzählt eine Geschichte: eine Situation, einen Moment. Es ist der Content, der dem Fan zeigt, dass du immer da bist — und oft der, der wirklich konvertiert. Genau das machen wir: dir den Content im richtigen Moment geben, in der richtigen Situation, für die richtige Person — deine Whales, deine VIP-Kunden.',
    diffTitle: 'Keine Umsatzbeteiligung. Niemals.',
    diff: 'Ein einziges Bild kann dir richtig viel Geld einbringen — und genau da wollen andere ihren Anteil, als wären sie deine Partner. Bei uns nicht: Wir produzieren auf einem anderen Level, und es ist Teil deines Abos, Punkt. Alles, was du mit unserem Content verdienst, egal wie viel, gehört zu 100% dir.',
  },
  it: {
    label: 'Il vero problema',
    highlight: 'Abbiamo il tuo contenuto al momento giusto — per te.',
    sub: 'I soldi si fanno in chat, e il fan non aspetta. Quando il contenuto non è pronto, succede questo:',
    chain: [
      { t: 'Il fan chiede', d: 'In chat, vuole qualcosa all’istante.' },
      { t: 'Occupata o senza materiale', d: 'Sei occupata — o non hai quel contenuto a portata di mano.' },
      { t: 'Arriva tardi', d: 'Il contenuto non arriva in tempo e il fan si raffredda.' },
      { t: 'Vendita persa', d: 'Non vendi — o vendi meno.', loss: true },
    ],
    solveKicker: 'Con Let’s Shoot',
    solveTitle: 'Il contenuto giusto, al momento giusto',
    creatorNote: 'Se crei contenuti, sai già quanto vale averli pronti in ogni forma e all’istante — è la parte più difficile, ed è proprio quella che vende di più.',
    solve: 'Immagina di non restare mai senza niente da dire. Hai sempre contenuti di vendita e di engagement pronti da mandare nel secondo che conta — e ogni conversazione diventa un’occasione di vendita.',
    examplesLabel: 'Ecco come funziona in chat',
    examples: [
      'Gli parli, gli mostri com’è la tua giornata e gli costruisci una storia. Questo lo aggancia — e gli vendi più contenuti.',
      'Il tuo cliente VIP vuole qualcosa solo per lui stanotte. Invece di perderlo, gli mandi la foto perfetta e chiudi la vendita.',
      '“Che fai?” — gli mandi una foto in spiaggia, come se gli raccontassi la tua giornata, e finisce in un PPV.',
    ],
    thesis: 'Questo risolve il vero problema del settore: il tempo e la disponibilità della creator. Noi creiamo il prodotto — e il prodotto è ciò che vende.',
    custom: 'E se un fan chiede qualcosa che tu, il tuo team o la tua agenzia non avete a portata di mano? Lo produciamo noi — così non lasci mai una vendita sul tavolo.',
    stratKicker: 'Vendita + engagement',
    stratTitle: 'Storie che vendono',
    strat: 'Il contenuto di vendita ce l’hai quasi sempre — quello che ti manca è l’engagement. L’engagement racconta una storia: una situazione, un momento. È il contenuto che dimostra al fan che ci sei sempre, e spesso è quello che converte davvero. È questo che facciamo: darti il contenuto al momento giusto, nella situazione giusta e per la persona giusta — le tue whale, i tuoi clienti VIP.',
    diffTitle: 'Nessuna percentuale. Mai.',
    diff: 'Una sola immagine può farti guadagnare tantissimo — ed è proprio lì che altri vogliono la loro percentuale, come se fossero tuoi soci. Con noi no: produciamo a un altro livello ed è incluso nel tuo abbonamento, punto. Tutto quello che guadagni con i nostri contenuti, per quanto sia, è 100% tuo.',
  },
  zh: {
    label: '真正的问题',
    highlight: '在对的时刻，你的内容已经备好——为你。',
    sub: '钱是在聊天里赚的，而粉丝不会等。内容没准备好时，就会发生这些：',
    chain: [
      { t: '粉丝开口要', d: '在聊天里，他现在就想要。' },
      { t: '没空或没素材', d: '你在忙——或者手边刚好没有那个内容。' },
      { t: '内容来晚了', d: '内容没能及时送到，粉丝的热情就凉了。' },
      { t: '订单没了', d: '你没卖出去——或者卖得更少。', loss: true },
    ],
    solveKicker: '有了 Let’s Shoot',
    solveTitle: '对的内容，恰好在对的时刻',
    creatorNote: '如果你做内容，你就知道随时备好各种形式的内容有多值钱——这是最难的部分，也恰恰是最能卖钱的部分。',
    solve: '想象一下，你永远不缺话题。销售内容和互动内容随时待命，在最关键的那一秒发出去——每一次对话都变成一次销售机会。',
    examplesLabel: '在聊天里是这样的',
    examples: [
      '你跟他聊天，给他看你的日常，编一个故事。他被吸引住了——你就能卖给他更多内容。',
      '你的 VIP 客户今晚想要一份只属于他的内容。与其失去他，不如发出那张完美的照片，直接成交。',
      '“在干嘛？”——你发一张海滩照，就像在分享你的一天，最后变成一单 PPV。',
    ],
    thesis: '这解决了行业里真正的问题：创作者的时间和随时响应的能力。我们打造产品——而产品才是卖钱的关键。',
    custom: '要是粉丝想要的内容，你、你的团队或你的机构手边都没有呢？我们来制作——让你永远不错过任何一单。',
    stratKicker: '销售 + 互动',
    stratTitle: '会卖钱的故事',
    strat: '销售内容你几乎总有——缺的是互动内容。互动内容讲的是一个故事：一个情境、一个瞬间。它让粉丝感觉你一直都在，而且往往正是它真正促成转化。这就是我们做的：在对的时刻、对的情境，把对的内容给对的人——你的金主、你的 VIP 客户。',
    diffTitle: '不抽成。永远不。',
    diff: '一张图就可能让你赚很多钱——而别人正是想在这里分一杯羹，好像他们是你的合伙人。我们不一样：我们的制作水准在另一个层级，而且全部包含在你的订阅里，就这么简单。用我们的内容赚到的每一分钱，不管多少，100% 都是你的。',
  },
};

const ICONS = [MessageCircle, Clock, Hourglass, TrendingDown];

export default function Solution() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="por-que" className="relative scroll-mt-24 overflow-hidden bg-ink py-24 sm:py-28">
      {/* ambient depth */}
      <div className="blob left-1/2 top-24 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="blob bottom-0 right-[8%] h-[280px] w-[280px] bg-rose-500/10" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-5">
        {/* ── Heading ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-hair/5 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgb(var(--brand,0_177_246))]" />
            {t.label}
          </span>
          <h2 className="headline mx-auto mt-5 max-w-[18ch] text-[clamp(1.85rem,4vw,3rem)] leading-[1.1] text-rainbow [text-wrap:balance]">
            {t.highlight}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">
            {t.sub}
          </p>
        </motion.div>

        {/* ── Cause → effect chain ─────────────────────────────────────────── */}
        <div className="relative mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-stretch md:gap-0">
          {/* connector line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" aria-hidden />

          {t.chain.map((step, i) => {
            const Icon = ICONS[i];
            const loss = step.loss;
            return (
              <Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease, delay: i * 0.09 }}
                  className={`group relative flex flex-1 flex-col items-center rounded-2xl border p-6 text-center backdrop-blur-sm transition-all duration-300 md:mx-1.5 ${
                    loss
                      ? 'border-rose-500/30 bg-gradient-to-b from-rose-500/[0.12] to-rose-500/[0.03] hover:border-rose-500/50'
                      : 'border-line bg-gradient-to-b from-card to-ink-2/60 hover:-translate-y-1 hover:border-brand/40'
                  }`}
                >
                  {/* step number */}
                  <span
                    className={`absolute right-3 top-3 font-mono text-[11px] font-semibold ${
                      loss ? 'text-rose-400/70' : 'text-paper-dim'
                    }`}
                  >
                    {loss ? '✕' : `0${i + 1}`}
                  </span>

                  {/* icon chip */}
                  <div
                    className={`relative z-[1] mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${
                      loss
                        ? 'bg-rose-500/15 text-rose-400 ring-rose-500/25'
                        : 'bg-brand/12 text-brand ring-brand/25'
                    }`}
                  >
                    <Icon size={24} aria-hidden strokeWidth={1.75} />
                  </div>

                  <div className={`font-display text-[17px] font-semibold ${loss ? 'text-rose-200' : 'text-paper'}`}>
                    {step.t}
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-snug text-paper-mute">{step.d}</p>
                </motion.div>

                {i < t.chain.length - 1 && (
                  <div className="flex shrink-0 items-center justify-center py-1 text-paper-dim md:py-0">
                    <ArrowRight className="hidden h-4 w-4 md:block" aria-hidden />
                    <ArrowDown className="h-4 w-4 md:hidden" aria-hidden />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ── Resolution — the "wow, I need this" moment ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.65, ease }}
          className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-[2rem] border border-brand/45 bg-gradient-to-b from-brand/[0.14] via-brand/[0.05] to-transparent p-8 text-center shadow-glow sm:p-14"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20 text-brand ring-1 ring-brand/40 shadow-glow-sm">
              <Zap size={32} aria-hidden strokeWidth={1.75} />
            </div>
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brand">{t.solveKicker}</div>
            <h3 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-bold leading-[1.05] text-paper [text-wrap:balance] sm:text-5xl">
              {t.solveTitle}
            </h3>

            {/* creator validation — prominent lead */}
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-paper [text-wrap:balance] sm:text-xl">
              {t.creatorNote}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-paper-mute [text-wrap:balance]">{t.solve}</p>

            {/* Real chat scenarios — emotive examples */}
            <div className="mx-auto mt-9 max-w-2xl">
              <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{t.examplesLabel}</div>
              <div className="space-y-3">
                {t.examples.map((ex, i) => (
                  <div key={i} className="flex items-start gap-3.5 rounded-2xl border border-line bg-ink-2/70 px-5 py-4 text-left transition-colors hover:border-brand/40">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand ring-1 ring-brand/25">
                      <MessageCircle size={16} aria-hidden />
                    </span>
                    <p className="text-[15px] leading-snug text-paper">{ex}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-2xl border-t border-brand/15 pt-7 font-display text-xl font-semibold leading-snug text-paper [text-wrap:balance] sm:text-2xl">
              {t.thesis}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-paper-mute [text-wrap:balance]">
              {t.custom}
            </p>
          </div>
        </motion.div>

        {/* ── Strategy / the opener ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 flex max-w-3xl items-start gap-4 rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/60 px-6 py-6 text-left"
        >
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand ring-1 ring-brand/25">
            <Heart size={20} aria-hidden strokeWidth={1.9} />
          </div>
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">{t.stratKicker}</div>
            <h3 className="mt-1 font-display text-lg font-semibold text-paper sm:text-xl">{t.stratTitle}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-paper-mute">{t.strat}</p>
          </div>
        </motion.div>

        {/* ── No revenue share ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-6 flex max-w-3xl items-start gap-4 rounded-2xl border border-line bg-card px-6 py-6 text-left"
        >
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand ring-1 ring-brand/20">
            <Check size={18} aria-hidden strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-paper sm:text-xl">{t.diffTitle}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-paper-mute">{t.diff}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
