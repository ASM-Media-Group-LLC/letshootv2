'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import EditorChrome, { EditorBg } from './EditorChrome';

// ── Flow (900vh) ──────────────────────────────────────────────────────────────
// Phase 1 [0–0.14]   Intro 1: BIG headline reveals letter-by-letter ("Conoce a tu fotógrafo IA.")
// Phase 2 [0.14–0.30] Intro 2: "Sin estudio. Sin esperas." (stagger), portrait emerges below
// Phase 3 [0.28–0.85] Editor: workspace + portrait + comment bubbles around portrait
// Phase 4 [0.85–1.00] Outro:   portrait + editor fade away, transition to content

const SRCS = [
  '/hero-stage-1.jpg', '/hero-stage-2.jpg',
  '/hero-stage-3.jpg', '/hero-stage-4.jpg', '/hero-stage-5.jpg',
];

// Screen 1 — frase grande en 2 líneas (no se rompe en medio).
// La segunda línea lleva el gradiente azul→rosa.
const S1 = {
  es: ['Conoce a tu',     { text: 'fotógrafo IA.',           gradient: true }],
  en: ['Meet your',       { text: 'AI photographer.',        gradient: true }],
  pt: ['Conhece o teu',   { text: 'fotógrafo IA.',           gradient: true }],
  fr: ['Découvre ton',    { text: 'photographe IA.',         gradient: true }],
  de: ['Lerne deinen',    { text: 'KI-Fotografen kennen.',   gradient: true }],
  it: ['Incontra il tuo', { text: 'fotografo IA.',           gradient: true }],
  zh: ['认识你的',         { text: 'AI 摄影师。',              gradient: true }],
};

// Screen 2 — dos líneas dramáticas (entran en stagger por scroll)
const S2 = {
  es: { l1: 'Sin estudio.', l2: 'Sin esperas.' },
  en: { l1: 'No studio.',   l2: 'No waiting.' },
  pt: { l1: 'Sem estúdio.', l2: 'Sem esperas.' },
  fr: { l1: 'Sans studio.', l2: 'Sans attente.' },
  de: { l1: 'Kein Studio.', l2: 'Kein Warten.' },
  it: { l1: 'Nessuno studio.', l2: 'Nessuna attesa.' },
  zh: { l1: '无需摄影棚。', l2: '无需等待。' },
};

// Comment bubble texts per stage (positions are language-independent).
// We keep the side/y positions in a separate array and only translate the text.
const BUBBLE_LAYOUT = [
  [{ side: 'left',  y: 18 }, { side: 'right', y: 38 }, { side: 'left',  y: 62 }],
  [{ side: 'left',  y: 20 }, { side: 'right', y: 42 }, { side: 'left',  y: 68 }],
  [{ side: 'right', y: 22 }, { side: 'left',  y: 46 }, { side: 'right', y: 70 }],
  [{ side: 'left',  y: 16 }, { side: 'right', y: 40 }, { side: 'left',  y: 64 }],
  [{ side: 'right', y: 18 }, { side: 'left',  y: 44 }, { side: 'right', y: 68 }],
];

const BUBBLE_TEXTS = {
  es: [
    ['Rostro real',   'Sin filtros',    'Piel natural'],
    ['Smokey eyes',   'Labios nude',    'Glam editorial'],
    ['Blazer crema',  'Premium style',  'Textura tejido'],
    ['New York',      'Golden hour',    'Skyline'],
    ['Maldivas',      'Playa privada',  'HD · Editorial'],
  ],
  en: [
    ['Real face',     'No filters',     'Natural skin'],
    ['Smokey eyes',   'Nude lips',      'Editorial glam'],
    ['Cream blazer',  'Premium style',  'Fabric texture'],
    ['New York',      'Golden hour',    'Skyline'],
    ['Maldives',      'Private beach',  'HD · Editorial'],
  ],
  pt: [
    ['Rosto real',    'Sem filtros',    'Pele natural'],
    ['Smokey eyes',   'Lábios nude',    'Glam editorial'],
    ['Blazer creme',  'Estilo premium', 'Textura do tecido'],
    ['Nova Iorque',   'Golden hour',    'Skyline'],
    ['Maldivas',      'Praia privada',  'HD · Editorial'],
  ],
  fr: [
    ['Visage réel',   'Sans filtres',   'Peau naturelle'],
    ['Smokey eyes',   'Lèvres nude',    'Glam éditorial'],
    ['Blazer crème',  'Style premium',  'Texture tissu'],
    ['New York',      'Golden hour',    'Skyline'],
    ['Maldives',      'Plage privée',   'HD · Éditorial'],
  ],
  de: [
    ['Echtes Gesicht','Ohne Filter',    'Natürliche Haut'],
    ['Smokey Eyes',   'Nude Lippen',    'Editorial-Glam'],
    ['Creme-Blazer',  'Premium-Style',  'Stoff-Textur'],
    ['New York',      'Golden Hour',    'Skyline'],
    ['Malediven',     'Privatstrand',   'HD · Editorial'],
  ],
  it: [
    ['Volto reale',   'Senza filtri',   'Pelle naturale'],
    ['Smokey eyes',   'Labbra nude',    'Glam editoriale'],
    ['Blazer crema',  'Stile premium',  'Texture tessuto'],
    ['New York',      'Golden hour',    'Skyline'],
    ['Maldive',       'Spiaggia privata','HD · Editorial'],
  ],
  zh: [
    ['真实面孔',      '无滤镜',         '自然肌肤'],
    ['烟熏妆',        '裸色唇',         '编辑级妆容'],
    ['奶油西装',      '高级风格',       '面料质感'],
    ['纽约',          '黄金时刻',       '天际线'],
    ['马尔代夫',      '私人海滩',       'HD · 编辑级'],
  ],
};

const getBubbles = (l) => {
  const texts = BUBBLE_TEXTS[l] || BUBBLE_TEXTS.es;
  return BUBBLE_LAYOUT.map((stage, i) =>
    stage.map((pos, j) => ({ ...pos, text: texts[i]?.[j] || '' }))
  );
};

// ── Finale phase copy (closing CTA at the end of the hero) ──
const FINALE = {
  es: { pill: 'Tu sesión está lista',  pre: 'Ahora es ',         hi: 'tu turno.',          body: 'Crea fotos y videos de nivel editorial desde cualquier lugar. Sin estudio. Sin esperas.' },
  en: { pill: 'Your session is ready', pre: "Now it's ",         hi: 'your turn.',         body: 'Create editorial-level photos and videos from anywhere. No studio. No waiting.' },
  pt: { pill: 'A tua sessão está pronta', pre: 'Agora é a ',     hi: 'tua vez.',           body: 'Cria fotos e vídeos de nível editorial de qualquer lugar. Sem estúdio. Sem esperas.' },
  fr: { pill: 'Ta séance est prête',   pre: 'À toi de ',         hi: 'jouer.',             body: "Crée des photos et vidéos de niveau éditorial depuis n'importe où. Sans studio. Sans attente." },
  de: { pill: 'Deine Session ist bereit', pre: 'Jetzt bist ',    hi: 'du dran.',           body: 'Erstelle Editorial-Fotos und -Videos von überall. Kein Studio. Kein Warten.' },
  it: { pill: 'La tua sessione è pronta', pre: 'Ora tocca a ',   hi: 'te.',                body: 'Crea foto e video di livello editoriale da ovunque. Nessuno studio. Nessuna attesa.' },
  zh: { pill: '你的会话已就绪',          pre: '现在轮到 ',         hi: '你了。',              body: '从任何地方创建编辑级别的照片和视频。无需摄影棚。无需等待。' },
};

const ease = [0.22, 1, 0.36, 1];
const WIPES = [[0.36,0.50],[0.50,0.62],[0.62,0.72],[0.72,0.83]];

// Reveal with mixed effects:
//  • String lines  → letter-by-letter blur reveal (works perfectly with solid text)
//  • { text, gradient: true } → wipe-mask reveal (LEFT→RIGHT) on the whole line.
//    This preserves the CSS gradient (background-clip: text would break with
//    per-letter inline-block spans because the gradient gets clipped per span).
function RevealText({ lines, className = '', delay = 0 }) {
  let charCount = 0;
  // Count chars in non-gradient lines (for delay sync)
  return (
    <h1 className={`headline ${className}`} aria-label={lines.map(l => typeof l === 'string' ? l : l.text).join(' ')}>
      {lines.map((line, li) => {
        const text = typeof line === 'string' ? line : line.text;
        const isGradient = typeof line === 'object' && line.gradient;

        if (isGradient) {
          // Wipe reveal — keeps the gradient intact.
          // NOTE: clip-path uses negative top/bottom so diacritics (´ ñ) aren't clipped.
          return (
            <motion.span
              key={li}
              initial={{ clipPath: 'inset(-20% 100% -20% 0)', opacity: 0, y: 18 }}
              animate={{ clipPath: 'inset(-20%   0% -20% 0)', opacity: 1, y: 0 }}
              transition={{
                clipPath: { duration: 1.2, ease: [0.7, 0, 0.2, 1], delay: delay + charCount * 0.03 + 0.15 },
                opacity:  { duration: 0.5, ease, delay: delay + charCount * 0.03 + 0.1 },
                y:        { duration: 0.8, ease, delay: delay + charCount * 0.03 + 0.1 },
              }}
              className="block text-rainbow"
              style={{ willChange: 'clip-path', paddingBlock: '0.1em' }}
            >
              {text}
            </motion.span>
          );
        }

        // Solid line — letter-by-letter blur reveal
        return (
          <span key={li} className="block">
            {text.split('').map((ch) => {
              const i = charCount++;
              return (
                <motion.span
                  key={`${li}-${i}`}
                  initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease, delay: delay + i * 0.03 }}
                  style={{ display: 'inline-block', whiteSpace: 'pre' }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

export default function CinematicHero() {
  const { t, lang } = useLang();
  const s1 = S1[lang] || S1.es;
  const s2 = S2[lang] || S2.es;
  const finale = FINALE[lang] || FINALE.es;
  const bubblesByStage = getBubbles(lang);

  const ref  = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const [reduced, setReduced]     = useState(false);
  const [activeStage, setActive]  = useState(0);
  const [vh, setVh]               = useState(800);

  useEffect(() => {
    if (window.matchMedia) setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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

  // ── Phase 1: Intro 1 — "Conoce a tu fotógrafo IA." ──
  // Fade out IN PLACE with a soft blur (no slide-up). Letter-by-letter intro
  // is preserved inside <RevealText/>.
  const s1O    = useTransform(p, [0.00, 0.04, 0.12, 0.16], [1, 1, 1, 0]);
  const s1Blur = useTransform(p, [0.12, 0.16], [0, 16]);
  const s1Scale = useTransform(p, [0.12, 0.16], [1, 0.96]);

  // ── Phase 2: Intro 2 — "Sin estudio. Sin esperas." ──
  // Enters with a FLASH: quick zoom-in (1.15→1) + fast opacity ramp.
  // Exits in place with fade+blur (same as Phase 1).
  const s2O    = useTransform(p, [0.16, 0.19, 0.29, 0.33], [0, 1, 1, 0]);
  const s2Scale = useTransform(p, [0.16, 0.20, 0.29, 0.33], [1.18, 1, 1, 0.96]);
  const s2Blur  = useTransform(p, [0.16, 0.18, 0.29, 0.33], [10, 0, 0, 16]);
  const l1Y = useTransform(p, [0.16, 0.22], [40, 0]);
  const l2Y = useTransform(p, [0.19, 0.25], [40, 0]);
  // "Sin esperas." gradient wipe — driven by scroll progress (no whileInView).
  const l2ClipR = useTransform(p, [0.19, 0.27], [100, 0]);
  const l2Clip  = useMotionTemplate`inset(-20% ${l2ClipR}% -20% 0)`;

  // ── Flash overlays — brief bright pulse at each phase transition ──
  // Two flashes: one when Phase 1 → Phase 2, another when Phase 2 → Editor.
  const flash1O = useTransform(p, [0.13, 0.155, 0.18], [0, 0.55, 0]);
  const flash2O = useTransform(p, [0.30, 0.325, 0.36], [0, 0.45, 0]);

  // ── Phase 3: Portrait + editor ──
  // Portrait slides UP from below as Phase 2 leaves.
  const portraitO = useTransform(p, [0.30, 0.36, 0.85, 0.92], [0, 1, 1, 0]);
  const portraitY = useTransform(p, [0.30, 0.36], [vh * 0.4, 0]);
  const portraitS = useTransform(p, [0.30, 0.40], [0.85, 1]);

  // Editor UI fades in shortly after the portrait
  const editorO = useTransform(p, [0.34, 0.42, 0.85, 0.91], [0, 1, 1, 0]);

  // ── Wipe clips ──
  const w0 = useTransform(p, WIPES[0], [0, 1]);
  const w1 = useTransform(p, WIPES[1], [0, 1]);
  const w2 = useTransform(p, WIPES[2], [0, 1]);
  const w3 = useTransform(p, WIPES[3], [0, 1]);
  const b0 = useTransform(w0, [0,1],[100,0]);
  const b1 = useTransform(w1, [0,1],[100,0]);
  const b2 = useTransform(w2, [0,1],[100,0]);
  const b3 = useTransform(w3, [0,1],[100,0]);
  const cp1 = useMotionTemplate`inset(0 0 ${b0}% 0)`;
  const cp2 = useMotionTemplate`inset(0 0 ${b1}% 0)`;
  const cp3 = useMotionTemplate`inset(0 0 ${b2}% 0)`;
  const cp4 = useMotionTemplate`inset(0 0 ${b3}% 0)`;
  const clips = [null, cp1, cp2, cp3, cp4];

  // ── Scanlines ──
  const sly0 = useMotionTemplate`${useTransform(w0,[0,1],[0,100])}%`;
  const sly1 = useMotionTemplate`${useTransform(w1,[0,1],[0,100])}%`;
  const sly2 = useMotionTemplate`${useTransform(w2,[0,1],[0,100])}%`;
  const sly3 = useMotionTemplate`${useTransform(w3,[0,1],[0,100])}%`;
  const slo0 = useTransform(w0,[0,0.03,0.97,1],[0,1,1,0]);
  const slo1 = useTransform(w1,[0,0.03,0.97,1],[0,1,1,0]);
  const slo2 = useTransform(w2,[0,0.03,0.97,1],[0,1,1,0]);
  const slo3 = useTransform(w3,[0,0.03,0.97,1],[0,1,1,0]);
  const scanlines = [
    {y:sly0,o:slo0},{y:sly1,o:slo1},{y:sly2,o:slo2},{y:sly3,o:slo3},
  ];

  // Bubbles fade with editor
  const bubbleO = useTransform(p, [0.38, 0.46, 0.85, 0.90], [0, 1, 1, 0]);

  // ── Finale phase [0.88–1.0]: closing CTA that fills the gap between editor
  //    end and the next section. Slides up + fades in as the editor fades out.
  const finaleO = useTransform(p, [0.88, 0.94], [0, 1]);
  const finaleY = useTransform(p, [0.88, 0.96], [60, 0]);
  const finaleScale = useTransform(p, [0.88, 0.94], [0.94, 1]);

  // Scan progress for editor render bar
  const scanProgressMV = useTransform(p, [WIPES[0][0], WIPES[3][1]], [0, 1]);
  const [scanProgress, setScanProgress] = useState(0);
  useEffect(() => scanProgressMV.on('change', v => setScanProgress(Math.max(0, Math.min(1, v)))), [scanProgressMV]);

  // Progress bar at top
  const barSc = p;

  return (
    <section ref={ref} id="hero" className="relative h-[760vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* Animated gradient backdrop (scoped to hero only) */}
        {!reduced && <AnimatedGradientBg topOffset={20} />}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden />

        {/* Progress bar */}
        <motion.div className="absolute left-0 top-0 z-50 h-[2px] w-full origin-left bg-brand" style={{ scaleX: barSc }} aria-hidden />

        {/* ── Flash overlays — bright pulse at phase transitions ── */}
        <motion.div
          aria-hidden
          style={{
            opacity: flash1O,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(127,224,255,0.4) 35%, transparent 70%)',
            mixBlendMode: 'screen',
          }}
          className="pointer-events-none absolute inset-0 z-[55]"
        />
        <motion.div
          aria-hidden
          style={{
            opacity: flash2O,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(0,177,246,0.4) 35%, transparent 70%)',
            mixBlendMode: 'screen',
          }}
          className="pointer-events-none absolute inset-0 z-[55]"
        />

        {/* ════ PHASE 1 — Intro 1 (fade + blur in place, no slide) ════ */}
        <motion.div
          style={{
            opacity: s1O,
            scale: s1Scale,
            filter: useMotionTemplate`blur(${s1Blur}px)`,
          }}
          className="absolute inset-0 z-30 flex items-center justify-center px-6"
        >
          <RevealText
            lines={s1}
            className="text-center text-[clamp(2.5rem,8vw,7rem)] leading-[1.05] text-paper max-w-5xl"
          />
        </motion.div>

        {/* ════ PHASE 2 — Intro 2 (zoom-flash in, fade+blur out) ════ */}
        <motion.div
          style={{
            opacity: s2O,
            scale: s2Scale,
            filter: useMotionTemplate`blur(${s2Blur}px)`,
          }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center"
        >
          {/* "Sin estudio." — slides up from a "box reveal" mask */}
          <div className="overflow-hidden">
            <motion.h2
              style={{ y: l1Y }}
              className="headline text-[clamp(3rem,9vw,8rem)] leading-[0.95] text-paper"
            >
              {s2.l1}
            </motion.h2>
          </div>
          {/* "Sin esperas." — left-to-right wipe driven by scroll progress.
              clip-path inset uses -20%/-20% top/bottom so diacritics aren't clipped. */}
          <motion.h2
            style={{
              y: l2Y,
              clipPath: l2Clip,
              willChange: 'clip-path',
              paddingBlock: '0.1em',
            }}
            className="headline text-[clamp(3rem,9vw,8rem)] leading-[0.95] text-rainbow"
          >
            {s2.l2}
          </motion.h2>
        </motion.div>

        {/* ════ EDITOR BACKGROUND ════ */}
        <motion.div style={{ opacity: editorO }} className="absolute inset-0 z-[5] pointer-events-none">
          <EditorBg />
        </motion.div>

        {/* ════ EDITOR CHROME (tools, panels) ════ */}
        <motion.div style={{ opacity: editorO }} className="absolute inset-0 z-20 pointer-events-none">
          <EditorChrome stage={activeStage} scanProgress={scanProgress} />
        </motion.div>

        {/* ════ PORTRAIT (4:5 square-ish, slides up from below) ════ */}
        <motion.div
          style={{ opacity: portraitO, scale: portraitS, y: portraitY }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          {/* Portrait + bubbles wrapper — sized so it never overflows on mobile.
              height is bounded by BOTH 72vh and (88vw × 5/4) so a narrow viewport
              shrinks the portrait instead of clipping it. */}
          <div
            className="relative"
            style={{
              width: 'min(88vw, calc(72vh * 4 / 5))',
              aspectRatio: '4 / 5',
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-3xl"
              style={{
                boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--overlay) / 0.12), 0 0 80px -10px rgba(0,177,246,0.35)',
              }}
            >
              {SRCS.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt={i === 0 ? 'Rostro real, antes de LetShoot' : ''}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    objectPosition: '50% 18%',
                    ...(clips[i] ? { clipPath: clips[i] } : {}),
                  }}
                  draggable={false}
                />
              ))}

              {/* Scanlines */}
              {scanlines.map((sl, i) => (
                <motion.div
                  key={i}
                  className="pointer-events-none absolute inset-x-0 z-20"
                  style={{
                    top: sl.y, opacity: sl.o,
                    height: '3px', marginTop: '-1.5px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0,177,246,0.5) 10%, rgba(127,224,255,1) 50%, rgba(0,177,246,0.5) 90%, transparent 100%)',
                    boxShadow: '0 0 18px 6px rgba(0,177,246,0.45), 0 0 50px 16px rgba(0,177,246,0.16)',
                  }}
                />
              ))}
            </div>

            {/* ── Comment bubbles around the portrait ──
                Hidden on mobile because there's no room next to the portrait. */}
            <motion.div style={{ opacity: bubbleO }} className="pointer-events-none absolute inset-0 hidden md:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`bubbles-${activeStage}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="absolute inset-0"
                >
                  {bubblesByStage[activeStage]?.map((b, idx) => (
                    <CommentBubble key={idx} bubble={b} index={idx} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* ════ FINALE — fills the gap between editor end and next section ════ */}
        <motion.div
          style={{ opacity: finaleO, y: finaleY, scale: finaleScale }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 pointer-events-none"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            {finale.pill}
          </span>
          <h2 className="headline text-center text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] text-paper">
            {finale.pre}<span className="text-rainbow inline-block" style={{ paddingBlock: '0.1em' }}>{finale.hi}</span>
          </h2>
          <p className="mt-5 max-w-xl text-center text-base leading-relaxed text-paper-mute sm:text-lg">
            {finale.body}
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
            >
              {t.hero.ctaPrimary}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#results"
              className="glass-ios inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium text-paper transition-colors hover:text-brand"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// ── Comment bubble component ────────────────────────────────────────────────
function CommentBubble({ bubble, index }) {
  const isLeft = bubble.side === 'left';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, x: isLeft ? -10 : 10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 + index * 0.12 }}
      className="absolute"
      style={{
        [isLeft ? 'right' : 'left']: '100%',
        top: `${bubble.y}%`,
        [isLeft ? 'marginRight' : 'marginLeft']: 'clamp(8px, 2vw, 24px)',
      }}
    >
      {/* Connector line + dot */}
      <div className={`flex items-center gap-2 ${isLeft ? 'flex-row-reverse' : ''}`}>
        {/* Dot anchored at portrait edge */}
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-brand shadow-[0_0_12px_3px_rgba(0,177,246,0.7)]" />
          {/* Tiny line going to the bubble */}
          <div
            className={`absolute top-1/2 h-px w-3 -translate-y-1/2 bg-gradient-to-r ${
              isLeft ? 'right-2 from-transparent to-brand/60' : 'left-2 from-brand/60 to-transparent'
            }`}
          />
        </div>

        {/* Bubble */}
        <div
          className="glass-ios whitespace-nowrap rounded-2xl px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-paper"
          style={{
            // Different rounded corner for "chat bubble" feel
            borderBottomLeftRadius: isLeft ? '0.25rem' : '1rem',
            borderBottomRightRadius: isLeft ? '1rem' : '0.25rem',
          }}
        >
          {bubble.text}
        </div>
      </div>
    </motion.div>
  );
}
