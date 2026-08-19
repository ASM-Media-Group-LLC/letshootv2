'use client';

// Preview público del layout de una cuenta de creadora «en proceso»: ya
// verificada, le falta pagar y subir fotos del clon. NO llama a Supabase,
// NO requiere auth — solo muestra el layout con datos mock. Sirve para
// enseñar la pantalla sin tener que seedear cuentas ni loguearse.
//
// Todos los botones son visuales (no ejecutan nada) — es un showcase.

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, IdCard, CreditCard, Sparkles, CheckCircle2, Circle, ArrowRight, Check, ShieldCheck, ArrowLeft, Upload, Camera } from 'lucide-react';
import Logo from '@/components/Logo';
import { PACKS, PERIODS } from '@/lib/packs';
import ProposalDeck from '@/components/ProposalDeck';

const MOCK = {
  first: 'Camila',
  last: 'Demo',
  dob: '1998-05-14',
  country: 'MX',
  phone: '+52 55 1234 5678',
  handle: 'camilademo',
};

// Slides mock del lookbook — mismas fotos de Julia que usa la cuenta PROPUESTA
// demo. No dependen de storage: los path viven en /public/lib.
const PROPOSAL_SLIDES = [
  { id: '1', position: 0, inspiration_url: '/lib/lluvia-cafe.jpg',   real_url: '/lib/julia-frontal-1.jpg', ai_url: '/lib/julia-angulo-1.jpg', caption: 'Escena: café, lluvia — mirada al lente' },
  { id: '2', position: 1, inspiration_url: '/lib/julia-guino-1.jpg', real_url: '/lib/julia-medio-1.jpg',   ai_url: '/lib/julia-risa-1.jpg',   caption: 'Cama en la mañana — íntimo natural' },
  { id: '3', position: 2, inspiration_url: '/lib/julia-body-1.jpg',  real_url: '/lib/julia-bikini-1.jpg',  ai_url: '/lib/julia-bikini-2.jpg', caption: 'Gym / fitness — post entreno' },
  { id: '4', position: 3, inspiration_url: '/lib/julia-mano-1.jpg',  real_url: '/lib/julia-vestida-1.jpg', ai_url: '/lib/julia-vestida-2.jpg', caption: 'Sauna / robe — bienestar' },
  { id: '5', position: 4, inspiration_url: '/lib/julia-perfil-1.jpg', real_url: '/lib/julia-marca-1.jpg', ai_url: '/lib/julia-perfil-2.jpg', caption: 'Salida de noche — outfit statement' },
];
const PROPOSAL_INTRO = 'Estas son solo 5 escenas para que te des una idea. Con tu clon podemos generar cualquier situación que tu audiencia pida — en minutos, sin producción.';

const TABS = [
  { key: 'pago',  label: 'Suscripción · Pago',   desc: 'Elige tu pack de contenido',    icon: CreditCard, done: false },
  { key: 'clon',  label: 'Fotos del clon',       desc: 'Sube tus fotos para entrenar tu clon', icon: Sparkles, done: false },
  { key: 'datos', label: 'Datos e identidad',    desc: 'Tu información y verificación', icon: IdCard,     done: true },
];

export default function PreviewEnProceso() {
  const [tab, setTab] = useState('pago');
  const [pack, setPack] = useState('core');
  const [showProposal, setShowProposal] = useState(true); // arranca abierto — es lo primero que ve la CC
  const doneCount = TABS.filter((t) => t.done).length;

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      {/* Lookbook full-screen — se muestra abierto por default (como en la
          experiencia real cuando entra la CC con propuesta publicada). */}
      {showProposal && (
        <ProposalDeck
          creatorName={MOCK.first}
          intro={PROPOSAL_INTRO}
          slides={PROPOSAL_SLIDES}
          onClose={() => setShowProposal(false)}
          onChoosePack={(k) => { setPack(k); setShowProposal(false); setTab('pago'); }}
          chosenPack={pack}
        />
      )}

      {/* Ribbon aviso «esto es un preview» */}
      <div className="border-b border-amber-500/25 bg-amber-500/[0.08] px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-200">
        Preview · Layout de una creadora en proceso — nada de esto guarda
        <Link href="/owner" className="ml-3 underline hover:text-amber-100">Volver a /owner</Link>
      </div>

      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-block">Registro</span>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {/* Header del hub */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="font-display text-2xl font-semibold sm:text-[1.75rem]">Hola {MOCK.first}, ya casi</h1>
            <p className="mt-2 text-sm leading-relaxed text-paper-mute">
              Tu identidad está verificada. Faltan dos pasos para empezar a recibir contenido: elige tu pack y sube las fotos para entrenar tu clon.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <div className="relative grid h-11 w-11 place-items-center">
              <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                  className="text-brand" strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 * (1 - doneCount / TABS.length)} />
              </svg>
              <span className="absolute text-xs font-semibold text-paper">{doneCount}/{TABS.length}</span>
            </div>
            <div className="whitespace-pre-line text-xs leading-tight text-paper-mute">{doneCount} de {TABS.length}{'\n'}pasos listos</div>
          </div>
        </div>

        {/* Botón para reabrir el lookbook — visible cuando el deck está cerrado */}
        {!showProposal && (
          <button onClick={() => setShowProposal(true)}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/[0.12] to-brand/[0.03] p-4 text-left transition-colors hover:from-brand/[0.18]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-paper">Tu propuesta personalizada</p>
                <p className="text-xs text-paper-mute">Mira cómo se vería tu clon con tus fotos + elige tu pack</p>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0 text-brand" />
          </button>
        )}

        {/* Tabs stepper */}
        <div className="mt-7 grid grid-cols-3 gap-3">
          {TABS.map((tb) => {
            const active = tab === tb.key;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`group relative flex flex-col gap-4 rounded-2xl border p-5 text-left transition-all ${
                  active ? 'border-brand bg-brand/[0.06] shadow-glow-sm' : 'border-line bg-card hover:border-hair hover:bg-ink-2'
                }`}>
                <div className="flex items-start justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                    active ? 'bg-brand text-on-accent' : 'bg-hair/[0.07] text-paper-mute group-hover:text-paper'
                  }`}>
                    <tb.icon size={19} />
                  </span>
                  {tb.done
                    ? <CheckCircle2 size={22} className="text-brand" />
                    : <Circle size={22} className="text-paper-dim/40" />}
                </div>
                <div>
                  <div className="font-display text-base font-semibold text-paper">{tb.label}</div>
                  <div className="mt-0.5 text-xs text-paper-dim">{tb.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Panel del tab activo */}
        <div className="mt-6">
          {tab === 'pago' && <PagoPanel pack={pack} setPack={setPack} />}
          {tab === 'clon' && <ClonPanel />}
          {tab === 'datos' && <DatosPanel />}
        </div>
      </main>
    </div>
  );
}

function Panel({ title, desc, children }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-6 sm:p-7">
      <div>
        <h2 className="font-display text-xl font-semibold text-paper">{title}</h2>
        {desc && <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{desc}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function PagoPanel({ pack, setPack }) {
  const [period, setPeriod] = useState('m');
  const current = PACKS.find((p) => p.key === pack) || PACKS[1];
  return (
    <Panel title="Elige tu pack" desc="Contenido listo para vender cada mes. El clon IA se crea gratis con cualquier plan.">
      {/* Billing period toggle */}
      <div className="mx-auto mb-6 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-ink-2 p-1.5">
        {PERIODS.map((per) => {
          const active = period === per.key;
          const label = per.key === 'm' ? 'Mensual' : per.key === 'q' ? 'Trimestral' : 'Anual';
          return (
            <button key={per.key} type="button" onClick={() => setPeriod(per.key)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-full px-3 py-2 text-xs font-bold transition-all duration-200 sm:text-sm ${
                active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
              }`}>
              <span>{label}</span>
              {per.off > 0 && (
                <span className={`mt-0.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase ${
                  active ? 'bg-on-accent/20 text-on-accent' : 'bg-brand/15 text-brand'
                }`}>Ahorra {per.off}%</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((p) => {
          const price = p[period];
          const active = pack === p.key;
          const discount = Math.round((1 - price / p.was) * 100);
          return (
            <button key={p.key} type="button" onClick={() => setPack(p.key)}
              className={`group relative flex flex-col rounded-3xl border p-6 text-left transition-all ${
                active ? 'border-brand bg-brand/[0.07] shadow-glow-sm ring-1 ring-brand'
                : p.popular ? 'border-brand/50 bg-brand/[0.04]' : 'border-line bg-card hover:border-paper/20'
              }`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent">Más popular</div>
              )}
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{p.name}</span>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-sm text-paper-dim line-through">${p.was}</span>
                <span className="rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">-{discount}%</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`font-display text-[2.6rem] leading-none ${p.popular || active ? 'text-brand' : 'text-paper'}`}>${price}</span>
                <span className="font-mono text-[11px] text-paper-dim">/mes</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                <PackLine>{p.photos} fotos finales</PackLine>
                <PackLine>{p.videos} video{p.videos === 1 ? '' : 's'} corto{p.videos === 1 ? '' : 's'} IA</PackLine>
                <PackLine>{p.key === 'test' ? '5' : p.key === 'core' ? '10' : '20'} conceptos de venta</PackLine>
                <PackLine>{p.key === 'pro' ? '2 revisiones técnicas' : '1 revisión técnica'}</PackLine>
              </ul>
              <span className={`mt-6 inline-flex items-center justify-center gap-1 rounded-full px-4 py-2.5 text-sm font-bold ${
                active ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper'
              }`}>
                {active ? <><Check size={15} /> Elegido</> : 'Elegir'}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-on-accent transition-colors hover:bg-brand/90">
        Elegir {current.name} · ${current[period]}/mes
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">No se te cobra ahora. Confirmamos tu pago contigo y activamos tu cuenta.</p>
    </Panel>
  );
}

function ClonPanel() {
  const slots = [
    { key: 'front', label: 'Frontal', hint: 'Mirando al lente' },
    { key: 'angle', label: '¾', hint: 'Torso girado' },
    { key: 'side', label: 'Perfil', hint: '90° de lado' },
    { key: 'smile', label: 'Expresión', hint: 'Risa, guiño…' },
    { key: 'half',  label: 'Medio cuerpo', hint: 'De cintura para arriba' },
    { key: 'full',  label: 'Cuerpo entero', hint: 'De pies a cabeza' },
  ];
  return (
    <Panel title="Sube las fotos para tu clon" desc="Con unas 20 fotos ya podemos empezar. Ideal: 50+ con varias expresiones, ángulos, ropa y luz natural.">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.05] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Camera size={18} /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-paper">0 / 20 fotos subidas</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hair/10">
            <div className="h-full rounded-full bg-brand" style={{ width: '0%' }} />
          </div>
        </div>
      </div>

      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Los 6 ángulos que necesitamos</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((s) => (
          <div key={s.key} className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-line bg-ink-2 p-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-hair/10 text-paper-dim">
              <Camera size={20} />
            </div>
            <p className="text-sm font-semibold text-paper">{s.label}</p>
            <p className="text-[11px] text-paper-dim">{s.hint}</p>
          </div>
        ))}
      </div>

      <button type="button"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-on-accent transition-colors hover:bg-brand/90">
        <Upload size={17} /> Subir fotos
      </button>
    </Panel>
  );
}

function DatosPanel() {
  return (
    <>
      <Panel title="Datos e identidad" desc="Ya completo — así verificamos que eres tú y que puedes usar la plataforma.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre legal" value={MOCK.first} />
          <Field label="Apellido" value={MOCK.last} />
          <Field label="Fecha de nacimiento" value={MOCK.dob} />
          <Field label="País" value={MOCK.country} />
          <Field label="Teléfono" value={MOCK.phone} />
          <Field label="@handle" value={MOCK.handle} />
        </div>
      </Panel>

      <div className="mt-4 rounded-3xl border border-brand/25 bg-brand/[0.05] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><ShieldCheck size={18} /></span>
          <div>
            <p className="font-display text-sm font-semibold text-paper">Identidad verificada</p>
            <p className="mt-0.5 text-xs text-paper-mute">Tu ID, selfie y consentimientos están aprobados por el equipo.</p>
          </div>
          <CheckCircle2 size={20} className="ml-auto shrink-0 text-brand" />
        </div>
      </div>

      <button type="button" className="mt-4 flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-paper">
        <ArrowLeft size={15} /> Editar datos
      </button>
    </>
  );
}

function Field({ label, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-paper-dim">{label}</span>
      <div className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper">{value}</div>
    </label>
  );
}

function PackLine({ children }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-paper-mute">
      <Check size={14} className="mt-0.5 shrink-0 text-brand" /> <span>{children}</span>
    </li>
  );
}
