'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import EditorChrome, { EditorBg } from './EditorChrome';

// ── NEW FLOW (620vh) ──────────────────────────────────────────────────────────
// Phase 1 [0–0.45]:  Before/After comparisons — real content vs AI content.
//   Pair 1: ba-before-1 → wipe → ba-after-1  (casual vs editorial)
//   Pair 2: ba-before-2 → wipe → ba-after-2  (casual vs park editorial)
// Phase 2 [0.43–0.85]: AI Editor — 5-stage photo transformation.
// Phase 3 [0.83–1.0]:  Finale CTA.
// ─────────────────────────────────────────────────────────────────────────────

// Before/After image pairs
const BA = [
  { before: '/ba-before-1.jpg', after: '/ba-after-1.jpg' },
  { before: '/ba-before-2.jpg', after: '/ba-after-2.jpg' },
];

// Editor stage images
const EDITOR_SRCS = [
  '/hero-stage-1.jpg', '/hero-stage-2.jpg',
  '/hero-stage-3.jpg', '/hero-stage-4.jpg', '/hero-stage-5.jpg',
];

const EDITOR_WIPES = [[0.47,0.56],[0.56,0.65],[0.65,0.73],[0.73,0.82]];

// ── Label copy per lang ───────────────────────────────────────────────────────
const LABELS = {
  es: { before: 'Contenido real', after: 'Contenido IA', scroll: 'Desliza', vsTitle: 'vs' },
  en: { before: 'Real content',   after: 'AI content',   scroll: 'Scroll',  vsTitle: 'vs' },
  pt: { before: 'Conteúdo real',  after: 'Conteúdo IA',  scroll: 'Desliza', vsTitle: 'vs' },
  fr: { before: 'Contenu réel',   after: 'Contenu IA',   scroll: 'Défile',  vsTitle: 'vs' },
  de: { before: 'Echter Content', after: 'KI-Content',   scroll: 'Scrollen',vsTitle: 'vs' },
  it: { before: 'Contenuto reale',after: 'Contenuto IA', scroll: 'Scorri',  vsTitle: 'vs' },
  zh: { before: '真实内容',        after: 'AI 内容',      scroll: '向下滑动',vsTitle: 'vs' },
};

// ── Editor label copy ─────────────────────────────────────────────────────────
const EDITOR_LABELS = {
  es: [
    { sub: 'Analizando rasgos...', n: '01' },
    { sub: 'Aplicando maquillaje IA...', n: '02' },
    { sub: 'Rediseñando vestuario...', n: '03' },
    { sub: 'Generando locación IA...', n: '04' },
    { sub: '¡Sesión lista!', n: '05' },
  ],
  en: [
    { sub: 'Analyzing features...', n: '01' },
    { sub: 'Applying AI makeup...', n: '02' },
    { sub: 'Redesigning outfit...', n: '03' },
    { sub: 'Generating AI location...', n: '04' },
    { sub: 'Session ready!', n: '05' },
  ],
  pt: [
    { sub: 'A analisar traços...', n: '01' },
    { sub: 'A aplicar maquilhagem IA...', n: '02' },
    { sub: 'A redesenhar vestuário...', n: '03' },
    { sub: 'A gerar localização IA...', n: '04' },
    { sub: 'Sessão pronta!', n: '05' },
  ],
  fr: [
    { sub: 'Analyse des traits...', n: '01' },
    { sub: 'Application du maquillage IA...', n: '02' },
    { sub: 'Redesign de la tenue...', n: '03' },
    { sub: 'Génération de lieu IA...', n: '04' },
    { sub: 'Séance prête !', n: '05' },
  ],
  de: [
    { sub: 'Gesichtszüge analysieren...', n: '01' },
    { sub: 'KI-Make-up anwenden...', n: '02' },
    { sub: 'Outfit neu gestalten...', n: '03' },
    { sub: 'KI-Location generieren...', n: '04' },
    { sub: 'Session bereit!', n: '05' },
  ],
  it: [
    { sub: 'Analisi dei tratti...', n: '01' },
    { sub: 'Applicazione trucco IA...', n: '02' },
    { sub: 'Riprogettazione outfit...', n: '03' },
    { sub: 'Generazione location IA...', n: '04' },
    { sub: 'Sessione pronta!', n: '05' },
  ],
  zh: [
    { sub: '分析面部特征...', n: '01' },
    { sub: '应用 AI 妆容...', n: '02' },
    { sub: '重新设计服装...', n: '03' },
    { sub: '生成 AI 地点...', n: '04' },
    { sub: '会话已就绪！', n: '05' },
  ],
};

const FINALE = {
  es: { pill: 'Tu sesión está lista',     pre: 'Ahora es ',   hi: 'tu turno.',       body: 'Crea fotos y videos de nivel editorial desde cualquier lugar. Sin estudio. Sin esperas.' },
  en: { pill: 'Your session is ready',    pre: "Now it's ",   hi: 'your turn.',      body: 'Create editorial-level photos and videos from anywhere. No studio. No waiting.' },
  pt: { pill: 'A tua sessão está pronta', pre: 'Agora é a ',  hi: 'tua vez.',        body: 'Cria fotos e vídeos de nível editorial de qualquer lugar. Sem estúdio. Sem esperas.' },
  fr: { pill: 'Ta séance est prête',      pre: 'À toi de ',   hi: 'jouer.',          body: "Crée des photos et vidéos de niveau éditorial depuis n'importe où. Sans studio." },
  de: { pill: 'Deine Session ist bereit', pre: 'Jetzt bist ', hi: 'du dran.',        body: 'Erstelle Editorial-Fotos und -Videos von überall. Kein Studio. Kein Warten.' },
  it: { pill: 'La tua sessione è pronta', pre: 'Ora tocca a ',hi: 'te.',             body: 'Crea foto e video di livello editoriale da ovunque. Nessuno studio.' },
  zh: { pill: '你的会话已就绪',             pre: '现在轮到 ',    hi: '你了。',           body: '从任何地方创建编辑级别的照片和视频。无需摄影棚。无需等待。' },
};

const ease = [0.22, 1, 0.36, 1];

export default function CinematicHero() {
  const { t, lang } = useLang();
  const lbl    = LABELS[lang]        || LABELS.es;
  const edLbls = EDITOR_LABELS[lang] || EDITOR_LABELS.es;
  const finale = FINALE[lang]        || FINALE.es;

  const ref = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const [reduced, setReduced]     = useState(false);
  const [activeStage, setActive]  = useState(0);
  const [scanProgress, setSP]     = useState(0);

  useEffect(() => {
    if (window.matchMedia) setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    return p.on('change', v => {
      if      (v >= EDITOR_WIPES[3][0]) setActive(4);
      else if (v >= EDITOR_WIPES[2][0]) setActive(3);
      else if (v >= EDITOR_WIPES[1][0]) setActive(2);
      else if (v >= EDITOR_WIPES[0][0]) setActive(1);
      else                              setActive(0);
    });
  }, [p]);

  const spMV = useTransform(p, [EDITOR_WIPES[0][0], EDITOR_WIPES[3][1]], [0, 1]);
  useEffect(() => spMV.on('change', v => setSP(Math.max(0, Math.min(1, v)))), [spMV]);

  // ── PHASE 1: Before/After wipes ──────────────────────────────────────────
  // Pair 1: ba-before-1 is base. ba-after-1 wipes in from left [0.06, 0.20]
  const ba1WipeP = useTransform(p, [0.06, 0.20], [0, 1]);
  const ba1ClipR = useTransform(ba1WipeP, [0,1], [100, 0]);
  const ba1Clip  = useMotionTemplate`inset(0 ${ba1ClipR}% 0 0)`;
  const ba1ScanY = useMotionTemplate`${useTransform(ba1WipeP,[0,1],[0,100])}%`;
  const ba1ScanO = useTransform(ba1WipeP, [0,0.04,0.96,1],[0,1,1,0]);

  // Pair 2: ba-before-2 crossfades in [0.23, 0.28], ba-after-2 wipes in [0.30, 0.43]
  const pair2O   = useTransform(p, [0.23, 0.28], [0, 1]);
  const ba2WipeP = useTransform(p, [0.30, 0.43], [0, 1]);
  const ba2ClipR = useTransform(ba2WipeP, [0,1], [100, 0]);
  const ba2Clip  = useMotionTemplate`inset(0 ${ba2ClipR}% 0 0)`;
  const ba2ScanY = useMotionTemplate`${useTransform(ba2WipeP,[0,1],[0,100])}%`;
  const ba2ScanO = useTransform(ba2WipeP, [0,0.04,0.96,1],[0,1,1,0]);

  // Phase 1 container: visible [0, 0.45]
  const baO = useTransform(p, [0, 0.02, 0.42, 0.46], [0, 1, 1, 0]);
  const baY = useTransform(p, [0.42, 0.46], [0, -40]);

  // Current pair indicator
  const pair1 = useTransform(p, v => v < 0.26);

  // ── PHASE 2: Editor ──────────────────────────────────────────────────────
  const portraitO = useTransform(p, [0.43, 0.49, 0.84, 0.91], [0, 1, 1, 0]);
  const portraitY = useTransform(p, [0.43, 0.49], [60, 0]);
  const editorO   = useTransform(p, [0.47, 0.53, 0.84, 0.90], [0, 1, 1, 0]);

  const w0 = useTransform(p, EDITOR_WIPES[0], [0,1]);
  const w1 = useTransform(p, EDITOR_WIPES[1], [0,1]);
  const w2 = useTransform(p, EDITOR_WIPES[2], [0,1]);
  const w3 = useTransform(p, EDITOR_WIPES[3], [0,1]);
  const b0=useTransform(w0,[0,1],[100,0]); const b1=useTransform(w1,[0,1],[100,0]);
  const b2=useTransform(w2,[0,1],[100,0]); const b3=useTransform(w3,[0,1],[100,0]);
  const cp1=useMotionTemplate`inset(0 0 ${b0}% 0)`;
  const cp2=useMotionTemplate`inset(0 0 ${b1}% 0)`;
  const cp3=useMotionTemplate`inset(0 0 ${b2}% 0)`;
  const cp4=useMotionTemplate`inset(0 0 ${b3}% 0)`;
  const editorClips=[null,cp1,cp2,cp3,cp4];

  const sly0=useMotionTemplate`${useTransform(w0,[0,1],[0,100])}%`;
  const sly1=useMotionTemplate`${useTransform(w1,[0,1],[0,100])}%`;
  const sly2=useMotionTemplate`${useTransform(w2,[0,1],[0,100])}%`;
  const sly3=useMotionTemplate`${useTransform(w3,[0,1],[0,100])}%`;
  const slo0=useTransform(w0,[0,0.04,0.96,1],[0,1,1,0]);
  const slo1=useTransform(w1,[0,0.04,0.96,1],[0,1,1,0]);
  const slo2=useTransform(w2,[0,0.04,0.96,1],[0,1,1,0]);
  const slo3=useTransform(w3,[0,0.04,0.96,1],[0,1,1,0]);
  const edScanlines=[{y:sly0,o:slo0},{y:sly1,o:slo1},{y:sly2,o:slo2},{y:sly3,o:slo3}];

  const edLabelO = useTransform(p, [0.47, 0.54], [0, 1]);
  const bubbleO  = useTransform(p, [0.51, 0.57, 0.84, 0.88], [0, 1, 1, 0]);

  // ── PHASE 3: Finale ──────────────────────────────────────────────────────
  const finaleO = useTransform(p, [0.86, 0.93], [0, 1]);
  const finaleY = useTransform(p, [0.86, 0.93], [22, 0]);

  // Progress bar
  const barSc = p;
  const hintO = useTransform(p, [0, 0.05], [1, 0]);

  return (
    <section ref={ref} id="hero" className="relative h-[620vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* Gradient backdrop */}
        {!reduced && <AnimatedGradientBg topOffset={20} />}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden />

        {/* Progress bar */}
        <motion.div className="absolute left-0 top-0 z-50 h-[2px] w-full origin-left bg-brand" style={{ scaleX: barSc }} aria-hidden />

        {/* ════ PHASE 1 — BEFORE/AFTER COMPARISONS ════ */}
        <motion.div
          style={{ opacity: baO, y: baY }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center"
        >
          {/* Labels */}
          <div className="mb-4 flex items-center gap-4 z-10">
            <span className="glass-ios rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-mute">
              {lbl.before}
            </span>
            <span className="font-mono text-[11px] text-paper-dim">{lbl.vsTitle}</span>
            <span className="rounded-full bg-brand px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-on-accent">
              {lbl.after}
            </span>
          </div>

          {/* Portrait frame — same dimensions as editor phase */}
          <div
            className="relative overflow-hidden rounded-3xl shadow-2xl shadow-black/60"
            style={{
              width: 'min(88vw, calc(72vh * 4 / 5))',
              aspectRatio: '4 / 5',
              border: '1px solid rgba(var(--overlay) / 0.12)',
            }}
          >
            {/* Pair 1: before */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BA[0].before} alt="Contenido real" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 18%' }} draggable={false} />

            {/* Pair 1: after (wipe) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={BA[0].after} alt="Contenido IA" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 18%', clipPath: ba1Clip }} draggable={false} />

            {/* Pair 1 scanline */}
            <motion.div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ba1ScanY, opacity: ba1ScanO, height:'3px', marginTop:'-1.5px', background:'linear-gradient(90deg,transparent 0%,rgba(0,177,246,0.5) 10%,rgba(127,224,255,1) 50%,rgba(0,177,246,0.5) 90%,transparent 100%)', boxShadow:'0 0 18px 6px rgba(0,177,246,0.45)' }} />

            {/* Pair 2: before (crossfades in) */}
            <motion.img
              // eslint-disable-next-line @next/next/no-img-element
              src={BA[1].before} alt="" className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: '50% 18%', opacity: pair2O }}
              draggable={false}
            />

            {/* Pair 2: after (wipe) */}
            <motion.img
              // eslint-disable-next-line @next/next/no-img-element
              src={BA[1].after} alt="" className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: '50% 42%', clipPath: ba2Clip, opacity: pair2O }}
              draggable={false}
            />

            {/* Pair 2 scanline */}
            <motion.div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ba2ScanY, opacity: ba2ScanO, height:'3px', marginTop:'-1.5px', background:'linear-gradient(90deg,transparent 0%,rgba(0,177,246,0.5) 10%,rgba(127,224,255,1) 50%,rgba(0,177,246,0.5) 90%,transparent 100%)', boxShadow:'0 0 18px 6px rgba(0,177,246,0.45)' }} />

            {/* Bottom scrim */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          {/* Scroll hint */}
          <motion.div style={{ opacity: hintO }} className="mt-5 flex flex-col items-center gap-1 text-paper-mute">
            <span className="font-mono text-[10px] uppercase tracking-widest">{lbl.scroll}</span>
            <div className="h-6 w-px rounded-full bg-gradient-to-b from-paper-dim/60 to-transparent" />
          </motion.div>
        </motion.div>

        {/* ════ PHASE 2 — EDITOR BACKGROUND ════ */}
        <motion.div style={{ opacity: editorO }} className="absolute inset-0 z-[5] pointer-events-none">
          <EditorBg />
        </motion.div>

        {/* ════ PHASE 2 — EDITOR CHROME ════ */}
        <motion.div style={{ opacity: editorO }} className="absolute inset-0 z-20 pointer-events-none">
          <EditorChrome stage={activeStage} scanProgress={scanProgress} />
        </motion.div>

        {/* ════ PHASE 2 — EDITOR PORTRAIT ════ */}
        <motion.div
          style={{ opacity: portraitO, y: portraitY }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="relative">
            {/* Portrait */}
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                width: 'min(88vw, calc(72vh * 4 / 5))',
                aspectRatio: '4 / 5',
                boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--overlay) / 0.12)',
              }}
            >
              {EDITOR_SRCS.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt={i===0 ? 'Rostro real, antes de LetShoot' : ''}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition:'50% 18%', ...(editorClips[i] ? { clipPath: editorClips[i] } : {}) }}
                  draggable={false}
                />
              ))}

              {/* Editor scanlines */}
              {edScanlines.map((sl,i) => (
                <motion.div key={i} className="pointer-events-none absolute inset-x-0 z-20" style={{ top:sl.y, opacity:sl.o, height:'3px', marginTop:'-1.5px', background:'linear-gradient(90deg,transparent 0%,rgba(0,177,246,0.5) 10%,rgba(127,224,255,1) 50%,rgba(0,177,246,0.5) 90%,transparent 100%)', boxShadow:'0 0 18px 6px rgba(0,177,246,0.45)' }} />
              ))}
            </div>

            {/* Bubbles (md+) */}
            <motion.div style={{ opacity: bubbleO }} className="pointer-events-none absolute inset-0 hidden md:block">
              <AnimatePresence mode="wait">
                <motion.div key={`b-${activeStage}`} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration: 0.4, ease }} className="absolute inset-0">
                  {/* left bubble */}
                  <div className="absolute right-[calc(100%+1rem)] top-[25%] hidden flex-col items-end gap-1 lg:flex">
                    <span className="glass-ios rounded-2xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-paper whitespace-nowrap" style={{ borderBottomRightRadius:'0.3rem' }}>
                      {edLbls[activeStage]?.sub}
                    </span>
                    <div className="flex items-center gap-1"><div className="h-px w-8 bg-gradient-to-r from-brand/60 to-transparent"/><div className="h-1.5 w-1.5 rounded-full bg-brand/60"/></div>
                  </div>
                  {/* right counter */}
                  <div className="absolute left-[calc(100%+1rem)] top-[45%] hidden lg:flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-brand/60"/><div className="h-px w-8 bg-gradient-to-r from-transparent to-brand/60"/></div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-paper-mute">{edLbls[activeStage]?.n} / 05</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* ════ PHASE 3 — FINALE ════ */}
        <motion.div
          style={{ opacity: finaleO, y: finaleY }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 pointer-events-none"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            {finale.pill}
          </span>
          <h2 className="headline text-center text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] text-paper">
            {finale.pre}<span className="text-rainbow inline-block" style={{ paddingBlock:'0.1em' }}>{finale.hi}</span>
          </h2>
          <p className="mt-5 max-w-xl text-center text-base leading-relaxed text-paper-mute sm:text-lg">{finale.body}</p>
          <div className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#pricing" className="group inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]">
              {t.hero.ctaPrimary}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a href="#results" className="glass-ios inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium text-paper transition-colors hover:text-brand">
              {t.hero.ctaSecondary}
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
