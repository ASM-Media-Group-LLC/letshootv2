'use client';

// A clean, on-brand first-visit welcome: a few centered pop-up steps that explain the
// panel to a brand-new user. Shows once per role (localStorage), skippable, no deps.
// Same restrained look as the emails: dark card, one blue accent, progress dots.
import { useEffect, useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import Logo from '@/components/Logo';

export default function WelcomeTour({ storageKey, steps }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch { /* SSR / private mode — just skip */ }
  }, [storageKey]);

  function close() {
    try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    setOpen(false);
  }

  if (!open || !steps?.length) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/80 p-5 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-card p-7 text-center shadow-glow-sm">
        <button onClick={close} aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-line text-paper-dim transition-colors hover:text-paper">
          <X size={15} />
        </button>

        <div className="flex justify-center"><Logo size="sm" /></div>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[2px] text-brand">{step.eyebrow || 'Bienvenida'}</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-paper">{step.title}</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-paper-mute">{step.body}</p>

        {/* progress dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-brand' : 'w-1.5 bg-hair/20'}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {!last && (
            <button onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-medium text-paper-dim transition-colors hover:text-paper">
              Saltar
            </button>
          )}
          <button onClick={() => (last ? close() : setI((n) => n + 1))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.02]">
            {last ? <>Empezar <Check size={15} /></> : <>Siguiente <ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
