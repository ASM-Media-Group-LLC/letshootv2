'use client';

// ─────────────────────────────────────────────────────────────────────────
// make.letshoot.ai — home de la nueva sección.
// El middleware reescribe el host `make.` → /make/*, así que esta página se
// sirve en la RAÍZ del subdominio (make.letshoot.ai/). Las sub-rutas futuras
// viven en app/make/** y se enlazan con href root-relative (href="/algo").
//
// Placeholder listo para construir: cuando llegue el prompt, reemplazamos el
// contenido de abajo por la app real. La estructura (subdominio, routing,
// shell) ya queda funcionando.
// ─────────────────────────────────────────────────────────────────────────

import { Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';

export default function MakeHome() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-ink px-6 text-paper">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,175,240,0.10), transparent 65%)' }}
      />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Logo size="lg" />
        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.08] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
          <Sparkles size={12} /> make.letshoot.ai
        </span>
        <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-[-0.02em]">
          El taller está listo.
        </h1>
        <p className="mt-4 max-w-md text-balance text-base leading-relaxed text-paper-mute sm:text-lg">
          Esta es la base de la nueva sección. La estructura ya funciona — falta el contenido, que construimos enseguida.
        </p>
      </div>
    </main>
  );
}
