'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// ── Plans (language-independent: name, price, structure) ─────────────────────
const PLANS = [
  { key: 'free',     name: 'Free',     base: 0 },
  { key: 'standard', name: 'Standard', base: 79.99 },
  { key: 'plus',     name: 'Plus',     base: 119.99, inherits: 'Standard' },
  { key: 'premium',  name: 'Premium',  base: 199.99, inherits: 'Plus', popular: true },
  { key: 'elite',    name: 'Elite',    base: 399.00, inherits: 'Premium', attention: true },
];

// Billing periods (mult = discount applied, off = badge under label)
const PERIODS = [
  { key: 'm', mult: 1,    off: null },
  { key: 'q', mult: 0.85, off: 15 },
  { key: 'a', mult: 0.75, off: 25 },
];

// ── Copy per language (es + en; others fall back to en) ──────────────────────
const COPY = {
  es: {
    periodLabels: { m: 'Mensual', q: '3 Meses', a: 'Anual' },
    save: 'Ahorra', perMonth: '/mes', free: 'Gratis', off: '-50%', popular: 'Más popular',
    everyA: 'Todo lo de', everyB: ', y:', attention: 'Atención personalizada',
    plans: {
      free: { desc: 'Comprueba la magia sin pagar nada. Tu primera sesión corre por nuestra cuenta.', cta: 'Probar gratis', features: [
        { t: '1 sesión de prueba' }, { t: 'Vista previa en baja resolución' }, { t: 'Sin tarjeta de crédito' },
      ]},
      standard: { desc: 'Todo lo que necesitas para dejar de pagar fotógrafo y producir como pro.', cta: 'Empezar', features: [
        { t: 'Hasta 150 fotos IA / mes' }, { t: 'Outfits y locaciones', tag: 'Sin límite' }, { t: 'Calidad HD' }, { t: 'Maquillaje y estilo IA', tag: 'Exclusivo' },
      ]},
      plus: { desc: 'Sube de nivel: más volumen, video y calidad 4K para crecer sin frenos.', cta: 'Empezar', features: [
        { t: 'Hasta 400 fotos IA / mes' }, { t: 'Videos IA cortos', tag: 'Nuevo' }, { t: 'Calidad 4K', tag: 'Exclusivo' }, { t: 'Locaciones premium' },
      ]},
      premium: { desc: 'El arsenal completo: producción ilimitada, prioridad total y licencia comercial.', cta: 'Empezar', features: [
        { t: 'Fotos IA ilimitadas' }, { t: 'Videos IA largos + reels' }, { t: 'Renders prioritarios', tag: 'Sin espera' }, { t: 'Licencia comercial', tag: 'Exclusivo' }, { t: 'Soporte prioritario' },
      ]},
      elite: { desc: 'Tu estudio creativo personal. Un equipo real dirige cada sesión por ti.', cta: 'Hablar con ventas', features: [
        { t: 'Gestor de cuenta dedicado' }, { t: 'Sesiones a medida', tag: 'Express' }, { t: 'Dirección creativa 1-a-1' }, { t: 'Soporte por línea directa' },
      ]},
    },
  },
  en: {
    periodLabels: { m: 'Monthly', q: '3 Months', a: 'Annual' },
    save: 'Save', perMonth: '/mo', free: 'Free', off: '-50%', popular: 'Most popular',
    everyA: 'Everything in', everyB: ', and:', attention: 'Personalized attention',
    plans: {
      free: { desc: 'See the magic for free. Your first session is on us.', cta: 'Try for free', features: [
        { t: '1 trial session' }, { t: 'Low-res preview' }, { t: 'No credit card required' },
      ]},
      standard: { desc: 'Everything you need to ditch the photographer and shoot like a pro.', cta: 'Get started', features: [
        { t: 'Up to 150 AI photos / mo' }, { t: 'Outfits & locations', tag: 'Unlimited' }, { t: 'HD quality' }, { t: 'AI makeup & styling', tag: 'Exclusive' },
      ]},
      plus: { desc: 'Level up: more volume, video and 4K quality to grow without limits.', cta: 'Get started', features: [
        { t: 'Up to 400 AI photos / mo' }, { t: 'Short AI videos', tag: 'New' }, { t: '4K quality', tag: 'Exclusive' }, { t: 'Premium locations' },
      ]},
      premium: { desc: 'The full arsenal: unlimited production, top priority and commercial rights.', cta: 'Get started', features: [
        { t: 'Unlimited AI photos' }, { t: 'Long AI videos + reels' }, { t: 'Priority renders', tag: 'Zero wait' }, { t: 'Commercial license', tag: 'Exclusive' }, { t: 'Priority support' },
      ]},
      elite: { desc: 'Your personal creative studio. A real team directs every session for you.', cta: 'Talk to sales', features: [
        { t: 'Dedicated account manager' }, { t: 'Custom sessions', tag: 'Express' }, { t: '1-on-1 creative direction' }, { t: 'Direct-line support' },
      ]},
    },
  },
};

const fmt = (n) => n.toFixed(2);

export default function Pricing() {
  const { t, lang } = useLang();
  const p = t.pricing;
  const c = COPY[lang] || COPY.en;
  const [period, setPeriod] = useState('m');
  const mult = PERIODS.find((x) => x.key === period).mult;

  return (
    <section id="pricing" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={p.label} titleA={p.titleA} highlight={p.titleHighlight} sub={p.sub} align="center" hue="gradient" />
        </div>

        {/* Billing period toggle */}
        <div className="mx-auto mt-10 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-card/80 p-1.5 backdrop-blur">
          {PERIODS.map((per) => {
            const active = period === per.key;
            return (
              <button
                key={per.key}
                type="button"
                onClick={() => setPeriod(per.key)}
                className={`relative flex flex-1 flex-col items-center justify-center rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 ${
                  active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:bg-hair/[0.04] hover:text-paper'
                }`}
              >
                <span>{c.periodLabels[per.key]}</span>
                {per.off && (
                  <span className={`mt-0.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                    active ? 'bg-on-accent/20 text-on-accent' : 'bg-brand/15 text-brand'
                  }`}>
                    {c.save} {per.off}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANS.map((plan, i) => {
            const pc = c.plans[plan.key];
            const price = plan.base * mult;
            const original = plan.base * 2 * mult;
            const highlight = plan.popular || plan.attention;
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease, delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border p-5 transition-shadow duration-300 ${
                  plan.popular ? 'border-brand bg-brand/[0.07] shadow-glow-sm' :
                  plan.attention ? 'border-brand/70 bg-card' : 'border-line bg-card hover:border-paper/20'
                }`}
              >
                {/* Glow wash on the featured plan */}
                {plan.popular && (
                  <div className="pointer-events-none absolute inset-x-0 -top-px h-28 bg-gradient-to-b from-brand/20 to-transparent" aria-hidden />
                )}

                {/* Attention ribbon */}
                {plan.attention && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">
                    {c.attention}
                  </div>
                )}

                {/* Name + popular / off badge */}
                <div className="relative flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{plan.name}</span>
                  {plan.popular ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-on-accent">{c.popular}</span>
                  ) : plan.base > 0 ? (
                    <span className="rounded-md bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">{c.off}</span>
                  ) : null}
                </div>

                {/* Price */}
                {plan.base > 0 ? (
                  <div className="relative mt-3">
                    <span className="font-mono text-xs text-paper-dim line-through">${fmt(original)}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display text-[2.6rem] leading-none ${plan.popular ? 'text-brand' : 'text-paper'}`}>${fmt(price)}</span>
                      <span className="text-sm text-paper-dim">{c.perMonth}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-3 font-display text-[2.6rem] leading-none text-paper">{c.free}</div>
                )}

                <p className="relative mt-4 min-h-[2.5rem] text-[13px] leading-relaxed text-paper-mute">{pc.desc}</p>

                <div className="relative my-4 h-px bg-line/70" />

                {plan.inherits && (
                  <p className="relative -mt-1 mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-dim">
                    {c.everyA} <span className="text-paper">{plan.inherits}</span>{c.everyB}
                  </p>
                )}

                <ul className="relative flex-1 space-y-2.5">
                  {pc.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-[13px] text-paper-mute">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1">
                        {f.t}
                        {f.tag && (
                          <span className="ml-1.5 inline-block rounded bg-hair/10 px-1.5 py-px align-middle font-mono text-[9px] uppercase tracking-wide text-paper-dim">
                            {f.tag}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`relative mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold transition-transform hover:scale-[1.03] ${
                    highlight ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/60 hover:text-brand'
                  }`}
                >
                  {pc.cta}
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
