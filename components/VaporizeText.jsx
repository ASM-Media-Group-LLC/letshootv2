'use client';

// VaporizeTextCycle — particle-based text that vaporizes and cycles.
// Ported from TypeScript (21st.dev) to plain JSX for Next.js 14 / React 18.

import { useRef, useEffect, useState, createElement, useMemo, useCallback, memo } from 'react';

export const Tag = { H1: 'h1', H2: 'h2', H3: 'h3', P: 'p' };

export default function VaporizeTextCycle({
  texts = ['Hello'],
  font = { fontFamily: 'sans-serif', fontSize: '50px', fontWeight: 400 },
  color = 'rgb(255,255,255)',
  spread = 5,
  density = 5,
  animation = { vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 0.5 },
  direction = 'left-to-right',
  alignment = 'center',
  tag = Tag.P,
  onCycleEnd,      // optional: called when the LAST phrase finishes vaporizing
}) {
  const canvasRef  = useRef(null);
  const wrapperRef = useRef(null);
  const isInView   = useIsInView(wrapperRef);
  const lastFontRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const onCycleEndCalledRef = useRef(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [animState, setAnimState] = useState('static'); // static|vaporizing|fadingIn|waiting
  const vaporizeProgress = useRef(0);
  const fadeOpacity = useRef(0);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });

  const density01 = useMemo(() => transformValue(density, [0,10], [0.3,1], true), [density]);

  const globalDpr = useMemo(() => (typeof window !== 'undefined' ? window.devicePixelRatio * 1.5 || 1 : 1), []);

  const durations = useMemo(() => ({
    VAPORIZE: (animation.vaporizeDuration ?? 2) * 1000,
    FADE_IN:  (animation.fadeInDuration  ?? 1) * 1000,
    WAIT:     (animation.waitDuration    ?? 0.5) * 1000,
  }), [animation.vaporizeDuration, animation.fadeInDuration, animation.waitDuration]);

  const fontCfg = useMemo(() => {
    const sz = parseInt(String(font.fontSize ?? '50').replace('px', ''));
    const spread_ = calcSpread(sz);
    return {
      sz,
      spread: spread_,
      spreadMult: spread_ * spread,
      fontStr: `${font.fontWeight ?? 400} ${sz * globalDpr}px ${font.fontFamily ?? 'sans-serif'}`,
    };
  }, [font, spread, globalDpr]);

  const doUpdateParticles = useCallback((particles, vpX, dt) =>
    updateParticles(particles, vpX, dt, fontCfg.spreadMult, durations.VAPORIZE, direction, density01),
    [fontCfg.spreadMult, durations.VAPORIZE, direction, density01]);

  const doRender = useCallback((ctx, particles) => renderParticles(ctx, particles, globalDpr), [globalDpr]);

  // Start cycle when in view
  useEffect(() => {
    if (isInView) {
      const id = setTimeout(() => setAnimState('vaporizing'), 0);
      return () => clearTimeout(id);
    } else {
      setAnimState('static');
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    }
  }, [isInView]);

  // Animation loop
  useEffect(() => {
    if (!isInView) return;
    let last = performance.now();
    let id;
    const animate = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !particlesRef.current.length) { id = requestAnimationFrame(animate); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (animState === 'static' || animState === 'waiting') {
        doRender(ctx, particlesRef.current);
      } else if (animState === 'vaporizing') {
        vaporizeProgress.current += dt * 100 / (durations.VAPORIZE / 1000);
        const bounds = canvas.textBoundaries;
        if (bounds) {
          const pct = Math.min(100, vaporizeProgress.current);
          const vpX = direction === 'left-to-right'
            ? bounds.left + bounds.width * pct / 100
            : bounds.right - bounds.width * pct / 100;
          const done = doUpdateParticles(particlesRef.current, vpX, dt);
          doRender(ctx, particlesRef.current);
          if (vaporizeProgress.current >= 100 && done) {
            const nextIdx = (currentIdx + 1) % texts.length;
            // If we've just vaporized the LAST text and caller wants a callback
            if (nextIdx === 0 && onCycleEnd && !onCycleEndCalledRef.current) {
              onCycleEndCalledRef.current = true;
              onCycleEnd();
            }
            setCurrentIdx(nextIdx);
            setAnimState('fadingIn');
            fadeOpacity.current = 0;
          }
        }
      } else if (animState === 'fadingIn') {
        fadeOpacity.current += dt * 1000 / durations.FADE_IN;
        ctx.save(); ctx.scale(globalDpr, globalDpr);
        particlesRef.current.forEach(p => {
          p.x = p.originalX; p.y = p.originalY;
          const a = Math.min(fadeOpacity.current, 1) * p.originalAlpha;
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${a})`);
          ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1, 1);
        });
        ctx.restore();
        if (fadeOpacity.current >= 1) {
          setAnimState('waiting');
          setTimeout(() => {
            setAnimState('vaporizing');
            vaporizeProgress.current = 0;
            resetParticles(particlesRef.current);
          }, durations.WAIT);
        }
      }
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [animState, isInView, texts.length, direction, globalDpr, doUpdateParticles, doRender, durations, currentIdx, onCycleEnd]);

  // Re-render canvas when text/size/index changes
  useEffect(() => {
    renderCanvas({ texts, font, color, alignment, canvasRef, wrapperSize, particlesRef, globalDpr, currentIdx, density01 });
    const cur = font.fontFamily ?? 'sans-serif';
    if (cur !== lastFontRef.current) {
      lastFontRef.current = cur;
      const tid = setTimeout(() => {
        cleanup(canvasRef, particlesRef);
        renderCanvas({ texts, font, color, alignment, canvasRef, wrapperSize, particlesRef, globalDpr, currentIdx, density01 });
      }, 1000);
      return () => clearTimeout(tid);
    }
  }, [texts, font, color, alignment, wrapperSize, currentIdx, globalDpr, density01]);

  // Resize observer
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setWrapperSize({ width, height });
      }
      renderCanvas({ texts, font, color, alignment, canvasRef,
        wrapperSize: { width: el.clientWidth, height: el.clientHeight },
        particlesRef, globalDpr, currentIdx, density01 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect();
      setWrapperSize({ width: r.width, height: r.height });
    }
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ minWidth: '30px', minHeight: '20px', pointerEvents: 'none' }} />
      {/* Hidden SEO text */}
      {createElement(tag, { style: { position:'absolute', width:0, height:0, overflow:'hidden', userSelect:'none', pointerEvents:'none' } }, texts.join(' '))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderCanvas({ texts, font, color, alignment, canvasRef, wrapperSize, particlesRef, globalDpr, currentIdx, density01 }) {
  const canvas = canvasRef.current;
  if (!canvas || !wrapperSize.width || !wrapperSize.height) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = wrapperSize;
  canvas.style.width  = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width  = Math.floor(width  * globalDpr);
  canvas.height = Math.floor(height * globalDpr);
  const sz   = parseInt(String(font.fontSize ?? '50').replace('px', ''));
  const fStr = `${font.fontWeight ?? 400} ${sz * globalDpr}px ${font.fontFamily ?? 'sans-serif'}`;
  const clr  = parseColor(color ?? 'rgb(255,255,255)');
  const textX = alignment === 'center' ? canvas.width / 2 : alignment === 'left' ? 0 : canvas.width;
  const textY = canvas.height / 2;
  const text  = texts[currentIdx] ?? texts[0] ?? '';
  const { particles, textBoundaries } = createParticles(ctx, canvas, text, textX, textY, fStr, clr, alignment ?? 'center');
  particlesRef.current = particles;
  canvas.textBoundaries = textBoundaries;
}

function cleanup(canvasRef, particlesRef) {
  const ctx = canvasRef.current?.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  particlesRef.current = [];
}

function createParticles(ctx, canvas, text, textX, textY, font, color, alignment) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle   = color;
  ctx.font        = font;
  ctx.textAlign   = alignment;
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const metrics   = ctx.measureText(text);
  const textWidth = metrics.width;
  const textLeft  = alignment === 'center' ? textX - textWidth / 2
                  : alignment === 'left'   ? textX
                  : textX - textWidth;

  ctx.fillText(text, textX, textY);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const dpr = canvas.width / parseInt(canvas.style.width);
  const sr  = Math.max(1, Math.round(dpr / 3));
  const particles = [];

  for (let y = 0; y < canvas.height; y += sr) {
    for (let x = 0; x < canvas.width; x += sr) {
      const idx   = (y * canvas.width + x) * 4;
      const alpha = imageData[idx + 3];
      if (alpha > 0) {
        const oa = alpha / 255 * (sr / dpr);
        particles.push({ x, y, originalX: x, originalY: y, color: `rgba(${imageData[idx]},${imageData[idx+1]},${imageData[idx+2]},${oa})`, opacity: oa, originalAlpha: oa, velocityX: 0, velocityY: 0, angle: 0, speed: 0 });
      }
    }
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { particles, textBoundaries: { left: textLeft, right: textLeft + textWidth, width: textWidth } };
}

function updateParticles(particles, vpX, dt, spreadMult, vaporizeDuration, direction, density01) {
  let allDone = true;
  particles.forEach(p => {
    const should = direction === 'left-to-right' ? p.originalX <= vpX : p.originalX >= vpX;
    if (should) {
      if (p.speed === 0) {
        p.angle = Math.random() * Math.PI * 2;
        p.speed = (Math.random() * 1 + 0.5) * spreadMult;
        p.velocityX = Math.cos(p.angle) * p.speed;
        p.velocityY = Math.sin(p.angle) * p.speed;
        p.shouldFadeQuickly = Math.random() > density01;
      }
      if (p.shouldFadeQuickly) {
        p.opacity = Math.max(0, p.opacity - dt);
      } else {
        const dx  = p.originalX - p.x, dy = p.originalY - p.y;
        const dst = Math.sqrt(dx*dx + dy*dy);
        const damp = Math.max(0.95, 1 - dst / (100 * spreadMult));
        const rs = spreadMult * 3;
        p.velocityX = (p.velocityX + (Math.random()-0.5)*rs + dx*0.002) * damp;
        p.velocityY = (p.velocityY + (Math.random()-0.5)*rs + dy*0.002) * damp;
        const mv = spreadMult * 2;
        const cv = Math.sqrt(p.velocityX**2 + p.velocityY**2);
        if (cv > mv) { p.velocityX *= mv/cv; p.velocityY *= mv/cv; }
        p.x += p.velocityX * dt * 20;
        p.y += p.velocityY * dt * 10;
        p.opacity = Math.max(0, p.opacity - dt * 0.25 * (2000 / vaporizeDuration));
      }
      if (p.opacity > 0.01) allDone = false;
    } else {
      allDone = false;
    }
  });
  return allDone;
}

function renderParticles(ctx, particles, dpr) {
  ctx.save(); ctx.scale(dpr, dpr);
  particles.forEach(p => {
    if (p.opacity > 0) {
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`);
      ctx.fillRect(p.x / dpr, p.y / dpr, 1, 1);
    }
  });
  ctx.restore();
}

function resetParticles(particles) {
  particles.forEach(p => { p.x = p.originalX; p.y = p.originalY; p.opacity = p.originalAlpha; p.speed = 0; p.velocityX = 0; p.velocityY = 0; });
}

function calcSpread(sz) {
  const pts = [{size:20,spread:0.2},{size:50,spread:0.5},{size:100,spread:1.5}];
  if (sz <= pts[0].size) return pts[0].spread;
  if (sz >= pts[pts.length-1].size) return pts[pts.length-1].spread;
  let i = 0;
  while (i < pts.length-1 && pts[i+1].size < sz) i++;
  const p1 = pts[i], p2 = pts[i+1];
  return p1.spread + (sz-p1.size) * (p2.spread-p1.spread) / (p2.size-p1.size);
}

function parseColor(color) {
  const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgba) return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${rgba[4]})`;
  const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},1)`;
  return 'rgba(0,0,0,1)';
}

function transformValue(input, inputRange, outputRange, clamp = false) {
  const progress = (input - inputRange[0]) / (inputRange[1] - inputRange[0]);
  let r = outputRange[0] + progress * (outputRange[1] - outputRange[0]);
  if (clamp) r = outputRange[1] > outputRange[0] ? Math.min(Math.max(r, outputRange[0]), outputRange[1]) : Math.min(Math.max(r, outputRange[1]), outputRange[0]);
  return r;
}

function useIsInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0, rootMargin: '50px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return inView;
}
