'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MoveHorizontal } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Before / after example pairs (selfie → editorial result)
const PAIRS = [
  { before: '/ba-before-1.jpg', after: '/ba-after-1.jpg' },
  { before: '/ba-before-2.jpg', after: '/ba-after-2.jpg' },
];

const TITLES = {
  es: { label: 'ANTES / DESPUÉS', titleA: 'De selfie a', highlight: 'portada', sub: 'La misma tú. Arrastra el control y mira en qué se convierte una selfie normal.', before: 'Tu selfie', after: 'Con LetShoot', drag: 'Arrastra' },
  en: { label: 'BEFORE / AFTER', titleA: 'From selfie to', highlight: 'cover', sub: 'The same you. Drag the handle and see what an ordinary selfie becomes.', before: 'Your selfie', after: 'With LetShoot', drag: 'Drag' },
  pt: { label: 'ANTES / DEPOIS', titleA: 'De selfie a', highlight: 'capa', sub: 'A mesma tu. Arrasta o controlo e vê no que se transforma uma selfie normal.', before: 'A tua selfie', after: 'Com LetShoot', drag: 'Arrasta' },
  fr: { label: 'AVANT / APRÈS', titleA: 'Du selfie à la', highlight: 'couverture', sub: 'La même toi. Glisse le curseur et vois ce que devient un simple selfie.', before: 'Ton selfie', after: 'Avec LetShoot', drag: 'Glisse' },
  de: { label: 'VORHER / NACHHER', titleA: 'Vom Selfie zum', highlight: 'Cover', sub: 'Dasselbe Du. Zieh den Regler und sieh, was aus einem normalen Selfie wird.', before: 'Dein Selfie', after: 'Mit LetShoot', drag: 'Ziehen' },
  it: { label: 'PRIMA / DOPO', titleA: 'Dal selfie alla', highlight: 'copertina', sub: 'La stessa te. Trascina il cursore e guarda in cosa si trasforma un selfie normale.', before: 'Il tuo selfie', after: 'Con LetShoot', drag: 'Trascina' },
  zh: { label: '前 / 后', titleA: '从自拍到', highlight: '封面大片', sub: '同样的你。拖动滑块，看看一张普通自拍如何蜕变。', before: '你的自拍', after: '用 LetShoot', drag: '拖动' },
};

export default function EditorSection() {
  const { lang } = useLang();
  const t = TITLES[lang] || TITLES.es;

  const [pairIdx, setPairIdx] = useState(0);
  const [pos, setPos] = useState(50);
  const frameRef = useRef(null);
  const dragging = useRef(false);

  const pair = PAIRS[pairIdx];

  const setFromClientX = useCallback((clientX) => {
    const el = frameRef.current;
    if (!el || clientX == null) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onPointerDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => { dragging.current = false; };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4));
    else if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4));
  };

  return (
    <section className="relative w-full overflow-hidden bg-ink">
      <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:pt-32 sm:pb-28">
        <SectionHeading
          align="center"
          hue="gradient"
          label={t.label}
          titleA={t.titleA}
          highlight={t.highlight}
          sub={t.sub}
        />

        {/* ── Interactive before/after slider ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-12 flex flex-col items-center"
        >
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="relative select-none overflow-hidden rounded-3xl border border-hair/15 shadow-soft"
            style={{
              width: 'min(90vw, calc(70vh * 4 / 5), 460px)',
              aspectRatio: '4 / 5',
              touchAction: 'none',
              cursor: 'ew-resize',
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--overlay)/0.1)',
            }}
          >
            {/* AFTER — full background (the impressive result) */}
            <img
              src={pair.after}
              alt="Resultado con LetShoot"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            {/* BEFORE — clipped to the left of the handle (the original selfie) */}
            <img
              src={pair.before}
              alt="Selfie original"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              draggable={false}
            />

            {/* Corner labels */}
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              {t.before}
            </span>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand/85 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-accent backdrop-blur">
              {t.after}
            </span>

            {/* Divider + handle */}
            <div
              className="pointer-events-none absolute inset-y-0 z-10"
              style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_12px_2px_rgba(0,177,246,0.5)]" />
              <button
                type="button"
                aria-label={t.drag}
                onKeyDown={onKeyDown}
                className="pointer-events-auto absolute top-1/2 left-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/95 text-ink shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MoveHorizontal size={18} aria-hidden />
              </button>
            </div>
          </div>

          {/* Example switcher */}
          {PAIRS.length > 1 && (
            <div className="mt-6 flex items-center gap-2">
              {PAIRS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ejemplo ${i + 1}`}
                  onClick={() => { setPairIdx(i); setPos(50); }}
                  className={`h-2.5 rounded-full transition-all ${
                    i === pairIdx ? 'w-7 bg-brand' : 'w-2.5 bg-hair/30 hover:bg-hair/50'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
