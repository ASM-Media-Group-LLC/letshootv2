'use client';

import { useRef, useState, useEffect } from 'react';
import { Check, Eraser, FileText, ShieldCheck } from 'lucide-react';
import { useLang } from '@/app/providers';

const T = {
  en: {
    badge: 'Model Authorization',
    title: 'AI Content — Authorization & Consent',
    intro: 'Please complete your details and consents below. Once signed, this authorizes LetShoot to build your AI clone and produce content as described.',
    yourInfo: 'Your information',
    f: {
      fullName: 'Full legal name', stageName: 'Creator / stage name', dob: 'Date of birth',
      idNumber: 'Government ID / passport number', email: 'Email', phone: 'Phone',
      address: 'Address', agency: 'Agency name', country: 'Country',
    },
    consentsTitle: 'Consents',
    c: {
      age: 'I confirm I am at least 18 years old, and I will provide valid proof of age / government ID.',
      clone: 'I authorize LetShoot to create an AI clone (model) of my likeness and to generate photos and videos based on it.',
      content: 'I will provide real photos and videos of myself to train the model. I confirm I am the person shown and that I own or hold all rights to that material.',
      third: 'I authorize LetShoot to deliver the generated content to the agency named below, which manages and/or resells my content on my behalf.',
      confidential: 'I understand LetShoot will not sell, publish, or share my content outside this authorization, and will not provide it to anyone other than me and — if authorized above — the named agency.',
    },
    signTitle: 'Signature',
    drawHere: 'Sign here (draw with your mouse or finger)',
    clear: 'Clear', signedName: 'Type your full name to confirm', dateLabel: 'Date',
    signBtn: 'Sign & generate agreement',
    required: 'Please complete all required fields, consents and your signature.',
    doneTitle: 'Agreement signed',
    doneMsg: 'Thank you. A copy has been generated below — you can print or save it as PDF.',
    print: 'Print / Save PDF',
    contractTitle: 'AI CONTENT AUTHORIZATION & CONSENT AGREEMENT',
    disclaimer: 'Template for review. This is not legal advice — have a qualified attorney review before use.',
  },
  es: {
    badge: 'Autorización de la modelo',
    title: 'Contenido IA — Autorización y consentimiento',
    intro: 'Completa tus datos y consentimientos. Al firmar, autorizas a LetShoot a crear tu clon IA y producir contenido según se describe.',
    yourInfo: 'Tus datos',
    f: {
      fullName: 'Nombre legal completo', stageName: 'Nombre artístico / de creadora', dob: 'Fecha de nacimiento',
      idNumber: 'Número de identificación / pasaporte', email: 'Correo', phone: 'Teléfono',
      address: 'Dirección', agency: 'Nombre de la agencia', country: 'País',
    },
    consentsTitle: 'Consentimientos',
    c: {
      age: 'Confirmo que tengo al menos 18 años y proporcionaré una identificación válida que lo acredite.',
      clone: 'Autorizo a LetShoot a crear un clon IA (modelo) de mi imagen y a generar fotos y videos basados en él.',
      content: 'Proporcionaré fotos y videos reales míos para entrenar el modelo. Confirmo que soy la persona que aparece y que poseo todos los derechos sobre ese material.',
      third: 'Autorizo a LetShoot a entregar el contenido generado a la agencia indicada abajo, que gestiona y/o revende mi contenido en mi nombre.',
      confidential: 'Entiendo que LetShoot no venderá, publicará ni compartirá mi contenido fuera de esta autorización, y no lo dará a nadie más que a mí y — si lo autoricé arriba — a la agencia indicada.',
    },
    signTitle: 'Firma',
    drawHere: 'Firma aquí (dibuja con el mouse o el dedo)',
    clear: 'Borrar', signedName: 'Escribe tu nombre completo para confirmar', dateLabel: 'Fecha',
    signBtn: 'Firmar y generar contrato',
    required: 'Completa los campos requeridos, los consentimientos y tu firma.',
    doneTitle: 'Contrato firmado',
    doneMsg: 'Gracias. Abajo se generó una copia — puedes imprimirla o guardarla como PDF.',
    print: 'Imprimir / Guardar PDF',
    contractTitle: 'CONTRATO DE AUTORIZACIÓN Y CONSENTIMIENTO DE CONTENIDO IA',
    disclaimer: 'Plantilla para revisión. Esto no es asesoría legal — que un abogado la revise antes de usarla.',
  },
};

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <span className="text-[13px] text-paper-mute">{label}{required && <span className="text-brand"> *</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none transition-colors focus:border-brand/60"
      />
    </label>
  );
}

export default function ContratoPage() {
  const { lang } = useLang();
  const t = T[lang] || T.es;

  const [form, setForm] = useState({
    fullName: '', stageName: '', dob: '', idNumber: '', email: '', phone: '', address: '', country: '', agency: '',
  });
  const [consents, setConsents] = useState({ age: false, clone: false, content: false, third: false, confidential: false });
  const [signedName, setSignedName] = useState('');
  const [error, setError] = useState(false);
  const [signed, setSigned] = useState(false);
  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (k) => setConsents((p) => ({ ...p, [k]: !p[k] }));

  // ── Signature pad ──
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2); // retina
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#eaf2f8';
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  };
  const start = (e) => { drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const { x, y } = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); hasInk.current = true; };
  const end = () => { drawing.current = false; };
  const clearSig = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); hasInk.current = false; };

  const requiredOk =
    form.fullName && form.dob && form.idNumber && form.email &&
    consents.age && consents.clone && consents.content && consents.confidential &&
    signedName && hasInk.current;

  const onSign = () => {
    if (!requiredOk) { setError(true); return; }
    setError(false);
    setSigned(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  return (
    <main className="relative z-10 min-h-screen bg-ink px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center print:hidden">
          <span className="inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand">{t.badge}</span>
          <h1 className="headline mt-4 text-[clamp(1.8rem,5vw,2.6rem)] text-paper">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-paper-mute">{t.intro}</p>
        </div>

        {signed ? (
          <SignedContract t={t} form={form} consents={consents} signedName={signedName} date={today} sigData={canvasRef.current?.toDataURL()} />
        ) : (
          <div className="space-y-8">
            {/* Info */}
            <section className="rounded-3xl border border-line bg-card p-6 sm:p-8">
              <h2 className="font-display text-lg text-paper">{t.yourInfo}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label={t.f.fullName} value={form.fullName} onChange={set('fullName')} required />
                <Field label={t.f.stageName} value={form.stageName} onChange={set('stageName')} />
                <Field label={t.f.dob} value={form.dob} onChange={set('dob')} type="date" required />
                <Field label={t.f.idNumber} value={form.idNumber} onChange={set('idNumber')} required />
                <Field label={t.f.email} value={form.email} onChange={set('email')} type="email" required />
                <Field label={t.f.phone} value={form.phone} onChange={set('phone')} type="tel" />
                <Field label={t.f.country} value={form.country} onChange={set('country')} />
                <Field label={t.f.address} value={form.address} onChange={set('address')} />
              </div>
            </section>

            {/* Consents */}
            <section className="rounded-3xl border border-line bg-card p-6 sm:p-8">
              <h2 className="font-display text-lg text-paper">{t.consentsTitle}</h2>
              <div className="mt-5 space-y-3">
                {['age', 'clone', 'content', 'third', 'confidential'].map((k) => (
                  <div key={k}>
                    <button
                      type="button"
                      onClick={() => toggle(k)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-line bg-ink-2 p-4 text-left transition-colors hover:border-brand/40"
                    >
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${consents[k] ? 'border-brand bg-brand text-on-accent' : 'border-line'}`}>
                        {consents[k] && <Check size={13} aria-hidden />}
                      </span>
                      <span className="flex-1 text-[13px] leading-relaxed text-paper-mute">
                        {t.c[k]}{(k !== 'third') && <span className="text-brand"> *</span>}
                      </span>
                    </button>
                    {k === 'third' && consents.third && (
                      <div className="mt-2 pl-8">
                        <Field label={t.f.agency} value={form.agency} onChange={set('agency')} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Signature */}
            <section className="rounded-3xl border border-line bg-card p-6 sm:p-8">
              <h2 className="font-display text-lg text-paper">{t.signTitle}</h2>
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-paper-mute">{t.drawHere}<span className="text-brand"> *</span></span>
                  <button type="button" onClick={clearSig} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] text-paper-mute transition-colors hover:text-brand">
                    <Eraser size={12} aria-hidden /> {t.clear}
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={320}
                  onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                  onTouchStart={start} onTouchMove={move} onTouchEnd={end}
                  className="mt-2 h-40 w-full cursor-crosshair touch-none rounded-2xl border border-line bg-ink-2"
                />
                <div className="mt-4">
                  <Field label={t.signedName} value={signedName} onChange={setSignedName} required />
                </div>
                <p className="mt-3 font-mono text-[12px] text-paper-dim">{t.dateLabel}: {today}</p>
              </div>
            </section>

            {error && <p className="text-center text-sm text-red-400">{t.required}</p>}

            <button
              type="button"
              onClick={onSign}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-base font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.02]"
            >
              <ShieldCheck size={18} aria-hidden /> {t.signBtn}
            </button>

            <p className="text-center font-mono text-[11px] leading-relaxed text-paper-dim">{t.disclaimer}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return <div className="flex justify-between gap-4 border-b border-line/60 py-1.5 text-sm"><span className="text-paper-dim">{label}</span><span className="text-paper">{value}</span></div>;
}

function SignedContract({ t, form, consents, signedName, date, sigData }) {
  return (
    <div className="rounded-3xl border border-brand/30 bg-card p-6 sm:p-10">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/[0.06] px-5 py-4 print:hidden">
        <ShieldCheck size={22} className="shrink-0 text-brand" aria-hidden />
        <div>
          <div className="font-display text-lg text-paper">{t.doneTitle}</div>
          <div className="text-[13px] text-paper-mute">{t.doneMsg}</div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 text-brand">
        <FileText size={18} aria-hidden />
        <h2 className="font-display text-base tracking-wide">{t.contractTitle}</h2>
      </div>

      <div className="mt-4 space-y-1">
        <Row label={t.f.fullName} value={form.fullName} />
        <Row label={t.f.stageName} value={form.stageName} />
        <Row label={t.f.dob} value={form.dob} />
        <Row label={t.f.idNumber} value={form.idNumber} />
        <Row label={t.f.email} value={form.email} />
        <Row label={t.f.phone} value={form.phone} />
        <Row label={t.f.country} value={form.country} />
        <Row label={t.f.address} value={form.address} />
        {consents.third && <Row label={t.f.agency} value={form.agency} />}
      </div>

      <ul className="mt-6 space-y-2.5">
        {['age', 'clone', 'content', 'confidential', ...(consents.third ? ['third'] : [])].map((k) => (
          <li key={k} className="flex items-start gap-2 text-[13px] leading-relaxed text-paper-mute">
            <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden /> <span>{t.c[k]}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-end justify-between gap-6 border-t border-line pt-6">
        <div>
          {sigData && <img src={sigData} alt="signature" className="h-16 w-auto" />}
          <div className="mt-1 border-t border-line pt-1 font-display text-paper">{signedName}</div>
          <div className="font-mono text-[11px] text-paper-dim">{t.dateLabel}: {date}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-paper">LetShoot</div>
          <div className="font-mono text-[11px] text-paper-dim">by Unlok</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] print:hidden"
      >
        <FileText size={16} aria-hidden /> {t.print}
      </button>

      <p className="mt-6 font-mono text-[11px] leading-relaxed text-paper-dim print:hidden">{t.disclaimer}</p>
    </div>
  );
}
