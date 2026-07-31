'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, RotateCcw } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// The blind test: one card is presented as the real model, the other as her AI
// clone. The visitor taps the one they think is real, then the labels drop.
// kind: 'real' → the model's own casual selfie · 'ai' → the clone-made studio shot.
const PAIR = [
  { src: '/lib/julia-frontal-1.jpg', pos: '50% 30%', kind: 'ai' },
  { src: '/lib/tudecides-mandas.jpg', pos: '50% 32%', kind: 'real' },
];

const T = {
  es: {
    label: 'PRUEBA CIEGA', titleA: '¿Cuál es la', highlight: 'foto real?',
    sub: 'Una es la modelo real. La otra la hizo su clon IA. Tocá la que creas que es real.',
    tapA: 'Esta es la real', right: '¡Acertaste!', wrong: 'Era la otra.',
    revealSub: 'La foto de estudio la hizo su clon IA — sin cámara, sin sesión, sin fotógrafo. Si tuviste que pensarlo, tus fans ni lo van a notar.',
    badgeReal: 'Modelo real', badgeAI: 'Clon IA', again: 'Jugar otra vez', cta: 'Quiero mi clon',
  },
  en: {
    label: 'BLIND TEST', titleA: 'Which one is the', highlight: 'real photo?',
    sub: 'One is the real model. The other was made by her AI clone. Tap the one you think is real.',
    tapA: 'This one is real', right: 'You got it!', wrong: 'It was the other one.',
    revealSub: 'The studio shot was made by her AI clone — no camera, no shoot, no photographer. If you had to think about it, your fans will never notice.',
    badgeReal: 'Real model', badgeAI: 'AI clone', again: 'Play again', cta: 'I want my clone',
  },
  pt: {
    label: 'TESTE CEGO', titleA: 'Qual é a', highlight: 'foto real?',
    sub: 'Uma é a modelo real. A outra foi feita pelo clone de IA dela. Toca na que você acha que é real.',
    tapA: 'Esta é a real', right: 'Acertou!', wrong: 'Era a outra.',
    revealSub: 'A foto de estúdio foi feita pelo clone de IA dela — sem câmera, sem sessão, sem fotógrafo. Se você teve que pensar, seus fãs nem vão notar.',
    badgeReal: 'Modelo real', badgeAI: 'Clone IA', again: 'Jogar de novo', cta: 'Quero meu clone',
  },
  fr: {
    label: 'TEST À L’AVEUGLE', titleA: 'Laquelle est la', highlight: 'vraie photo ?',
    sub: 'L’une est la vraie modèle. L’autre a été créée par son clone IA. Touche celle qui te semble réelle.',
    tapA: 'C’est la vraie', right: 'Bien vu !', wrong: 'C’était l’autre.',
    revealSub: 'La photo studio a été créée par son clone IA — sans appareil, sans shooting, sans photographe. Si tu as dû hésiter, tes fans ne verront jamais la différence.',
    badgeReal: 'Vraie modèle', badgeAI: 'Clone IA', again: 'Rejouer', cta: 'Je veux mon clone',
  },
  de: {
    label: 'BLINDTEST', titleA: 'Welches ist das', highlight: 'echte Foto?',
    sub: 'Eins zeigt das echte Model. Das andere hat ihr KI-Klon erstellt. Tippe auf das, das du für echt hältst.',
    tapA: 'Das ist echt', right: 'Richtig!', wrong: 'Es war das andere.',
    revealSub: 'Das Studiofoto hat ihr KI-Klon erstellt — ohne Kamera, ohne Shooting, ohne Fotograf. Wenn du überlegen musstest, merken deine Fans es nie.',
    badgeReal: 'Echtes Model', badgeAI: 'KI-Klon', again: 'Nochmal spielen', cta: 'Ich will meinen Klon',
  },
  it: {
    label: 'TEST ALLA CIECA', titleA: 'Qual è la', highlight: 'foto vera?',
    sub: 'Una è la modella vera. L’altra l’ha creata il suo clone IA. Tocca quella che pensi sia vera.',
    tapA: 'Questa è vera', right: 'Indovinato!', wrong: 'Era l’altra.',
    revealSub: 'La foto in studio l’ha creata il suo clone IA — senza fotocamera, senza servizio, senza fotografo. Se ci hai dovuto pensare, i tuoi fan non se ne accorgeranno mai.',
    badgeReal: 'Modella vera', badgeAI: 'Clone IA', again: 'Gioca ancora', cta: 'Voglio il mio clone',
  },
  zh: {
    label: '盲测', titleA: '哪张是', highlight: '真实照片？',
    sub: '一张是真实模特，另一张由她的 AI 克隆生成。点击你认为真实的那张。',
    tapA: '这张是真的', right: '答对了！', wrong: '是另一张。',
    revealSub: '棚拍那张由她的 AI 克隆生成——不用相机、不用拍摄、不用摄影师。连你都要想一下，你的粉丝根本不会察觉。',
    badgeReal: '真实模特', badgeAI: 'AI 克隆', again: '再玩一次', cta: '我要我的克隆',
  },
};

export default function RealVsAI() {
  const { lang } = useLang();
  const t = T[lang] || T.en;
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState(null);

  const pick = (i) => {
    if (revealed) return;
    setPicked(i);
    setRevealed(true);
  };

  const guessedRight = picked !== null && PAIR[picked].kind === 'real';

  return (
    <section id="real-vs-ia" className="relative bg-ink py-24 sm:py-28">
      <div className="blob right-1/4 top-24 h-[320px] w-[320px] bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        {/* The two candidates */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:gap-5">
          {PAIR.map((p, i) => (
            <motion.button
              key={p.src}
              type="button"
              onClick={() => pick(i)}
              disabled={revealed}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease, delay: i * 0.12 }}
              whileHover={revealed ? {} : { y: -6, transition: { duration: 0.25, ease } }}
              className={`group relative aspect-[3/4] overflow-hidden rounded-3xl border text-left transition-colors ${
                revealed
                  ? p.kind === 'real'
                    ? 'border-brand/60 ring-2 ring-brand/40'
                    : 'border-line'
                  : 'cursor-pointer border-line hover:border-brand/50'
              }`}
              aria-label={revealed ? (p.kind === 'real' ? t.badgeReal : t.badgeAI) : t.tapA}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt=""
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                style={{ objectPosition: p.pos }}
              />
              {/* Idle hint */}
              {!revealed && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 pt-10 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
                    {t.tapA}
                  </span>
                </div>
              )}
              {/* Reveal badges: real model vs AI clone */}
              <AnimatePresence>
                {revealed && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 3 }}
                    transition={{ duration: 0.45, ease, delay: 0.15 + i * 0.12 }}
                    className={`glass-ios absolute right-3 top-3 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-display text-xs font-semibold uppercase shadow-lg sm:text-sm ${
                      p.kind === 'real' ? 'text-paper' : 'text-brand'
                    }`}
                  >
                    {p.kind === 'real'
                      ? <Camera size={14} aria-hidden />
                      : <Sparkles size={14} aria-hidden />}
                    {p.kind === 'real' ? t.badgeReal : t.badgeAI}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Verdict */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease }}
              >
                <p className="font-display text-2xl font-bold text-paper sm:text-3xl">
                  {guessedRight ? t.right : t.wrong}
                </p>
                <p className="mx-auto mt-2 max-w-xl text-balance text-base leading-relaxed text-paper-mute sm:text-lg">
                  {t.revealSub}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="#pricing"
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.04]"
                  >
                    {t.cta}
                  </a>
                  <button
                    type="button"
                    onClick={() => { setRevealed(false); setPicked(null); }}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-paper-mute transition-colors hover:border-brand/50 hover:text-brand"
                  >
                    <RotateCcw size={15} aria-hidden /> {t.again}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs uppercase tracking-[0.18em] text-paper-dim"
              >
                &nbsp;
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
