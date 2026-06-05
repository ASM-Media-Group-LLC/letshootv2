'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import EditorChrome, { EditorBg } from './EditorChrome';

// ── Scroll-driven AI editor section ─────────────────────────────────────────
// h-[520vh] sticky — shows the 5-stage photo transformation with the editor UI.
// Scroll bands:
//   [0.05, 0.20] → stage 0→1 (makeup)
//   [0.22, 0.38] → stage 1→2 (outfit)
//   [0.40, 0.55] → stage 2→3 (NYC)
//   [0.57, 0.72] → stage 3→4 (beach)
//   [0.80, 0.95] → CTA appears

const SRCS = [
  '/hero-stage-1.jpg', '/hero-stage-2.jpg',
  '/hero-stage-3.jpg', '/hero-stage-4.jpg', '/hero-stage-5.jpg',
];

const WIPES = [[0.05,0.20],[0.22,0.38],[0.40,0.55],[0.57,0.72]];

const LABELS = {
  es: [
    { sub: 'Analizando rasgos...',      n: '01' },
    { sub: 'Aplicando maquillaje IA...', n: '02' },
    { sub: 'Rediseñando vestuario...',   n: '03' },
    { sub: 'Generando locación IA...',   n: '04' },
    { sub: '¡Sesión lista!',             n: '05' },
  ],
  en: [
    { sub: 'Analyzing features...',     n: '01' },
    { sub: 'Applying AI makeup...',     n: '02' },
    { sub: 'Redesigning outfit...',     n: '03' },
    { sub: 'Generating AI location...', n: '04' },
    { sub: 'Session ready!',            n: '05' },
  ],
  pt: [
    { sub: 'A analisar traços...',               n: '01' },
    { sub: 'A aplicar maquilhagem IA...',        n: '02' },
    { sub: 'A redesenhar vestuário...',          n: '03' },
    { sub: 'A gerar localização IA...',          n: '04' },
    { sub: 'Sessão pronta!',                     n: '05' },
  ],
  fr: [
    { sub: 'Analyse des traits...',              n: '01' },
    { sub: 'Application du maquillage IA...',   n: '02' },
    { sub: 'Redesign de la tenue...',           n: '03' },
    { sub: 'Génération de lieu IA...',          n: '04' },
    { sub: 'Séance prête !',                    n: '05' },
  ],
  de: [
    { sub: 'Gesichtszüge analysieren...',       n: '01' },
    { sub: 'KI-Make-up anwenden...',            n: '02' },
    { sub: 'Outfit neu gestalten...',           n: '03' },
    { sub: 'KI-Location generieren...',         n: '04' },
    { sub: 'Session bereit!',                   n: '05' },
  ],
  it: [
    { sub: 'Analisi dei tratti...',             n: '01' },
    { sub: 'Applicazione trucco IA...',         n: '02' },
    { sub: 'Riprogettazione outfit...',         n: '03' },
    { sub: 'Generazione location IA...',        n: '04' },
    { sub: 'Sessione pronta!',                  n: '05' },
  ],
  zh: [
    { sub: '分析面部特征...',   n: '01' },
    { sub: '应用 AI 妆容...', n: '02' },
    { sub: '重新设计服装...',  n: '03' },
    { sub: '生成 AI 地点...', n: '04' },
    { sub: '会话已就绪！',    n: '05' },
  ],
};

const ease = [0.22, 1, 0.36, 1];

export default function EditorSection() {
  const { t, lang } = useLang();
  const labels = LABELS[lang] || LABELS.es;

  const ref = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const [activeStage, setActive] = useState(0);
  const [scanProgress, setSP]   = useState(0);
  const [reduced, setReduced]   = useState(false);

  useEffect(() => {
    if (window.matchMedia) setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    return p.on('change', v => {
      if      (v >= WIPES[3][0]) setActive(4);
      else if (v >= WIPES[2][0]) setActive(3);
      else if (v >= WIPES[1][0]) setActive(2);
      else if (v >= WIPES[0][0]) setActive(1);
      else                       setActive(0);
    });
  }, [p]);

  const spMV = useTransform(p, [WIPES[0][0], WIPES[3][1]], [0, 1]);
  useEffect(() => spMV.on('change', v => setSP(Math.max(0, Math.min(1, v)))), [spMV]);

  // Wipe clips (top → bottom scanline)
  const w0=useTransform(p,WIPES[0],[0,1]); const w1=useTransform(p,WIPES[1],[0,1]);
  const w2=useTransform(p,WIPES[2],[0,1]); const w3=useTransform(p,WIPES[3],[0,1]);
  const b0=useTransform(w0,[0,1],[100,0]); const b1=useTransform(w1,[0,1],[100,0]);
  const b2=useTransform(w2,[0,1],[100,0]); const b3=useTransform(w3,[0,1],[100,0]);
  const cp1=useMotionTemplate`inset(0 0 ${b0}% 0)`;
  const cp2=useMotionTemplate`inset(0 0 ${b1}% 0)`;
  const cp3=useMotionTemplate`inset(0 0 ${b2}% 0)`;
  const cp4=useMotionTemplate`inset(0 0 ${b3}% 0)`;
  const clips=[null,cp1,cp2,cp3,cp4];

  // Scanline Y + opacity (all hooks at top level — no hooks inside loops)
  const sly0=useMotionTemplate`${useTransform(w0,[0,1],[0,100])}%`;
  const sly1=useMotionTemplate`${useTransform(w1,[0,1],[0,100])}%`;
  const sly2=useMotionTemplate`${useTransform(w2,[0,1],[0,100])}%`;
  const sly3=useMotionTemplate`${useTransform(w3,[0,1],[0,100])}%`;
  const slo0=useTransform(w0,[0,0.04,0.96,1],[0,1,1,0]);
  const slo1=useTransform(w1,[0,0.04,0.96,1],[0,1,1,0]);
  const slo2=useTransform(w2,[0,0.04,0.96,1],[0,1,1,0]);
  const slo3=useTransform(w3,[0,0.04,0.96,1],[0,1,1,0]);
  const sl=[{y:sly0,o:slo0},{y:sly1,o:slo1},{y:sly2,o:slo2},{y:sly3,o:slo3}];

  // CTA
  const ctaO = useTransform(p, [0.78, 0.88], [0, 1]);
  const ctaY = useTransform(p, [0.78, 0.88], [20, 0]);

  return (
    <section ref={ref} className="relative h-[520vh] bg-ink">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">

        {/* Editor workspace background */}
        <EditorBg />

        {/* Editor chrome (toolbar, panels) */}
        <EditorChrome stage={activeStage} scanProgress={scanProgress} />

        {/* Portrait centered */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative">
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                width: 'min(88vw, calc(72vh * 4 / 5))',
                aspectRatio: '4 / 5',
                boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--overlay)/0.12)',
              }}
            >
              {SRCS.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt={i===0 ? 'Foto original antes de LetShoot' : ''}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition:'50% 18%', ...(clips[i] ? { clipPath: clips[i] } : {}) }}
                  draggable={false}
                />
              ))}

              {/* Scanlines */}
              {sl.map((s, i) => (
                <motion.div key={i} className="pointer-events-none absolute inset-x-0 z-20"
                  style={{ top:s.y, opacity:s.o, height:'3px', marginTop:'-1.5px',
                    background:'linear-gradient(90deg,transparent 0%,rgba(0,177,246,0.5) 10%,rgba(127,224,255,1) 50%,rgba(0,177,246,0.5) 90%,transparent 100%)',
                    boxShadow:'0 0 18px 6px rgba(0,177,246,0.45)' }}
                />
              ))}
            </div>

            {/* Bubble annotations — desktop only */}
            <AnimatePresence mode="wait">
              <motion.div key={activeStage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.35,ease}}
                className="pointer-events-none absolute inset-0 hidden lg:block">
                {/* left */}
                <div className="absolute right-[calc(100%+1.25rem)] top-1/4 flex flex-col items-end gap-1.5">
                  <span className="glass-ios whitespace-nowrap rounded-2xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-paper" style={{borderBottomRightRadius:'0.3rem'}}>
                    {labels[activeStage]?.sub}
                  </span>
                  <div className="flex items-center gap-1"><div className="h-px w-8 bg-gradient-to-r from-brand/60 to-transparent"/><div className="h-1.5 w-1.5 rounded-full bg-brand/60"/></div>
                </div>
                {/* right */}
                <div className="absolute left-[calc(100%+1.25rem)] top-[45%] flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-brand/60"/><div className="h-px w-8 bg-gradient-to-r from-transparent to-brand/60"/></div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper-mute">{labels[activeStage]?.n} / 05</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* CTA at the end */}
        <motion.div style={{ opacity: ctaO, y: ctaY }}
          className="absolute bottom-10 inset-x-0 z-40 flex justify-center px-5">
          <a href="#pricing"
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]">
            {t.hero.ctaPrimary}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
        </motion.div>

      </div>
    </section>
  );
}
